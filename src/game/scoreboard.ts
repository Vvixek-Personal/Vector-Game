import type { LeaderboardRecord } from "../firebase/leaderboard";
import { MODE_ORDER, MODES, type GameMode } from "./types";
import type { ScoreEntry } from "./storage";

export type BoardMode = "overall" | Exclude<GameMode, "practice">;
export const BOARD_MODES = ["overall", ...MODE_ORDER.filter(mode => mode !== "practice")] as BoardMode[];
export function validBoardMode(value: string): BoardMode {
  return BOARD_MODES.includes(value as BoardMode) ? value as BoardMode : "overall";
}
export function rankRecords(records: LeaderboardRecord[]) {
  const sorted = records.filter(record => record && Number.isSafeInteger(record.score) && record.score >= 0)
    .sort((a, b) => b.score - a.score || (a.userName ?? "").localeCompare(b.userName ?? "") || a.id.localeCompare(b.id));
  let rank = 0;
  return sorted.map((record, index) => {
    if (index === 0 || record.score !== sorted[index - 1].score) rank = index + 1;
    return { ...record, rank };
  });
}
export function pointsToNextPlace(records: ReturnType<typeof rankRecords>, userId?: string): number | null {
  const index = records.findIndex(record => record.userId === userId);
  if (index < 0) return null;
  const next = records.slice(0, index).reverse().find(record => record.score > records[index].score);
  return next ? next.score - records[index].score + 1 : null;
}
export interface DeviceScoreRow { id: string; mode: GameMode; name: string; score: number; date: string; savedCount: number; rank: number }
export function deviceScoreRows(mode: BoardMode, getScores: (mode: GameMode) => ScoreEntry[]): DeviceScoreRow[] {
  const modes = mode === "overall" ? MODE_ORDER.filter(value => value !== "practice") : [mode];
  const rows = modes.flatMap(value => {
    const saved = getScores(value).filter(entry => entry && Number.isSafeInteger(entry.score) && entry.score > 0).sort((a,b) => b.score - a.score);
    return (mode === "overall" ? saved.slice(0,1) : saved).map((entry, index) => ({
      id: value + "-" + index, mode: value, name: mode === "overall" ? MODES[value].label : typeof entry.name === "string" && entry.name.trim() ? entry.name : "Ace",
      score: entry.score, date: typeof entry.date === "string" ? entry.date : "", savedCount: saved.length, rank: 0,
    }));
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  let rank = 0;
  return rows.map((row, index) => {
    if (index === 0 || row.score !== rows[index - 1].score) rank = index + 1;
    return { ...row, rank };
  });
}
export function challengeWindow(mode: BoardMode, now = Date.now()): { resetsAt: number; label: string } | null {
  if (mode !== "daily" && mode !== "weekly") return null;
  const date = new Date(now);
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  if (mode === "daily") return { resetsAt: midnight + 86400000, label: "Daily · resets at 00:00 UTC" };
  // Keep the existing game/save buckets: seven-day blocks starting on Jan 1, with a new bucket at New Year.
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const nextYear = Date.UTC(date.getUTCFullYear() + 1, 0, 1);
  const week = Math.floor((now - yearStart) / 604800000);
  const resetsAt = Math.min(yearStart + (week + 1) * 604800000, nextYear);
  const weekday = new Date(resetsAt).toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });
  return { resetsAt, label: "Weekly · resets " + weekday + " at 00:00 UTC" };
}
export function remainingTime(resetsAt: number, now: number): string {
  const minutes = Math.max(0, Math.ceil((resetsAt - now) / 60000));
  if (minutes < 60) return minutes + "m";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes % 1440 / 60);
  const mins = minutes % 60;
  return days ? days + "d " + hours + "h" : hours + "h " + mins + "m";
}
export function recordDate(value: unknown): string {
  if (!value || typeof value !== "object") return "Date unavailable";
  const stamp = value as { seconds?: number; toMillis?: () => number };
  const millis = typeof stamp.toMillis === "function" ? stamp.toMillis() : typeof stamp.seconds === "number" ? stamp.seconds * 1000 : NaN;
  return Number.isFinite(millis) ? new Date(millis).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Date unavailable";
}
