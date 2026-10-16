// Lucky Wheel mechanics, slices, weighting and cooldown logic

import { type Stats, spendSparks, spendDiamonds, saveStats } from "./storage";
import { type Profile } from "./profile";
import { type EggType, addEggToInventory } from "./incubator";

export type SpinRarity = "common" | "rare" | "epic" | "ultra";

export interface SpinReward {
  id: string;
  label: string;
  sublabel: string;
  type: "sparks" | "diamonds" | "egg" | "avatar" | "jackpot";
  rarity: SpinRarity;
  amount?: number;
  eggType?: EggType;
  avatarId?: string;
  avatarName?: string;
  color: string;
  accent: string;
  weight: number;
}

// Daily rotating jackpot and avatar roster
const DAILY_ROTATING_PRIZES = [
  { avatarId: "ani-valkyrie", avatarName: "Valkyrie PFP", sublabel: "Anime Avatar", color: "#4f46e5", accent: "#818cf8", eggType: "quantum" as EggType, sparksJackpot: 2500, diamondsJackpot: 50 },
  { avatarId: "ani-vortex", avatarName: "Vortex PFP", sublabel: "Quantum Visor", color: "#06b6d4", accent: "#67e8f9", eggType: "solar" as EggType, sparksJackpot: 3000, diamondsJackpot: 60 },
  { avatarId: "ani-raiden", avatarName: "Raiden PFP", sublabel: "Thunder Katana", color: "#8b5cf6", accent: "#c4b5fd", eggType: "neon" as EggType, sparksJackpot: 2000, diamondsJackpot: 40 },
  { avatarId: "ani-astral", avatarName: "Astral PFP", sublabel: "Cosmic Prime", color: "#f59e0b", accent: "#fde68a", eggType: "solar" as EggType, sparksJackpot: 5000, diamondsJackpot: 100 },
  { avatarId: "ani-chronos", avatarName: "Chronos PFP", sublabel: "Time Weaver", color: "#ec4899", accent: "#f472b6", eggType: "quantum" as EggType, sparksJackpot: 2800, diamondsJackpot: 45 },
  { avatarId: "ani-kitsune", avatarName: "Kitsune PFP", sublabel: "Fox Spirit", color: "#ef4444", accent: "#fca5a5", eggType: "neon" as EggType, sparksJackpot: 2200, diamondsJackpot: 35 },
  { avatarId: "ani-shin", avatarName: "Shinobi X PFP", sublabel: "Phantom Visor", color: "#10b981", accent: "#6ee7b7", eggType: "solar" as EggType, sparksJackpot: 3500, diamondsJackpot: 75 },
];

