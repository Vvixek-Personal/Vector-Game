import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db, auth, sanitizeFirestoreData } from "./config";
import { safeStorage, getSaveScope } from "../game/persistence";
import type { Profile } from "../game/profile";
import type { GameMode } from "../game/types";
import { TITLES } from "../game/profile";
import { scoreBucket, getDailyId, getWeeklyId } from "../game/storage";

export interface LeaderboardRecord {
  role?: "player" | "moderator" | "developer";
  ownerAccount?: boolean;
  developerUntil?: number;
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  avatarId?: string;
  frameId?: string;
  useGooglePfp?: boolean;
  title?: string;
  level: number;
  mode: string;
  score: number;
  streak: number;
  updatedAt?: any;
}

export interface ScoreSubmissionParams {
  challengeId?: string;
  mode: GameMode;
  score: number;
  streak: number;
  userName?: string;
  userPhoto?: string;
  avatarId?: string;
  frameId?: string;
  useGooglePfp?: boolean;
  title?: string;
  role?: "player" | "moderator" | "developer";
  ownerAccount?: boolean;
  developerUntil?: number;
  level: number;
}

interface PendingScore {
  id: string;
  uid: string;
  params: ScoreSubmissionParams;
  createdAt: number;
}

const PENDING_SCORES_KEY = "vector_pending_leaderboard_scores_v1";

function normalizeParams(
  paramsOrMode: ScoreSubmissionParams | GameMode,
  scoreArg?: number,
  streakArg?: number,
  operativeNameArg?: string,
  profileArg?: Profile,
  levelArg?: number
): ScoreSubmissionParams | null {
  if (paramsOrMode === "practice" || (typeof paramsOrMode === "object" && paramsOrMode.mode === "practice")) return null;
  if (typeof paramsOrMode === "object") return paramsOrMode;
  return {
    mode: paramsOrMode,
    score: scoreArg ?? 0,
    streak: streakArg ?? 0,
    userName: operativeNameArg || "Operative",
    title: profileArg ? (TITLES.find((t) => t.id === profileArg.titleId)?.name || "Operative") : "Operative",
    avatarId: profileArg?.avatarId,
    frameId: profileArg?.frameId,
    useGooglePfp: profileArg?.accessRole === "developer" && !!profileArg.customPhotoURL,
    userPhoto: profileArg?.customPhotoURL || undefined,
    role: profileArg?.accessRole === "developer" || profileArg?.accessRole === "moderator" ? profileArg.accessRole : "player",
    level: levelArg ?? 0,
  };
}

