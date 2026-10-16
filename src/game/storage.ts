// Persistence: settings, per-mode high scores, lifetime stats.

import type { DirName, GameMode } from "./types";
import { auth, db, sanitizeFirestoreData } from "../firebase/config";
import { doc, setDoc } from "firebase/firestore";

export type UiMode = "dark" | "light";
export type Colorway = "cobalt" | "tangerine" | "orchid" | "spring" | "pearl";
export type ThemeId = "cyan" | "amber" | "violet" | "mono" | "aurora" | "cyber" | "emerald";
export type MusicStyle = "drive" | "pulse" | "calm";
export type PadPosition = "center" | "right" | "left" | "hidden";
export type KeyPreset = "both" | "arrows" | "wasd";
export type BindDir = DirName;
export type TextSize = "normal" | "medium" | "large" | "huge";

export const TEXT_SIZES: { id: TextSize; label: string; scale: number; description: string }[] = [
  { id: "normal", label: "Normal", scale: 1.0, description: "Compact baseline text" },
  { id: "medium", label: "Medium", scale: 1.08, description: "Slightly enlarged, comfortable text" },
  { id: "large", label: "Large", scale: 1.20, description: "Large, high-readability text" },
  { id: "huge", label: "Huge", scale: 1.34, description: "Extra large text for maximum clarity" },
];

export const COLORWAYS: { id: Colorway; name: string; swatch: string }[] = [
  { id: "cobalt", name: "Cobalt", swatch: "#3ec9ff" },
  { id: "tangerine", name: "Tangerine", swatch: "#ff9d4d" },
  { id: "orchid", name: "Orchid", swatch: "#b389ff" },
  { id: "spring", name: "Spring", swatch: "#34d399" },
  { id: "pearl", name: "Pearl", swatch: "#94a3b8" },
];

export const ARENA_THEMES: { id: ThemeId; name: string }[] = [
  { id: "cyan", name: "Ion" },
  { id: "amber", name: "Solar" },
  { id: "violet", name: "Phase" },
  { id: "mono", name: "Mono" },
  { id: "aurora", name: "Aurora" },
  { id: "cyber", name: "Cyber" },
  { id: "emerald", name: "Emerald" },
];

export interface Settings {
  uiMode: UiMode;
  colorway: Colorway;
  theme: ThemeId;
  dpad: PadPosition;
  dpadScale: number;
  reducedMotion: boolean;
  highContrast: boolean;
  largeUi: boolean;
  leftHanded: boolean;
  announcer: boolean;
  haptics: number;
  hapticsKind: boolean;
  screenShake: boolean;
  confirmPlay: boolean;
  showHints: boolean;
  scoreFloats: boolean;
  compactHud: boolean;
  colorBlind: boolean;
  autoPauseBlur: boolean;
  musicStyle: MusicStyle;
  soundEnabled: boolean;
  keyPreset: KeyPreset;
  /** Custom solo binds: direction -> key codes. Merged on top of preset defaults. */
  binds: Partial<Record<BindDir, string[]>>;
  textSize: TextSize;
}

const DEFAULT_SETTINGS: Settings = {
  uiMode: "dark",
  colorway: "cobalt",
  theme: "cyan",
  dpad: "center",
  dpadScale: 100,
  reducedMotion: false,
  highContrast: false,
  largeUi: false,
  leftHanded: false,
  announcer: false,
  haptics: 100,
  hapticsKind: true,
  screenShake: true,
  confirmPlay: false,
  showHints: true,
  scoreFloats: true,
  compactHud: false,
  colorBlind: false,
  autoPauseBlur: true,
  musicStyle: "drive",
  soundEnabled: true,
  keyPreset: "both",
  binds: {},
  textSize: "medium",
};

const SETTINGS_KEY = "vector_settings_v5";
const NAME_KEY = "vector_player_name";
const TUTORIAL_KEY = "vector_tutorial_seen_v2";
const SCORE_KEY = "vector_scores_v5";
const STATS_KEY = "vector_stats_v5";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const merged: Settings = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
    if (!merged.binds || typeof merged.binds !== "object") merged.binds = {};
    if (!["normal", "medium", "large", "huge"].includes(merged.textSize)) {
      merged.textSize = "medium";
    }
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
  if (auth?.currentUser) {
    setDoc(doc(db, "users", auth.currentUser.uid), sanitizeFirestoreData({ settings: s }), { merge: true }).catch(console.warn);
  }
}

// ---------------------------------------------------------------- key binds

