import base from "./catalog-base.json" with { type: "json" };
import { levelFor, xpForStats } from "./progression.mjs";
export { base };
export const OWNER_EMAIL = "personal.me.vivek@gmail.com";
export const NAME_CHANGE_COST = 100;
export class DomainError extends Error { constructor(code,message){super(message);this.code=code;} }
export function insist(test,code,message){if(!test)throw new DomainError(code,message);}
export function int(value,label="Amount",max=1000000000,min=0){
  insist(Number.isSafeInteger(value)&&value>=min&&value<=max,"invalid-argument",label+" is outside the allowed range.");return value;
}
export function text(value,label,max=100,min=1){
  insist(typeof value==="string","invalid-argument",label+" is required.");
  const clean=value.replace(/<[^>]*>/g,"").replace(/[\u0000-\u001f\u007f]/g,"").trim();
  insist(clean.length>=min&&clean.length<=max,"invalid-argument",label+" must be "+min+"–"+max+" characters.");return clean;
}
export function uid(value){insist(typeof value==="string"&&/^[A-Za-z0-9:_-]{1,128}$/.test(value),"invalid-argument","Choose a valid player ID.");return value;}
export const dayFor=now=>new Date(now).toISOString().slice(0,10);
export function weeklyFor(now){const date=new Date(now);return date.getUTCFullYear()+"_W"+Math.floor((now-Date.UTC(date.getUTCFullYear(),0,1))/604800000);}
export function periods(now){return {daily:dayFor(now),weekly:weeklyFor(now),monthly:dayFor(now).slice(0,7)};}
export function roleFor(account,ownerVerified=false,now=Date.now()){
  return ownerVerified||Number(account?.developerUntil)>now ? "developer" : account?.role==="moderator" ? "moderator" : "player";
}
function cleanDay(value){
  if(typeof value!=="string")return "";
  const match=value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return match ? match[1]+"-"+match[2].padStart(2,"0")+"-"+match[3].padStart(2,"0") : "";
}
const number=(value,fallback=0,max=1000000000)=>Number.isFinite(value)&&value>=0?Math.min(max,Math.floor(value)):fallback;
export function newAccount(user,seed={},now=Date.now(),catalog=base.items){
  const stats=structuredClone(base.defaultStats), profile=structuredClone(base.defaultProfile);
  for(const key of Object.keys(stats))if(typeof stats[key]==="number")stats[key]=number(seed.stats?.[key],stats[key]);
  stats.fastestMs=number(seed.stats?.fastestMs,9999,9999);
  stats.history=Array.isArray(seed.stats?.history)?seed.stats.history.filter(r=>r&&Number.isFinite(r.score)&&typeof r.mode==="string"&&r.mode!=="practice").slice(0,100):[];
  stats.modeRuns=Object.fromEntries(Object.entries(seed.stats?.modeRuns||{}).filter(([k,v])=>MODES.includes(k)&&Number.isSafeInteger(v)&&v>=0));
  stats.lastLoginDate=cleanDay(seed.stats?.lastLoginDate);if(stats.lastLoginDate>dayFor(now))stats.lastLoginDate=dayFor(now);
  for(const key of ["avatarId","bannerId","frameId","titleId","bannerStyle","arenaThemeId","audioPackId"])if(typeof seed.profile?.[key]==="string")profile[key]=seed.profile[key];
  for(const key of ["customAvatar","customBanner"]){const value=seed.profile?.[key];if(!value||typeof value!=="object")continue;for(const color of ["from","to"])if(/^#[0-9a-f]{6}$/i.test(value[color]))profile[key][color]=value[color];if(key==="customAvatar"&&typeof value.glyph==="string")profile[key].glyph=value.glyph.slice(0,2)||"▲";if(key==="customBanner"&&["waves","grid","orbits","rays","dots","plain"].includes(value.pattern))profile[key].pattern=value.pattern;}
  const legacyIds={"shop-pulse":"frm-pulse","shop-patron":"ttl-patron","shop-nebula":"ban-nebula","shop-comet":"earned-comet"};
  profile.purchased=Array.isArray(seed.profile?.purchased)?[...new Set(seed.profile.purchased.map(id=>legacyIds[id]||id).filter(id=>catalog.some(item=>item.id===id&&!item.pack)))]:[];
  for(const key of ["wishlist","favoriteModes"])profile[key]=Array.isArray(seed.profile?.[key])?seed.profile[key].filter(v=>typeof v==="string").slice(0,200):[];
  profile.claimedLevels=Array.isArray(seed.profile?.claimedLevels)?[...new Set(seed.profile.claimedLevels.filter(v=>Number.isInteger(v)&&v>=1&&v<=100))]:[];
  profile.charges={shield:number(seed.profile?.charges?.shield,1,100),surge:number(seed.profile?.charges?.surge,0,100),saver:number(seed.profile?.charges?.saver,0,100)};
  profile.useGooglePfp=false;profile.inventoryRules={};profile.customTitles=[];
  const account={uid:uid(user.uid),email:typeof user.email==="string"?user.email:"",operativeName:typeof seed.operativeName==="string"?seed.operativeName.replace(/<[^>]*>/g,"").slice(0,15).trim()||"Ace":(user.displayName||"Ace").slice(0,15),
    schemaVersion:3,role:"player",developerUntil:0,stats,profile,nameChangesUsed:0,createdAt:now,updatedAt:now,
    daily:{day:stats.lastLoginDate||"",streak:number(seed.stats?.loginStreak)},spin:{lastFreeAt:0,history:[]},
    incubator:{inventory:[{id:"welcome-egg",eggType:"neon",obtainedAt:now}],pods:[null,null]},missions:{},revision:0};
  if(seed.incubator&&typeof seed.incubator==="object"){
    const used=new Set();const validEgg=e=>e&&typeof e.id==="string"&&e.id.length<=100&&base.eggs[e.eggType]&&!used.has(e.id)&&!!used.add(e.id);
    account.incubator.inventory=Array.isArray(seed.incubator.inventory)?seed.incubator.inventory.filter(validEgg).slice(0,100).map(e=>({id:e.id,eggType:e.eggType,obtainedAt:Math.min(now,number(e.obtainedAt,now,now))})):[];
    account.incubator.pods=Array.from({length:2},(_,i)=>{const pod=seed.incubator.pods?.[i];if(!validEgg(pod))return null;const durationMs=base.eggs[pod.eggType].durationSeconds*1000,readyAt=Math.min(now+durationMs,number(pod.readyAt,now+durationMs,now+durationMs));return {id:pod.id,eggType:pod.eggType,startedAt:readyAt-durationMs,durationMs,readyAt};});
  }
  account.spin.lastFreeAt=Math.min(now,number(seed.spin?.lastFreeAt,0,now));
  account.spin.history=Array.isArray(seed.spin?.history)?seed.spin.history.slice(0,20).filter(v=>typeof v==="string").map(label=>({label:label.slice(0,120),at:now})):[];
  for(const rule of base.rules)if(rule.op==="<"?stats[rule.stat]<rule.value:stats[rule.stat]>=rule.value)account.profile.purchased.push(rule.id);
  account.profile.purchased=[...new Set(account.profile.purchased)];
  refreshMissions(account,now);return account;
}
export const MODES=["arcade","coop","waves","memory","rush","blitz","sudden","zen","versus","daily","weekly"];
export function catalogFor(overrides=[],now=Date.now()){
  const map=new Map(base.items.map(item=>[item.id,structuredClone(item)]));
  const diamonds=[...map.values()].filter(item=>item.currency==="diamonds"&&!item.pack);
  if(diamonds.length){const item=diamonds[Math.floor(now/604800000)%diamonds.length];item.originalCost=item.cost;item.cost=Math.floor(item.cost*.7);item.isSale=true;item.salePercent=30;}
  for(const override of overrides){const previous=map.get(override.id);map.set(override.id,{...previous,...override});}
  return [...map.values()];
}
export function equivalent(a,b){
  const entries=Object.entries(a?.apply||{});
  return entries.length>0&&entries.every(([key,value])=>b?.apply?.[key]===value);
}
export function aliases(item,catalog){return catalog.filter(other=>other.id===item.id||equivalent(item,other)).map(i=>i.id);}
export function policyFor(account,item,catalog){
  const rules=account.profile.inventoryRules||{},values=aliases(item,catalog).map(id=>rules[id]);
  return values.includes("locked")?"locked":values.some(Boolean)?"removed":null;
}
export function owns(account,item,catalog,role="player"){
  if(item.pack)return false;if(role==="developer")return true;
  if(policyFor(account,item,catalog))return false;
  const ids=aliases(item,catalog);
  if(role==="moderator"||ids.some(id=>account.profile.purchased.includes(id)||base.starters.includes(id)))return true;
  return base.rules.some(rule=>ids.includes(rule.id)&&(rule.op==="<"?account.stats[rule.stat]<rule.value:account.stats[rule.stat]>=rule.value));
}
export function unequip(account,item,catalog){
  for(const other of catalog.filter(i=>aliases(item,catalog).includes(i.id)))for(const [key,value]of Object.entries(other.apply||{})){
    if(account.profile[key]===value)account.profile[key]=base.defaultProfile[key]??null;
  }
}
function putOwned(account,item,catalog){for(const id of aliases(item,catalog))delete account.profile.inventoryRules[id];account.profile.purchased=[...new Set([...account.profile.purchased,item.id])];}
function takeOwned(account,item,catalog,reason){
  const ids=aliases(item,catalog);account.profile.purchased=account.profile.purchased.filter(id=>!ids.includes(id));
  account.profile.inventoryRules||={};for(const id of ids)account.profile.inventoryRules[id]=reason;unequip(account,item,catalog);
}
export function itemFor(catalog,id){const item=catalog.find(i=>i.id===id);insist(item,"not-found","This item is no longer available.");return item;}
function spend(account,currency,amount){
  int(amount,"Price",100000000);insist(currency==="sparks"||currency==="diamonds","invalid-argument","Unknown currency.");
  insist(account.stats[currency]>=amount,"failed-precondition","Not enough "+(currency==="diamonds"?"Diamonds.":"Sparks."));
  account.stats[currency]-=amount;if(currency==="sparks")account.stats.sparksSpent+=amount;
}
function equip(account,item,catalog,role){
  insist(owns(account,item,catalog,role),"permission-denied","This item is not available in your collection.");
  Object.assign(account.profile,item.apply||{});if(item.tab==="avatars"){account.profile.useGooglePfp=false;account.profile.customPhotoURL=null;}
}
const missionTemplates=[
  {id:"runs",title:"Complete 10 runs",key:"runs",target:10,xp:500,diamonds:5},
  {id:"score",title:"Earn 5,000 points",key:"score",target:5000,xp:1000,diamonds:10},
  {id:"streak",title:"Reach a 30 streak",key:"streak",target:30,xp:800,diamonds:8},
  {id:"perfect",title:"Land 5 perfect hits",key:"perfectHits",target:5,xp:600,diamonds:5},
];
export function refreshMissions(account,now){
  const current=periods(now);account.missions||={};
  for(const [kind,mult,count]of [["daily",1,3],["weekly",5,2],["monthly",20,1]]){
    if(account.missions[kind]?.period===current[kind])continue;
    let seed=[...account.uid+current[kind]].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,0);
    const pool=[...missionTemplates];for(let i=pool.length-1;i>0;i--){seed=(seed*1664525+1013904223)>>>0;const j=seed%(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
    account.missions[kind]={period:current[kind],items:pool.slice(0,count).map(m=>({id:kind+"_"+current[kind]+"_"+m.id,title:m.title.replace(/[\d,]+/,n=>(Number(n.replaceAll(",",""))*mult).toLocaleString("en-US")),type:kind,key:m.key,target:m.target*mult,progress:0,claimed:false,xp:m.xp*mult,diamonds:m.diamonds*mult}))};
  }
}
export function publicPlayer(account,role="player"){
  return {uid:account.uid,name:account.operativeName,searchName:account.operativeName.toLowerCase(),avatarId:account.profile.avatarId,frameId:account.profile.frameId,
    photoURL:role==="developer"?account.profile.customPhotoURL||null:null,role,ownerAccount:!!account.ownerAccount,developerUntil:account.developerUntil||0,level:levelFor(account.stats)};
}
export function accountView(account,role){return {...account,accessRole:role,profile:{...account.profile,accessRole:role,customPhotoURL:role==="developer"?account.profile.customPhotoURL:null,useGooglePfp:role==="developer"&&!!account.profile.useGooglePfp}};}
export function applyAction(original,action,payload,catalog,role,now,extra={}){
  const account=structuredClone(original);account.profile.inventoryRules||={};account.profile.customTitles||=[];
  refreshMissions(account,now);let result={};let message="Saved.";
  switch(action){
    case "purchase":{
      const item=itemFor(catalog,payload.itemId);
      insist(item.active!==false,"failed-precondition","This item is not on sale right now.");
      insist(role==="developer"||policyFor(account,item,catalog)!=="locked","permission-denied","A developer has locked this item for your account.");
      if(owns(account,item,catalog,role)){equip(account,item,catalog,role);message="Equipped "+item.name+".";break;}
      insist(payload.expectedCost===item.cost && payload.expectedCurrency===item.currency,"failed-precondition","The price changed. Review the updated price before buying.");
      insist(!item.unlockOnly,"permission-denied",item.desc||"Earn this item through play.");
      spend(account,item.currency,item.cost);
      if(item.pack){account.stats.diamonds+=int(item.pack.diamonds,"Diamond pack",1000000);message="Exchange complete.";}
      else{putOwned(account,item,catalog);equip(account,item,catalog,role);account.profile.wishlist=(account.profile.wishlist||[]).filter(id=>id!==item.id);message="Unlocked and equipped "+item.name+".";}
      break;
    }
    case "equip":{
      if(typeof payload.itemId==="string"&&payload.itemId.startsWith("custom-title_")){
        const title=account.profile.customTitles.find(t=>t.id===payload.itemId);insist(title,"permission-denied","This title was not assigned to your account.");account.profile.titleId=title.id;
      }else equip(account,itemFor(catalog,payload.itemId),catalog,role);
      message="Equipped.";break;
    }
    case "claimDaily":{
      const today=dayFor(now);
      if(account.daily?.day===today){message="Today’s reward is already claimed.";result.alreadyClaimed=true;break;}
      const yesterday=dayFor(now-86400000),streak=account.daily?.day===yesterday?(account.daily.streak||0)+1:1,cycle=((streak-1)%7)+1;
      const sparks=cycle===7?50:cycle===3?20:10,diamonds=cycle===7?5:0;
      account.daily={day:today,streak,claimedAt:now};account.stats.lastLoginDate=today;account.stats.loginStreak=streak;
      account.stats.sparks+=sparks;account.stats.sparksEarned+=sparks;account.stats.diamonds+=diamonds;
      result.reward={sparks,diamonds,streak};message="Daily reward claimed.";break;
    }
    case "rename":{
      const name=text(payload.name,"Player name",15,2);
      if(name===account.operativeName){message="That is already your name.";break;}
      const used=number(account.nameChangesUsed);
      if(role!=="developer"&&used>=1)spend(account,"diamonds",NAME_CHANGE_COST);
      account.operativeName=name;account.nameChangesUsed=used+1;message="Your name is now "+name+".";break;
    }
    case "recordRun":{
      const run=payload.summary,session=extra.run;
      insist(run&&session&&!session.completedAt,"failed-precondition","This run has already been settled or has expired.");
      insist(MODES.includes(session.mode)&&run.mode===session.mode,"invalid-argument","The run does not match its session.");
      insist(now>=session.startedAt&&now-session.startedAt<=86400000,"failed-precondition","This run session has expired.");
      const hits=int(run.hits,"Hits",100000),misses=int(run.misses,"Misses",100000),score=int(run.score,"Score",100000000);
      const perfectHits=int(run.perfectHits??0,"Perfect hits",hits),streak=int(run.bestStreak,"Streak",hits);
      const seconds=Number(run.playSeconds);
      insist(Number.isFinite(seconds)&&seconds>=0&&seconds<=(now-session.startedAt)/1000+3,"invalid-argument","Run timing is invalid.");
      insist(hits<=seconds*50+20&&score<=hits*50000,"invalid-argument","Run totals are outside the supported limits.");
      const average=number(run.avgReactionMs,0,30000),fastest=number(run.fastestMs,0,30000);
      const gained=score>0?Math.max(1,Math.round(score/8)+Math.floor(streak/4)*3):0;
      const previousStreak=account.stats.bestStreak;
      account.stats.runs++;account.stats.totalScore+=score;account.stats.bestStreak=Math.max(previousStreak,streak);
      if(fastest>0)account.stats.fastestMs=Math.min(account.stats.fastestMs||9999,fastest);
      account.stats.sparks+=gained;account.stats.sparksEarned+=gained;account.stats.hits+=hits;account.stats.misses+=misses;
      account.stats.playSeconds+=seconds;account.stats.reactionTotal+=average*hits;account.stats.reactionCount+=hits;
      account.stats.modeRuns[session.mode]=(account.stats.modeRuns[session.mode]||0)+1;
      const snap={id:session.id,runNumber:account.stats.runs,createdAt:now,date:dayFor(now),mode:session.mode,score,acc:hits+misses?Math.round(hits/(hits+misses)*100):0,sparks:gained,streak,hits,misses,perfectHits,playSeconds:seconds,avgReactionMs:average,fastestMs:fastest,modifierMultiplier:session.multiplier};
      account.stats.history=[snap,...account.stats.history].slice(0,100);
      for(const period of Object.values(account.missions))for(const mission of period.items){
        const value=mission.key==="runs"?1:mission.key==="score"?score:mission.key==="streak"?streak:perfectHits;
        mission.progress=Math.min(mission.target,mission.key==="streak"?Math.max(mission.progress,value):mission.progress+value);
      }
      result.run={...session,completedAt:now,score,streak};result.reward={sparks:gained,xp:score+50+Math.max(0,streak-previousStreak)*10};message="Run rewards saved.";break;
    }
    case "claimLevel":{
      const level=int(payload.level,"Level",100,1),reward=base.levelRewards.find(r=>r.level===level);
      insist(reward&&levelFor(account.stats)>=level,"permission-denied","Reach this level first.");
      if(account.profile.claimedLevels.includes(level)){message="Milestone already claimed.";break;}
      const item=itemFor(catalog,reward.storeItemId);
      insist(policyFor(account,item,catalog)!=="locked","permission-denied","This reward is locked for your account.");
      putOwned(account,item,catalog);account.profile.claimedLevels.push(level);account.stats.diamonds+=reward.diamonds||0;message="Milestone reward added to your collection.";break;
    }
    case "claimAvailableLevels":{
      let count=0;for(const reward of base.levelRewards){if(reward.level>levelFor(account.stats)||account.profile.claimedLevels.includes(reward.level))continue;const item=itemFor(catalog,reward.storeItemId);if(policyFor(account,item,catalog)==="locked")continue;putOwned(account,item,catalog);account.profile.claimedLevels.push(reward.level);account.stats.diamonds+=reward.diamonds||0;count++;}
      message=count?count+" milestone rewards claimed.":"No milestone rewards are ready.";break;
    }
    case "claimMission":{
      const mission=Object.values(account.missions).flatMap(p=>p.items).find(m=>m.id===payload.missionId);
      insist(mission,"not-found","This mission has expired.");
      insist(mission.progress>=mission.target,"failed-precondition","Finish this mission first.");
      if(mission.claimed){message="Mission already claimed.";break;}
      mission.claimed=true;account.stats.bonusXp=(account.stats.bonusXp||0)+mission.xp;account.stats.diamonds+=mission.diamonds;message="Mission rewards claimed.";break;
    }
    case "spin":{
      insist(["free","sparks","diamonds"].includes(payload.currency),"invalid-argument","Choose a spin.");
      if(payload.currency==="free"){insist(now-(account.spin.lastFreeAt||0)>=86400000,"failed-precondition","Your free spin is not ready.");account.spin.lastFreeAt=now;}
      else spend(account,payload.currency,payload.currency==="sparks"?150:5);
      const reward=base.spin[int(extra.spinIndex,"Spin result",base.spin.length-1)];
      if(["sparks","jackpot"].includes(reward.type)){account.stats.sparks+=reward.amount;account.stats.sparksEarned+=reward.amount;}
      if(reward.type==="diamonds")account.stats.diamonds+=reward.amount;
      if(reward.type==="egg")account.incubator.inventory.push({id:extra.randomId,eggType:reward.eggType,obtainedAt:now});
      if(reward.type==="avatar"){
        const item=itemFor(catalog,reward.avatarId);
        if(policyFor(account,item,catalog)==="locked"){account.stats.sparks+=400;account.stats.sparksEarned+=400;}
        else if(owns(account,item,catalog,role)){account.stats.sparks+=400;account.stats.sparksEarned+=400;}
        else putOwned(account,item,catalog);
      }
      account.spin.history=[{label:reward.label+" "+reward.sublabel,at:now},...account.spin.history].slice(0,10);result.spinIndex=extra.spinIndex;message=reward.label+" "+reward.sublabel;break;
    }
    case "buyEgg":{
      const egg=base.eggs[payload.eggType];insist(egg,"invalid-argument","Choose an egg.");
      insist(account.incubator.inventory.length<50,"resource-exhausted","Hatch an egg before buying more.");
      const currency=payload.currency==="diamonds"?"diamonds":"sparks",price=currency==="diamonds"?egg.costDiamonds:egg.costSparks;
      insist(price>0,"invalid-argument","This egg does not use that currency.");spend(account,currency,price);
      account.incubator.inventory.push({id:extra.randomId,eggType:egg.type,obtainedAt:now});message="Egg added.";break;
    }
    case "startEgg":{
      const index=int(payload.pod,"Pod",1),egg=account.incubator.inventory.find(e=>e.id===payload.eggId);
      insist(egg&&!account.incubator.pods[index],"failed-precondition","Choose an egg and an empty pod.");
      account.incubator.inventory=account.incubator.inventory.filter(e=>e.id!==egg.id);
      const durationMs=base.eggs[egg.eggType].durationSeconds*1000;account.incubator.pods[index]={...egg,startedAt:now,durationMs,readyAt:now+durationMs};message="Incubation started.";break;
    }
    case "boostEgg":{
      const pod=account.incubator.pods[int(payload.pod,"Pod",1)];insist(pod&&pod.readyAt>now,"failed-precondition","This pod does not need a boost.");
      spend(account,"sparks",50);pod.readyAt=now;message="Egg is ready.";break;
    }
    case "hatchEgg":{
      const index=int(payload.pod,"Pod",1),pod=account.incubator.pods[index];insist(pod&&pod.readyAt<=now,"failed-precondition","The egg is not ready.");
      account.incubator.pods[index]=null;
      const r=extra.randomUnit;
      if(pod.eggType==="neon"){if(r<.65){const n=200+Math.floor(r/.65*300);account.stats.sparks+=n;account.stats.sparksEarned+=n;message="Hatched "+n+" Sparks.";}else{const n=4+Math.floor((r-.65)/.35*5);account.stats.diamonds+=n;message="Hatched "+n+" Diamonds.";}}
      else{
        const item=itemFor(catalog,pod.eggType==="quantum"?"ani-cipher":"ani-astral");
        const threshold=pod.eggType==="quantum"?.5:.6;
        if(r<threshold){const diamonds=pod.eggType==="quantum"?15+Math.floor(r/threshold*15):50+Math.floor(r/threshold*50),sparks=pod.eggType==="quantum"?0:1500;account.stats.sparks+=sparks;account.stats.sparksEarned+=sparks;account.stats.diamonds+=diamonds;message="Hatched "+diamonds+" Diamonds"+(sparks?" and "+sparks+" Sparks":"")+".";}
        else if(!owns(account,item,catalog,role)&&policyFor(account,item,catalog)!=="locked"){putOwned(account,item,catalog);message="Hatched "+item.name+".";}
        else{const sparks=pod.eggType==="quantum"?800:2000;account.stats.sparks+=sparks;account.stats.sparksEarned+=sparks;message="Avatar unavailable or already owned. Converted to "+sparks+" Sparks.";}
      }
      break;
    }
    case "sendGift":{
      const recipient=structuredClone(extra.recipient),item=itemFor(catalog,payload.itemId);
      insist(recipient&&recipient.uid!==account.uid,"invalid-argument","Choose another player.");
      insist(!item.pack&&owns(account,item,catalog,role),"permission-denied","Only available cosmetics can be gifted.");
      insist(!recipient.profile.purchased.some(id=>aliases(item,catalog).includes(id)),"already-exists","This player already owns that item.");
      insist(policyFor(recipient,item,catalog)!=="locked","permission-denied","This item is locked for the recipient.");
      if(role!=="developer")takeOwned(account,item,catalog,"gifted");
      result.gift={id:extra.randomId,sender:account.uid,recipient:recipient.uid,senderName:account.operativeName,recipientName:recipient.operativeName,itemId:item.id,itemName:item.name,status:"pending",createdAt:now,consumed:role!=="developer"};
      message=role==="developer"?"Gift sent. Your copy is retained.":"Gift sent. The item is held until accepted or returned.";break;
    }
    case "claimGift":case "returnGift":{
      const gift=structuredClone(extra.gift);insist(gift&&gift.status==="pending","failed-precondition","This gift has already been handled.");
      const item=itemFor(catalog,gift.itemId);
      if(action==="claimGift"){
        insist(gift.recipient===account.uid,"permission-denied","This gift is for another player.");
        insist(policyFor(account,item,catalog)!=="locked","permission-denied","This item is locked for your account.");
        insist(!account.profile.purchased.some(id=>aliases(item,catalog).includes(id)),"already-exists","You already own this item. Return the gift instead.");
        putOwned(account,item,catalog);gift.status="claimed";message="Gift added to your collection.";
      }else{
        insist(gift.sender===account.uid||gift.recipient===account.uid,"permission-denied","This gift is private.");
        const sender=gift.sender===account.uid?account:structuredClone(extra.sender);
        insist(sender,"not-found","The sender account is unavailable.");
        if(gift.consumed){
          const wasLocked=policyFor(sender,item,catalog)==="locked";
          putOwned(sender,item,catalog);if(wasLocked)for(const id of aliases(item,catalog))sender.profile.inventoryRules[id]="locked";
        }
        if(sender.uid!==account.uid)result.other=sender;
        gift.status=gift.sender===account.uid?"cancelled":"returned";message="Gift returned to the sender.";
      }
      gift.handledAt=now;result.gift=gift;break;
    }
    case "adminWallet":{
      insist(role==="developer","permission-denied","Developer access required.");
      const target=structuredClone(extra.target);
      insist(target,"not-found","Player not found.");
      for(const key of ["sparks","diamonds"])if(payload[key]!==undefined)target.stats[key]=int(payload[key],key);
      for(const key of ["totalScore","bonusXp","runs","bestStreak"])if(payload[key]!==undefined)target.stats[key]=int(payload[key],key);
      if(payload.charges)for(const key of ["shield","surge","saver"])if(payload.charges[key]!==undefined)target.profile.charges[key]=int(payload.charges[key],key,10000);
      result.target=target;message="Player balances and progression updated.";break;
    }
    case "adminInventory":{
      insist(role==="developer","permission-denied","Developer access required.");
      const target=structuredClone(extra.target),item=itemFor(catalog,payload.itemId);
      insist(target&&!item.pack,"invalid-argument","Choose a player and cosmetic.");
      insist(["grant","remove","lock","unlock"].includes(payload.operation),"invalid-argument","Choose an inventory action.");
      if(payload.operation==="grant")putOwned(target,item,catalog);
      if(["remove","lock"].includes(payload.operation))takeOwned(target,item,catalog,payload.operation==="lock"?"locked":"removed");
      if(payload.operation==="unlock")for(const id of aliases(item,catalog))delete target.profile.inventoryRules[id];
      result.target=target;message="Player inventory updated.";break;
    }
    case "adminRole":{
      insist(role==="developer","permission-denied","Developer access required.");
      const target=structuredClone(extra.target);insist(target,"not-found","Player not found.");
      insist(["player","moderator"].includes(payload.role),"invalid-argument","Choose Player or Moderator.");
      target.role=payload.role;
      if(roleFor(target,!!target.ownerAccount,now)==="player")for(const item of catalog){const fields=Object.entries(item.apply||{});if(fields.length&&fields.every(([key,value])=>target.profile[key]===value)&&!owns(target,item,catalog,"player"))unequip(target,item,catalog);}
      result.target=target;message=payload.role==="moderator"?"Moderator assigned. Current and future store items are available.":"Moderator access removed.";break;
    }
    case "adminTitle":{
      insist(role==="developer","permission-denied","Developer access required.");
      const target=structuredClone(extra.target);insist(target,"not-found","Player not found.");target.profile.customTitles||=[];
      if(payload.removeId){target.profile.customTitles=target.profile.customTitles.filter(t=>t.id!==payload.removeId);if(target.profile.titleId===payload.removeId)target.profile.titleId="rookie";}
      else{insist(target.profile.customTitles.length<30,"resource-exhausted","Remove a title before assigning more.");const title={id:"custom-title_"+extra.randomId,name:text(payload.name,"Title",32),color:/^#[0-9a-f]{6}$/i.test(payload.color)?payload.color:"#a8b7f2",assignedAt:now};target.profile.customTitles.push(title);}
      result.target=target;message="Player-specific titles updated.";break;
    }
    case "revokeDeveloper":{
      insist(role==="developer","permission-denied","Developer access required.");
      const target=structuredClone(extra.target);insist(target,"not-found","Player not found.");target.developerUntil=0;result.target=target;message="Password-based developer session revoked.";break;
    }
    default:throw new DomainError("invalid-argument","Unknown action.");
  }
  account.updatedAt=now;account.revision=(account.revision||0)+1;
  for(const key of ["other","target"])if(result[key]){result[key].updatedAt=now;result[key].revision=(result[key].revision||0)+1;}
  if(result.target?.uid===account.uid){result.account=result.target;delete result.target;}else result.account=account;
  return {...result,message};
}
export function validateCatalogItem(input,existing){
  const id=existing?.id||text(input.id,"Item ID",80);
  insist(/^[a-z0-9][a-z0-9_-]{1,79}$/.test(id),"invalid-argument","Use a lowercase item ID with letters, numbers and hyphens.");
  insist(!id.startsWith("custom-title_"),"invalid-argument","This prefix is reserved for player-specific titles.");
  const tab=existing?.tab||input.tab;
  insist(["avatars","banners","frames","titles","themes","styles","audio",...(existing?.pack?["diamonds"]:[])].includes(tab),"invalid-argument","Choose a supported category.");
  const value={...existing,id,tab,name:text(input.name??existing?.name,"Item name",48),desc:text(input.desc??existing?.desc??"A custom Vector item.","Description",240),
    cost:int(input.cost??existing?.cost??0,"Price",100000000),currency:input.currency??existing?.currency??"sparks",rarity:input.rarity??existing?.rarity??"rare",active:input.active!==false};
  if(existing?.pack)insist(value.currency==="sparks","invalid-argument","Diamond exchanges must be priced in Sparks.");
  insist(["sparks","diamonds"].includes(value.currency),"invalid-argument","Choose Sparks or Diamonds.");
  insist(["common","rare","epic","ultra"].includes(value.rarity),"invalid-argument","Choose a rarity.");
  if(input.cost!==undefined){delete value.originalCost;delete value.salePercent;delete value.isSale;}
  const color=c=>typeof c==="string"&&/^#[0-9a-f]{6}$/i.test(c);
  if(!existing){
    if(tab==="avatars"){insist(typeof input.photo==="string"&&(input.photo.startsWith("https://")||input.photo.startsWith("http://")||input.photo.startsWith("data:image/")),"invalid-argument","Upload an avatar image first.");value.photo=input.photo;value.apply={avatarId:id};}
    if(tab==="themes"){insist(Array.isArray(input.themeSwatch)&&input.themeSwatch.length===3&&input.themeSwatch.every(color),"invalid-argument","Choose three theme colors.");value.themeSwatch=input.themeSwatch;value.apply={arenaThemeId:id};}
    if(tab==="banners"){insist(color(input.from)&&color(input.to),"invalid-argument","Choose two banner colors.");value.preview="linear-gradient(120deg,"+input.from+","+input.to+")";value.apply={bannerId:id};}
    if(tab==="frames"){insist(color(input.color),"invalid-argument","Choose a frame color.");value.frameCss="0 0 0 3px "+input.color+", 0 0 16px "+input.color+"66";value.apply={frameId:id};}
    if(tab==="titles")value.apply={titleId:id};
    if(tab==="styles"){insist(["waves","grid","orbits","rays","dots","plain"].includes(input.pattern),"invalid-argument","Choose a pattern.");value.pattern=input.pattern;value.apply={bannerStyle:input.pattern};}
    if(tab==="audio"){insist(["retro","ethereal","cyber","zen"].includes(input.audioPackId),"invalid-argument","Choose a supported audio engine.");value.apply={audioPackId:input.audioPackId};}
  }else{
    if(tab==="themes"&&input.themeSwatch){insist(input.themeSwatch.length===3&&input.themeSwatch.every(color),"invalid-argument","Choose three theme colors.");value.themeSwatch=input.themeSwatch;}
    if(tab==="avatars"&&input.photo){insist(typeof input.photo==="string"&&(input.photo.startsWith("https://")||input.photo.startsWith("http://")||input.photo.startsWith("data:image/")),"invalid-argument","Upload a valid image.");value.photo=input.photo;delete value.hero;delete value.anime;delete value.cartoon;}
  }
  return value;
}
