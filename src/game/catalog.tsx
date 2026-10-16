// Store catalog. Sparks from play. Diamonds only from Spark conversion.

import React from "react";
import { Sparkles, Gem } from "lucide-react";
import type { BannerPattern } from "./profile";

export type StoreTab = "avatars" | "banners" | "frames" | "themes" | "styles" | "titles" | "audio" | "diamonds" | "spin" | "incubator";
export type Currency = "sparks" | "diamonds";

export interface StoreItem {
  id: string;
  tab: StoreTab;
  name: string;
  desc: string;
  cost: number;
  originalCost?: number;
  isNew?: boolean;
  isSale?: boolean;
  salePercent?: number;
  currency: Currency;
  apply?: Partial<{ avatarId: string; bannerId: string; frameId: string; titleId: string; bannerStyle: BannerPattern; audioPackId: string }>;
  photo?: string;
  preview?: string;
  anime?: string;
  cartoon?: string;
  pattern?: BannerPattern;
  frameCss?: string;
  themeSwatch?: [string, string, string];
  pack?: { sparks?: number; diamonds?: number };
  rarity?: "common" | "rare" | "epic" | "ultra";
}

export interface StoreTabDef {
  id: StoreTab;
  label: string;
  hint: string;
  iconName: "user" | "image" | "circle-dot" | "palette" | "layers" | "award" | "music" | "gem" | "disc" | "egg";
}

export const STORE_TABS: StoreTabDef[] = [
  { id: "spin", label: "Lucky Spin", hint: "Daily Wheel & Jackpots", iconName: "disc" },
  { id: "incubator", label: "Incubator", hint: "Hatch Eggs for Loot", iconName: "egg" },
  { id: "avatars", label: "Avatar", hint: "Anime PFPs & Faces", iconName: "user" },
  { id: "banners", label: "Banner", hint: "Header Washes", iconName: "image" },
  { id: "frames", label: "Frames", hint: "Rings Around You", iconName: "circle-dot" },
  { id: "themes", label: "Themes", hint: "Arena Palettes", iconName: "palette" },
  { id: "styles", label: "Styles", hint: "Patterns on Wash", iconName: "layers" },
  { id: "titles", label: "Titles", hint: "Dossier Badges", iconName: "award" },
  { id: "audio", label: "Audio", hint: "Music & FX Packs", iconName: "music" },
  { id: "diamonds", label: "Diamonds", hint: "Convert Sparks", iconName: "gem" },
];

const S = (n: number) => ({ cost: n, currency: "sparks" as const });
const D = (n: number) => ({ cost: n, currency: "diamonds" as const });

