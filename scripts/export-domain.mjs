import { writeFile, mkdir } from "node:fs/promises";
import { STORE_ITEMS } from "../src/game/catalog.tsx";
import { AVATARS, BANNERS, FRAMES, TITLES, DEFAULT_PROFILE } from "../src/game/profile.ts";
import { loadStats } from "../src/game/storage.ts";
import { ownsStoreItem } from "../src/game/store.ts";
import { LEVEL_REWARDS } from "../src/game/levels.ts";
import { SPIN_SLICES } from "../src/game/spin.ts";
import { EGG_DEFS } from "../src/game/incubator.ts";
const defaults = loadStats();
const items = STORE_ITEMS.map(item => {
  const value = structuredClone(item);
  if (value.desc.startsWith("✨ 30% OFF WEEKLY FEATURE: ")) {
    value.cost = value.originalCost; delete value.originalCost; delete value.isSale; delete value.salePercent;
    value.desc = value.desc.replace("✨ 30% OFF WEEKLY FEATURE: ","");
  }
  return value;
});
const rules = [];
for (const item of items) {
  const a = item.apply;
  const def = a?.avatarId ? AVATARS.find(d=>d.id===a.avatarId) : a?.bannerId ? BANNERS.find(d=>d.id===a.bannerId) : a?.frameId ? FRAMES.find(d=>d.id===a.frameId) : a?.titleId ? TITLES.find(d=>d.id===a.titleId) : null;
  const label = def?.rule(defaults).label || "";
  const tests = [[/^Play ([\d,]+) run/,"runs",">="],[/^Reach a ([\d,]+) streak/,"bestStreak",">="],[/^Earn ([\d,]+) lifetime/,"totalScore",">="],[/^React under ([\d,]+)ms/,"fastestMs","<"]];
  for (const [pattern,stat,op] of tests) { const match=label.match(pattern); if(match)rules.push({id:item.id,stat,op,value:Number(match[1].replaceAll(",",""))}); }
}
await mkdir("functions/src",{recursive:true});
await writeFile("functions/src/catalog-base.json",JSON.stringify({
  items, rules, starters:items.filter(i=>ownsStoreItem(i,DEFAULT_PROFILE,defaults)).map(i=>i.id),
  defaultProfile:DEFAULT_PROFILE, defaultStats:defaults, levelRewards:LEVEL_REWARDS,
  spin:SPIN_SLICES, eggs:EGG_DEFS,
},null,2)+"\n");
console.log("Exported",items.length,"items,",LEVEL_REWARDS.length,"milestones.");