function readPendingScores(): PendingScore[] {
  try {
    const parsed = JSON.parse(safeStorage.getItem(PENDING_SCORES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((entry) => entry?.params && Number.isSafeInteger(entry.params.score)) : [];
  } catch {
    return [];
  }
}

function writePendingScores(entries: PendingScore[]) {
  try {
    safeStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(entries.slice(-30)));
  } catch {
    /* device storage is unavailable; the current run still has a local score */
  }
}

function queueScore(params: ScoreSubmissionParams, currentUser: { uid: string }) {
  const bucket = scoreBucket(params.mode, params.challengeId);
  const id = `${currentUser.uid}_${bucket}_${params.score}_${params.streak}`;
  const entries = readPendingScores();
  if (!entries.some((entry) => entry.id === id)) {
    entries.push({ id, uid: currentUser.uid, params, createdAt: Date.now() });
    writePendingScores(entries);
  }
}

type ScoreWriteStatus = "published" | "current" | "failed";

/** Write one verified personal best. "current" means a newer best already exists. */
async function writeScoreToCloud(params: ScoreSubmissionParams): Promise<ScoreWriteStatus> {
  const currentUser = auth.currentUser;
  if (!currentUser) return "failed";
  const { mode, score, streak, challengeId } = params;
  if (!Number.isSafeInteger(score) || score <= 0 || !Number.isSafeInteger(streak) || streak < 0) return "current";

  const modeString = scoreBucket(mode, challengeId);
  const docId = `${currentUser.uid}_${modeString}`;
  const scoreRef = doc(db, "leaderboard", docId);
  const overallRef = doc(db, "leaderboard", `${currentUser.uid}_overall`);
  const payload: LeaderboardRecord = {
    id: docId,
    userId: currentUser.uid,
    userName: (params.userName?.trim() || currentUser.displayName || "Operative").slice(0, 30),
    userPhoto: params.userPhoto || currentUser.photoURL || null as unknown as undefined,
    avatarId: params.avatarId || "spark",
    frameId: params.frameId || "none",
    useGooglePfp: params.useGooglePfp ?? false,
    title: params.title || "Operative",
    role: params.role || "player",
    ownerAccount: !!params.ownerAccount,
    developerUntil: params.developerUntil || 0,
    level: Math.max(0, Math.floor(Number(params.level) || 0)),
    mode: modeString,
    score,
    streak,
    updatedAt: serverTimestamp(),
  };

  try {
    return await runTransaction(db, async (transaction) => {
      const [existing, overall] = await Promise.all([transaction.get(scoreRef), transaction.get(overallRef)]);
      const previous = existing.exists() ? Number(existing.data().score) || 0 : 0;
      if (previous >= score) return "current";
      const overallData = overall.exists() ? overall.data() : {};
      transaction.set(scoreRef, sanitizeFirestoreData(payload));
      transaction.set(overallRef, sanitizeFirestoreData({
        ...payload,
        id: `${currentUser.uid}_overall`,
        mode: "overall",
        score: Math.max(0, (Number(overallData.score) || 0) + score - previous),
        streak: Math.max(Number(overallData.streak) || 0, streak),
      }));
      return "published";
    });
  } catch (error) {
    console.warn("Could not submit score to cloud leaderboard:", error);
    return "failed";
  }
}

/**
 * Publish a completed run. Failed authenticated writes are kept in the
 * account's device slot and retried on sign-in or reconnection.
 */
export async function submitScoreToCloud(
  paramsOrMode: ScoreSubmissionParams | GameMode,
  scoreArg?: number,
  streakArg?: number,
  operativeNameArg?: string,
  profileArg?: Profile,
  levelArg?: number
): Promise<boolean> {
  const params = normalizeParams(paramsOrMode, scoreArg, streakArg, operativeNameArg, profileArg, levelArg);
  if (!params) return false;
  const currentUser = auth.currentUser;
  if (!currentUser || params.mode === "practice" || params.score <= 0) return false;
  const status = await writeScoreToCloud(params);
  if (status === "failed") queueScore(params, currentUser);
  return status === "published";
}

export { submitScoreToCloud as submitScore };

/** Retry scores saved while offline or before account services became ready. */
export async function retryPendingScores(): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid || getSaveScope() !== uid) return 0;
  const pending = readPendingScores();
  if (!pending.length) return 0;
  const remaining: PendingScore[] = [];
  let published = 0;
  for (const entry of pending) {
    if (entry.uid !== uid) continue;
    const status = await writeScoreToCloud(entry.params);
    if (status === "failed") remaining.push(entry);
    else if (status === "published") published++;
  }
  writePendingScores(remaining);
  return published;
}

export function pendingScoreCount(): number {
  const uid = auth.currentUser?.uid;
  if (!uid || getSaveScope() !== uid) return 0;
  return readPendingScores().filter((entry) => entry.uid === uid).length;
}

// Subscribe to real-time leaderboard entries for any mode or overall
export function subscribeToLeaderboard(
  mode: string,
  callback: (entries: LeaderboardRecord[], metadata?: { fromCache: boolean }) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  try {
    const modeString = mode === "weekly" ? `weekly_${getWeeklyId()}` : mode === "daily" ? `daily_${getDailyId()}` : mode;
    const q = query(
      collection(db, "leaderboard"),
      where("mode", "==", modeString),
      orderBy("score", "desc"),
      limit(50)
    );

    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.empty) {
          callback([], { fromCache: snapshot.metadata.fromCache });
          return;
        }
        const list: LeaderboardRecord[] = [];
        snapshot.forEach((docSnap) => list.push({ ...docSnap.data(), id: docSnap.id } as LeaderboardRecord));
        callback(list, { fromCache: snapshot.metadata.fromCache });
      },
      (error) => {
        console.warn("Leaderboard snapshot listener warning:", error);
        callback([]);
        onError?.(error);
      }
    );
  } catch (err) {
    console.warn("Leaderboard subscription error:", err);
    callback([]);
    onError?.(err);
    return () => {};
  }
}