export const STORE_ITEMS: StoreItem[] = [
  // Anime Style PFPs — High-detail Japanese anime aesthetic portraits
  { id: "av-spark", tab: "avatars", name: "Spark", desc: "The original glowing vector spark mark.", ...S(150), preview: "✦", apply: { avatarId: "spark" }, rarity: "common" },
  { id: "ani-valkyrie", tab: "avatars", name: "Valkyrie", desc: "Celestial blade sovereign with radiant star halo and sapphire eyes.", ...S(1350), anime: "ani-valkyrie", apply: { avatarId: "ani-valkyrie" }, rarity: "epic", isNew: true },
  { id: "ani-vortex", tab: "avatars", name: "Vortex", desc: "Quantum speedster with ultraviolet neon visor and dual light trails.", ...D(40), anime: "ani-vortex", apply: { avatarId: "ani-vortex" }, rarity: "ultra", isNew: true },
  { id: "ani-cipher", tab: "avatars", name: "Cipher", desc: "Cyberpunk netrunner with holographic neon visor.", ...S(380), anime: "ani-cipher", apply: { avatarId: "ani-cipher" }, rarity: "rare" },
  { id: "ani-sakura", tab: "avatars", name: "Sakura", desc: "Pastel pink star idol with starry anime eyes.", ...S(420), anime: "ani-sakura", apply: { avatarId: "ani-sakura" }, rarity: "rare" },
  { id: "ani-ryu", tab: "avatars", name: "Ryu", desc: "Flame ronin with spiky fiery hair & crest headband.", cost: 345, originalCost: 460, currency: "sparks", isSale: true, salePercent: 25, anime: "ani-ryu", apply: { avatarId: "ani-ryu" }, rarity: "rare" },
  { id: "ani-kage", tab: "avatars", name: "Kage", desc: "Shadow shinobi with midnight cowl & crimson gaze.", ...S(520), anime: "ani-kage", apply: { avatarId: "ani-kage" }, rarity: "rare" },
  { id: "ani-kitsune", tab: "avatars", name: "Kitsune", desc: "Fox spirit with sacred ears & vermilion eye markings.", ...S(620), anime: "ani-kitsune", apply: { avatarId: "ani-kitsune" }, rarity: "epic" },
  { id: "ani-eva", tab: "avatars", name: "Eva", desc: "Ace mecha pilot with neural interface temple clips.", ...S(680), anime: "ani-eva", apply: { avatarId: "ani-eva" }, rarity: "epic" },
  { id: "ani-ren", tab: "avatars", name: "Ren", desc: "Streetwear rebel with dual-tone split dye hair.", ...S(740), anime: "ani-ren", apply: { avatarId: "ani-ren" }, rarity: "epic" },
  { id: "ani-yuki", tab: "avatars", name: "Yuki", desc: "Frost sorceress with pale ice locks & crystal clip.", ...S(820), anime: "ani-yuki", apply: { avatarId: "ani-yuki" }, rarity: "epic" },
  { id: "ani-chiyo", tab: "avatars", name: "Chiyo", desc: "Neko champion with fluffy cat ears and gold bell.", ...S(900), anime: "ani-chiyo", apply: { avatarId: "ani-chiyo" }, rarity: "epic" },
  { id: "ani-nero", tab: "avatars", name: "Nero", desc: "Abyss prince with dark obsidian horns & golden iris.", ...S(1100), anime: "ani-nero", apply: { avatarId: "ani-nero" }, rarity: "epic" },
  { id: "ani-lumi", tab: "avatars", name: "Lumi", desc: "Celestial valkyrie with radiant glowing halo.", ...S(1250), anime: "ani-lumi", apply: { avatarId: "ani-lumi" }, rarity: "epic" },
  { id: "ani-zen", tab: "avatars", name: "Zen", desc: "Emerald gale archer with serene mint focus.", ...S(1380), anime: "ani-zen", apply: { avatarId: "ani-zen" }, rarity: "epic" },
  { id: "ani-miku", tab: "avatars", name: "Aria", desc: "Neon cyber vocalist with twin teal ponytails.", ...S(1500), anime: "ani-miku", apply: { avatarId: "ani-miku" }, rarity: "epic" },
  { id: "ani-kaido", tab: "avatars", name: "Kaido", desc: "Thunder fist brawler with electric spiky golden mane.", ...S(1650), anime: "ani-kaido", apply: { avatarId: "ani-kaido" }, rarity: "epic" },
  { id: "ani-shin", tab: "avatars", name: "Shinobi X", desc: "Cybernetic phantom assassin with illuminated visor.", ...D(30), anime: "ani-shin", apply: { avatarId: "ani-shin" }, rarity: "ultra" },
  { id: "ani-astral", tab: "avatars", name: "Astral Prime", desc: "Cosmic sovereign with starfield locks and gold crown.", ...D(50), anime: "ani-astral", apply: { avatarId: "ani-astral" }, rarity: "ultra" },
  { id: "ani-nova", tab: "avatars", name: "Nova", desc: "Solar alchemist with radiant golden hair and star prism earrings.", ...S(1450), anime: "ani-nova", apply: { avatarId: "ani-nova" }, rarity: "epic", isNew: true },
  { id: "ani-raiden", tab: "avatars", name: "Raiden", desc: "Thunder Katana operative with purple arc lightning.", ...S(1550), anime: "ani-raiden", apply: { avatarId: "ani-raiden" }, rarity: "epic", isNew: true },
  { id: "ani-chronos", tab: "avatars", name: "Chronos", desc: "Time weaver operative with temporal gold halo.", ...S(1680), anime: "ani-chronos", apply: { avatarId: "ani-chronos" }, rarity: "epic", isNew: true },
  { id: "ani-mecha-zero", tab: "avatars", name: "Unit Zero", desc: "Ace mecha phantom pilot with emerald neural suit.", ...S(1720), anime: "ani-mecha-zero", apply: { avatarId: "ani-mecha-zero" }, rarity: "epic", isNew: true },
  { id: "ani-kitsune-fire", tab: "avatars", name: "Homura", desc: "Celestial nine-tailed fox deity with burning vermilion aura.", ...D(45), anime: "ani-kitsune-fire", apply: { avatarId: "ani-kitsune-fire" }, rarity: "ultra", isNew: true },

  // Illustrated faces — categorized under Avatar
  { id: "cto-blaze", tab: "avatars", name: "Blaze", desc: "High-velocity pilot with fiery locks, goggles and flight jacket.", ...S(2400), cartoon: "cto-blaze", apply: { avatarId: "cto-blaze" }, rarity: "epic", isNew: true },
  ...([
    ["cto-bean", "Bean", "Round face, navy hair.", 1200],
    ["cto-pip", "Pip", "Soft oval, cocoa hair.", 1280],
    ["cto-moss", "Moss", "Square chin, forest cut.", 1360],
    ["cto-nori", "Nori", "Violet shirt, ink hair.", 1480],
    ["cto-blush", "Blush", "Pink bun, blush.", 1600],
    ["cto-kiwi", "Kiwi", "Green crew, grin.", 1720],
    ["cto-soda", "Soda", "Blue crop, square.", 1840],
    ["cto-pixel", "Pixel", "Block hair, amber tee.", 1980],
    ["cto-fox", "Fox", "Pointed hair, rust.", 2280],
    ["cto-luna", "Luna", "Indigo halo.", 3200],
  ] as const).map(([id, name, desc, cost]) => ({
    id, tab: "avatars" as const, name, desc, ...S(cost), cartoon: id, apply: { avatarId: id }, rarity: "epic" as const,
  })),
  { id: "cto-royal", tab: "avatars", name: "Royal", desc: "Indigo cape energy.", ...D(20), cartoon: "cto-royal", apply: { avatarId: "cto-royal" }, rarity: "ultra" },
  { id: "cto-bolt", tab: "avatars", name: "Bolt", desc: "Lightning hair.", ...D(50), cartoon: "cto-bolt", apply: { avatarId: "cto-bolt" }, rarity: "ultra" },

  // Banners 12+
  { id: "ban-aurora-borealis", tab: "banners", name: "Hyper Aurora", desc: "Prismatic northern light ribbons with drifting cosmic stardust.", preview: "linear-gradient(120deg,#064e3b,#10b981 40%,#6366f1 80%,#ec4899)", apply: { bannerId: "hyper-aurora" }, ...S(420), rarity: "epic", isNew: true },
  { id: "ban-supernova", tab: "banners", name: "Supernova", desc: "Cosmic blaze from deep violet to solar gold.", preview: "linear-gradient(120deg,#1c0a35,#9333ea 45%,#f59e0b)", apply: { bannerId: "supernova" }, cost: 308, originalCost: 440, currency: "sparks", isSale: true, salePercent: 30, rarity: "rare" },
  ...([
    ["ban-tide", "Tide", "Teal to mint.", "linear-gradient(120deg,#123a4a,#2dd4bf)", "tide", 180],
    ["ban-ember", "Ember", "Coal to amber.", "linear-gradient(120deg,#3a1f16,#d97706)", "ember", 220],
    ["ban-violet", "Violet Haze", "Ink to lilac.", "linear-gradient(120deg,#221a3f,#c084fc)", "violet", 260],
    ["ban-aurora", "Aurora", "Pine to ice.", "linear-gradient(120deg,#0b3b2e,#a5f3fc)", "aurora", 320],
    ["ban-rose", "Rosé", "Wine to blush.", "linear-gradient(120deg,#3f1626,#fb7185)", "rose", 340],
    ["ban-ghost", "Ghostline", "Quiet charcoal.", "linear-gradient(120deg,#111827,#4b5563)", "ghostline", 280],
    ["ban-gold", "Gilded", "Walnut to gold.", "linear-gradient(120deg,#3f2f0b,#fbbf24)", "gold", 480],
    ["ban-nebula", "Nebula", "Indigo to violet.", "linear-gradient(120deg,#0b1024,#7c3aed)", "nebula", 520],
    ["ban-citrus", "Citrus", "Lime splash.", "linear-gradient(120deg,#14532d,#84cc16)", "citrus", 300],
    ["ban-ice", "Icebox", "Cold steel.", "linear-gradient(120deg,#0c4a6e,#e0f2fe)", "ice", 360],
    ["ban-noir", "Noir", "Almost black.", "linear-gradient(120deg,#030712,#1f2937)", "noir", 400],
    ["ban-peach", "Peach", "Sunset skin.", "linear-gradient(120deg,#9a3412,#fed7aa)", "peach", 380],
    ["ban-dusk", "Dusk", "Deep twilight wash with indigo and rose undertones.", "linear-gradient(120deg,#2b3350,#4c3a6b 55%,#7a4a6e)", "dusk", 180],
    ["ban-solaris", "Solaris", "Blazing cosmic corona with incandescent gold and ruby flare.", "linear-gradient(120deg,#450a0a,#dc2626 50%,#fef08a)", "solaris", 460],
  ] as const).map(([id, name, desc, preview, bannerId, cost]) => ({
    id, tab: "banners" as const, name, desc, preview, apply: { bannerId }, ...S(cost), rarity: "rare" as const,
  })),
  { id: "ban-obsidian", tab: "banners", name: "Obsidian", desc: "Black glass with gold edge.", preview: "linear-gradient(120deg,#020617,#111827 40%,#fbbf24)", apply: { bannerId: "obsidian" }, ...D(20), rarity: "ultra" },
  { id: "ban-crown", tab: "banners", name: "Crownlight", desc: "The expensive wash.", preview: "linear-gradient(120deg,#1e1b4b,#f472b6 50%,#fbbf24)", apply: { bannerId: "crown" }, ...D(50), rarity: "ultra" },

  // Styles 12
  ...([
    ["sty-waves", "Waves", "Soft concentric wash.", "waves", 140],
    ["sty-grid", "Grid", "Fine graph paper.", "grid", 140],
    ["sty-orbits", "Orbits", "Faint circling rings.", "orbits", 180],
    ["sty-rays", "Rays", "A slow sunburst.", "rays", 180],
    ["sty-dots", "Dots", "Tiny scattered marks.", "dots", 120],
    ["sty-plain", "Plain", "Just the wash.", "plain", 100],
    ["sty-chevron", "Chevron", "Quiet arrows.", "waves", 200],
    ["sty-noise", "Grain", "Film grain.", "dots", 220],
    ["sty-scan", "Scan", "CRT lines.", "grid", 240],
    ["sty-halo", "Halo", "Center bloom.", "orbits", 260],
    ["sty-tide", "Ripple", "Water rings.", "waves", 280],
    ["sty-spark", "Sparkfall", "Falling ticks.", "dots", 300],
  ] as const).map(([id, name, desc, pattern, cost]) => ({
    id, tab: "styles" as const, name, desc, pattern, apply: { bannerStyle: pattern }, ...S(cost), rarity: "common" as const,
  })),

  // Themes 12
  { id: "thm-hyper-laser", tab: "themes", name: "Laser Inferno", desc: "Carbon obsidian with burning vermilion and solar amber vectors.", preview: "#ef4444", themeSwatch: ["#ef4444", "#0f0204", "#f59e0b"], ...S(350), rarity: "epic", isNew: true },
  { id: "thm-prism-wave", tab: "themes", name: "Prism Wave", desc: "Holographic pastel iridescent spectrum on void carbon.", preview: "#a855f7", themeSwatch: ["#a855f7", "#0a0614", "#38bdf8"], ...S(380), rarity: "epic", isNew: true },
  { id: "thm-deep-abyss", tab: "themes", name: "Abyssal Trench", desc: "Trench black with bioluminescent electric teal.", preview: "#14b8a6", themeSwatch: ["#14b8a6", "#020c0f", "#06b6d4"], ...S(420), rarity: "rare", isNew: true },
  { id: "thm-matrix", tab: "themes", name: "Neon Matrix", desc: "Hyper-contrast digital rain emerald with obsidian core.", preview: "#10b981", themeSwatch: ["#10b981", "#020d08", "#059669"], ...S(380), rarity: "rare", isNew: true },
  { id: "thm-cyberpunk", tab: "themes", name: "Cyberpunk", desc: "High-octane magenta & electric cyan.", preview: "#ec4899", themeSwatch: ["#ec4899", "#080614", "#06b6d4"], cost: 270, originalCost: 360, currency: "sparks", isSale: true, salePercent: 25, rarity: "rare" },
  ...([
    ["thm-ion", "Ion", "Cyan arena.", "#38e8ff", "#0a061b", "#7c5cff", 220],
    ["thm-solar", "Solar", "Amber arena.", "#ffb14d", "#100b05", "#fb7185", 260],
    ["thm-phase", "Phase", "Violet arena.", "#c4b5fd", "#0b0615", "#f0abfc", 260],
    ["thm-cyber", "Cyber Neon", "Neon rose & laser cyan synthwave.", "#f43f5e", "#050816", "#06b6d4", 320],
    ["thm-emerald", "Emerald Void", "Laser jade & lime plasma obsidian.", "#10b981", "#020f0a", "#84cc16", 320],
    ["thm-mono", "Mono", "Graphite arena.", "#f8fafc", "#050505", "#94a3b8", 240],
    ["thm-aurora", "Aurora", "Mint arena.", "#6ee7b7", "#02100d", "#67e8f9", 300],
    ["thm-ember", "Forge", "Hot coal.", "#fb923c", "#1c0b05", "#f43f5e", 320],
    ["thm-abyss", "Abyss", "Deep navy.", "#60a5fa", "#020617", "#818cf8", 340],
    ["thm-sakura", "Sakura", "Pink dusk.", "#fb7185", "#1f0a14", "#f9a8d4", 360],
    ["thm-lime", "Lime", "Acid green.", "#a3e635", "#052e16", "#4ade80", 280],
    ["thm-sand", "Sand", "Warm stone.", "#fcd34d", "#1c1408", "#fdba74", 300],
    ["thm-ice", "Ice", "Cold white.", "#e0f2fe", "#082f49", "#7dd3fc", 380],
    ["thm-blood", "Signal", "Red alert.", "#fb7185", "#1c0508", "#ef4444", 400],
    ["thm-synthwave", "Synthwave", "Retro-future violet skyline & laser pink.", "#ff007f", "#0a0017", "#00f0ff", 380],
  ] as const).map(([id, name, desc, a, b, c, cost]) => ({
    id, tab: "themes" as const, name, desc, preview: a, themeSwatch: [a, b, c] as [string, string, string], ...S(cost), rarity: "rare" as const,
  })),
  { id: "thm-void", tab: "themes", name: "Void", desc: "True black, white arrow.", preview: "#f8fafc", themeSwatch: ["#f8fafc", "#000000", "#64748b"], ...D(20), rarity: "ultra" },
  { id: "thm-gold", tab: "themes", name: "Aurum", desc: "Black and gold only.", preview: "#fbbf24", themeSwatch: ["#fbbf24", "#0a0702", "#f59e0b"], ...D(50), rarity: "ultra" },

  // Frames 16
  { id: "frm-dragon", tab: "frames", name: "Dragon Ring", desc: "Dual serpentine dragon coils emitting molten gold fire.", frameCss: "0 0 0 3px #f59e0b, 0 0 18px 4px #ef4444, 0 0 0 6px #b45309", apply: { frameId: "dragon" }, ...S(480), rarity: "epic", isNew: true },
  { id: "frm-quantum-orbit", tab: "frames", name: "Quantum Orbit", desc: "Tachyonic orbital rings with continuous spinning starlight particles.", frameCss: "0 0 0 3px #a855f7, 0 0 20px 4px #06b6d4, 0 0 0 6px #6366f1", apply: { frameId: "quantum-orbit" }, ...S(560), rarity: "epic", isNew: true },
  { id: "frm-neon-matrix", tab: "frames", name: "Matrix Pulse", desc: "Emerald code stream outline that beats in rhythm.", frameCss: "0 0 0 3px #10b981, 0 0 22px 5px #059669", apply: { frameId: "neon-matrix" }, ...S(420), rarity: "rare", isNew: true },
  { id: "frm-celestial", tab: "frames", name: "Celestial Corona", desc: "Radiant multi-layered astral ring with orbiting cyan light particles.", frameCss: "0 0 0 3px #38bdf8, 0 0 0 6px #818cf8, 0 0 28px 6px #38bdf8aa", apply: { frameId: "celestial" }, ...S(520), rarity: "epic", isNew: true },
  { id: "frm-valkyrie", tab: "frames", name: "Valkyrie Halo", desc: "Radiant winged halo with twin sapphire crystal flares.", frameCss: "0 0 0 3px #38bdf8, 0 0 24px 6px #0284c7, 0 0 0 6px #ffffff44", apply: { frameId: "valkyrie" }, ...S(460), rarity: "epic", isNew: true },
  { id: "frm-starlight", tab: "frames", name: "Starlight", desc: "Pulsing diamond stellar aura with four-point star flares.", frameCss: "0 0 0 3px #38bdf8, 0 0 20px 4px #818cf8", apply: { frameId: "starlight" }, cost: 238, originalCost: 340, currency: "sparks", isSale: true, salePercent: 30, rarity: "rare" },
  ...([
    ["frm-clean", "Clean", "Minimalist silhouette without an outer ring.", "none", 80],
    ["frm-ring", "Ring", "Thin brand ring.", "0 0 0 3px var(--brand)", 160],
    ["frm-glow", "Glow", "Soft halo.", "0 0 0 3px #0000, 0 0 18px 4px var(--brand)", 240],
    ["frm-double", "Double", "Two-line ring.", "0 0 0 2px var(--surface), 0 0 0 5px var(--brand)", 280],
    ["frm-pulse", "Pulse", "Living brand ring.", "0 0 0 3px var(--brand), 0 0 12px var(--brand)", 300],
    ["frm-thin", "Hairline", "Almost nothing.", "0 0 0 1px #ffffff88", 140],
    ["frm-bold", "Bold", "Heavy outline.", "0 0 0 5px var(--text)", 220],
    ["frm-mint", "Mint", "Green edge.", "0 0 0 3px #34d399", 260],
    ["frm-rose", "Rose", "Pink edge.", "0 0 0 3px #fb7185", 260],
    ["frm-ice", "Ice", "Cyan edge.", "0 0 0 3px #67e8f9", 260],
    ["frm-gold", "Gilded", "Gold edge.", "0 0 0 3px #fbbf24, 0 0 22px 2px #fbbf2488", 480],
    ["frm-prism", "Prism", "Pink-cyan edge.", "0 0 0 3px #0000, 0 0 0 5px #f0abfc, 0 0 22px 4px #22d3ee", 520],
    ["frm-shadow", "Drop", "Soft drop shadow.", "0 10px 24px #00000066", 200],
    ["frm-hyper", "Hyperdrive", "Electric pulse halo.", "0 0 0 2px #06b6d4, 0 0 0 5px #ec4899, 0 0 16px #06b6d4", 380],
  ] as const).map(([id, name, desc, frameCss, cost]) => ({
    id, tab: "frames" as const, name, desc, frameCss, apply: { frameId: id.replace("frm-", "") }, ...S(cost), rarity: "rare" as const,
  })),
  { id: "frm-obsidian", tab: "frames", name: "Obsidian", desc: "Black ring, gold fleck.", frameCss: "0 0 0 4px #0b0b0b, 0 0 0 6px #fbbf24", apply: { frameId: "obsidian" }, ...D(20), rarity: "ultra" },
  { id: "frm-crown", tab: "frames", name: "Crown", desc: "The expensive ring.", frameCss: "0 0 0 3px #fbbf24, 0 0 0 8px #f472b6, 0 0 28px #fbbf24", apply: { frameId: "crown" }, ...D(100), rarity: "ultra" },

  // Titles 14
  { id: "ttl-time-bender", tab: "titles", name: "Time Bender", desc: "For operative chronos who react between the frames.", apply: { titleId: "time-bender" }, ...S(580), rarity: "epic", isNew: true },
  { id: "ttl-bounty-hunter", tab: "titles", name: "Bounty Hunter", desc: "Operative who systematically purges daily & weekly bounties.", apply: { titleId: "bounty-hunter" }, ...S(620), rarity: "epic", isNew: true },
  { id: "ttl-tournament-king", tab: "titles", name: "Tournament King", desc: "Reigns supreme atop weekly seeded tournament brackets.", apply: { titleId: "tournament-king" }, ...D(40), rarity: "ultra", isNew: true },
  { id: "ttl-godspeed", tab: "titles", name: "Godspeed", desc: "For arrow masters who read patterns at instantaneous reflex.", apply: { titleId: "godspeed" }, ...S(650), rarity: "rare", isNew: true },
  { id: "ttl-hyperdrive", tab: "titles", name: "Hyperdrive", desc: "Surpassed the reaction barrier.", apply: { titleId: "hyperdrive" }, cost: 385, originalCost: 550, currency: "sparks", isSale: true, salePercent: 30, rarity: "rare" },
  ...([
    ["ttl-rookie", "Rookie", "First steps on the grid.", "rookie", 80],
    ["ttl-steady", "Steady Hand", "For people who wait.", "steady", 180],
    ["ttl-streaker", "Streak Keeper", "You don't drop it.", "streaker", 240],
    ["ttl-sharp", "Sharpshooter", "Clean reads.", "sharpshooter", 320],
    ["ttl-speed", "Speedster", "Under a quarter second.", "speedster", 360],
    ["ttl-grinder", "Grinder", "Shows up anyway.", "grinder", 280],
    ["ttl-pilot", "Pilot", "Hands on the stick.", "pilot", 300],
    ["ttl-ghost", "Ghost", "Barely there.", "ghost", 340],
    ["ttl-patron", "Patron", "Quiet flex.", "patron", 480],
    ["ttl-ace", "Ace", "The default, earned.", "ace", 200],
    ["ttl-vector", "Vector", "House name.", "vector", 400],
    ["ttl-night", "Night Shift", "After hours.", "night", 260],
    ["ttl-legend", "Vector Legend", "The long game.", "legend", 900],
    ["ttl-combo-master", "Combo Master", "Flows through perfect chains.", "combo-master", 500],
  ] as const).map(([id, name, desc, titleId, cost]) => ({
    id, tab: "titles" as const, name, desc, apply: { titleId }, ...S(cost), rarity: "rare" as const,
  })),
  { id: "ttl-sovereign", tab: "titles", name: "Sovereign", desc: "Diamond-only line.", apply: { titleId: "sovereign" }, ...D(20), rarity: "ultra" },
  { id: "ttl-eternal", tab: "titles", name: "Eternal Flow", desc: "Transcended all speed and rhythm limits.", apply: { titleId: "eternal" }, ...D(35), rarity: "ultra" },
  { id: "ttl-myth", tab: "titles", name: "Myth", desc: "Almost nobody has this.", apply: { titleId: "myth" }, ...D(100), rarity: "ultra" },

  // Audio Packs
  { id: "aud-synth", tab: "audio", name: "Cyberpunk Pulse", desc: "Analog sawtooth basslines, punchy synthesized clicks, and neon filter sweeps.", apply: { audioPackId: "synth" }, ...S(1800), rarity: "epic", isNew: true },
  { id: "aud-chiptune", tab: "audio", name: "Arcade 84", desc: "Authentic FM-synthesis blips, square-wave arpeggios, and 80s coin hits.", apply: { audioPackId: "chiptune" }, ...S(2200), rarity: "epic", isNew: true },
  { id: "aud-lofi", tab: "audio", name: "Lofi Midnight", desc: "Warm vinyl flutter, mellow Rhodes piano chords, and soothing night ambience.", apply: { audioPackId: "lofi" }, ...D(30), rarity: "ultra", isNew: true },
  { id: "aud-retro", tab: "audio", name: "8-Bit Arcade", desc: "Classic chiptune sound effects and retro synthesizer hits.", apply: { audioPackId: "retro" }, ...S(2000), rarity: "rare" },
  { id: "aud-ethereal", tab: "audio", name: "Ethereal Chimes", desc: "Soft, crystalline bells and windchimes for a relaxing vibe.", apply: { audioPackId: "ethereal" }, ...S(3500), rarity: "epic" },
  { id: "aud-cyber", tab: "audio", name: "Cyberdeck", desc: "Heavy mechanical clacks and glitch hop synthetic bursts.", apply: { audioPackId: "cyber" }, ...D(30), rarity: "ultra" },
  { id: "aud-zen", tab: "audio", name: "Zen Garden", desc: "Bamboo strikes and deep resonating gongs.", apply: { audioPackId: "zen" }, ...D(40), rarity: "ultra" },

  // Diamond conversion — not earned by play
  { id: "dia-100", tab: "diamonds", name: "100 Diamonds", desc: "10,000 Sparks → 100 ◆", ...S(10000), pack: { diamonds: 100 }, rarity: "rare" },
  { id: "dia-280", tab: "diamonds", name: "280 Diamonds", desc: "20,000 Sparks → 280 ◆ (SPECIAL 20% DISCOUNT)", cost: 20000, originalCost: 25000, currency: "sparks", isSale: true, salePercent: 20, pack: { diamonds: 280 }, rarity: "epic" },
  { id: "dia-600", tab: "diamonds", name: "600 Diamonds", desc: "50,000 Sparks → 600 ◆", ...S(50000), pack: { diamonds: 600 }, rarity: "ultra" },
  { id: "dia-1500", tab: "diamonds", name: "1,500 Diamonds", desc: "100,000 Sparks → 1,500 ◆ (Grandmaster chest)", ...S(100000), pack: { diamonds: 1500 }, rarity: "ultra" },
];

