// Shared types, constants, and direction math for VECTOR.

import type { GameModifiers } from "./modifiers";

export type DirName = "N" | "E" | "S" | "W";

export type GameMode =
  | "practice"
  | "arcade"
  | "coop"
  | "waves"
  | "memory"
  | "rush"
  | "blitz"
  | "sudden"
  | "zen"
  | "versus"
  | "daily"
  | "weekly";

export type ArrowMark = "none" | "opposite" | "bonus";
export type Phase = "menu" | "countdown" | "playing" | "paused" | "over";

// ---------------------------------------------------------------- direction

export const DIR_VEC: Record<DirName, { x: number; y: number }> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};

export const DIR_GLYPH: Record<DirName, string> = { N: "▲", E: "▶", S: "▼", W: "◀" };
export const DIR_LABEL: Record<DirName, string> = { N: "up", E: "right", S: "down", W: "left" };

export const CARDINALS = [0, 90, 180, 270];
export const ALL_DIRS = [0, 45, 90, 135, 180, 225, 270, 315];

/** Directions needed to express a 8-way angle. */
export function dirsForAngle(deg: number): DirName[] {
  switch (((deg % 360) + 360) % 360) {
    case 0: return ["E"];
    case 45: return ["S", "E"];
    case 90: return ["S"];
    case 135: return ["S", "W"];
    case 180: return ["W"];
    case 225: return ["N", "W"];
    case 270: return ["N"];
    default: return ["N", "E"];
  }
}

export function oppositeAngle(deg: number): number {
  return (deg + 180) % 360;
}

/** Combine held directions into an 8-way angle. Null when they cancel out. */
export function angleFromDirs(dirs: DirName[]): number | null {
  let x = 0;
  let y = 0;
  for (const d of dirs) {
    x += DIR_VEC[d].x;
    y += DIR_VEC[d].y;
  }
  if (x === 0 && y === 0) return null;
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return ((Math.round(deg / 45) * 45) % 360 + 360) % 360;
}

/** Snap a raw screen angle to the nearest 8-way direction. */
export function snapAngle(deg: number): number {
  return ((Math.round(deg / 45) * 45) % 360 + 360) % 360;
}

// ---------------------------------------------------------------- scoring

export interface ReactionRating {
  label: string;
  bonus: number;
  color: string;
}

export function reactionRating(ms: number): ReactionRating {
  if (ms < 220) return { label: "Lightning", bonus: 15, color: "#fef08a" };
  if (ms < 340) return { label: "Perfect", bonus: 10, color: "#7df9ff" };
  if (ms < 500) return { label: "Great", bonus: 5, color: "#2ee6b6" };
  return { label: "Nice", bonus: 0, color: "rgba(255,255,255,0.75)" };
}

export const BASE_SCORE = 10;
export const DIAG_MULT = 1.6;
export const OPPOSITE_MULT = 1.8;
export const BONUS_MULT = 5;
export const OVERDRIVE_STREAK = 8;
export const COMBO_STEP = 4;
export const COMBO_CAP = 5;

// ---------------------------------------------------------------- modes

export interface ModeDef {
  label: string;
  icon: string;
  tag: string;
  desc: string;
  /** Accent color used in the game-mode carousel tiles. */
  color: string;
  /** 999 = endless. */
  lives: number;
  roundTime: number;
  untimed?: boolean;
  players: 1 | 2;
  /** Memory: seconds the arrow is visible before hiding. */
  reveal?: number;
  /** Rush/Blitz: total seconds to keep the run alive. */
  total?: number;
  /** Rush: seconds gained per hit. */
  onHit?: number;
  /** Rush: seconds lost per miss. */
  onMiss?: number;
  /** Waves: arrows per wave bonus. */
  waveSize?: number;
  /** Versus: rounds per match. */
  rounds?: number;
  /** Daily: deterministic seeded arrows. */
  seeded?: boolean;
}

