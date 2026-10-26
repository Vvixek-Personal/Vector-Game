import test from "node:test";
import assert from "node:assert/strict";
import { loadProfile } from "../src/game/profile";
import { safeStorage, setSaveScope } from "../src/game/persistence";
import { newAccount, base, dayFor } from "../functions/src/domain.mjs";
test("guest and multiple account saves stay isolated across repeated sign-outs",()=>{
  const key="qa-save-"+Date.now();setSaveScope("guest");safeStorage.setItem(key,"guest progress");
  setSaveScope("player-a");assert.equal(safeStorage.getItem(key),null);safeStorage.setItem(key,"A progress");
  setSaveScope("player-b");assert.equal(safeStorage.getItem(key),null);safeStorage.setItem(key,"B progress");
  setSaveScope("player-a");assert.equal(safeStorage.getItem(key),"A progress");
  setSaveScope("guest");assert.equal(safeStorage.getItem(key),"guest progress");
  setSaveScope("player-b");assert.equal(safeStorage.getItem(key),"B progress");safeStorage.removeItem(key);
  setSaveScope("guest");
});
test("legacy migration preserves earned avatars, hatchery and spin cooldown",()=>{
  const now=Date.UTC(2026,9,25,12),seed={stats:{sparks:250,diamonds:6,lastLoginDate:"2026-10-25",loginStreak:4},profile:{purchased:["shop-comet"],claimedLevels:[1,2],avatarId:"comet"},spin:{lastFreeAt:now-1000,history:["50 Sparks"]},incubator:{inventory:[{id:"egg-legacy",eggType:"solar",obtainedAt:now-2000}],pods:[{id:"pod-legacy",eggType:"quantum",readyAt:now+5000},null]}};
  const account=newAccount({uid:"legacy-player"},seed,now);
  assert.ok(account.profile.purchased.includes("earned-comet"));assert.equal(account.profile.avatarId,"comet");
  assert.deepEqual(account.profile.claimedLevels,[1,2]);assert.equal(account.daily.day,dayFor(now));
  assert.equal(account.spin.lastFreeAt,now-1000);assert.equal(account.incubator.inventory[0].eggType,"solar");
  assert.equal(account.incubator.pods[0].readyAt,now+5000);assert.ok(base.items.find(i=>i.id==="earned-comet"));
});
test("legacy future local calendar date cannot trigger a second UTC daily claim",()=>{
  const now=Date.UTC(2026,9,25,23),account=newAccount({uid:"timezone-player"},{stats:{lastLoginDate:"2026-10-26",loginStreak:3}},now);
  assert.equal(account.daily.day,"2026-10-25");
});

test('dynamic equipped frame and title survive before their catalog metadata arrives',()=>{
  setSaveScope('dynamic-catalog-test');safeStorage.setItem('vector_profile_v5',JSON.stringify({frameId:'custom-new-frame',titleId:'custom-new-title',purchased:['custom-new-frame','custom-new-title']}));
  assert.equal(loadProfile().frameId,'custom-new-frame');assert.equal(loadProfile().titleId,'custom-new-title');setSaveScope('guest');
});