export function defaultBindCodes(preset: KeyPreset): Record<DirName, string[]> {
  const arrows: Record<DirName, string> = {
    N: "ArrowUp", E: "ArrowRight", S: "ArrowDown", W: "ArrowLeft",
  };
  const wasd: Record<DirName, string> = { N: "KeyW", E: "KeyD", S: "KeyS", W: "KeyA" };
  const out: Record<DirName, string[]> = { N: [], E: [], S: [], W: [] };
  for (const d of ["N", "E", "S", "W"] as DirName[]) {
    if (preset === "both" || preset === "arrows") out[d].push(arrows[d]);
    if (preset === "both" || preset === "wasd") out[d].push(wasd[d]);
  }
  return out;
}

export function codeLabel(code: string): string {
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1];
  const digit = /^Digit([0-9])$/.exec(code);
  if (digit) return digit[1];
  const map: Record<string, string> = {
    ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
    Space: "Space", Enter: "Enter",
  };
  return map[code] ?? code.replace("Numpad", "Num").slice(0, 10);
}

/** Preset defaults merged with custom binds, as code -> direction. */
export function resolveKeyMap(settings: Settings): Map<string, DirName> {
  const map = new Map<string, DirName>();
  const defaults = defaultBindCodes(settings.keyPreset);
  for (const d of ["N", "E", "S", "W"] as DirName[]) {
    for (const code of defaults[d]) map.set(code, d);
    for (const code of settings.binds[d] ?? []) map.set(code, d);
  }
  return map;
}

// ---------------------------------------------------------------- scores

export interface ScoreEntry {
  score: number;
  name: string;
  date: string;
}

const MAX_SCORES = 8;

function allScores(): Record<string, ScoreEntry[]> {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ScoreEntry[]>) : {};
  } catch {
    return {};
  }
}

export function loadScores(mode: GameMode): ScoreEntry[] {
  return allScores()[mode] ?? [];
}

export function bestScore(mode: GameMode): number {
  const list = loadScores(mode);
  return list.length ? list[0].score : 0;
}

/** Insert a score for a mode. Returns list + rank (-1 = not placed). */
export function addScore(mode: GameMode, entry: ScoreEntry): { list: ScoreEntry[]; rank: number } {
  const all = allScores();
  const list = [...(all[mode] ?? []), entry].sort((a, b) => b.score - a.score).slice(0, MAX_SCORES);
  all[mode] = list;
  try {
    localStorage.setItem(SCORE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  return { list, rank: list.findIndex((e) => e === entry) };
}

// ---------------------------------------------------------------- stats

export interface RunSnap {
  score: number;
  mode: string;
  acc: number;
  sparks: number;
  streak: number;
  date: string;
}

export interface Stats {
  runs: number;
  totalScore: number;
  bestStreak: number;
  fastestMs: number;
  sparks: number;
  sparksEarned: number;
  hits: number;
  misses: number;
  playSeconds: number;
  reactionTotal: number;
  reactionCount: number;
  sparksSpent: number;
  diamonds: number;
  history: RunSnap[];
  modeRuns: Record<string, number>;
  loginStreak?: number;
  lastLoginDate?: string;
}

const EMPTY_STATS: Stats = {
  runs: 0, totalScore: 0, bestStreak: 0, fastestMs: 9999, sparks: 0, sparksEarned: 0,
  hits: 0, misses: 0, playSeconds: 0, reactionTotal: 0, reactionCount: 0, sparksSpent: 0,
  diamonds: 0,
  history: [], modeRuns: {},
  loginStreak: 0, lastLoginDate: "",
};

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? { ...EMPTY_STATS, ...(JSON.parse(raw) as Partial<Stats>) } : { ...EMPTY_STATS };
  } catch {
    return { ...EMPTY_STATS };
  }
}

/** Sparks awarded for a finished run. Always at least 1 if you scored. */
export function sparksForRun(score: number, bestStreak: number): number {
  if (score <= 0) return 0;
  return Math.max(1, Math.round(score / 8) + Math.floor(bestStreak / 4) * 3);
}

export function recordRun(
  score: number,
  bestStreak: number,
  fastestMs: number,
  extra?: { hits?: number; misses?: number; playSeconds?: number; avgMs?: number; mode?: string; acc?: number },
): Stats {
  const s = loadStats();
  const gained = sparksForRun(score, bestStreak);
  const snap: RunSnap = {
    score, mode: extra?.mode ?? "arcade", acc: extra?.acc ?? 0, sparks: gained, streak: bestStreak,
    date: new Date().toLocaleDateString(),
  };
  const modeRuns = { ...(s.modeRuns ?? {}) };
  if (extra?.mode) modeRuns[extra.mode] = (modeRuns[extra.mode] ?? 0) + 1;
  const next: Stats = {
    runs: s.runs + 1,
    totalScore: s.totalScore + score,
    bestStreak: Math.max(s.bestStreak, bestStreak),
    fastestMs: fastestMs ? Math.min(s.fastestMs || 9999, fastestMs) : s.fastestMs,
    sparks: (s.sparks ?? 0) + gained,
    sparksEarned: (s.sparksEarned ?? 0) + gained,
    hits: (s.hits ?? 0) + (extra?.hits ?? 0),
    misses: (s.misses ?? 0) + (extra?.misses ?? 0),
    playSeconds: (s.playSeconds ?? 0) + (extra?.playSeconds ?? 0),
    reactionTotal: (s.reactionTotal ?? 0) + (extra?.avgMs ?? 0) * (extra?.hits ?? 0),
    reactionCount: (s.reactionCount ?? 0) + (extra?.hits ?? 0),
    sparksSpent: s.sparksSpent ?? 0,
    diamonds: s.diamonds ?? 0,
    history: [snap, ...(s.history ?? [])].slice(0, 24),
    modeRuns,
  };
  try {
    saveStats(next);
  } catch {
    /* ignore */
  }
  return next;
}

