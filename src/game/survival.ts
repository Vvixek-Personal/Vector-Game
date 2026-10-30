// Survival Mode: 10 distinct level gauntlets with unique rules and modifiers.

import type { GameModifiers } from "./modifiers";

export type SurvivalTaskType =
  | "survive_time"
  | "quota"
  | "rush"
  | "flawless"
  | "opposite_rush"
  | "speed_blitz"
  | "memory_recall";

export interface SurvivalLevel {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  taskType: SurvivalTaskType;
  taskDescription: string;
  lives: number;
  /** Duration in seconds for time survival or time trial limit */
  duration?: number;
  /** Number of target hits required to pass */
  targetHits?: number;
  /** Seconds allowed per arrow */
  roundTime: number;
  /** If true, any mistake (wrong direction or timeout) fails instantly */
  noWrong?: boolean;
  /** Seconds added per hit (for rush taskType) */
  onHitAddTime?: number;
  /** Seconds lost per miss (for rush taskType) */
  onMissSubTime?: number;
  /** Memory reveal seconds */
  memoryReveal?: number;
  /** Ratio of opposite arrows (0 to 1) */
  oppositeChance?: number;
  /** Preset modifiers applied */
  modifiers?: GameModifiers;
  rewardSparks: number;
  rewardDiamonds: number;
  starGoals: {
    star1: string;
    star2: string;
    star3: string;
  };
}

export const SURVIVAL_LEVELS: SurvivalLevel[] = [
  {
    id: 1,
    title: "Initiation",
    subtitle: "30s Endurance",
    badge: "3 HEARTS SURVIVAL",
    badgeColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    taskType: "survive_time",
    taskDescription: "Survive for 30 seconds with 3 hearts. Focus on steady rhythm.",
    lives: 3,
    duration: 30,
    roundTime: 2.4,
    rewardSparks: 40,
    rewardDiamonds: 1,
    starGoals: {
      star1: "Survive the full 30 seconds",
      star2: "Finish with at least 2 hearts left",
      star3: "Reach 85%+ accuracy",
    },
  },
  {
    id: 2,
    title: "Sudden Death",
    subtitle: "1 Heart · 20 Hits",
    badge: "1 HEART",
    badgeColor: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    taskType: "quota",
    taskDescription: "Clear 20 arrows with only 1 Heart. Any mistake is lethal.",
    lives: 1,
    targetHits: 20,
    roundTime: 2.2,
    rewardSparks: 50,
    rewardDiamonds: 1,
    starGoals: {
      star1: "Hit 20 arrows without dying",
      star2: "Finish in under 35 seconds",
      star3: "Streak of 20 (perfect run)",
    },
  },
  {
    id: 3,
    title: "Time Crunch",
    subtitle: "25 Hits in 28s",
    badge: "TIME TRIAL",
    badgeColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    taskType: "quota",
    taskDescription: "Hit 25 arrows before the 28-second clock expires. 3 hearts.",
    lives: 3,
    duration: 28,
    targetHits: 25,
    roundTime: 1.8,
    rewardSparks: 60,
    rewardDiamonds: 2,
    starGoals: {
      star1: "Reach 25 hits before time expires",
      star2: "Finish with at least 5s remaining",
      star3: "Finish with at least 8s remaining",
    },
  },
  {
    id: 4,
    title: "Flawless Protocol",
    subtitle: "No Wrong Allowed",
    badge: "NO WRONG",
    badgeColor: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    taskType: "flawless",
    taskDescription: "Hit 25 arrows with 100% accuracy. A single wrong move fails instantly.",
    lives: 1,
    noWrong: true,
    targetHits: 25,
    roundTime: 2.4,
    rewardSparks: 70,
    rewardDiamonds: 2,
    starGoals: {
      star1: "Clear 25 arrows without a single mistake",
      star2: "Average reaction speed under 360ms",
      star3: "Average reaction speed under 290ms",
    },
  },
  {
    id: 5,
    title: "Rush Clock",
    subtitle: "Survive the Drain",
    badge: "RUSH CLOCK",
    badgeColor: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    taskType: "rush",
    taskDescription: "Survive the Rush clock for 40 seconds. Hits add +0.7s; misses cost -3s!",
    lives: 999,
    duration: 40,
    roundTime: 2.0,
    onHitAddTime: 0.7,
    onMissSubTime: -3.0,
    rewardSparks: 80,
    rewardDiamonds: 2,
    starGoals: {
      star1: "Survive the full 40 seconds",
      star2: "Score at least 30 hits",
      star3: "Clock never drops below 12s",
    },
  },
  {
    id: 6,
    title: "Mirror Inversion",
    subtitle: "Reverse Reflexes",
    badge: "INVERSION",
    badgeColor: "text-pink-400 border-pink-500/30 bg-pink-500/10",
    taskType: "opposite_rush",
    taskDescription: "Clear 25 arrows. Over 70% have Swap badges requiring opposite input!",
    lives: 3,
    targetHits: 25,
    roundTime: 2.2,
    oppositeChance: 0.75,
    rewardSparks: 90,
    rewardDiamonds: 3,
    starGoals: {
      star1: "Reach 25 hits",
      star2: "Zero misses on Opposite badges",
      star3: "Accuracy 90%+",
    },
  },
  {
    id: 7,
    title: "The Furnace",
    subtitle: "40s with 1 Heart",
    badge: "1 HEART SURVIVAL",
    badgeColor: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    taskType: "survive_time",
    taskDescription: "Survive for 40 seconds of accelerated arrows with ONLY 1 Heart.",
    lives: 1,
    duration: 40,
    roundTime: 1.8,
    rewardSparks: 100,
    rewardDiamonds: 3,
    starGoals: {
      star1: "Survive the 40 seconds with 1 heart",
      star2: "Achieve at least 25 hits",
      star3: "Accuracy 95%+",
    },
  },
  {
    id: 8,
    title: "Shadow Veil",
    subtitle: "Memory Flash",
    badge: "MEMORY RECALL",
    badgeColor: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
    taskType: "memory_recall",
    taskDescription: "Clear 20 arrows. The arrow flashes for 0.7s then disappears. Trust memory.",
    lives: 2,
    targetHits: 20,
    roundTime: 2.6,
    memoryReveal: 0.7,
    rewardSparks: 120,
    rewardDiamonds: 3,
    starGoals: {
      star1: "Clear 20 memory recall arrows",
      star2: "Lose 0 hearts",
      star3: "100% accuracy",
    },
  },
  {
    id: 9,
    title: "Precision Blitz",
    subtitle: "Rapid + No Wrong",
    badge: "SPEED & NO WRONG",
    badgeColor: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    taskType: "flawless",
    taskDescription: "Clear 30 arrows at blistering 1.5s pace. No mistakes allowed!",
    lives: 1,
    noWrong: true,
    targetHits: 30,
    roundTime: 1.5,
    rewardSparks: 150,
    rewardDiamonds: 4,
    starGoals: {
      star1: "Clear 30 rapid arrows without mistake",
      star2: "Fastest reaction under 220ms (Lightning)",
      star3: "Average reaction under 290ms",
    },
  },
  {
    id: 10,
    title: "The Overdrive Core",
    subtitle: "The Ultimate Gauntlet",
    badge: "CORE OVERDRIVE",
    badgeColor: "text-red-500 border-red-500/40 bg-red-500/15",
    taskType: "survive_time",
    taskDescription: "Final sector! Survive 60 seconds with 1 Heart under escalating overdrive tempo.",
    lives: 1,
    duration: 60,
    roundTime: 1.5,
    modifiers: { hyperSpeed: true },
    rewardSparks: 250,
    rewardDiamonds: 10,
    starGoals: {
      star1: "Survive the full 60 seconds",
      star2: "Trigger Overdrive (streak 8+)",
      star3: "Reach Max Combo ×5",
    },
  },
];

