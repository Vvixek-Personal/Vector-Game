// Leveling and Horizontal Rail Progression System
// Every level awards an item from the Store catalog.
// Every 10th level awards an item + 10 Diamonds!

import type { Stats } from "./storage";
import type { Profile } from "./profile";
import { STORE_ITEMS, type StoreItem } from "./catalog";

export interface LevelRewardDef {
  level: number;
  xpRequired: number;
  storeItemId: string;
  diamonds?: number;
}

// XP required for each level: smooth, rewarding curve (Level 0 is 0 XP, Level 1 is 100 XP)
export function xpForLevel(level: number): number {
  if (level <= 0) return 0;
  return 100000 * level; // 100,000 XP per level as requested
}

// Player's lifetime XP calculated from total score, runs, and streaks (plus bonus/mission XP)
export function xpForStats(stats: Stats, bonusXp = 0): number {
  return Math.max(0, (stats.totalScore ?? 0) + (stats.runs ?? 0) * 50 + (stats.bestStreak ?? 0) * 10 + (bonusXp ?? 0));
}

export function addPlayerXp(profile: Profile, xp: number): Profile {
  return {
    ...profile,
    bonusXp: (profile.bonusXp || 0) + Math.max(0, xp),
  };
}

// 50 Handcrafted Level Rewards matching real STORE_ITEMS
// Every level gives a store item. Every 10th level also grants 10 Diamonds!
export const LEVEL_REWARDS: LevelRewardDef[] = [
  { level: 1, xpRequired: xpForLevel(1), storeItemId: "cto-bean" }, // Cartoon Avatar Bean
  { level: 2, xpRequired: xpForLevel(2), storeItemId: "ban-tide" }, // Banner Tide
  { level: 3, xpRequired: xpForLevel(3), storeItemId: "frm-ring" }, // Frame Ring
  { level: 4, xpRequired: xpForLevel(4), storeItemId: "ttl-steady" }, // Title Steady Hand
  { level: 5, xpRequired: xpForLevel(5), storeItemId: "thm-matrix" }, // Theme Neon Matrix
  { level: 6, xpRequired: xpForLevel(6), storeItemId: "sty-waves" }, // Style Waves
  { level: 7, xpRequired: xpForLevel(7), storeItemId: "cto-pip" }, // Cartoon Avatar Pip
  { level: 8, xpRequired: xpForLevel(8), storeItemId: "frm-glow" }, // Frame Glow
  { level: 9, xpRequired: xpForLevel(9), storeItemId: "ban-ember" }, // Banner Ember
  { level: 10, xpRequired: xpForLevel(10), storeItemId: "ani-ryu", diamonds: 10 }, // Anime Ryu + 10 Diamonds
  { level: 11, xpRequired: xpForLevel(11), storeItemId: "ttl-streaker" }, // Title Streak Keeper
  { level: 12, xpRequired: xpForLevel(12), storeItemId: "thm-ion" }, // Theme Ion
  { level: 13, xpRequired: xpForLevel(13), storeItemId: "ban-citrus" }, // Banner Citrus
  { level: 14, xpRequired: xpForLevel(14), storeItemId: "frm-mint" }, // Frame Mint
  { level: 15, xpRequired: xpForLevel(15), storeItemId: "cto-moss" }, // Cartoon Avatar Moss
  { level: 16, xpRequired: xpForLevel(16), storeItemId: "sty-orbits" }, // Style Orbits
  { level: 17, xpRequired: xpForLevel(17), storeItemId: "ttl-sharp" }, // Title Sharpshooter
  { level: 18, xpRequired: xpForLevel(18), storeItemId: "thm-solar" }, // Theme Solar
  { level: 19, xpRequired: xpForLevel(19), storeItemId: "frm-ice" }, // Frame Ice
  { level: 20, xpRequired: xpForLevel(20), storeItemId: "ani-sakura", diamonds: 10 }, // Anime Sakura + 10 Diamonds
  { level: 21, xpRequired: xpForLevel(21), storeItemId: "ban-violet" }, // Banner Violet Haze
  { level: 22, xpRequired: xpForLevel(22), storeItemId: "cto-nori" }, // Cartoon Avatar Nori
  { level: 23, xpRequired: xpForLevel(23), storeItemId: "ttl-speed" }, // Title Speedster
  { level: 24, xpRequired: xpForLevel(24), storeItemId: "thm-phase" }, // Theme Phase
  { level: 25, xpRequired: xpForLevel(25), storeItemId: "frm-pulse" }, // Frame Pulse
  { level: 26, xpRequired: xpForLevel(26), storeItemId: "sty-rays" }, // Style Rays
  { level: 27, xpRequired: xpForLevel(27), storeItemId: "ban-aurora" }, // Banner Aurora
  { level: 28, xpRequired: xpForLevel(28), storeItemId: "cto-blush" }, // Cartoon Avatar Blush
  { level: 29, xpRequired: xpForLevel(29), storeItemId: "ttl-grinder" }, // Title Grinder
  { level: 30, xpRequired: xpForLevel(30), storeItemId: "ani-cipher", diamonds: 10 }, // Anime Cipher + 10 Diamonds
  { level: 40, xpRequired: xpForLevel(40), storeItemId: "ani-kitsune", diamonds: 20 },
  { level: 50, xpRequired: xpForLevel(50), storeItemId: "thm-synthwave", diamonds: 30 },
  { level: 60, xpRequired: xpForLevel(60), storeItemId: "frm-prism", diamonds: 40 },
  { level: 70, xpRequired: xpForLevel(70), storeItemId: "ban-obsidian", diamonds: 50 },
  { level: 80, xpRequired: xpForLevel(80), storeItemId: "ttl-legend", diamonds: 60 },
  { level: 90, xpRequired: xpForLevel(90), storeItemId: "ban-aurora-borealis", diamonds: 80 },
  { level: 100, xpRequired: xpForLevel(100), storeItemId: "ani-valkyrie", diamonds: 100 },
];

export interface PlayerLevelProgress {
  currentLevel: number;
  currentXp: number;
  levelBaseXp: number;
  nextLevelXp: number;
  progress: number;
  maxLevel: number;
  unclaimedCount: number;
}

export function getPlayerLevelProgress(stats: Stats, profile: Profile): PlayerLevelProgress {
  const currentXp = xpForStats(stats, profile?.bonusXp || 0);
  const maxLevel = 100;

  let currentLevel = 0;
  for (let lvl = 1; lvl <= maxLevel; lvl++) {
    if (currentXp >= xpForLevel(lvl)) {
      currentLevel = lvl;
    } else {
      break;
    }
  }

  const levelBaseXp = xpForLevel(currentLevel);
  const nextLevelXp = currentLevel < maxLevel ? xpForLevel(currentLevel + 1) : levelBaseXp;
  const span = Math.max(1, nextLevelXp - levelBaseXp);
  const into = Math.max(0, currentXp - levelBaseXp);
  const progress = currentLevel >= maxLevel ? 1 : Math.min(1, into / span);

  const claimed = profile.claimedLevels ?? [];
  let unclaimedCount = 0;
  for (const reward of LEVEL_REWARDS) {
    if (reward.level <= currentLevel && !claimed.includes(reward.level)) {
      unclaimedCount++;
    }
  }

  return {
    currentLevel,
    currentXp,
    levelBaseXp,
    nextLevelXp,
    progress,
    maxLevel,
    unclaimedCount,
  };
}

export function getStoreItemForReward(reward: LevelRewardDef): StoreItem | undefined {
  return STORE_ITEMS.find((item) => item.id === reward.storeItemId);
}
