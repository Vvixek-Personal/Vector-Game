// Player profile: custom avatar, banner, titles, frames and exclusive perks.
// Everything derives from lifetime stats, so unlocks feel earned and the
// data stays tiny. Pure helpers + a small validated localStorage record.

import { STORE_ITEMS } from "./catalog";
import { heroFor } from "./characters";
import { MODE_ORDER, type GameMode } from "./types";
import type { Stats } from "./storage";
import { persistSave } from "../firebase/cloudSave";
import { safeStorage as localStorage } from "./persistence";

export interface UnlockRule {
  /** Human-readable requirement, e.g. "Play 10 runs". */
  label: string;
  met: boolean;
  progress: string;
}

export interface AvatarDef {
  id: string;
  name: string;
  glyph: string;
  from: string;
  to: string;
  rule: (s: Stats) => UnlockRule;
}

export interface BannerDef {
  id: string;
  name: string;
  /** CSS background for the banner preview + header. */
  css: string;
  dark: boolean;
  rule: (s: Stats) => UnlockRule;
}

export interface FrameDef {
  id: string;
  name: string;
  css: string;
  rule: (s: Stats) => UnlockRule;
}

export interface TitleDef {
  id: string;
  name: string;
  rule: (s: Stats) => UnlockRule;
}

export interface PerkDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  effect: string;
  rule: (s: Stats) => UnlockRule;
}

export interface Profile {
  avatarId: string;
  customAvatar: { glyph: string; from: string; to: string };
  bannerId: string;
  customBanner: { from: string; to: string; pattern: BannerPattern };
  bannerStyle: BannerPattern;
  frameId: string;
  titleId: string;
  purchased: string[];
  accessRole?: "guest" | "player" | "moderator" | "developer";
  inventoryRules?: Record<string, "removed" | "locked" | "gifted">;
  customTitles?: {id:string;name:string;color:string;assignedAt?:number}[];
  customPhotoURL?: string | null;
  wishlist?: string[];
  favoriteModes?: GameMode[];
  claimedLevels?: number[];
  charges: { shield: number; surge: number; saver: number };
  useGooglePfp?: boolean;
  audioPackId?: string;
  arenaThemeId?: string;
}

export type BannerPattern = "waves" | "grid" | "orbits" | "rays" | "dots" | "plain";

export const AVATAR_GLYPHS = ["▲", "◆", "✦", "➤", "◍", "⬢", "✚", "☾", "◎", "★", "➶", "◈"];
export const AVATAR_COLORS = [
  "#a8b7f2", "#7dd3fc", "#6ee7b7", "#bef264", "#fde047", "#fdba74",
  "#f472b6", "#f0abfc", "#c4b5fd", "#f87171", "#94a3b8", "#f8fafc",
];
export const BANNER_PATTERNS: BannerPattern[] = ["waves", "orbits", "grid", "rays", "dots", "plain"];

const always = (label = "Unlocked from the start"): UnlockRule => ({ label, met: true, progress: "✓" });
const shopOnly = (label = "Buy with Sparks"): UnlockRule => ({ label, met: false, progress: "Shop" });
const runsRule = (n: number) => (s: Stats): UnlockRule => ({
  label: `Play ${n} run${n > 1 ? "s" : ""}`,
  met: s.runs >= n,
  progress: `${Math.min(s.runs, n)}/${n}`,
});
const streakRule = (n: number) => (s: Stats): UnlockRule => ({
  label: `Reach a ${n} streak`,
  met: s.bestStreak >= n,
  progress: `${Math.min(s.bestStreak, n)}/${n}`,
});
const scoreRule = (n: number) => (s: Stats): UnlockRule => ({
  label: `Earn ${n.toLocaleString()} lifetime`,
  met: s.totalScore >= n,
  progress: `${Math.min(s.totalScore, n).toLocaleString()}/${n.toLocaleString()}`,
});
const speedRule = (ms: number) => (s: Stats): UnlockRule => ({
  label: `React under ${ms}ms`,
  met: s.fastestMs < ms,
  progress: s.fastestMs >= 9999 ? "—" : `${s.fastestMs}ms`,
});
const sparksRule = (n: number) => (s: Stats): UnlockRule => ({
  label: `Earn ${n.toLocaleString()} Sparks`,
  met: (s.sparksEarned ?? 0) >= n,
  progress: `${Math.min(s.sparksEarned ?? 0, n).toLocaleString()}/${n.toLocaleString()}`,
});