export function getSurvivalLevel(levelId: number): SurvivalLevel {
  return SURVIVAL_LEVELS.find((l) => l.id === levelId) || SURVIVAL_LEVELS[0];
}

export function evaluateSurvivalStars(
  level: SurvivalLevel,
  stats: {
    cleared: boolean;
    livesLeft: number;
    hits: number;
    accuracy: number;
    avgReactionMs: number;
    fastestMs: number;
    bestStreak: number;
    timeLeft?: number;
    lowestClock?: number;
    maxComboReached?: number;
    oppositeMisses?: number;
  }
): number {
  if (!stats.cleared) return 0;
  let stars = 1; // 1 star for clearing the level

  switch (level.id) {
    case 1:
      if (stats.livesLeft >= 2) stars++;
      if (stats.accuracy >= 85) stars++;
      break;
    case 2:
      if (stats.bestStreak >= 15 || (stats.timeLeft ?? 0) >= 5) stars++;
      if (stats.bestStreak >= 20 && stats.accuracy === 100) stars++;
      break;
    case 3:
      if ((stats.timeLeft ?? 0) >= 5) stars++;
      if ((stats.timeLeft ?? 0) >= 8) stars++;
      break;
    case 4:
      if (stats.avgReactionMs > 0 && stats.avgReactionMs <= 360) stars++;
      if (stats.avgReactionMs > 0 && stats.avgReactionMs <= 290) stars++;
      break;
    case 5:
      if (stats.hits >= 30) stars++;
      if ((stats.lowestClock ?? 15) >= 12) stars++;
      break;
    case 6:
      if ((stats.oppositeMisses ?? 0) === 0) stars++;
      if (stats.accuracy >= 90) stars++;
      break;
    case 7:
      if (stats.hits >= 25) stars++;
      if (stats.accuracy >= 95) stars++;
      break;
    case 8:
      if (stats.livesLeft >= 2) stars++;
      if (stats.accuracy >= 100) stars++;
      break;
    case 9:
      if (stats.fastestMs > 0 && stats.fastestMs <= 220) stars++;
      if (stats.avgReactionMs > 0 && stats.avgReactionMs <= 290) stars++;
      break;
    case 10:
      if (stats.bestStreak >= 8) stars++;
      if ((stats.maxComboReached ?? 1) >= 5) stars++;
      break;
    default:
      if (stats.accuracy >= 90) stars++;
      if (stats.accuracy >= 98) stars++;
      break;
  }

  return Math.min(3, Math.max(1, stars));
}
