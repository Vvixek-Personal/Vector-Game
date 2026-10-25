import { safeStorage as localStorage } from "../game/persistence";
export interface GameModifiers {
  hyperSpeed?: boolean;
  vortexSpin?: boolean;
  phantomMirage?: boolean;
  mirrorRealm?: boolean;
  suddenRisk?: boolean;
}

export interface ModifierDef {
  id: keyof GameModifiers;
  name: string;
  short: string;
  desc: string;
  bonusPercent: number;
  icon: string;
  badgeColor: string;
}

export const MODIFIER_DEFS: ModifierDef[] = [
  {
    id: "hyperSpeed",
    name: "Hyper Velocity",
    short: "Speed",
    desc: "Arrows expire 35% sooner. Built for fast reflexes.",
    bonusPercent: 35,
    icon: "⚡",
    badgeColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  {
    id: "vortexSpin",
    name: "Vortex Spin",
    short: "Vortex",
    desc: "Arrows rotate as they close in on the ring.",
    bonusPercent: 25,
    icon: "🌀",
    badgeColor: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  },
  {
    id: "phantomMirage",
    name: "Stealth Mirage",
    short: "Mirage",
    desc: "Arrows fade in and out while you read them.",
    bonusPercent: 30,
    icon: "🔮",
    badgeColor: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  },
  {
    id: "mirrorRealm",
    name: "Mirror Realm",
    short: "Mirror",
    desc: "Every arrow is flipped: answer the opposite way.",
    bonusPercent: 40,
    icon: "🪞",
    badgeColor: "text-pink-400 border-pink-500/30 bg-pink-500/10",
  },
  {
    id: "suddenRisk",
    name: "Sudden Death",
    short: "1-Life",
    desc: "One life only. A single miss ends the run.",
    bonusPercent: 100,
    icon: "💀",
    badgeColor: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  },
];

export function getModifierMultiplier(mods?: GameModifiers | null): number {
  if (!mods) return 1.0;
  let mult = 1.0;
  if (mods.hyperSpeed) mult += 0.35;
  if (mods.vortexSpin) mult += 0.25;
  if (mods.phantomMirage) mult += 0.30;
  if (mods.mirrorRealm) mult += 0.40;
  if (mods.suddenRisk) mult += 1.00;
  return Number(mult.toFixed(2));
}

export function loadModifiers(): GameModifiers {
  try {
    const raw = localStorage.getItem("vector_modifiers_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      return Object.fromEntries(MODIFIER_DEFS.map(m => [m.id, parsed?.[m.id] === true]));
    }
  } catch {}
  return {};
}

export function saveModifiers(mods: GameModifiers) {
  try {
    localStorage.setItem("vector_modifiers_v1", JSON.stringify(mods));
  } catch {}
}