export function spendSparks(amount: number): Stats | null {
  const s = loadStats();
  if ((s.sparks ?? 0) < amount) return null;
  const next = { ...s, sparks: s.sparks - amount, sparksSpent: (s.sparksSpent ?? 0) + amount };
  try {
    saveStats(next);
  } catch {
    /* ignore */
  }
  return next;
}

export function spendDiamonds(amount: number): Stats | null {
  const s = loadStats();
  if ((s.diamonds ?? 0) < amount) return null;
  const next = { ...s, diamonds: s.diamonds - amount };
  try {
    saveStats(next);
  } catch {
    /* ignore */
  }
  return next;
}

export function convertSparksToDiamonds(sparksCost: number, diamondsGain: number): Stats | null {
  const s = loadStats();
  if ((s.sparks ?? 0) < sparksCost) return null;
  const next = {
    ...s,
    sparks: s.sparks - sparksCost,
    sparksSpent: (s.sparksSpent ?? 0) + sparksCost,
    diamonds: (s.diamonds ?? 0) + diamondsGain,
  };
  try {
    saveStats(next);
  } catch {
    /* ignore */
  }
  return next;
}

export function saveStats(s: Stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
  if (auth?.currentUser) {
    setDoc(doc(db, "users", auth.currentUser.uid), sanitizeFirestoreData({ stats: s }), { merge: true }).catch(console.warn);
  }
}

export function checkDailyLogin(stats: Stats): { nextStats: Stats; rewardSparks: number; rewardDiamonds: number } | null {
  const now = new Date();
  const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  if (stats.lastLoginDate === today) return null; // Already logged in today

  let streak = stats.loginStreak || 0;
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = `${yesterdayDate.getFullYear()}-${yesterdayDate.getMonth() + 1}-${yesterdayDate.getDate()}`;

  if (stats.lastLoginDate === yesterday) {
    streak++;
  } else {
    streak = 1; // Broken streak
  }

  // Define rewards based on streak
  // Day 7: 50 Sparks + 5 Diamonds
  // Day 3: 20 Sparks
  // Other days: 10 Sparks
  let sparks = 10;
  let diamonds = 0;
  
  const cycleDay = ((streak - 1) % 7) + 1;
  if (cycleDay === 7) {
    sparks = 50;
    diamonds = 5;
  } else if (cycleDay === 3) {
    sparks = 20;
  }

  const nextStats: Stats = {
    ...stats,
    loginStreak: streak,
    lastLoginDate: today,
    sparks: (stats.sparks || 0) + sparks,
    diamonds: (stats.diamonds || 0) + diamonds,
    sparksEarned: (stats.sparksEarned || 0) + sparks,
  };

  saveStats(nextStats);
  return { nextStats, rewardSparks: sparks, rewardDiamonds: diamonds };
}

// ---------------------------------------------------------------- misc

export function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "Ace";
  } catch {
    return "Ace";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
  if (auth?.currentUser) {
    setDoc(doc(db, "users", auth.currentUser.uid), sanitizeFirestoreData({ operativeName: name || "Operative" }), { merge: true }).catch(console.warn);
  }
}

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function resetTutorial() {
  try {
    localStorage.removeItem(TUTORIAL_KEY);
  } catch {
    /* ignore */
  }
}

/** Deterministic seed for the Daily mode. */
export function dailySeed(): number {
  const d = new Date();
  const str = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 12345;
}

export function getWeeklyId(): string {
  const d = new Date();
  const year = d.getFullYear();
  const start = new Date(year, 0, 1);
  const diff = (d.getTime() - start.getTime()) + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60000;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const week = Math.floor(diff / oneWeek);
  return `${year}_W${week}`;
}

export function weeklySeed(): number {
  const str = getWeeklyId();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 12345;
}

export function dailyLabel(): string {
  return new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