export const AVATARS: AvatarDef[] = [
  { id: "spark", name: "Spark", glyph: "✦", from: "#a8b7f2", to: "#7dd3fc", rule: () => always() },
  { id: "arrow", name: "True North", glyph: "▲", from: "#6ee7b7", to: "#38bdf8", rule: () => always() },
  { id: "orbit", name: "Orbit", glyph: "◍", from: "#f0abfc", to: "#8b5cf6", rule: () => always() },
  { id: "bolt", name: "Bolt", glyph: "➶", from: "#fde047", to: "#fb923c", rule: () => always() },
  { id: "prism", name: "Prism", glyph: "◆", from: "#38bdf8", to: "#818cf8", rule: runsRule(5) },
  { id: "lunar", name: "Lunar", glyph: "☾", from: "#c4b5fd", to: "#475569", rule: runsRule(10) },
  { id: "hex", name: "Hexcore", glyph: "⬢", from: "#2dd4bf", to: "#0ea5e9", rule: streakRule(8) },
  { id: "cross", name: "Crosshair", glyph: "◎", from: "#f472b6", to: "#fb7185", rule: streakRule(12) },
  { id: "star", name: "Supernova", glyph: "★", from: "#fbbf24", to: "#ef4444", rule: scoreRule(2500) },
  { id: "diamond", name: "Monarch", glyph: "◈", from: "#f8fafc", to: "#94a3b8", rule: scoreRule(6000) },
  { id: "ghost", name: "Ghost", glyph: "➤", from: "#94a3b8", to: "#334155", rule: speedRule(220) },
  { id: "plus", name: "Medic", glyph: "✚", from: "#86efac", to: "#059669", rule: runsRule(25) },
  { id: "comet", name: "Comet", glyph: "☄", from: "#fde68a", to: "#38bdf8", rule: () => shopOnly() },
];

// Keep starter and earned avatar identities in the same inventory registry.
for (const avatar of AVATARS) {
  if (!STORE_ITEMS.some(item=>item.apply?.avatarId===avatar.id)) STORE_ITEMS.push({
    id:"earned-"+avatar.id,tab:"avatars",name:avatar.name,desc:avatar.rule({runs:0,totalScore:0,bestStreak:0,fastestMs:9999,sparksEarned:0} as Stats).label,
    cost:0,currency:"sparks",rarity:"common",preview:avatar.glyph,apply:{avatarId:avatar.id},unlockOnly:true,
  });
}
export const BANNERS: BannerDef[] = [
  { id: "dusk", name: "Dusk", css: "linear-gradient(120deg,#2b3350,#4c3a6b 55%,#7a4a6e)", dark: true, rule: () => always() },
  { id: "tide", name: "Tide", css: "linear-gradient(120deg,#123a4a,#1d6d7a 55%,#2dd4bf)", dark: true, rule: () => always() },
  { id: "ember", name: "Ember", css: "linear-gradient(120deg,#3a1f16,#7a3a1d 55%,#d97706)", dark: true, rule: runsRule(5) },
  { id: "violet", name: "Violet Haze", css: "linear-gradient(120deg,#221a3f,#5b3f9e 55%,#c084fc)", dark: true, rule: streakRule(8) },
  { id: "aurora", name: "Aurora", css: "linear-gradient(120deg,#0b3b2e,#0e7490 55%,#a5f3fc)", dark: true, rule: scoreRule(2500) },
  { id: "gold", name: "Gilded", css: "linear-gradient(120deg,#3f2f0b,#92600a 55%,#fbbf24)", dark: true, rule: scoreRule(6000) },
  { id: "ghostline", name: "Ghostline", css: "linear-gradient(120deg,#111827,#1f2937 55%,#4b5563)", dark: true, rule: speedRule(220) },
  { id: "rose", name: "Rosé", css: "linear-gradient(120deg,#3f1626,#9d2c4d 55%,#fb7185)", dark: true, rule: runsRule(25) },
  { id: "nebula", name: "Nebula", css: "linear-gradient(120deg,#0b1024,#312e81 50%,#7c3aed)", dark: true, rule: () => shopOnly() },
  { id: "supernova", name: "Supernova", css: "linear-gradient(120deg,#1c0a35,#9333ea 45%,#f59e0b)", dark: true, rule: () => shopOnly() },
];

