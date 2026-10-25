import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HeroAvatar from "../src/components/HeroAvatar";
import { HERO_CHARACTERS } from "../src/game/characters";
import { STORE_ITEMS } from "../src/game/catalog";
import { DEFAULT_PROFILE, loadProfile, saveProfile, avatarFor } from "../src/game/profile";
import { safeStorage } from "../src/game/persistence";
import { loadStats, saveStats, loadScores, type ScoreEntry } from "../src/game/storage";
import { filterStoreItems, ownsStoreItem, transactStoreItem, type StoreFilters } from "../src/game/store";
import { rankRecords, pointsToNextPlace, deviceScoreRows, challengeWindow, validBoardMode } from "../src/game/scoreboard";
import type { LeaderboardRecord } from "../src/firebase/leaderboard";

beforeEach(() => { for (const key of ["vector_stats_v5", "vector_profile_v5", "vector_scores_v5"]) safeStorage.removeItem(key); });
const filters: StoreFilters = { view: "browse", tab: "all", query: "", currency: "all", rarity: "all", affordable: false, sort: "featured" };
test("starter cosmetics can be equipped without paying", () => {
  saveStats({ ...loadStats(), sparks: 1000 });
  const result = transactStoreItem("av-spark", "buy");
  assert.equal(result.ok, true); assert.equal(loadStats().sparks, 1000);
  assert.equal(loadProfile().avatarId, "spark");
});
test("a hero purchase persists once, removes its wish, and restores the character", () => {
  saveStats({ ...loadStats(), sparks: 1500 });
  saveProfile({ ...structuredClone(DEFAULT_PROFILE), useGooglePfp: true, wishlist: ["hero-spider", "hero-iron"] });
  assert.equal(transactStoreItem("hero-spider", "buy").ok, true);
  assert.equal(loadStats().sparks, 1000); assert.equal(loadStats().sparksSpent, 500);
  assert.equal(loadProfile().avatarId, "hero-spider"); assert.equal(loadProfile().useGooglePfp, false);
  assert.deepEqual(loadProfile().wishlist, ["hero-iron"]); assert.equal(avatarFor(loadProfile()).hero, "hero-spider");
  assert.equal(transactStoreItem("hero-spider", "buy").ok, true);
  assert.equal(loadStats().sparks, 1000); assert.equal(loadProfile().purchased.filter(id => id === "hero-spider").length, 1);
});
test("unaffordable and unowned equipment never grants a cosmetic", () => {
  saveStats({ ...loadStats(), sparks: 499 });
  assert.equal(transactStoreItem("hero-spider", "buy").ok, false);
  assert.equal(transactStoreItem("hero-spider", "equip").ok, false);
  assert.equal(loadStats().sparks, 499); assert.equal(loadProfile().avatarId, "spark");
  assert.equal(transactStoreItem("unknown", "buy").ok, false);
});
test("diamond purchases do not spend Sparks", () => {
  const item = STORE_ITEMS.find(item => item.id === "ani-astral")!;
  saveStats({ ...loadStats(), sparks: 1200, diamonds: 100 });
  assert.equal(transactStoreItem(item.id, "buy").ok, true);
  assert.equal(loadStats().sparks, 1200); assert.equal(loadStats().diamonds, 100 - item.cost);
});
test("legacy ownership and earned cosmetics prevent a second charge", () => {
  const stats = { ...loadStats(), runs: 3, sparks: 1000 }; saveStats(stats);
  saveProfile({ ...structuredClone(DEFAULT_PROFILE), purchased: ["shop-pulse"] });
  assert.equal(ownsStoreItem(STORE_ITEMS.find(item => item.id === "frm-pulse")!, loadProfile(), stats), true);
  assert.equal(transactStoreItem("frm-pulse", "buy").ok, true);
  assert.equal(transactStoreItem("frm-ring", "equip").ok, true);
  assert.equal(loadStats().sparks, 1000);
});
test("exchanges show the new balance and reject insufficient funds", () => {
  saveStats({ ...loadStats(), sparks: 10500, diamonds: 3 });
  assert.equal(transactStoreItem("dia-100", "buy").ok, true);
  assert.equal(loadStats().sparks, 500); assert.equal(loadStats().diamonds, 103);
  assert.equal(transactStoreItem("dia-100", "buy").ok, false);
  assert.equal(loadStats().diamonds, 103);
});
test("store search uses all words and filters by ownership, price and currency", () => {
  const profile = { ...structuredClone(DEFAULT_PROFILE), wishlist: ["hero-spider", "hero-iron"] };
  const stats = { ...loadStats(), sparks: 600, diamonds: 0 };
  assert.deepEqual(filterStoreItems(STORE_ITEMS, profile, stats, { ...filters, query: "friendly NEIGHBORHOOD" }).map(i => i.id), ["hero-spider"]);
  assert.deepEqual(filterStoreItems(STORE_ITEMS, profile, stats, { ...filters, view: "wishlist", affordable: true }).map(i => i.id), ["hero-spider"]);
  const sorted = filterStoreItems(STORE_ITEMS, profile, stats, { ...filters, sort: "price-low" });
  const firstDiamond = sorted.findIndex(item => item.currency === "diamonds");
  assert.ok(firstDiamond > 0); assert.ok(sorted.slice(firstDiamond).every(item => item.currency === "diamonds"));
  assert.ok(sorted.slice(0,firstDiamond).every((item,i,arr)=>i===0||item.cost >= arr[i-1].cost));
});
test("wishlist and favorite mode saves remove duplicates and invalid IDs", () => {
  safeStorage.setItem("vector_profile_v5", JSON.stringify({ ...DEFAULT_PROFILE, wishlist: ["hero-spider", "missing", "hero-spider", "dia-100", 3], favoriteModes: ["practice", "arcade", "missing", "practice", null] }));
  assert.deepEqual(loadProfile().wishlist, ["hero-spider"]); assert.deepEqual(loadProfile().favoriteModes, ["practice", "arcade"]);
});
test("all eight character portraits render valid SVGs and exist in the catalog", () => {
  assert.equal(HERO_CHARACTERS.length, 8); assert.equal(new Set(HERO_CHARACTERS.map(h=>h.id)).size, 8);
  for (const hero of HERO_CHARACTERS) {
    const svg = renderToStaticMarkup(createElement(HeroAvatar,{id:hero.id}));
    assert.match(svg, /<svg/); assert.ok(svg.includes('data-character="' + hero.id + '"')); assert.ok(!svg.includes("undefined"));
    assert.equal(STORE_ITEMS.find(item => item.id === hero.id)?.apply?.avatarId, hero.id);
  }
});
function record(id: string, score: number): LeaderboardRecord { return { id, userId:id, userName:id, level:1, mode:"arcade", score, streak:4 }; }
test("tied scores share competition places without changing the input", () => {
  const input = [record("B",100),record("A",100),record("C",80),record("bad",NaN)];
  const ranked = rankRecords(input);
  assert.deepEqual(ranked.map(r=>[r.id,r.rank]), [["A",1],["B",1],["C",3]]);
  assert.equal(input[0].id,"B"); assert.equal(input.length,4);
});
test("the next target skips tied players and calculates points needed to pass", () => {
  const records=rankRecords([record("A",100),record("B",80),record("C",80),record("D",60)]);
  assert.equal(pointsToNextPlace(records,"C"),21); assert.equal(pointsToNextPlace(records,"A"),null);
  assert.equal(pointsToNextPlace(records,"absent"),null);
});
test("device overview uses one real best per mode and excludes practice", () => {
  const scores: Record<string,ScoreEntry[]>={arcade:[{score:120,name:"Ace",date:"Today"},{score:50,name:"Ace",date:"Yesterday"}],blitz:[{score:80,name:"Ace",date:"Today"}],practice:[{score:99999,name:"Ace",date:"Today"}]};
  const rows=deviceScoreRows("overall",mode=>scores[mode]??[]);
  assert.deepEqual(rows.map(r=>[r.mode,r.score]),[["arcade",120],["blitz",80]]);
  assert.equal(rows[0].savedCount,2); assert.equal(deviceScoreRows("arcade",mode=>scores[mode]??[]).length,2);
  assert.equal(validBoardMode("practice"),"overall");
});
test("challenge resets match UTC midnight and the existing Jan-1 weekly buckets", () => {
  assert.equal(challengeWindow("daily",Date.parse("2026-10-25T23:59:00Z"))?.resetsAt,Date.parse("2026-10-26T00:00:00Z"));
  assert.equal(challengeWindow("weekly",Date.parse("2026-10-25T19:00:00Z"))?.resetsAt,Date.parse("2026-10-29T00:00:00Z"));
  assert.equal(challengeWindow("weekly",Date.parse("2026-10-26T00:00:00Z"))?.resetsAt,Date.parse("2026-10-29T00:00:00Z"));
  assert.equal(challengeWindow("weekly",Date.parse("2026-12-31T23:59:00Z"))?.resetsAt,Date.parse("2027-01-01T00:00:00Z"));
  assert.equal(challengeWindow("arcade"),null);
});
test("malformed saved score rows do not break the scoreboard", () => {
  safeStorage.setItem("vector_scores_v5",JSON.stringify({arcade:[null,{}, {score:-1},{score:1.5},{score:150,name:{bad:true},date:{bad:true}}]}));
  assert.equal(loadScores("arcade").length,1); assert.equal(loadScores("arcade")[0].score,150);
  const rows = deviceScoreRows("arcade", loadScores); assert.equal(rows[0].name,"Ace"); assert.equal(rows[0].date,"");
});
