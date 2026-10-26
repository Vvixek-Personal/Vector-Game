import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { base, OWNER_EMAIL, catalogFor } from "../src/domain.mjs";
process.env.FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST="127.0.0.1:8080";
initializeApp({projectId:"demo-vector"});
const auth=getAuth(),db=getFirestore("ai-studio-vectorgame-560ec9bd-4e7c-4177-8021-3f5fed39406a");
const suffix=randomUUID().slice(0,8),password="Emulator-fixture-password-2026";
async function client(email,verified=true){
  let user;try{user=await auth.getUserByEmail(email);await auth.updateUser(user.uid,{password,emailVerified:verified});}
  catch{user=await auth.createUser({email,password,emailVerified:verified,displayName:email.split("@")[0]});}
  const response=await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,returnSecureToken:true})});
  const data=await response.json();assert.ok(data.idToken,JSON.stringify(data));return {uid:user.uid,email,token:data.idToken};
}
async function call(user,name,data={}){
  const response=await fetch("http://127.0.0.1:5001/demo-vector/us-central1/"+name,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+user.token},body:JSON.stringify({data})});
  const json=await response.json();if(json.error){const error=new Error(json.error.message);error.code=json.error.status;throw error;}assert.ok(response.ok&&json.result, name+" did not return a successful callable result: "+JSON.stringify(json));return json.result;
}
const action=(user,action,payload={},requestId=randomUUID())=>call(user,"gameAction",{action,payload,requestId});
const account=async user=>(await db.collection("accounts").doc(user.uid).get()).data();
test("Firebase account, economy, permissions and gift integration",{timeout:600000},async t=>{
  const owner=await client(OWNER_EMAIL),a=await client("vector-a-"+suffix+"@example.com"),b=await client("vector-b-"+suffix+"@example.com");
  await t.test("bootstrap ignores injected privileges and only migrates once",async()=>{
    const result=await call(a,"bootstrapAccount",{guestImport:{stats:{sparks:1000,diamonds:200},profile:{purchased:["hero-spider"],role:"developer",customTitles:[{id:"forged"}]},role:"developer",operativeName:"Alpha"}});
    assert.equal(result.account.accessRole,"player");assert.equal(result.account.profile.customTitles.length,0);
    const again=await call(a,"bootstrapAccount",{guestImport:{stats:{sparks:999999}}});assert.equal(again.account.stats.sparks,1000);
    await call(b,"bootstrapAccount",{guestImport:{operativeName:"Beta"}});const admin=await call(owner,"bootstrapAccount");assert.equal(admin.account.accessRole,"developer");
  });
  await t.test("direct balance writes, cross-account reads and role escalation are denied",async()=>{
    const endpoint="http://127.0.0.1:8080/v1/projects/demo-vector/databases/"+db.databaseId+"/documents/";
    const write=await fetch(endpoint+"accounts/"+a.uid,{method:"PATCH",headers:{Authorization:"Bearer "+a.token,"Content-Type":"application/json"},body:JSON.stringify({fields:{role:{stringValue:"developer"}}})});assert.equal(write.status,403);
    const other=await fetch(endpoint+"accounts/"+b.uid,{headers:{Authorization:"Bearer "+a.token}});assert.equal(other.status,403);
    await assert.rejects(call(a,"listPlayers"),e=>e.code==="PERMISSION_DENIED");
    await assert.rejects(action(a,"adminWallet",{userId:b.uid,sparks:999}),e=>e.code==="PERMISSION_DENIED");
    const legacy=await fetch(endpoint+"users/"+a.uid,{method:"PATCH",headers:{Authorization:"Bearer "+a.token,"Content-Type":"application/json"},body:JSON.stringify({fields:{userId:{stringValue:a.uid},stats:{mapValue:{fields:{sparks:{integerValue:"99999999"}}}}}})});assert.equal(legacy.status,403);
  });
  await t.test("concurrent daily claims credit exactly one reward",async()=>{
    const before=await account(a);const results=await Promise.all(Array.from({length:5},()=>action(a,"claimDaily")));
    assert.equal(results.filter(r=>r.reward).length,1);assert.equal((await account(a)).stats.sparks,before.stats.sparks+10);
    const id=randomUUID();await action(a,"claimDaily",{},id);const replay=await action(a,"claimDaily",{},id);assert.equal(replay.alreadyClaimed,true);assert.equal(replay.reward,null);
  });
  await t.test("one free name change then exactly 100 Diamonds across reconnects",async()=>{
    await action(a,"rename",{name:"Alpha One"});await call(a,"bootstrapAccount");
    await action(a,"rename",{name:"Alpha Two"});assert.equal((await account(a)).stats.diamonds,100);
    assert.equal((await account(a)).nameChangesUsed,2);
  });
  await t.test("purchases use current prices and retries do not charge twice",async()=>{
    const item=catalogFor().find(i=>i.id==="hero-miles");await action(owner,"adminWallet",{userId:a.uid,sparks:5000,diamonds:200});
    const id=randomUUID(),payload={itemId:item.id,expectedCost:item.cost,expectedCurrency:item.currency};
    await Promise.all([action(a,"purchase",payload,id),action(a,"purchase",payload,id)]);
    assert.equal((await account(a)).stats.sparks,5000-item.cost);
    const next=catalogFor().find(i=>i.id==="hero-iron");assert.ok(next);
    await call(owner,"saveCatalogItem",{item:{...next,cost:1234}});
    await assert.rejects(action(a,"purchase",{itemId:next.id,expectedCost:next.cost,expectedCurrency:next.currency}),e=>e.code==="FAILED_PRECONDITION");
    await action(a,"purchase",{itemId:next.id,expectedCost:1234,expectedCurrency:next.currency});
    assert.equal((await account(a)).stats.sparks,5000-item.cost-1234);
  });
  await t.test("gifts remove the item and concurrent acceptance settles once",async()=>{
    const sent=await action(a,"sendGift",{recipient:b.uid,itemId:"hero-spider"});
    assert.ok(!(await account(a)).profile.purchased.includes("hero-spider"));
    const claims=await Promise.allSettled([action(b,"claimGift",{giftId:sent.gift.id}),action(b,"claimGift",{giftId:sent.gift.id})]);
    assert.equal(claims.filter(r=>r.status==="fulfilled").length,1);
    assert.ok((await account(b)).profile.purchased.includes("hero-spider"));
    await assert.rejects(action(a,"returnGift",{giftId:sent.gift.id}),e=>e.code==="FAILED_PRECONDITION");
  });
  await t.test("returned gifts restore one copy and developer gifts keep theirs",async()=>{
    const sent=await action(a,"sendGift",{recipient:b.uid,itemId:"hero-miles"});
    await action(b,"returnGift",{giftId:sent.gift.id});assert.ok((await account(a)).profile.purchased.includes("hero-miles"));
    await assert.rejects(action(a,"returnGift",{giftId:sent.gift.id}),e=>e.code==="FAILED_PRECONDITION");
    const gift=await action(owner,"sendGift",{recipient:b.uid,itemId:"hero-miles"});await action(b,"claimGift",{giftId:gift.gift.id});
    assert.notEqual((await account(owner)).profile.inventoryRules["hero-miles"],"gifted");
  });
  await t.test("moderators receive future items but individual locks win",async()=>{
    await action(owner,"adminRole",{userId:b.uid,role:"moderator"});
    const id="custom-test-"+suffix;
    await call(owner,"saveCatalogItem",{item:{id,tab:"themes",name:"Integration Spectrum",desc:"Emulator item.",cost:900,currency:"sparks",rarity:"rare",themeSwatch:["#123456","#654321","#abcdef"]}});
    await action(b,"equip",{itemId:id});
    await action(owner,"adminInventory",{userId:b.uid,itemId:id,operation:"lock"});
    await assert.rejects(action(b,"equip",{itemId:id}),e=>e.code==="PERMISSION_DENIED");
    await action(owner,"adminInventory",{userId:b.uid,itemId:id,operation:"grant"});await action(b,"equip",{itemId:id});
    await call(b,"sendModeratorFeedback",{message:"Verified item restriction and future catalogue access."});
    await action(owner,"adminRole",{userId:b.uid,role:"player"});
    await assert.rejects(call(b,"sendModeratorFeedback",{message:"Should be rejected."}),e=>e.code==="PERMISSION_DENIED");
  });
  await t.test("exclusive titles stay assigned to one player",async()=>{
    await action(owner,"adminTitle",{userId:a.uid,name:"Founding Pilot",color:"#aabbcc"});
    const title=(await account(a)).profile.customTitles.at(-1);await action(a,"equip",{itemId:title.id});
    await assert.rejects(action(b,"equip",{itemId:title.id}),e=>e.code==="PERMISSION_DENIED");
    assert.equal((await db.collection("catalog").doc(title.id).get()).exists,false);
  });
  await t.test("master password grants expiring access and can be revoked",async()=>{
    await assert.rejects(call(a,"unlockDeveloper",{password:"incorrect-emulator-password"}),e=>e.code==="PERMISSION_DENIED");
    await call(a,"unlockDeveloper",{password:"Vector-emulator-test-passphrase-only"});
    assert.ok((await call(a,"bootstrapAccount")).account.accessRole==="developer");
    await action(owner,"revokeDeveloper",{userId:a.uid});
    await assert.rejects(call(a,"listPlayers"),e=>e.code==="PERMISSION_DENIED");
  });
  await t.test("authenticated run rewards settle once and forged scores fail",async()=>{
    const run=await call(a,"beginRun",{mode:"arcade",multiplier:1});
    const summary={mode:"arcade",score:100,hits:1,misses:0,perfectHits:0,bestStreak:1,playSeconds:1};
    const first=await action(a,"recordRun",{runId:run.id,summary},run.id),before=(await account(a)).stats.runs;
    await action(a,"recordRun",{runId:run.id,summary},run.id);assert.equal((await account(a)).stats.runs,before);assert.ok(first.account.stats.totalScore>=100);
    await assert.rejects(action(b,"recordRun",{runId:run.id,summary}),e=>e.code==="PERMISSION_DENIED");
  });
  await t.test("image uploads and data inspection require developer authority",async()=>{
    await assert.rejects(call(a,"uploadImage",{purpose:"profile",requestId:randomUUID(),base64:"x"}),e=>e.code==="PERMISSION_DENIED");
    const png=await import("node:fs/promises").then(fs=>fs.readFile(new URL("../../public/pwa-192x192.png",import.meta.url)));
    {const result=await call(owner,"uploadImage",{purpose:"profile",requestId:randomUUID(),base64:png.toString("base64")});assert.match(result.url,/profile-images/);}
    const logs=await call(owner,"inspectData",{collection:"ledger"});assert.ok(logs.documents.length>0);
    await assert.rejects(call(a,"inspectData",{collection:"accounts"}),e=>e.code==="PERMISSION_DENIED");
  });
  await import("node:fs/promises").then(async fs=>{await fs.mkdir(new URL("../../.vector-emulator-data/",import.meta.url),{recursive:true});await fs.writeFile(new URL("../../.vector-emulator-data/fixtures.json",import.meta.url),JSON.stringify({owner:{email:owner.email,password},player:{email:a.email,password,uid:a.uid},recipient:{email:b.email,password,uid:b.uid}},null,2));});
});