export const FRAMES: FrameDef[] = [
  { id: "none", name: "Clean", css: "none", rule: () => always() },
  { id: "ring", name: "Ring", css: "0 0 0 3px var(--brand)", rule: runsRule(3) },
  { id: "glow", name: "Glow", css: "0 0 0 3px #0000, 0 0 18px 4px var(--brand)", rule: streakRule(8) },
  { id: "double", name: "Double", css: "0 0 0 2px var(--surface), 0 0 0 5px var(--brand)", rule: scoreRule(2500) },
  { id: "gold", name: "Gilded", css: "0 0 0 3px #fbbf24, 0 0 22px 2px #fbbf2488", rule: scoreRule(6000) },
  { id: "prism", name: "Prism", css: "0 0 0 3px #0000, 0 0 0 5px #f0abfc, 0 0 22px 4px #22d3ee", rule: speedRule(220) },
  { id: "pulse", name: "Pulse", css: "0 0 0 3px var(--brand), 0 0 16px 2px var(--brand)", rule: () => shopOnly() },
  { id: "thin", name: "Hairline", css: "0 0 0 1px #ffffff88", rule: () => shopOnly() },
  { id: "bold", name: "Bold", css: "0 0 0 5px var(--text)", rule: () => shopOnly() },
  { id: "mint", name: "Mint", css: "0 0 0 3px #34d399", rule: () => shopOnly() },
  { id: "rose", name: "Rose", css: "0 0 0 3px #fb7185", rule: () => shopOnly() },
  { id: "ice", name: "Ice", css: "0 0 0 3px #67e8f9", rule: () => shopOnly() },
  { id: "shadow", name: "Drop", css: "0 10px 24px #00000066", rule: () => shopOnly() },
  { id: "obsidian", name: "Obsidian", css: "0 0 0 4px #0b0b0b, 0 0 0 6px #fbbf24", rule: () => shopOnly() },
  { id: "crown", name: "Crown", css: "0 0 0 3px #fbbf24, 0 0 0 8px #f472b6, 0 0 28px #fbbf24", rule: () => shopOnly() },
  { id: "hyper", name: "Hyperdrive", css: "0 0 0 2px #06b6d4, 0 0 0 5px #ec4899, 0 0 16px #06b6d4", rule: () => shopOnly() },
];

export const TITLES: TitleDef[] = [
  { id: "rookie", name: "Rookie", rule: () => always() },
  { id: "steady", name: "Steady Hand", rule: runsRule(5) },
  { id: "streaker", name: "Streak Keeper", rule: streakRule(8) },
  { id: "sharpshooter", name: "Sharpshooter", rule: streakRule(12) },
  { id: "speedster", name: "Speedster", rule: speedRule(250) },
  { id: "grinder", name: "Grinder", rule: runsRule(25) },
  { id: "highroller", name: "High Roller", rule: scoreRule(5000) },
  { id: "legend", name: "Vector Legend", rule: scoreRule(12000) },
  { id: "patron", name: "Patron", rule: () => shopOnly() },
  { id: "pilot", name: "Pilot", rule: () => shopOnly() },
  { id: "ghost", name: "Ghost", rule: () => shopOnly() },
  { id: "ace", name: "Ace", rule: () => shopOnly() },
  { id: "vector", name: "Vector", rule: () => shopOnly() },
  { id: "night", name: "Night Shift", rule: () => shopOnly() },
  { id: "sovereign", name: "Sovereign", rule: () => shopOnly() },
  { id: "myth", name: "Myth", rule: () => shopOnly() },
  { id: "combo-master", name: "Combo Master", rule: () => shopOnly() },
];

