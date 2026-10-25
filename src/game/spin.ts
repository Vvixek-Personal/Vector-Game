import { safeStorage as localStorage } from "../game/persistence";
// Lucky Wheel mechanics, slices, weighting and cooldown logic

import { type Stats, spendSparks, spendDiamonds, saveStats } from "./storage";
import { saveProfile, type Profile } from "./profile";
import { type EggType, addEggToInventory } from "./incubator";

export interface SpinReward {
  id: string;
  label: string;
  sublabel: string;
  type: "sparks" | "diamonds" | "egg" | "avatar" | "jackpot";
  amount?: number;
  eggType?: EggType;
  avatarId?: string;
  avatarName?: string;
  color: string;
  accent: string;
  weight: number;
}

export const SPIN_SLICES: SpinReward[] = [
  {
    id: "sparks-150",
    label: "+150",
    sublabel: "Sparks",
    type: "sparks",
    amount: 150,
    color: "#0284c7",
    accent: "#38bdf8",
    weight: 30,
  },
  {
    id: "diamonds-5",
    label: "+5",
    sublabel: "Diamonds",
    type: "diamonds",
    amount: 5,
    color: "#059669",
    accent: "#34d399",
    weight: 22,
  },
  {
    id: "egg-neon",
    label: "Neon Egg",
    sublabel: "Incubator",
    type: "egg",
    eggType: "neon",
    color: "#7c3aed",
    accent: "#a78bfa",
    weight: 16,
  },
  {
    id: "sparks-400",
    label: "+400",
    sublabel: "Sparks",
    type: "sparks",
    amount: 400,
    color: "#d97706",
    accent: "#fbbf24",
    weight: 14,
  },
  {
    id: "egg-quantum",
    label: "Void Egg",
    sublabel: "Incubator",
    type: "egg",
    eggType: "quantum",
    color: "#db2777",
    accent: "#f472b6",
    weight: 8,
  },
  {
    id: "diamonds-20",
    label: "+20",
    sublabel: "Diamonds",
    type: "diamonds",
    amount: 20,
    color: "#10b981",
    accent: "#6ee7b7",
    weight: 5,
  },
  {
    id: "avatar-cosmic",
    label: "Cipher PFP",
    sublabel: "Anime Avatar",
    type: "avatar",
    avatarId: "ani-cipher",
    avatarName: "Cipher",
    color: "#4f46e5",
    accent: "#818cf8",
    weight: 3,
  },
  {
    id: "jackpot-sparks",
    label: "+1,200",
    sublabel: "✦ JACKPOT!",
    type: "jackpot",
    amount: 1200,
    color: "#e11d48",
    accent: "#fb7185",
    weight: 2,
  },
];

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
        sparksEarned: (nextStats.sparksEarned || 0) + 400,
      };
      message = `Already owned ${reward.avatarName || "Item"}! Converted to +400 Sparks.`;
    }
  }

  try {
    saveStats(nextStats);
    saveProfile(nextProfile);
  } catch {
    /* ignore */
  }

  return { reward, nextStats, nextProfile, message };
}
