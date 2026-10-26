import test from "node:test";
import assert from "node:assert/strict";
import { base,newAccount,catalogFor,owns,applyAction,roleFor,validateCatalogItem,dayFor,DomainError } from "../src/domain.mjs";
import { xpForLevel,levelFor } from "../src/progression.mjs";
const NOW=Date.parse("2026-10-25T12:00:00Z"),catalog=catalogFor([],NOW);
const create=(id="player-a",seed={})=>newAccount({uid:id,email:id+"@example.com",displayName:id},seed,NOW);
function act(a,action,payload={},role="player",extra={},now=NOW){return applyAction(a,action,payload,catalog,role,now,{randomId:"operation-123",randomUnit:.8,spinIndex:0,...extra});}
const item=catalog.find(i=>i.id==="hero-spider");
const buy=(a,i=item)=>act(a,"purchase",{itemId:i.id,expectedCost:i.cost,expectedCurrency:i.currency});
test("migration never imports privileged fields or duplicate ownership",()=>{
 const a=create("member",{stats:{sparks:1200,diamonds:20,lastLoginDate:"2026-10-25"},profile:{purchased:["hero-spider","hero-spider","unknown"],accessRole:"developer",inventoryRules:{},customTitles:[{id:"fake"}]},role:"developer",developerUntil:Infinity});
 assert.equal(a.role,"player");assert.equal(a.developerUntil,0);assert.equal(a.profile.customTitles.length,0);assert.deepEqual(a.profile.purchased,["hero-spider"]);assert.equal(a.daily.day,"2026-10-25");
});
test("purchases use the server price and cannot charge twice for an owned cosmetic",()=>{
 let a=create();a.stats.sparks=1000;let r=buy(a);assert.equal(r.account.stats.sparks,500);assert.equal(r.account.profile.avatarId,"hero-spider");
 r=buy(r.account);assert.equal(r.account.stats.sparks,500);assert.equal(a.stats.sparks,1000);
 assert.throws(()=>act(a,"purchase",{itemId:item.id,expectedCost:1,expectedCurrency:"sparks"}),/price changed/);
});
test("insufficient funds and negative prices are rejected",()=>{
 const a=create();assert.throws(()=>buy(a),/Not enough/);
 assert.throws(()=>validateCatalogItem({id:"test-new",name:"Test",desc:"Test item",tab:"titles",cost:-1}),/range/);
});
test("one daily reward survives reload, repeated calls and repeated domain actions",()=>{
 const a=create();const first=act(a,"claimDaily");assert.equal(first.account.stats.sparks,10);
 const again=act(first.account,"claimDaily");assert.equal(again.account.stats.sparks,10);assert.equal(again.alreadyClaimed,true);
 const migrated=create("migrated",{stats:{sparks:55,lastLoginDate:"2026-10-25",loginStreak:3}});assert.equal(act(migrated,"claimDaily").account.stats.sparks,55);
});
test("daily streak cycle awards a seventh-day bonus once at UTC midnight",()=>{
 const a=create();a.daily={day:"2026-10-24",streak:6};
 const r=act(a,"claimDaily");assert.deepEqual(r.reward,{sparks:50,diamonds:5,streak:7});assert.equal(act(r.account,"claimDaily").account.stats.diamonds,5);
 const next=act(r.account,"claimDaily",{},"player",{},Date.parse("2026-10-26T00:00:00Z"));assert.equal(next.reward.streak,8);assert.equal(next.reward.sparks,10);
});
test("first account name change is free, subsequent changes cost 100 Diamonds",()=>{
 const a=create();a.stats.diamonds=150;const first=act(a,"rename",{name:"First Name"}).account;
 assert.equal(first.stats.diamonds,150);assert.equal(first.nameChangesUsed,1);
 const second=act(first,"rename",{name:"Second Name"}).account;assert.equal(second.stats.diamonds,50);assert.equal(second.nameChangesUsed,2);
 assert.throws(()=>act(second,"rename",{name:"Third Name"}),/Not enough/);
 const same=act(second,"rename",{name:"Second Name"}).account;assert.equal(same.nameChangesUsed,2);
});
test("developer names are unlimited but a forged payload role grants nothing",()=>{
 let a=create();a=act(a,"rename",{name:"Owner One"},"developer").account;a=act(a,"rename",{name:"Owner Two"},"developer").account;assert.equal(a.stats.diamonds,0);
 assert.throws(()=>act(a,"adminWallet",{role:"developer",sparks:999999},"player",{target:a}),/Developer/);
 assert.equal(roleFor({...a,role:"developer"},false,NOW),"player");assert.equal(roleFor(a,true,NOW),"developer");
});
test("password developer sessions expire and moderator roles remain limited",()=>{
 const a=create();a.role="moderator";a.developerUntil=NOW+1000;
 assert.equal(roleFor(a,false,NOW),"developer");assert.equal(roleFor(a,false,NOW+1001),"moderator");
 assert.throws(()=>act(a,"adminRole",{role:"moderator"},"moderator",{target:create("other")}),/Developer/);
});
test("moderators receive current and future items, except explicit restrictions",()=>{
 const a=create();const future=validateCatalogItem({id:"custom-future",name:"Future",desc:"A new title",tab:"titles",cost:200});
 assert.equal(owns(a,item,catalog,"moderator"),true);assert.equal(owns(a,future,[...catalog,future],"moderator"),true);
 a.profile.inventoryRules[item.id]="locked";assert.equal(owns(a,item,catalog,"moderator"),false);
});
test("remove forces a new purchase; lock blocks buys, gifts and earned unlocks",()=>{
 const admin=create("admin"),target=create("target");target.profile.purchased=[item.id];target.stats.sparks=1000;
 const removed=act(admin,"adminInventory",{itemId:item.id,operation:"remove"},"developer",{target}).target;
 assert.equal(owns(removed,item,catalog,"player"),false);assert.equal(buy(removed).account.stats.sparks,500);
 const locked=act(admin,"adminInventory",{itemId:item.id,operation:"lock"},"developer",{target}).target;
 assert.throws(()=>buy(locked),/locked/);assert.throws(()=>act(locked,"sendGift",{itemId:item.id},"player",{recipient:create("receiver")}),/available cosmetics/);
 const restored=act(admin,"adminInventory",{itemId:item.id,operation:"grant"},"developer",{target:locked}).target;assert.equal(owns(restored,item,catalog),true);
});
test("a gift removes and unequips the sender's item until accepted or returned",()=>{
 const sender=create("sender"),recipient=create("recipient");sender.profile.purchased=[item.id];sender.profile.avatarId="hero-spider";
 const sent=act(sender,"sendGift",{itemId:item.id},"player",{recipient});
 assert.equal(owns(sent.account,item,catalog),false);assert.notEqual(sent.account.profile.avatarId,"hero-spider");
 const received=act(recipient,"claimGift",{},"player",{gift:sent.gift});
 assert.equal(owns(received.account,item,catalog),true);assert.equal(received.gift.status,"claimed");
 assert.throws(()=>act(recipient,"claimGift",{},"player",{gift:received.gift}),/already been handled/);
});
test("returning or cancelling a gift restores exactly the consumed copy",()=>{
 const sender=create("sender"),recipient=create("recipient");sender.profile.purchased=[item.id];
 const sent=act(sender,"sendGift",{itemId:item.id},"player",{recipient});
 const returned=act(recipient,"returnGift",{},"player",{gift:sent.gift,sender:sent.account});
 assert.equal(owns(returned.other,item,catalog),true);assert.equal(returned.gift.status,"returned");
 assert.throws(()=>act(recipient,"returnGift",{},"player",{gift:returned.gift,sender:returned.other}),/already/);
});
test("developer gifting retains ownership, whereas moderator gifting consumes access",()=>{
 const a=create("staff"),recipient=create("recipient");
 const dev=act(a,"sendGift",{itemId:item.id},"developer",{recipient});assert.equal(dev.gift.consumed,false);assert.equal(owns(dev.account,item,catalog,"developer"),true);
 const mod=act(a,"sendGift",{itemId:item.id},"moderator",{recipient});assert.equal(mod.gift.consumed,true);assert.equal(owns(mod.account,item,catalog,"moderator"),false);
});
test("gifts cannot be claimed by another player or bypass recipient locks",()=>{
 const sender=create("sender"),recipient=create("recipient");sender.profile.purchased=[item.id];
 const sent=act(sender,"sendGift",{itemId:item.id},"player",{recipient});
 assert.throws(()=>act(create("intruder"),"claimGift",{},"player",{gift:sent.gift}),/another player/);
 recipient.profile.inventoryRules[item.id]="locked";assert.throws(()=>act(recipient,"claimGift",{},"player",{gift:sent.gift}),/locked/);
});
test("exclusive titles stay account-specific and are not store items",()=>{
 const admin=create("admin"),target=create("target");
 const assigned=act(admin,"adminTitle",{name:"The Original",color:"#ffcc66"},"developer",{target}).target;
 const id=assigned.profile.customTitles[0].id;assert.ok(id.startsWith("custom-title_"));assert.ok(!catalog.some(i=>i.id===id));
 assert.equal(act(assigned,"equip",{itemId:id}).account.profile.titleId,id);
 assert.throws(()=>act(create("other"),"equip",{itemId:id}),/not assigned/);
});
test("run settlement calculates rewards, precision and mission progress on the server",()=>{
 const a=create(),run={id:"run-12345678",uid:a.uid,mode:"arcade",bucket:"arcade",startedAt:NOW-10000,multiplier:1};
 const r=act(a,"recordRun",{summary:{mode:"arcade",score:500,hits:20,misses:5,perfectHits:8,bestStreak:10,playSeconds:8,avgReactionMs:300,fastestMs:200}},"player",{run});
 assert.equal(r.account.stats.runs,1);assert.equal(r.account.stats.history[0].acc,80);assert.equal(r.account.stats.sparks,Math.round(500/8)+6);assert.ok(r.reward.xp>0);
 assert.throws(()=>act(a,"recordRun",{summary:{mode:"arcade",score:500,hits:0,misses:1,bestStreak:0,playSeconds:1}},"player",{run}),/totals/);
 assert.throws(()=>act(a,"recordRun",{summary:{mode:"arcade"}},"player",{run:{...run,completedAt:NOW}}),/already/);
});
test("the level curve is monotonic, begins at 500 XP, and every milestone exists",()=>{
 assert.equal(xpForLevel(1),500);for(let level=1;level<=100;level++)assert.ok(xpForLevel(level)>xpForLevel(level-1));
 assert.equal(base.levelRewards.length,100);for(const reward of base.levelRewards)assert.ok(base.items.some(i=>i.id===reward.storeItemId));
 const a=create();a.stats.totalScore=xpForLevel(3);const r=act(a,"claimAvailableLevels");assert.equal(r.account.profile.claimedLevels.length,3);
 const repeat=act(r.account,"claimAvailableLevels");assert.equal(repeat.account.profile.claimedLevels.length,3);
});
test("egg purchase chooses one currency, and an empty pod never charges a boost",()=>{
 const a=create();a.stats.sparks=1000;a.stats.diamonds=30;
 const sparks=act(a,"buyEgg",{eggType:"quantum",currency:"sparks"}).account;assert.equal(sparks.stats.sparks,250);assert.equal(sparks.stats.diamonds,30);
 const gems=act(a,"buyEgg",{eggType:"quantum",currency:"diamonds"}).account;assert.equal(gems.stats.sparks,1000);assert.equal(gems.stats.diamonds,20);
 assert.throws(()=>act(a,"boostEgg",{pod:0}),/does not need/);assert.equal(a.stats.sparks,1000);
});
test("hatching clears a pod before any repeated collection",()=>{
 const a=create();const started=act(a,"startEgg",{pod:0,eggId:"welcome-egg"}).account;
 const ready=act(started,"hatchEgg",{pod:0},"player",{},NOW+21000);assert.equal(ready.account.incubator.pods[0],null);
 assert.throws(()=>act(ready.account,"hatchEgg",{pod:0},"player",{},NOW+21001),/not ready/);
});
test("catalog edits validate prices and do not grant custom account fields",()=>{
 const v=validateCatalogItem({id:"custom-night",name:"Night",desc:"A new title",tab:"titles",cost:100,currency:"diamonds",role:"developer",apply:{role:"developer"}});
 assert.equal(v.cost,100);assert.deepEqual(v.apply,{titleId:"custom-night"});assert.equal(v.role,undefined);
 assert.throws(()=>validateCatalogItem({id:"custom-theme",name:"Theme",desc:"Color set",tab:"themes",cost:10,themeSwatch:["red","blue","green"]}),/three theme colors/);
 const changed=validateCatalogItem({name:item.name,desc:item.desc,cost:25,currency:"diamonds"},item);assert.equal(changed.id,item.id);assert.equal(changed.cost,25);
});

