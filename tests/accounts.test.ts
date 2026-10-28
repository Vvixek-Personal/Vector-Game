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

test('developer validateCatalogItem and applyCatalogItem publish store items to runtime catalog and frames/banners/titles', async () => {
  const { validateCatalogItem, applyAction } = await import("../functions/src/domain.mjs");
  const { applyCatalogItem } = await import("../src/firebase/catalog");
  const { STORE_ITEMS } = await import("../src/game/catalog");
  const { FRAMES, BANNERS, TITLES } = await import("../src/game/profile");

  // 1. Theme creation
  const themeItem = validateCatalogItem({
    id: "custom-theme-test",
    name: "Cyber Neon",
    desc: "A futuristic electric arena.",
    tab: "themes",
    cost: 1200,
    currency: "sparks",
    rarity: "epic",
    themeSwatch: ["#38e8ff", "#0a061b", "#7c5cff"],
    active: true,
  });
  assert.equal(themeItem.apply?.arenaThemeId, "custom-theme-test");
  assert.deepEqual(themeItem.themeSwatch, ["#38e8ff", "#0a061b", "#7c5cff"]);

  // 2. Banner creation
  const bannerItem = validateCatalogItem({
    id: "custom-banner-test",
    name: "Cosmic Glow",
    desc: "Dual cosmic wash.",
    tab: "banners",
    cost: 800,
    currency: "sparks",
    rarity: "rare",
    from: "#26386b",
    to: "#8f5f9e",
    active: true,
  });
  assert.equal(bannerItem.apply?.bannerId, "custom-banner-test");
  assert.ok(bannerItem.preview?.includes("linear-gradient"));

  // 3. Avatar creation with data URI
  const avatarItem = validateCatalogItem({
    id: "custom-avatar-test",
    name: "Neon Ace",
    desc: "Exclusive vector avatar.",
    tab: "avatars",
    cost: 50,
    currency: "diamonds",
    rarity: "ultra",
    photo: "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAkA4JaQAA3AA/vsNAAA=",
    active: true,
  });
  assert.equal(avatarItem.apply?.avatarId, "custom-avatar-test");

  // 4. Apply catalog item publishes to STORE_ITEMS, BANNERS, TITLES, and FRAMES
  applyCatalogItem(themeItem as any);
  applyCatalogItem(bannerItem as any);
  applyCatalogItem(avatarItem as any);

  assert.ok(STORE_ITEMS.some(i => i.id === "custom-theme-test"));
  assert.ok(STORE_ITEMS.some(i => i.id === "custom-banner-test"));
  assert.ok(STORE_ITEMS.some(i => i.id === "custom-avatar-test"));
  assert.ok(BANNERS.some(b => b.id === "custom-banner-test"));

  // 5. Developer admin actions: wallet, inventory, custom title
  const devAccount = newAccount({ uid: "developer-user", email: "personal.me.vivek@gmail.com" }, {}, Date.now());
  const targetPlayer = newAccount({ uid: "target-player-1", email: "player@example.com" }, {}, Date.now());
  
  // adminWallet
  const walletResult = applyAction(devAccount, "adminWallet", {
    userId: "target-player-1",
    sparks: 9999,
    diamonds: 500,
    bonusXp: 1200,
    charges: { shield: 10, surge: 5, saver: 5 },
  }, STORE_ITEMS, "developer", Date.now(), { target: structuredClone(targetPlayer) });
  assert.equal(walletResult.target.stats.sparks, 9999);
  assert.equal(walletResult.target.stats.diamonds, 500);
  assert.equal(walletResult.target.profile.charges.shield, 10);

  // adminInventory grant and lock
  const grantResult = applyAction(devAccount, "adminInventory", {
    userId: "target-player-1",
    itemId: "custom-theme-test",
    operation: "grant",
  }, STORE_ITEMS, "developer", Date.now(), { target: structuredClone(targetPlayer) });
  assert.ok(grantResult.target.profile.purchased.includes("custom-theme-test"));

  const lockResult = applyAction(devAccount, "adminInventory", {
    userId: "target-player-1",
    itemId: "custom-theme-test",
    operation: "lock",
  }, STORE_ITEMS, "developer", Date.now(), { target: structuredClone(targetPlayer) });
  assert.equal(lockResult.target.profile.inventoryRules["custom-theme-test"], "locked");

  // adminTitle
  const titleResult = applyAction(devAccount, "adminTitle", {
    userId: "target-player-1",
    name: "Grand Champion",
    color: "#ff0077",
  }, STORE_ITEMS, "developer", Date.now(), { target: structuredClone(targetPlayer), randomId: "title-1" });
  assert.ok(titleResult.target.profile.customTitles.some((t: any) => t.name === "Grand Champion" && t.color === "#ff0077"));
});


test('developer verifier accepts only an explicitly supplied salted PBKDF2 record', async () => {
  const { pbkdf2Sync } = await import("node:crypto");
  const { verifyMasterKeyHash, MASTER_KEY_MIN_LENGTH, MASTER_KEY_MAX_LENGTH } = await import("../functions/src/master-key.mjs");
  const password = "test-only-password";
  const salt = "00112233445566778899aabbccddeeff";
  const hash = pbkdf2Sync(password, Buffer.from(salt, "hex"), 10000, 32, "sha256").toString("hex");
  const record = "pbkdf2-sha256$10000$" + salt + "$" + hash;
  assert.equal(MASTER_KEY_MIN_LENGTH, 8);
  assert.equal(MASTER_KEY_MAX_LENGTH, 256);
  assert.equal(await verifyMasterKeyHash(password, record), true);
  assert.equal(await verifyMasterKeyHash("wrong-test-password", record), false);
  assert.equal(await verifyMasterKeyHash(password, ""), false);
  assert.equal(await verifyMasterKeyHash(password, "pbkdf2-sha256$150000$00$00"), false);
});