export const MODES: Record<GameMode, ModeDef> = {
  practice: {
    label: "Practice", icon: "◎", tag: "untimed · unranked", color: "#34d399",
    desc: "Learn every direction at your own pace. No timer, no lost lives, no effect on your ranked progress.",
    lives: 999, roundTime: 1, players: 1, untimed: true,
  },
  arcade: {
    label: "Arcade", icon: "✦", tag: "3 lives · endless", color: "#38e8ff",
    desc: "Match the glowing arrow and climb a high score.",
    lives: 3, roundTime: 2.4, players: 1,
  },
  coop: {
    label: "Co-op", icon: "✦✦", tag: "2 players · 1 team", color: "#a78bfa",
    desc: "You on WASD, a friend on arrows. Both must hit every arrow.",
    lives: 2, roundTime: 2.8, players: 2,
  },
  waves: {
    label: "Waves", icon: "≈", tag: "5-arrow sets", color: "#38bdf8",
    desc: "Clear five arrows in a row for a wave bonus. Keep the flow.",
    lives: 3, roundTime: 2.4, players: 1, waveSize: 5,
  },
  memory: {
    label: "Memory", icon: "◍", tag: "flash · recall", color: "#f0abfc",
    desc: "The arrow flashes, then hides. Trust your memory.",
    lives: 3, roundTime: 2.6, players: 1, reveal: 0.9,
  },
  rush: {
    label: "Rush", icon: "⏱", tag: "60 second clock", color: "#fb7185",
    desc: "Every hit adds time, every miss steals it. Outlast the clock.",
    lives: 999, roundTime: 2.2, players: 1, total: 60, onHit: 0.6, onMiss: -3,
  },
  blitz: {
    label: "Blitz", icon: "⚡", tag: "30 second sprint", color: "#fbbf24",
    desc: "No lives, no mercy. Pure speed for thirty seconds.",
    lives: 999, roundTime: 1.8, players: 1, total: 30,
  },
  sudden: {
    label: "Sudden", icon: "◆", tag: "1 life", color: "#f87171",
    desc: "One mistake and it's over. Nerves of steel required.",
    lives: 1, roundTime: 2.4, players: 1,
  },
  zen: {
    label: "Zen", icon: "☾", tag: "no pressure", color: "#6ee7b7",
    desc: "No lives, slow arrows. Just flow.",
    lives: 999, roundTime: 3.2, players: 1,
  },
  versus: {
    label: "Versus", icon: "⚔", tag: "hot seat · 15 arrows", color: "#f472b6",
    desc: "Two players, one keyboard, same arrows. Most points wins.",
    lives: 999, roundTime: 2.4, players: 1, rounds: 15,
  },
  daily: {
    label: "Daily", icon: "◎", tag: "shared seed · fixed rules · UTC", color: "#fde047",
    desc: "Everyone plays the same arrows today. Same rules, same luck.",
    lives: 3, roundTime: 2.4, players: 1, seeded: true,
  },
  weekly: {
    label: "Weekly", icon: "🏆", tag: "weekly tournament · fixed rules · UTC", color: "#fbbf24",
    desc: "A fresh set of arrows every week. Climb the global tournament leaderboard.",
    lives: 3, roundTime: 2.2, players: 1, seeded: true,
  },
};

export const MODE_ORDER: GameMode[] = [
  "arcade",
  "practice",
  "coop",
  "waves",
  "memory",
  "rush",
  "blitz",
  "sudden",
  "zen",
  "versus",
  "daily",
  "weekly",
];

// ---------------------------------------------------------------- engine api

/** Everything the HUD needs, in one place. */
export interface HitFeedback {
  id: number; kind: "hit" | "miss" | "timeout"; label: string; reactionMs?: number; points?: number;
}

export interface HudState {
  feedback?: HitFeedback | null;
  score: number;
  streak: number;
  combo: number;
  overdrive: boolean;
  mark: ArrowMark;
  need: DirName[];
  lives: number;
  coopLives: [number, number];
  coopReady: [boolean, boolean];
  total: number | null;
  waveStep: number;
  waveSize: number;
  versus: { turn: 0 | 1; round: number; total: number; scores: [number, number] } | null;
  memory: "reveal" | "recall" | "";
  focusCharges: number;
  focusActive: boolean;
  focusFrac: number;
  focusAvailable: boolean;
  modifiers?: GameModifiers;
  modifierMultiplier?: number;
}

export interface GameSummary {
  challengeId?: string;
  mode: GameMode;
  score: number;
  best: number;
  newBest: boolean;
  accuracy: number;
  bestStreak: number;
  avgReactionMs: number;
  fastestMs: number;
  versus: [number, number] | null;
  winner: 0 | 1 | 2 | null; // 2 = tie
  waves: number;
  hits: number;
  perfectHits: number;
  misses: number;
  playSeconds: number;
  rank?: "SSS" | "S" | "A" | "B" | "C";
  modifierMultiplier?: number;
  xpGained?: number;
}

export interface EngineEvents {
  onPhase(phase: Phase): void;
  onHud(hud: HudState): void;
  onOver(summary: GameSummary): void;
}