// The shop is the source of truth for its existing cosmetics.
for (const item of STORE_ITEMS) {
  if (item.apply?.frameId && item.frameCss && !FRAMES.some(f => f.id === item.apply.frameId)) FRAMES.push({ id: item.apply.frameId, name: item.name, css: item.frameCss, rule: () => shopOnly() });
  if (item.apply?.titleId && !TITLES.some(t => t.id === item.apply.titleId)) TITLES.push({ id: item.apply.titleId, name: item.name, rule: () => shopOnly() });
  if (item.apply?.bannerId && item.preview && !BANNERS.some(b => b.id === item.apply.bannerId)) BANNERS.push({ id: item.apply.bannerId, name: item.name, css: item.preview, dark: true, rule: () => shopOnly() });
}

export const PERKS: PerkDef[] = [
  { id: "founder", icon: "🌱", name: "Founder", desc: "Finish your first run.", effect: "First-run milestone badge", rule: runsRule(1) },
  { id: "focus", icon: "◎", name: "Centered", desc: "Reach a 6 streak in any mode.", effect: "Unlocks the Glow avatar frame", rule: streakRule(6) },
  { id: "overdrive", icon: "⚡", name: "Overdrive", desc: "Reach an 8 streak.", effect: "Unlocks the Sharpshooter title", rule: streakRule(8) },
  { id: "lockedin", icon: "🎯", name: "Locked In", desc: "Reach a 20 streak.", effect: "Unlocks the Crosshair avatar", rule: streakRule(20) },
  { id: "reflex", icon: "🚀", name: "Reflexes", desc: "React in under 250ms.", effect: "Unlocks the Ghostline banner", rule: speedRule(250) },
  { id: "lightning", icon: "⚡", name: "Lightning", desc: "React in under 180ms.", effect: "Unlocks the Prism frame", rule: speedRule(180) },
  { id: "regular", icon: "🔥", name: "Regular", desc: "Play 10 runs.", effect: "Unlocks the Lunar avatar", rule: runsRule(10) },
  { id: "grinder", icon: "📅", name: "Session Grinder", desc: "Play 40 runs.", effect: "Unlocks the Rosé banner", rule: runsRule(40) },
  { id: "collector", icon: "💎", name: "Collector", desc: "Earn 2,500 lifetime points.", effect: "Unlocks Aurora banner + Double frame", rule: scoreRule(2500) },
  { id: "magnate", icon: "👑", name: "Magnate", desc: "Earn 12,000 lifetime points.", effect: "Unlocks the Vector Legend title", rule: scoreRule(12000) },
  { id: "banker", icon: "✦", name: "Spark Banker", desc: "Earn 200 Sparks in total.", effect: "Shows a Spark badge on your profile", rule: sparksRule(200) },
  { id: "treasury", icon: "🏦", name: "Treasury", desc: "Earn 800 Sparks in total.", effect: "Unlocks the Gilded banner", rule: sparksRule(800) },
];

export interface ShopItem {
  id: string;
  kind: "frame" | "title" | "banner" | "avatar";
  name: string;
  cost: number;
  desc: string;
}

export const SPARK_SHOP: ShopItem[] = [
  { id: "shop-pulse", kind: "frame", name: "Pulse frame", cost: 80, desc: "A soft brand ring around your avatar." },
  { id: "shop-patron", kind: "title", name: "Patron title", cost: 120, desc: "A quiet flex for regulars." },
  { id: "shop-nebula", kind: "banner", name: "Nebula banner", cost: 180, desc: "Deep indigo wash for your header." },
  { id: "shop-comet", kind: "avatar", name: "Comet avatar", cost: 220, desc: "A streaking mark, yours to keep." },
];

// ---------------------------------------------------------------- level

export function xpFor(stats: Stats): number {
  return Math.max(0, stats.totalScore + stats.runs * 25 + stats.bestStreak * 5);
}

