// Persistence: settings, per-mode high scores, lifetime stats.

import { HISTORY_LIMIT } from "./analytics";
import type { DirName, GameMode } from "./types";
import { persistSave } from "../firebase/cloudSave";
import { safeStorage as localStorage } from "./persistence";

export type UiMode = "dark" | "light";
export type Colorway = "cobalt" | "tangerine" | "orchid" | "spring" | "pearl";
export type ThemeId = "cyan" | "amber" | "violet" | "mono" | "aurora" | "cyber" | "emerald";
export type MusicStyle = "drive" | "pulse" | "calm";
export type AudioPack = "default" | "retro" | "ethereal" | "cyber" | "zen";
export type ParticleDensity = "full" | "reduced" | "off";
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

export const AUDIO_PACKS: { id: AudioPack; name: string; description: string }[] = [
  { id: "default", name: "Vector Synth", description: "Balanced modern electronic chimes" },
  { id: "retro", name: "Arcade 8-Bit", description: "Classic square-wave chip sounds" },
  { id: "ethereal", name: "Ethereal Glass", description: "Resonant sine-wave crystal bells" },
  { id: "cyber", name: "Cyberpunk", description: "Aggressive saw-synth and noise bursts" },
  { id: "zen", name: "Acoustic Zen", description: "Soft warm harmonic tones" },
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
  sfxVolume: number;
  musicVolume: number;
  audioPack: AudioPack;
  particleDensity: ParticleDensity;
  showFps: boolean;
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
  sfxVolume: 100,
  musicVolume: 80,
  audioPack: "default",
  particleDensity: "full",
  showFps: false,
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
    const parsed = JSON.parse(raw);
    const merged: Settings = { ...DEFAULT_SETTINGS, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      if (typeof DEFAULT_SETTINGS[key] === "boolean" && typeof merged[key] !== "boolean") (merged as any)[key] = DEFAULT_SETTINGS[key];
    }
    for (const [key, values] of Object.entries({
      uiMode: ["dark", "light"],
      colorway: COLORWAYS.map(c => c.id),
      theme: ARENA_THEMES.map(t => t.id),
      dpad: ["center", "right", "left", "hidden"],
      musicStyle: ["drive", "pulse", "calm"],
      audioPack: ["default", "retro", "ethereal", "cyber", "zen"],
      particleDensity: ["full", "reduced", "off"],
      keyPreset: ["both", "arrows", "wasd"],
    })) {
      if (!(values as string[]).includes((merged as any)[key])) (merged as any)[key] = (DEFAULT_SETTINGS as any)[key];
    }
    merged.haptics = Number.isFinite(merged.haptics) ? Math.min(100, Math.max(0, merged.haptics)) : 100;
    merged.dpadScale = Number.isFinite(merged.dpadScale) ? Math.min(125, Math.max(80, merged.dpadScale)) : 100;
    merged.sfxVolume = Number.isFinite(merged.sfxVolume) ? Math.min(100, Math.max(0, merged.sfxVolume)) : 100;
    merged.musicVolume = Number.isFinite(merged.musicVolume) ? Math.min(100, Math.max(0, merged.musicVolume)) : 80;
    if (!merged.binds || typeof merged.binds !== "object") merged.binds = {};
    if (!["normal", "medium", "large", "huge"].includes(merged.textSize)) {
      merged.textSize = "medium";
    }
    merged.binds = Object.fromEntries(Object.entries(merged.binds).filter(([d, codes]) => ["N", "E", "S", "W"].includes(d) && Array.isArray(codes)).map(([d, codes]) => [d, (codes as unknown[]).filter(c => typeof c === "string" && !["KeyF", "KeyM", "KeyP", "Escape", "Tab", "Space", "Enter"].includes(c)).slice(-2)]));
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings) {
  persistSave("settings", s);
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
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getDailyId(): string { return new Date().toISOString().slice(0, 10); }
export function scoreBucket(mode: GameMode, challengeId?: string) {
  return mode === "daily" ? `daily_${challengeId && /^\d{4}-\d{2}-\d{2}$/.test(challengeId) ? challengeId : getDailyId()}` : mode === "weekly" ? `weekly_${challengeId && /^\d{4}_W\d{1,2}$/.test(challengeId) ? challengeId : getWeeklyId()}` : mode;
}
export function loadScores(mode: GameMode, challengeId?: string): ScoreEntry[] {
  if (mode === "practice") return [];
  const scores = allScores()[scoreBucket(mode, challengeId)];
  return Array.isArray(scores) ? scores.filter(s => s && Number.isSafeInteger(s.score) && s.score >= 0).sort((a, b) => b.score - a.score) : [];
}

export function bestScore(mode: GameMode, challengeId?: string): number {
  const list = loadScores(mode, challengeId);
  return list.length ? list[0].score : 0;
}

/** Insert a score for a mode. Returns list + rank (-1 = not placed). */
export function addScore(mode: GameMode, entry: ScoreEntry, challengeId?: string): { list: ScoreEntry[]; rank: number } {
  if (mode === "practice") return { list: [], rank: -1 };
  const all = allScores();
  const list = [...loadScores(mode, challengeId), entry].sort((a, b) => b.score - a.score).slice(0, MAX_SCORES);
  all[scoreBucket(mode, challengeId)] = list;
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
  id?: string;
  runNumber?: number;
  createdAt?: number;
  hits?: number;
  misses?: number;
  perfectHits?: number;
  avgReactionMs?: number;
  fastestMs?: number;
  playSeconds?: number;
  modifierMultiplier?: number;
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
  bonusXp?: number;
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
    const parsed = raw ? JSON.parse(raw) : {};
    const stats: Stats = { ...structuredClone(EMPTY_STATS), ...(parsed && typeof parsed === "object" ? parsed : {}) };
    for (const [key, value] of Object.entries(EMPTY_STATS)) {
      if (typeof value === "number" && (typeof stats[key] !== "number" || !Number.isFinite(stats[key]) || stats[key] < 0)) stats[key] = value;
    }
    stats.bonusXp = Number.isFinite(stats.bonusXp) ? Math.max(0, stats.bonusXp ?? 0) : 0;
    stats.history = Array.isArray(stats.history) ? stats.history.filter(r => r && Number.isFinite(r.score) && typeof r.mode === "string").slice(0, HISTORY_LIMIT) : [];
    stats.modeRuns = stats.modeRuns && typeof stats.modeRuns === "object" && !Array.isArray(stats.modeRuns) ? Object.fromEntries(Object.entries(stats.modeRuns).filter(([k, v]) => typeof v === "number" && Number.isFinite(v) && v >= 0)) : {};
    return stats;
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
  extra?: { modifierMultiplier?: number; perfectHits?: number; hits?: number; misses?: number; playSeconds?: number; avgMs?: number; mode?: string; acc?: number },
): Stats {
  const s = loadStats();
  if (extra?.mode === "practice") return s;
  const gained = sparksForRun(score, bestStreak);
  const snap: RunSnap = {
    score, mode: extra?.mode ?? "arcade", acc: extra?.acc ?? 0, sparks: gained, streak: bestStreak,
    date: new Date().toLocaleDateString(),
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    runNumber: s.runs + 1, createdAt: Date.now(),
    hits: extra?.hits, misses: extra?.misses, perfectHits: extra?.perfectHits, modifierMultiplier: extra?.modifierMultiplier,
    avgReactionMs: extra?.avgMs, fastestMs: fastestMs > 0 ? fastestMs : undefined, playSeconds: extra?.playSeconds,
  };
  const modeRuns = { ...(s.modeRuns ?? {}) };
  if (extra?.mode) modeRuns[extra.mode] = (modeRuns[extra.mode] ?? 0) + 1;
  const next: Stats = {
    ...s,
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
    history: [snap, ...(s.history ?? [])].slice(0, HISTORY_LIMIT),
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
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
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
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
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
  if (!Number.isFinite(sparksCost) || sparksCost <= 0 || !Number.isFinite(diamondsGain) || diamondsGain <= 0) return null;
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
  persistSave("stats", s);
}

export function checkDailyLogin(stats: Stats): { nextStats: Stats; rewardSparks: number; rewardDiamonds: number } | null {
  stats = loadStats(); // Read the persisted claim, including React Strict Mode replays.
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

export function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return "Ace";
  // Strip HTML tags and control characters, trim whitespace, and enforce max length
  const cleaned = raw
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
    .trim()
    .slice(0, 30);
  return cleaned || "Ace";
}

export function loadName(): string {
  try {
    return sanitizeName(localStorage.getItem(NAME_KEY));
  } catch {
    return "Ace";
  }
}

export function saveName(name: string) {
  const cleanName = sanitizeName(name);
  persistSave("operativeName", cleanName);
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
export function dailySeed(challengeId = getDailyId()): number {
  const str = challengeId.split("-").map(Number).join("-");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 12345;
}

export function getWeeklyId(): string {
  const d = new Date();
  const year = d.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const diff = d.getTime() - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const week = Math.floor(diff / oneWeek);
  return `${year}_W${week}`;
}

export function weeklySeed(challengeId = getWeeklyId()): number {
  const str = challengeId;
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
