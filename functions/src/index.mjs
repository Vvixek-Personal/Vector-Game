import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { randomUUID, randomInt, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { base, OWNER_EMAIL, MODES, newAccount, roleFor, accountView, applyAction, catalogFor, publicPlayer, validateCatalogItem, insist, uid, text, int, dayFor, weeklyFor, DomainError } from "./domain.mjs";
import { MASTER_KEY_MIN_LENGTH, MASTER_KEY_MAX_LENGTH, MASTER_KEY_HASH, verifyMasterKey, verifyMasterKeyHash } from "./master-key.mjs";

initializeApp();
const databaseId=defineString("VECTOR_DATABASE_ID",{default:"ai-studio-vectorgame-560ec9bd-4e7c-4177-8021-3f5fed39406a"});
const bucketName=defineString("VECTOR_STORAGE_BUCKET",{default:"steel-scanner-8xfhk.firebasestorage.app"});
// The requested key works out of the box through its salted verification
// record. Owners can override it with a fresh PBKDF2 or scrypt record.
const masterHash=defineString("VECTOR_MASTER_PASSWORD_HASH",{default:MASTER_KEY_HASH});
const options={region:"us-central1",maxInstances:10,timeoutSeconds:90,memory:"256MiB"};
const db=()=>getFirestore(databaseId.value());
const owner=req=>req.auth?.token?.email_verified===true&&String(req.auth?.token?.email||"").toLowerCase()===OWNER_EMAIL;
const requireUser=req=>{
  if(!req.auth||req.auth.token.firebase?.sign_in_provider==="anonymous")throw new HttpsError("unauthenticated","Sign in with your player account first.");
  return uid(req.auth.uid);
};
function wrap(handler,extra={}){
  return onCall({...options,...extra},async req=>{
    try{return await handler(req);}
    catch(error){if(error instanceof HttpsError)throw error;if(error instanceof DomainError)throw new HttpsError(error.code,error.message);console.error("Vector action failed",{message:error?.message});throw new HttpsError("internal","This action could not be saved. Please try again.");}
  });
}
const stableHash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
function audit(transaction,database,actor,target,kind,details,now,id=randomUUID()){
  transaction.set(database.collection("ledger").doc(id),{actor,target,kind,details,createdAt:now});
}
function writeAccount(transaction,database,account,accessRole){
  transaction.set(database.collection("accounts").doc(account.uid),account);
  transaction.set(database.collection("players").doc(account.uid),publicPlayer(account,accessRole));
}
async function current(req){
  const id=requireUser(req),snap=await db().collection("accounts").doc(id).get();
  if(!snap.exists)throw new HttpsError("failed-precondition","Your account is not ready. Reconnect it first.");
  const account=snap.data();return {account,role:roleFor(account,owner(req)),database:db()};
}
export const bootstrapAccount=wrap(async req=>{
  const id=requireUser(req),database=db(),user=await getAuth().getUser(id),now=Date.now();
  const own=database.collection("accounts").doc(id),legacy=database.collection("users").doc(id);
  return database.runTransaction(async transaction=>{
    const [existing,old]=await Promise.all([transaction.get(own),transaction.get(legacy)]);
    const data=old.exists?old.data():{};
    const hasLegacy = old.exists && (data.stats || data.profile);
    const seed=hasLegacy?{stats:data.stats,profile:data.profile,operativeName:data.operativeName}:req.data?.guestImport||{};
    const catalog=existing.exists?null:await transaction.get(database.collection("catalog"));
    const account=existing.exists?existing.data():newAccount(user,seed,now,catalogFor(catalog.docs.map(d=>({...d.data(),id:d.id})),now));
    const role=roleFor(account,owner(req),now);
    account.email=user.email||"";account.ownerAccount=owner(req);account.updatedAt=now;
    if(!existing.exists)audit(transaction,database,id,id,"account.migrate",{source:hasLegacy?"legacy-cloud":"first-account",schemaVersion:3},now);
    writeAccount(transaction,database,account,role);
    return {account:accountView(account,role),settings:data.settings||null,preferences:data.preferences||{wishlist:data.profile?.wishlist||[],favoriteModes:data.profile?.favoriteModes||[]},settingsUpdatedAt:data.settingsUpdatedAt||0,preferencesUpdatedAt:data.preferencesUpdatedAt||data.profileUpdatedAt||0};
  });
},{timeoutSeconds:90});
export const gameAction=wrap(async req=>{
  const id=requireUser(req),database=db(),action=text(req.data?.action,"Action",40),payload=req.data?.payload||{};
  const requestId=text(req.data?.requestId,"Request ID",100);
  insist(/^[A-Za-z0-9_-]{8,100}$/.test(requestId),"invalid-argument","Invalid request ID.");
  const hash=stableHash({action,payload}),receiptRef=database.collection("receipts").doc(id+"_"+requestId),now=Date.now();
  const randomId=requestId,randomUnit=randomInt(0,1000000)/1000000;
  let weighted=randomInt(0,base.spin.reduce((sum,r)=>sum+r.weight,0)),spinIndex=0;
  for(let i=0;i<base.spin.length;i++){weighted-=base.spin[i].weight;if(weighted<0){spinIndex=i;break;}}
  return database.runTransaction(async transaction=>{
    const accountRef=database.collection("accounts").doc(id);
    const [receipt,accountSnap,catalogSnap]=await Promise.all([transaction.get(receiptRef),transaction.get(accountRef),transaction.get(database.collection("catalog"))]);
    insist(accountSnap.exists,"failed-precondition","Reconnect your account before using its inventory.");
    const account=accountSnap.data(),role=roleFor(account,owner(req),now);
    if(receipt.exists){insist(receipt.data().hash===hash,"already-exists","This request ID belongs to a different action.");return {...receipt.data().result,...(action==="claimDaily"?{alreadyClaimed:true,reward:null}:{}),account:accountView(account,role)};}
    const catalog=catalogFor(catalogSnap.docs.map(d=>({...d.data(),id:d.id})),now);
    const extra={randomId,randomUnit,spinIndex};
    let runRef,giftRef,targetRef,oldBest,overallRef;
    if(action==="recordRun"){
      runRef=database.collection("runs").doc(text(payload.runId,"Run ID",100));
      const snap=await transaction.get(runRef);extra.run=snap.exists?{...snap.data(),id:snap.id}:null;
      insist(extra.run?.uid===id,"permission-denied","This run belongs to another player.");
      const mode=extra.run.bucket;
      const scoreRef=database.collection("leaderboard").doc(id+"_"+mode);
      overallRef=database.collection("leaderboard").doc(id+"_overall");
      const [best,overall]=await Promise.all([transaction.get(scoreRef),transaction.get(overallRef)]);
      oldBest={scoreRef,score:best.exists?best.data().score:0,overall:overall.exists?overall.data():{}};
    }
    if(action==="sendGift"){
      const recipientRef=database.collection("accounts").doc(uid(payload.recipient));
      const recipient=await transaction.get(recipientRef);extra.recipient=recipient.exists?recipient.data():null;
    }
    if(action==="claimGift"||action==="returnGift"){
      giftRef=database.collection("gifts").doc(text(payload.giftId,"Gift ID",100));
      const gift=await transaction.get(giftRef);extra.gift=gift.exists?{...gift.data(),id:gift.id}:null;
      if(extra.gift?.sender!==id&&action==="returnGift"){const sender=await transaction.get(database.collection("accounts").doc(extra.gift.sender));extra.sender=sender.exists?sender.data():null;}
    }
    if(action.startsWith("admin")||action==="revokeDeveloper"){
      insist(role==="developer","permission-denied","Developer access required.");
      const targetId=uid(payload.userId);targetRef=database.collection("accounts").doc(targetId);
      const target=targetId===id?accountSnap:await transaction.get(targetRef);
      insist(target.exists,"not-found","This player needs to open the game once before their inventory can be managed.");
      extra.target=target.data();
    }
    const result=applyAction(account,action,payload,catalog,role,now,extra);
    const changed=result.account;writeAccount(transaction,database,changed,role);
    if(result.other)writeAccount(transaction,database,result.other,roleFor(result.other,false,now));
    if(result.target)writeAccount(transaction,database,result.target,roleFor(result.target,!!result.target.ownerAccount,now));
    if(result.gift)transaction.set(database.collection("gifts").doc(result.gift.id),result.gift);
    if(result.run){
      transaction.set(runRef,result.run);
      if(result.run.score>oldBest.score){
        const p=publicPlayer(changed,role),title=changed.profile.customTitles?.find(t=>t.id===changed.profile.titleId)?.name||catalog.find(i=>i.apply?.titleId===changed.profile.titleId)?.name||"Rookie";
        const record={id:id+"_"+result.run.bucket,userId:id,userName:changed.operativeName,mode:result.run.bucket,score:result.run.score,streak:result.run.streak,avatarId:p.avatarId,frameId:p.frameId,userPhoto:p.photoURL,useGooglePfp:!!p.photoURL,role,ownerAccount:p.ownerAccount,developerUntil:p.developerUntil,level:p.level,title,updatedAt:new Date(now)};
        transaction.set(oldBest.scoreRef,record);
        transaction.set(overallRef,{...record,id:id+"_overall",mode:"overall",score:(oldBest.overall.score||0)+result.run.score-oldBest.score,streak:Math.max(oldBest.overall.streak||0,result.run.streak)});
      }
    }
    const meta={message:result.message,...(result.reward?{reward:result.reward}:{}),...(result.alreadyClaimed?{alreadyClaimed:true}:{}),...(result.spinIndex!==undefined?{spinIndex:result.spinIndex}:{}),...(result.gift?{gift:result.gift}:{})};
    transaction.set(receiptRef,{uid:id,action,hash,result:meta,createdAt:now,expiresAt:new Date(now+30*86400000)});
    audit(transaction,database,id,result.target?.uid||payload.userId||id,action,{requestId,...(payload.itemId?{itemId:payload.itemId}:{}),...(payload.operation?{operation:payload.operation}:{}),before:{sparks:(extra.target||account).stats.sparks,diamonds:(extra.target||account).stats.diamonds},after:{sparks:(result.target||changed).stats.sparks,diamonds:(result.target||changed).stats.diamonds}},now,requestId+"_"+id);
    return {...meta,account:accountView(changed,role)};
  });
});
export const beginRun=wrap(async req=>{
  const {account,database}=await current(req),mode=req.data?.mode;
  insist(MODES.includes(mode),"invalid-argument","Choose a scored mode.");
  const now=Date.now(),id=randomUUID(),bucket=mode==="daily"?"daily_"+dayFor(now):mode==="weekly"?"weekly_"+weeklyFor(now):mode;
  const rateRef=database.collection("runLimits").doc(account.uid);
  return database.runTransaction(async transaction=>{
    const currentRate=await transaction.get(rateRef),rate=currentRate.exists?currentRate.data():{};
    insist(now-(rate.lastStartedAt||0)>1500,"resource-exhausted","Finish preparing your previous run first.");
    const run={id,uid:account.uid,mode,bucket,startedAt:now,multiplier:mode==="daily"||mode==="weekly"?1:Math.max(1,Math.min(3,Number(req.data?.multiplier)||1))};
    transaction.set(database.collection("runs").doc(id),run);
    transaction.set(rateRef,{lastStartedAt:now});return run;
  });
});
export const playerDirectory=wrap(async req=>{
  await current(req);const database=db(),query=String(req.data?.query||"").trim().slice(0,40),ids=[];
  if(/^[A-Za-z0-9:_-]{20,128}$/.test(query)){const direct=await database.collection("players").doc(query).get();if(direct.exists)return {players:[direct.data()]};}
  const reference=database.collection("players").orderBy("searchName").limit(12);
  const result=query?await reference.startAt(query.toLowerCase()).endAt(query.toLowerCase()+"\uf8ff").get():await reference.get();
  return {players:result.docs.map(d=>d.data())};
});
export const listPlayers=wrap(async req=>{
  const {role,database}=await current(req);insist(role==="developer","permission-denied","Developer access required.");
  const query=String(req.data?.query||"").trim(),pageToken=typeof req.data?.pageToken==="string"?req.data.pageToken:undefined;
  let users,nextPageToken;
  if(query.includes("@")){try{users=[await getAuth().getUserByEmail(query)];}catch{users=[];}}
  else if(query){try{users=[await getAuth().getUser(uid(query))];}catch{users=[];}}
  else{const page=await getAuth().listUsers(50,pageToken);users=page.users;nextPageToken=page.pageToken;}
  const records=users.length?await database.getAll(...users.map(user=>database.collection("accounts").doc(user.uid))):[];
  return {players:users.map((user,index)=>({uid:user.uid,email:user.email||"",displayName:user.displayName||"",disabled:user.disabled,account:records[index]?.exists?records[index].data():null})),nextPageToken:nextPageToken||null};
});
export const sendModeratorFeedback=wrap(async req=>{
  const {account,role,database}=await current(req);insist(role==="moderator"||role==="developer","permission-denied","Moderator access required.");
  const message=text(req.data?.message,"Feedback",2000),id=randomUUID(),now=Date.now();
  await database.collection("feedback").doc(id).set({id,uid:account.uid,name:account.operativeName,message,status:"new",createdAt:now});
  return {message:"Feedback sent to the developer."};
});
const inspectCollections=new Set(["accounts","users","players","catalog","gifts","ledger","feedback","runs"]);
export const inspectData=wrap(async req=>{
  const {role,database}=await current(req);insist(role==="developer","permission-denied","Developer access required.");
  const collection=String(req.data?.collection||"ledger");insist(inspectCollections.has(collection),"invalid-argument","Choose an application data collection.");
  if(req.data?.documentId){const document=await database.collection(collection).doc(text(req.data.documentId,"Document ID",180)).get();return {documents:document.exists?[{id:document.id,data:document.data()}]:[],nextCursor:null};}
  const timeField={ledger:"createdAt",gifts:"createdAt",feedback:"createdAt",runs:"startedAt"}[collection];
  let query=database.collection(collection).orderBy(timeField||"__name__",timeField?"desc":"asc").limit(30);
  if(req.data?.cursor){const cursor=await database.collection(collection).doc(text(req.data.cursor,"Cursor",180)).get();if(cursor.exists)query=query.startAfter(cursor);}
  const snapshot=await query.get();return {documents:snapshot.docs.map(d=>({id:d.id,data:d.data()})),nextCursor:snapshot.size===30?snapshot.docs.at(-1).id:null};
});
export const saveCatalogItem=wrap(async req=>{
  const {account,role,database}=await current(req);insist(role==="developer","permission-denied","Developer access required.");
  const input=req.data?.item||{},id=text(input.id,"Item ID",80);
  return database.runTransaction(async transaction=>{
    const reference=database.collection("catalog").doc(id),old=await transaction.get(reference);
    const existing=old.exists?old.data():base.items.find(item=>item.id===id);
    const item=validateCatalogItem(input,existing),now=Date.now();
    // Client-optimized data URIs are allowed so a catalog change can publish
    // without a separate Storage deployment. Remote bucket URLs remain valid.
    if(item.photo)insist(item.photo.includes("/b/"+bucketName.value()+"/")||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(item.photo),"invalid-argument","Upload images to this game's bucket or use an optimized image data URI.");
    transaction.set(reference,{...item,updatedAt:now,updatedBy:account.uid});
    audit(transaction,database,account.uid,id,"catalog.save",{itemId:id,cost:item.cost,currency:item.currency,active:item.active},now);
    return {item,message:"Store item saved."};
  });
});
export const acknowledgeFeedback=wrap(async req=>{
  const {account,role,database}=await current(req);insist(role==="developer","permission-denied","Developer access required.");
  const id=text(req.data?.id,"Feedback ID",100);await database.collection("feedback").doc(id).update({status:"reviewed",reviewedAt:Date.now(),reviewedBy:account.uid});return {message:"Feedback marked reviewed."};
});
export const unlockDeveloper=wrap(async req=>{
  const id=requireUser(req),database=db(),now=Date.now(),password=String(req.data?.password||"");
  insist(password.length>=MASTER_KEY_MIN_LENGTH&&password.length<=MASTER_KEY_MAX_LENGTH,"invalid-argument",`Enter the configured master key (${MASTER_KEY_MIN_LENGTH}–${MASTER_KEY_MAX_LENGTH} characters).`);
  const keys=[id,"ip_"+createHash("sha256").update(req.rawRequest.ip||"unknown").digest("hex")];
  await database.runTransaction(async transaction=>{
    const refs=keys.map(key=>database.collection("adminAttempts").doc(key)),docs=await Promise.all(refs.map(ref=>transaction.get(ref)));
    for(let i=0;i<refs.length;i++){const old=docs[i].exists?docs[i].data():{},same=now-(old.startedAt||0)<900000,count=same?(old.count||0):0;
      insist(count<(i===0?5:20),"resource-exhausted","Too many attempts. Try again in 15 minutes.");
      transaction.set(refs[i],{startedAt:same?old.startedAt:now,count:count+1});
    }
  });
  const record=masterHash.value()||MASTER_KEY_HASH;
  let authorized;
  if(record===MASTER_KEY_HASH) authorized=await verifyMasterKey(password);
  else {
    const [format,salt,expected]=record.split("$");
    if(format==="scrypt"&&/^[a-f0-9]{32,128}$/.test(salt||"")&&/^[a-f0-9]{128}$/.test(expected||"")){
      const actual=await promisify(scrypt)(password,salt,64);
      authorized=timingSafeEqual(actual,Buffer.from(expected,"hex"));
    }else authorized=await verifyMasterKeyHash(password,record);
  }
  insist(authorized,"permission-denied","The master key is incorrect.");
  const reference=database.collection("accounts").doc(id);
  await database.runTransaction(async transaction=>{
    const snapshot=await transaction.get(reference);insist(snapshot.exists,"failed-precondition","Reconnect your player account first.");
    const account=snapshot.data();account.developerUntil=now+3600000;account.updatedAt=now;
    writeAccount(transaction,database,account,"developer");audit(transaction,database,id,id,"developer.unlock",{expiresAt:account.developerUntil},now);
  });
  return {message:"Developer access unlocked for one hour.",expiresAt:now+3600000};
});
export const uploadImage=wrap(async req=>{
  const {account,role,database}=await current(req);insist(role==="developer","permission-denied","Only verified developers can upload images.");
  const purpose=req.data?.purpose==="profile"?"profile":"catalog",requestId=text(req.data?.requestId,"Upload ID",100);
  insist(/^[a-zA-Z0-9_-]{8,100}$/.test(requestId),"invalid-argument","Invalid upload ID.");
  const supplied=typeof req.data?.base64==="string"?req.data.base64:String(req.data?.dataUrl||"").replace(/^data:image\/[a-z]+;base64,/i,"");
  insist(typeof supplied==="string"&&supplied.length<=2800000,"invalid-argument","Choose an image smaller than 2 MB.");
  const bytes=Buffer.from(supplied,"base64");insist(bytes.length>20&&bytes.length<=2097152,"invalid-argument","Choose an image smaller than 2 MB.");
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,webp=bytes.subarray(0,4).toString()==="RIFF"&&bytes.subarray(8,12).toString()==="WEBP";
  insist(png||jpg||webp,"invalid-argument","Use a PNG, JPEG or WebP image.");
  if(png)insist(bytes.length>=24&&bytes.readUInt32BE(16)<=4096&&bytes.readUInt32BE(20)<=4096,"invalid-argument","Image dimensions must be 4096 pixels or smaller.");
  const ext=png?"png":jpg?"jpg":"webp",type=png?"image/png":jpg?"image/jpeg":"image/webp";
  const bucket=getStorage().bucket(bucketName.value()),path=(purpose==="profile"?"profile-images":"catalog-images")+"/"+account.uid+"/"+requestId+"."+ext,file=bucket.file(path);
  const digest=createHash("sha256").update(bytes).digest("hex");
  let token;
  const [exists]=await file.exists();
  if(exists){const [metadata]=await file.getMetadata();insist(metadata.metadata?.sha256===digest,"already-exists","Upload ID reused with different image.");token=metadata.metadata.firebaseStorageDownloadTokens;}
  else{token=randomUUID();await file.save(bytes,{contentType:type,resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{metadata:{firebaseStorageDownloadTokens:token,sha256:digest},cacheControl:"public,max-age=31536000,immutable"}});}
  const url="https://firebasestorage.googleapis.com/v0/b/"+bucket.name+"/o/"+encodeURIComponent(path)+"?alt=media&token="+token;
  if(purpose==="profile")await database.runTransaction(async transaction=>{
    const reference=database.collection("accounts").doc(account.uid),snapshot=await transaction.get(reference);
    const next=snapshot.data();insist(roleFor(next,owner(req))==="developer","permission-denied","Developer access expired.");
    next.profile.customPhotoURL=url;next.profile.useGooglePfp=false;next.updatedAt=Date.now();writeAccount(transaction,database,next,"developer");
    audit(transaction,database,account.uid,account.uid,"profile.photo",{path},Date.now());
  });
  if(purpose==="catalog")await database.collection("ledger").doc("upload_"+account.uid+"_"+requestId).set({actor:account.uid,target:path,kind:"catalog.image",details:{path},createdAt:Date.now()});
  return {url,message:"Image uploaded."};
},{timeoutSeconds:90});

export const initializePlayer=wrap(async req=>{
  const {account:actor,role,database}=await current(req);insist(role==="developer","permission-denied","Developer access required.");
  const id=uid(req.data?.userId),user=await getAuth().getUser(id),now=Date.now();
  return database.runTransaction(async transaction=>{
    const ref=database.collection("accounts").doc(id),legacyRef=database.collection("users").doc(id);
    const [existing,legacy]=await Promise.all([transaction.get(ref),transaction.get(legacyRef)]);
    if(existing.exists)return {message:"This player inventory is already ready."};
    const legacyData=legacy.exists?legacy.data():{},target=newAccount(user,legacyData,now);
    target.ownerAccount=user.emailVerified&&user.email?.toLowerCase()===OWNER_EMAIL;
    writeAccount(transaction,database,target,roleFor(target,target.ownerAccount,now));
    audit(transaction,database,actor.uid,id,"account.prepare",{source:legacy.exists?"legacy-cloud":"firebase-auth"},now);
    return {message:"Player inventory prepared. Existing cloud progress was preserved."};
  });
});