export function xpForLevel(level: number): number {
  return Math.round(400 * Math.pow(level, 1.55));
}

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  into: number;
  span: number;
  progress: number;
}

export function getLevelInfo(stats: Stats, titleId: string): LevelInfo {
  const xp = xpFor(stats);
  let level = 1;
  while (xp >= xpForLevel(level + 1) && level < 50) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const into = Math.max(0, xp - base);
  const span = Math.max(1, next - base);
  const title = TITLES.find((t) => t.id === titleId)?.name ?? TITLES[0].name;
  return { level, title, xp, into, span, progress: Math.min(1, into / span) };
}

// ---------------------------------------------------------------- persistence

export const DEFAULT_PROFILE: Profile = {
  avatarId: "spark",
  customAvatar: { glyph: "▲", from: "#a8b7f2", to: "#7dd3fc" },
  bannerId: "dusk",
  customBanner: { from: "#2b3350", to: "#7a4a6e", pattern: "waves" },
  bannerStyle: "waves",
  frameId: "none",
  titleId: "rookie",
  purchased: [],
  wishlist: [],
  favoriteModes: [],
  claimedLevels: [],
  charges: { shield: 1, surge: 0, saver: 0 },
};

const PROFILE_KEY = "vector_profile_v5";

function sanitizeId<T extends { id: string }>(list: T[], id: unknown, fallback: string): string {
  return typeof id === "string" && list.some((d) => d.id === id) ? id : fallback;
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return structuredClone(DEFAULT_PROFILE);
    const p = JSON.parse(raw) as Partial<Profile>;
    const patterns: BannerPattern[] = ["waves", "grid", "orbits", "rays", "dots", "plain"];
    return {
      accessRole: ["player","moderator","developer"].includes(p.accessRole) ? p.accessRole : "guest",
    inventoryRules: p.inventoryRules && typeof p.inventoryRules === "object" ? Object.fromEntries(Object.entries(p.inventoryRules).filter(([id,value]) => ["removed","locked","gifted"].includes(value))) as Profile["inventoryRules"] : {},
    customTitles: Array.isArray(p.customTitles) ? p.customTitles.filter(t=>t && typeof t.id === "string" && typeof t.name === "string").slice(0,30) : [],
    customPhotoURL: typeof p.customPhotoURL === "string" && p.customPhotoURL.startsWith("https://firebasestorage.googleapis.com/") ? p.customPhotoURL : null,
    avatarId: typeof p.avatarId === "string" ? p.avatarId : "spark",
      customAvatar: {
        glyph: typeof p.customAvatar?.glyph === "string" && p.customAvatar.glyph ? p.customAvatar.glyph.slice(0, 2) : "▲",
        from: typeof p.customAvatar?.from === "string" ? p.customAvatar.from : "#a8b7f2",
        to: typeof p.customAvatar?.to === "string" ? p.customAvatar.to : "#7dd3fc",
      },
      bannerId: typeof p.bannerId === "string" ? p.bannerId : "dusk",
      customBanner: {
        from: typeof p.customBanner?.from === "string" ? p.customBanner.from : "#2b3350",
        to: typeof p.customBanner?.to === "string" ? p.customBanner.to : "#7a4a6e",
        pattern: patterns.includes(p.customBanner?.pattern as BannerPattern) ? (p.customBanner as Profile["customBanner"]).pattern : "waves",
      },
    bannerStyle: (["waves", "grid", "orbits", "rays", "dots", "plain"] as BannerPattern[]).includes(p.bannerStyle as BannerPattern) ? (p.bannerStyle as BannerPattern) : "waves",
    frameId: typeof p.frameId === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(p.frameId) ? p.frameId : "none",
    titleId: typeof p.titleId === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(p.titleId) ? p.titleId : "rookie",
    purchased: Array.isArray(p.purchased)
      ? p.purchased.filter((id): id is string => typeof id === "string")
      : [],
    favoriteModes: Array.isArray(p.favoriteModes) ? [...new Set(p.favoriteModes.filter((mode): mode is GameMode => MODE_ORDER.includes(mode)))].slice(0, MODE_ORDER.length) : [],
    wishlist: Array.isArray(p.wishlist) ? [...new Set(p.wishlist.filter((id): id is string => typeof id === "string" && STORE_ITEMS.some(item => item.id === id && !item.pack)))].slice(0, 250) : [],
    claimedLevels: Array.isArray(p.claimedLevels)
      ? p.claimedLevels.filter((lvl): lvl is number => typeof lvl === "number")
      : [],
    charges: {
      shield: Math.max(0, Number(p.charges?.shield) || 0),
      surge: Math.max(0, Number(p.charges?.surge) || 0),
      saver: Math.max(0, Number(p.charges?.saver) || 0),
    },
    arenaThemeId: typeof p.arenaThemeId === "string" ? p.arenaThemeId : undefined,
    audioPackId: typeof p.audioPackId === "string" ? p.audioPackId : undefined,
    useGooglePfp: typeof p.useGooglePfp === "boolean" ? p.useGooglePfp : undefined,
    };
  } catch {
    return structuredClone(DEFAULT_PROFILE);
  }
}

