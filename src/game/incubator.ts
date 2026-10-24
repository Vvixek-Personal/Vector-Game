// Quantum Incubator & Hatchery mechanics

import { type Stats, saveStats, spendSparks, spendDiamonds } from "./storage";
import { type Profile, saveProfile } from "./profile";

export type EggType = "neon" | "quantum" | "solar";

export interface EggDef {
  type: EggType;
  name: string;
  tagline: string;
  durationSeconds: number;
  costSparks: number;
  costDiamonds: number;
  glowColor: string;
  accentColor: string;
  eggIcon: string;
  tier: "Common" | "Rare" | "Legendary";
  possibleLoot: string[];
}

export const EGG_DEFS: Record<EggType, EggDef> = {
  neon: {
    type: "neon",
    name: "Neon Core Egg",
    tagline: "High-voltage bio-mechanical shell charging with kinetic plasma.",
    durationSeconds: 20, // 20s for delightful instant progression
    costSparks: 250,
    costDiamonds: 0,
    glowColor: "#22c55e",
    accentColor: "#86efac",
    eggIcon: "🟢",
    tier: "Common",
    possibleLoot: ["Sparks (100 - 500)", "Diamonds (2 - 8)", "Title: Plasma Spark", "Rare Neon Frame"],
  },
  quantum: {
    type: "quantum",
    name: "Quantum Void Egg",
    tagline: "Crystalline chronos shell housing unstable subatomic tachyons.",
    durationSeconds: 45, // 45s
    costSparks: 750,
    costDiamonds: 10,
    glowColor: "#a855f7",
    accentColor: "#d8b4fe",
    eggIcon: "🟣",
    tier: "Rare",
    possibleLoot: ["Sparks (500 - 1500)", "Diamonds (10 - 25)", "Anime Avatar: Cipher", "Title: Chrono Breaker"],
  },
  solar: {
    type: "solar",
    name: "Solar Dragon Egg",
    tagline: "Radiant primordial core forged inside an exploding celestial star.",
    durationSeconds: 90, // 90s
    costSparks: 1800,
    costDiamonds: 30,
    glowColor: "#f59e0b",
    accentColor: "#fde68a",
    eggIcon: "🟡",
    tier: "Legendary",
    possibleLoot: ["Massive Sparks (2,000+)", "Diamonds (40 - 100)", "Legendary Dragon Avatar", "Legendary Title: Dragon Sovereign"],
  },
};

export interface ActivePod {
  id: string;
  eggType: EggType;
  startedAt: number;
  durationMs: number;
  readyAt: number;
}

export interface IncubatorState {
  inventory: { id: string; eggType: EggType; obtainedAt: number }[];
  pods: (ActivePod | null)[];
}

const INCUBATOR_KEY = "vector_incubator_state_v1";

const DEFAULT_STATE: IncubatorState = {
  inventory: [
    { id: "free-egg-1", eggType: "neon", obtainedAt: Date.now() },
  ],
  pods: [null, null], // 2 Pod slots
};