test("migration preserves legacy colors and known live catalog purchases",()=>{
 const custom={id:"custom-migration",tab:"titles",apply:{titleId:"custom-migration"},cost:10,currency:"sparks"};
 const a=newAccount({uid:"migration-colors"},{profile:{purchased:[custom.id],customAvatar:{glyph:"V",from:"#112233",to:"javascript:x"},customBanner:{from:"#334455",to:"#556677",pattern:"grid"}}},NOW,[...catalog,custom]);
 assert.ok(a.profile.purchased.includes(custom.id));assert.equal(a.profile.customAvatar.from,"#112233");assert.notEqual(a.profile.customAvatar.to,"javascript:x");assert.equal(a.profile.customBanner.pattern,"grid");
 assert.throws(()=>validateCatalogItem({id:"custom-title_reserved",name:"Reserved",desc:"Reserved title",tab:"titles",cost:1}),/reserved/);
});

test("demotion removes virtual moderator equipment but preserves paid items",()=>{
 const actor=create('developer'),target=create('moderator-target');target.role='moderator';target.profile.avatarId=item.apply.avatarId;
 const removed=act(actor,'adminRole',{role:'player'},'developer',{target}).target;assert.equal(removed.profile.avatarId,base.defaultProfile.avatarId);
 target.profile.purchased=[item.id];const kept=act(actor,'adminRole',{role:'player'},'developer',{target}).target;assert.equal(kept.profile.avatarId,item.apply.avatarId);
});