export function saveProfile(p: Profile) {
  persistSave("profile", p);
}

import { ANIME_CHARACTERS, type AnimeId } from "../components/AnimeAvatar";

export function avatarFor(profile: Profile): { glyph: string; from: string; to: string; name: string; cartoon?: string; anime?: string; hero?: string; photo?: string } {
  if (profile.accessRole === "developer" && profile.customPhotoURL) return {glyph:"",from:"#27304a",to:"#435baf",name:"Custom",photo:profile.customPhotoURL};
  const image = STORE_ITEMS.find(item=>item.apply?.avatarId === profile.avatarId && item.photo);
  if (image) return {glyph:"",from:"#27304a",to:"#435baf",name:image.name,photo:image.photo};
  const hero = heroFor(profile.avatarId);
  if (hero) return { glyph: "", from: hero.from, to: hero.to, name: hero.name, hero: hero.id };
  if (profile.avatarId.startsWith("ani-")) {
    const char = ANIME_CHARACTERS[profile.avatarId as AnimeId];
    return {
      glyph: "",
      from: char?.bgFrom ?? "#222",
      to: char?.bgTo ?? "#444",
      name: char?.name ?? profile.avatarId.slice(4),
      anime: profile.avatarId,
    };
  }
  if (profile.avatarId.startsWith("cto-")) {
    return { glyph: "", from: "#222", to: "#444", name: profile.avatarId.slice(4), cartoon: profile.avatarId };
  }
  if (profile.avatarId === "custom") {
    return { ...profile.customAvatar, name: "Custom" };
  }
  const a = AVATARS.find((x) => x.id === profile.avatarId) ?? AVATARS[0];
  return { glyph: a.glyph, from: a.from, to: a.to, name: a.name };
}

export function bannerFor(profile: Profile): { css: string; name: string } {
  if (profile.bannerId === "custom") {
    const { from, to } = profile.customBanner;
    return { css: `linear-gradient(120deg, ${from}, ${to})`, name: "Custom" };
  }
  const b = BANNERS.find((x) => x.id === profile.bannerId) ?? BANNERS[0];
  return { css: b.css, name: b.name };
}

export function isUnlocked(rule: (s: Stats) => UnlockRule, stats: Stats): boolean {
  try {
    return rule(stats).met;
  } catch {
    return false;
  }
}

const SHOP_UNLOCK: Record<string, string> = {
  pulse: "shop-pulse",
  patron: "shop-patron",
  nebula: "shop-nebula",
  comet: "shop-comet",
};

export function ownsCosmetic(id: string, profile: Profile, stats: Stats, rule: (s: Stats) => UnlockRule): boolean {
  if (SHOP_UNLOCK[id] && profile.purchased.includes(SHOP_UNLOCK[id])) return true;
  if (SHOP_UNLOCK[id] && !isUnlocked(rule, stats)) return false;
  return isUnlocked(rule, stats);
}
