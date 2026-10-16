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
    desc: "Arrow timeout is 35% faster. High-reflex challenge.",
    bonusPercent: 35,
    icon: "⚡",
    badgeColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  {
    id: "vortexSpin",
    name: "Vortex Spin",
    short: "Vortex",
    desc: "Arrows dynamically rotate and spin towards you.",
    bonusPercent: 25,
    icon: "🌀",
    badgeColor: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  },
  {
    id: "phantomMirage",
    name: "Stealth Mirage",
    short: "Mirage",
    desc: "Arrows oscillate in and out of invisibility.",
    bonusPercent: 30,
    icon: "🔮",
    badgeColor: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  },
  {
    id: "mirrorRealm",
    name: "Mirror Realm",
    short: "Mirror",
    desc: "Inverts all arrow directions (flip input 180°).",
    bonusPercent: 40,
    icon: "🪞",
    badgeColor: "text-pink-400 border-pink-500/30 bg-pink-500/10",
  },
  {
    id: "suddenRisk",
    name: "Sudden Death",
    short: "1-Life",
    desc: "Only 1 life. Any single miss or mistake ends the run!",
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
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function saveModifiers(mods: GameModifiers) {
  try {
    localStorage.setItem("vector_modifiers_v1", JSON.stringify(mods));
  } catch {}
}