export function getDailySpinSeed(): number {
  const now = new Date();
  const str = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getDailySpinSlices(): SpinReward[] {
  const seed = getDailySpinSeed();
  const dayIndex = seed % DAILY_ROTATING_PRIZES.length;
  const prize = DAILY_ROTATING_PRIZES[dayIndex];

  return [
    {
      id: "sparks-daily-1",
      label: `+${150 + (dayIndex * 20)}`,
      sublabel: "Sparks",
      type: "sparks",
      rarity: "common",
      amount: 150 + (dayIndex * 20),
      color: "#0284c7",
      accent: "#38bdf8",
      weight: 28,
    },
    {
      id: "diamonds-daily-1",
      label: `+${5 + (dayIndex % 3)}`,
      sublabel: "Diamonds",
      type: "diamonds",
      rarity: "common",
      amount: 5 + (dayIndex % 3),
      color: "#059669",
      accent: "#34d399",
      weight: 22,
    },
    {
      id: `egg-daily-${prize.eggType}`,
      label: prize.eggType === "solar" ? "Solar Egg" : prize.eggType === "quantum" ? "Void Egg" : "Neon Egg",
      sublabel: "Daily Hatch",
      type: "egg",
      rarity: prize.eggType === "solar" ? "epic" : "rare",
      eggType: prize.eggType,
      color: prize.eggType === "solar" ? "#f59e0b" : prize.eggType === "quantum" ? "#a855f7" : "#10b981",
      accent: prize.eggType === "solar" ? "#fde68a" : prize.eggType === "quantum" ? "#d8b4fe" : "#86efac",
      weight: 15,
    },
    {
      id: "sparks-daily-2",
      label: `+${400 + (dayIndex * 50)}`,
      sublabel: "Sparks",
      type: "sparks",
      rarity: "rare",
      amount: 400 + (dayIndex * 50),
      color: "#d97706",
      accent: "#fbbf24",
      weight: 14,
    },
    {
      id: "diamonds-daily-2",
      label: `+${18 + (dayIndex * 2)}`,
      sublabel: "Diamonds",
      type: "diamonds",
      rarity: "epic",
      amount: 18 + (dayIndex * 2),
      color: "#10b981",
      accent: "#6ee7b7",
      weight: 8,
    },
    {
      id: "egg-bonus",
      label: "Quantum Void",
      sublabel: "Incubator",
      type: "egg",
      rarity: "epic",
      eggType: "quantum",
      color: "#db2777",
      accent: "#f472b6",
      weight: 8,
    },
    {
      id: `avatar-${prize.avatarId}`,
      label: prize.avatarName,
      sublabel: prize.sublabel,
      type: "avatar",
      rarity: "ultra",
      avatarId: prize.avatarId,
      avatarName: prize.avatarName,
      color: prize.color,
      accent: prize.accent,
      weight: 3,
    },
    {
      id: "jackpot-sparks",
      label: `+${prize.sparksJackpot.toLocaleString()}`,
      sublabel: "✦ JACKPOT!",
      type: "jackpot",
      rarity: "ultra",
      amount: prize.sparksJackpot,
      color: "#e11d48",
      accent: "#fb7185",
      weight: 2,
    },
  ];
}

export const SPIN_SLICES: SpinReward[] = getDailySpinSlices();

export function getDailySpinInfo() {
  const seed = getDailySpinSeed();
  const dayIndex = seed % DAILY_ROTATING_PRIZES.length;
  const prize = DAILY_ROTATING_PRIZES[dayIndex];
  return {
    featuredName: prize.avatarName,
    jackpotSparks: prize.sparksJackpot,
    eggType: prize.eggType,
    dayIndex,
  };
}

const LAST_FREE_SPIN_KEY = "vector_last_free_spin_time";
const FREE_SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getRemainingFreeSpinMs(): number {
  try {
    const raw = localStorage.getItem(LAST_FREE_SPIN_KEY);
    if (!raw) return 0;
    const lastTime = parseInt(raw, 10);
    if (isNaN(lastTime)) return 0;
    const elapsed = Date.now() - lastTime;
    return Math.max(0, FREE_SPIN_COOLDOWN_MS - elapsed);
  } catch {
    return 0;
  }
}

export function canFreeSpin(): boolean {
  return getRemainingFreeSpinMs() <= 0;
}

export function recordFreeSpinUsed(): void {
  try {
    localStorage.setItem(LAST_FREE_SPIN_KEY, Date.now().toString());
  } catch {
    /* ignore */
  }
}

export function pickSpinRewardIndex(): number {
  const totalWeight = SPIN_SLICES.reduce((acc, s) => acc + s.weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < SPIN_SLICES.length; i++) {
    if (random < SPIN_SLICES[i].weight) {
      return i;
    }
    random -= SPIN_SLICES[i].weight;
  }
  return 0;
}

export interface SpinResultApplied {
  reward: SpinReward;
  nextStats: Stats;
  nextProfile: Profile;
  message: string;
}

export function applySpinReward(
  reward: SpinReward,
  currentStats: Stats,
  currentProfile: Profile
): SpinResultApplied {
  let nextStats: Stats = { ...currentStats };
  let nextProfile: Profile = { ...currentProfile };
  let message = "";

  if (reward.type === "sparks" || reward.type === "jackpot") {
    const amount = reward.amount || 150;
    nextStats = {
      ...nextStats,
      sparks: (nextStats.sparks || 0) + amount,
      sparksEarned: (nextStats.sparksEarned || 0) + amount,
    };
    message = `Won +${amount.toLocaleString()} Sparks!`;
  } else if (reward.type === "diamonds") {
    const amount = reward.amount || 5;
    nextStats = {
      ...nextStats,
      diamonds: (nextStats.diamonds || 0) + amount,
    };
    message = `Won +${amount} Diamonds!`;
  } else if (reward.type === "egg" && reward.eggType) {
    addEggToInventory(reward.eggType);
    message = `Received a rare ${reward.label}! Sent to your Incubator.`;
  } else if (reward.type === "avatar" && reward.avatarId) {
    if (!nextProfile.purchased.includes(reward.avatarId)) {
      nextProfile = {
        ...nextProfile,
        purchased: [...nextProfile.purchased, reward.avatarId],
        avatarId: reward.avatarId,
      };
      message = `Unlocked Exclusive PFP: ${reward.avatarName || "Special"}!`;
    } else {
      // Duplicate protection: give 400 sparks bonus!
      nextStats = {
        ...nextStats,
        sparks: (nextStats.sparks || 0) + 400,
      };
      message = `Already owned ${reward.avatarName || "Item"}! Converted to +400 Sparks.`;
    }
  }

  try {
    saveStats(nextStats);
  } catch {
    /* ignore */
  }

  return { reward, nextStats, nextProfile, message };
}