// Apply weekly 30% discount to one rotating diamond item
const diamondItems = STORE_ITEMS.filter(i => i.currency === "diamonds" && !i.pack);
if (diamondItems.length > 0) {
  const week = Math.floor(new Date().getTime() / (7 * 24 * 60 * 60 * 1000));
  const featured = diamondItems[week % diamondItems.length];
  featured.originalCost = featured.cost;
  featured.cost = Math.floor(featured.cost * 0.7);
  featured.desc = "✨ 30% OFF WEEKLY FEATURE: " + featured.desc;
}

export function itemsFor(tab: StoreTab): StoreItem[] {
  return STORE_ITEMS.filter((i) => i.tab === tab);
}

export function priceLabel(item: StoreItem, size: "md" | "lg" | "xl" = "md"): React.ReactNode {
  const isDiamonds = item.currency === "diamonds";
  const iconSize = size === "xl" ? 22 : size === "lg" ? 18 : 16;
  const numFormatted = item.cost.toLocaleString();
  const origFormatted = item.originalCost?.toLocaleString();

  return (
    <span className={`store-price-display price-${size} ${isDiamonds ? "text-cyan-400" : "text-amber-400"}`}>
      {item.originalCost && item.originalCost > item.cost && (
        <s className="price-original">
          {origFormatted}
        </s>
      )}
      <span className="price-current">
        {numFormatted}
      </span>
      <span className="price-currency-icon">
        {isDiamonds ? <Gem size={iconSize} className="inline-block shrink-0" /> : <Sparkles size={iconSize} className="inline-block shrink-0" />}
      </span>
      {item.salePercent && (
        <span className="price-sale-tag">
          -{item.salePercent}%
        </span>
      )}
    </span>
  );
}