export function loadIncubatorState(): IncubatorState {
  try {
    const raw = localStorage.getItem(INCUBATOR_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      inventory: parsed.inventory || [],
      pods: Array.isArray(parsed.pods) && parsed.pods.length === 2 ? parsed.pods : [null, null],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveIncubatorState(state: IncubatorState): void {
  try {
    localStorage.setItem(INCUBATOR_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function addEggToInventory(eggType: EggType): IncubatorState {
  const state = loadIncubatorState();
  const next: IncubatorState = {
    ...state,
    inventory: [
      ...state.inventory,
      {
        id: `egg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        eggType,
        obtainedAt: Date.now(),
      },
    ],
  };
  saveIncubatorState(next);
  return next;
}

export function startIncubation(eggInventoryId: string, podIndex: number): IncubatorState | null {
  const state = loadIncubatorState();
  if (podIndex < 0 || podIndex >= state.pods.length) return null;
  if (state.pods[podIndex] !== null) return null; // pod occupied

  const eggIndex = state.inventory.findIndex((e) => e.id === eggInventoryId);
  if (eggIndex === -1) return null;

  const egg = state.inventory[eggIndex];
  const def = EGG_DEFS[egg.eggType];
  const durationMs = def.durationSeconds * 1000;
  const now = Date.now();

  const activePod: ActivePod = {
    id: `pod-${egg.eggType}-${now}`,
    eggType: egg.eggType,
    startedAt: now,
    durationMs,
    readyAt: now + durationMs,
  };

  const nextInventory = state.inventory.filter((_, i) => i !== eggIndex);
  const nextPods = [...state.pods];
  nextPods[podIndex] = activePod;

  const nextState: IncubatorState = {
    inventory: nextInventory,
    pods: nextPods,
  };

  saveIncubatorState(nextState);
  return nextState;
}

export function speedUpPod(podIndex: number): IncubatorState | null {
  const state = loadIncubatorState();
  const pod = state.pods[podIndex];
  if (!pod) return null;

  const nextPods = [...state.pods];
  nextPods[podIndex] = {
    ...pod,
    readyAt: Date.now() - 1000, // Ready immediately
  };

  const nextState: IncubatorState = {
    ...state,
    pods: nextPods,
  };
  saveIncubatorState(nextState);
  return nextState;
}

export interface HatchReward {
  title: string;
  description: string;
  type: "sparks" | "diamonds" | "avatar" | "frame";
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  amount?: number;
  avatarId?: string;
  avatarName?: string;
}

export function hatchPod(
  podIndex: number,
  currentStats: Stats,
  currentProfile: Profile
): {
  reward: HatchReward;
  nextStats: Stats;
  nextProfile: Profile;
  nextIncubator: IncubatorState;
} | null {
  const state = loadIncubatorState();
  const pod = state.pods[podIndex];
  if (!pod) return null;
  if (Date.now() < pod.readyAt) return null; // Not finished

  // Generate reward based on eggType
  let reward: HatchReward;
  let nextStats = { ...currentStats };
  let nextProfile = { ...currentProfile };

  if (pod.eggType === "neon") {
    const roll = Math.random();
    if (roll < 0.65) {
      const sparks = 200 + Math.floor(Math.random() * 300);
      reward = {
        title: `+${sparks} Sparks`,
        description: "Kinetic sparks harvested from the shattered neon shell.",
        type: "sparks",
        rarity: "Common",
        amount: sparks,
      };
      nextStats.sparks = (nextStats.sparks || 0) + sparks;
    } else {
      const diamonds = 4 + Math.floor(Math.random() * 5);
      reward = {
        title: `+${diamonds} Diamonds`,
        description: "Gleaming condensed diamond crystals found inside!",
        type: "diamonds",
        rarity: "Rare",
        amount: diamonds,
      };
      nextStats.diamonds = (nextStats.diamonds || 0) + diamonds;
    }
  } else if (pod.eggType === "quantum") {
    const roll = Math.random();
    if (roll < 0.5) {
      const diamonds = 15 + Math.floor(Math.random() * 15);
      reward = {
        title: `+${diamonds} Quantum Diamonds`,
        description: "High-purity tachyonic diamonds extracted from the void.",
        type: "diamonds",
        rarity: "Rare",
        amount: diamonds,
      };
      nextStats.diamonds = (nextStats.diamonds || 0) + diamonds;
    } else {
      // Cosmic Anime Avatar / PFP
      const avatarId = "ani-cipher";
      reward = {
        title: "Cipher Operative PFP",
        description: "Cyberpunk netrunner with holographic neon visor!",
        type: "avatar",
        rarity: "Epic",
        avatarId,
        avatarName: "Cipher",
      };
      if (!nextProfile.purchased.includes(avatarId)) {
        nextProfile.purchased = [...nextProfile.purchased, avatarId];
        nextProfile.avatarId = avatarId;
      } else {
        const bonus = 800;
        reward.description = `Already unlocked! Converted into +${bonus} Bonus Sparks.`;
        nextStats.sparks = (nextStats.sparks || 0) + bonus;
      }
    }
  } else {
    // Solar Dragon Egg
    const roll = Math.random();
    if (roll < 0.6) {
      const diamonds = 50 + Math.floor(Math.random() * 50);
      const sparks = 1500;
      reward = {
        title: `+${diamonds} Diamonds & ${sparks} Sparks`,
        description: "The Dragon Core released immense celestial energy!",
        type: "diamonds",
        rarity: "Legendary",
        amount: diamonds,
      };
      nextStats.diamonds = (nextStats.diamonds || 0) + diamonds;
      nextStats.sparks = (nextStats.sparks || 0) + sparks;
    } else {
      const avatarId = "ani-astral";
      reward = {
        title: "Astral Prime Avatar",
        description: "Cosmic sovereign enveloped in starlight void robes!",
        type: "avatar",
        rarity: "Legendary",
        avatarId,
        avatarName: "Astral Prime",
      };
      if (!nextProfile.purchased.includes(avatarId)) {
        nextProfile.purchased = [...nextProfile.purchased, avatarId];
        nextProfile.avatarId = avatarId;
      } else {
        const bonus = 2000;
        reward.description = `Already unlocked! Awarded +${bonus} Sparks.`;
        nextStats.sparks = (nextStats.sparks || 0) + bonus;
      }
    }
  }

  // Clear pod slot
  const nextPods = [...state.pods];
  nextPods[podIndex] = null;

  const nextIncubator: IncubatorState = {
    ...state,
    pods: nextPods,
  };

  saveIncubatorState(nextIncubator);
  saveStats(nextStats);
  saveProfile(nextProfile);

  return { reward, nextStats, nextProfile, nextIncubator };
}
