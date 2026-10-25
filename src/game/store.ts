import { STORE_ITEMS, type StoreItem, type Currency } from "./catalog";
import { AVATARS, BANNERS, FRAMES, TITLES, DEFAULT_PROFILE, loadProfile, saveProfile, type Profile } from "./profile";
import { loadStats, convertSparksToDiamonds, spendDiamonds, spendSparks, type Stats } from "./storage";

export type StoreSort = "featured" | "price-low" | "price-high" | "name";
export type CollectionView = "browse" | "collection" | "wishlist";
export interface StoreFilters {
  view: CollectionView; tab: string; query: string; currency: Currency | "all";
  rarity: StoreItem["rarity"] | "all"; affordable: boolean; sort: StoreSort;
}
const legacy: Record<string, Partial<Profile>> = {
  "shop-pulse": { frameId: "pulse" }, "shop-patron": { titleId: "patron" },
  "shop-nebula": { bannerId: "nebula" }, "shop-comet": { avatarId: "comet" },
};
export function sameCosmetic(a: StoreItem["apply"], b: StoreItem["apply"]): boolean {
  if (!a || !b) return false;
  const entries = Object.entries(a);
  return entries.length > 0 && entries.every(([key, value]) => b[key] === value);
}
export function ownsStoreItem(item: StoreItem, profile: Profile, stats: Stats): boolean {
  if (item.pack) return false;
  if (item.frameCss === "none") return true;
  if (profile.purchased.includes(item.id)) return true;
  if (profile.purchased.some(id => sameCosmetic(item.apply, STORE_ITEMS.find(i => i.id === id)?.apply ?? legacy[id]))) return true;
  const a = item.apply;
  if (!a) return false;
  // Starter and achievement cosmetics are already available in the profile.
  const definition = a.avatarId ? AVATARS.find(i => i.id === a.avatarId)
    : a.bannerId ? BANNERS.find(i => i.id === a.bannerId)
    : a.frameId ? FRAMES.find(i => i.id === a.frameId)
    : a.titleId ? TITLES.find(i => i.id === a.titleId) : undefined;
  if (definition?.rule(stats).met) return true;
  return !!a.bannerStyle && a.bannerStyle === DEFAULT_PROFILE.bannerStyle;
}
export function isStoreItemEquipped(item: StoreItem, profile: Profile): boolean {
  if (item.frameCss === "none" && profile.frameId === "none") return true;
  return !item.pack && !!item.apply && Object.keys(item.apply).length > 0 &&
    Object.entries(item.apply).every(([key, value]) => profile[key] === value);
}
export function canAffordItem(item: StoreItem, stats: Stats): boolean {
  return (item.currency === "diamonds" ? stats.diamonds : stats.sparks) >= item.cost;
}
export function filterStoreItems(items: StoreItem[], profile: Profile, stats: Stats, filters: StoreFilters): StoreItem[] {
  const terms = filters.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const list = items.filter(item => {
    if (filters.tab !== "all" && item.tab !== filters.tab) return false;
    if (filters.view === "collection" && !ownsStoreItem(item, profile, stats)) return false;
    if (filters.view === "wishlist" && !profile.wishlist?.includes(item.id)) return false;
    if (filters.currency !== "all" && item.currency !== filters.currency) return false;
    if (filters.rarity !== "all" && (item.rarity ?? "common") !== filters.rarity) return false;
    if (filters.affordable && !ownsStoreItem(item, profile, stats) && !canAffordItem(item, stats)) return false;
    return terms.every(term => [item.name, item.desc, item.tab].join(" ").toLocaleLowerCase().includes(term));
  });
  return list.sort((a, b) => {
    if (filters.sort === "name") return a.name.localeCompare(b.name);
    if (filters.sort.startsWith("price")) {
      // Never compare the face value of two different currencies.
      const currencyOrder = Number(a.currency === "diamonds") - Number(b.currency === "diamonds");
      return currencyOrder || (filters.sort === "price-low" ? a.cost - b.cost : b.cost - a.cost) || a.name.localeCompare(b.name);
    }
    return Number(!!b.isNew) - Number(!!a.isNew) || Number(!!b.isSale) - Number(!!a.isSale);
  });
}
export type StoreResult = { ok: true; stats: Stats; profile: Profile; kind: "bought" | "equipped" | "exchanged" } | { ok: false; reason: string };
export function transactStoreItem(id: string, intent: "buy" | "equip"): StoreResult {
  const item = STORE_ITEMS.find(i => i.id === id);
  if (!item) return { ok: false, reason: "This item is unavailable." };
  const profile = loadProfile();
  const stats = loadStats();
  const owned = ownsStoreItem(item, profile, stats);
  if (intent === "equip" && !owned) return { ok: false, reason: "Unlock this item before equipping it." };
  if (owned) {
    const next = { ...profile, ...item.apply, ...(item.tab === "avatars" ? { useGooglePfp: false } : {}) };
    saveProfile(next);
    return { ok: true, stats, profile: next, kind: "equipped" };
  }
  const nextStats = item.pack?.diamonds ? convertSparksToDiamonds(item.cost, item.pack.diamonds)
    : item.currency === "diamonds" ? spendDiamonds(item.cost) : spendSparks(item.cost);
  if (!nextStats) return { ok: false, reason: "Your balance changed. You do not have enough " + (item.currency === "diamonds" ? "Diamonds." : "Sparks.") };
  if (item.pack) return { ok: true, stats: nextStats, profile, kind: "exchanged" };
  const nextProfile = { ...profile, ...item.apply, purchased: [...new Set([...profile.purchased, item.id])],
    wishlist: (profile.wishlist ?? []).filter(key => key !== id), ...(item.tab === "avatars" ? { useGooglePfp: false } : {}) };
  saveProfile(nextProfile);
  return { ok: true, stats: nextStats, profile: nextProfile, kind: "bought" };
}
