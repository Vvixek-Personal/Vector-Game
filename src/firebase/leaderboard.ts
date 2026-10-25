import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { db, auth, sanitizeFirestoreData } from "./config";
import type { Profile } from "../game/profile";
import type { GameMode } from "../game/types";
import { TITLES } from "../game/profile";
import { scoreBucket, getDailyId, getWeeklyId } from "../game/storage";

export interface LeaderboardRecord {
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
  level: number;
}

// Publish a completed run score to the real cloud Firestore leaderboard
export async function submitScoreToCloud(
  paramsOrMode: ScoreSubmissionParams | GameMode,
  scoreArg?: number,
  streakArg?: number,
  operativeNameArg?: string,
  profileArg?: Profile,
  levelArg?: number
): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (paramsOrMode === "practice" || (typeof paramsOrMode === "object" && paramsOrMode.mode === "practice")) return false;

  let mode: GameMode;
  let score: number;
  let streak: number;
  let operativeName: string;
  let userPhoto: string | undefined;
  let avatarId: string | undefined;
  let frameId: string | undefined;
  let useGooglePfp: boolean | undefined;
  let titleName: string;
  let level: number;

  if (typeof paramsOrMode === "object") {
    mode = paramsOrMode.mode;
    score = paramsOrMode.score;
    streak = paramsOrMode.streak;
    operativeName = paramsOrMode.userName || "Operative";
    userPhoto = paramsOrMode.userPhoto;
    avatarId = paramsOrMode.avatarId;
    frameId = paramsOrMode.frameId;
    useGooglePfp = paramsOrMode.useGooglePfp;
    titleName = paramsOrMode.title || "Operative";
    level = paramsOrMode.level;
  } else {
    mode = paramsOrMode;
    score = scoreArg ?? 0;
    streak = streakArg ?? 0;
    operativeName = operativeNameArg || "Operative";
    titleName = profileArg ? (TITLES.find((t) => t.id === profileArg.titleId)?.name || "Operative") : "Operative";
    level = levelArg ?? 0;
  }

  const modeString = scoreBucket(mode, typeof paramsOrMode === "object" ? paramsOrMode.challengeId : undefined);

  if (!currentUser || !Number.isSafeInteger(score) || score <= 0 || !Number.isSafeInteger(streak) || streak < 0) return false;

  try {
    const docId = `${currentUser.uid}_${modeString}`;
    const scoreRef = doc(db, "leaderboard", docId);

    const payload: LeaderboardRecord = {
      id: docId,
      userId: currentUser.uid,
      userName: (operativeName.trim() || currentUser.displayName || "Operative").slice(0, 30),
      userPhoto: userPhoto || currentUser.photoURL || null as unknown as undefined,
      avatarId: avatarId || "spark",
      frameId: frameId || "none",
      useGooglePfp: typeof useGooglePfp === "boolean" ? useGooglePfp : false,
      title: titleName,
      level,
      mode: modeString,
      score,
      streak,
      updatedAt: serverTimestamp(),
    };

    return await runTransaction(db, async transaction => {
      const overallRef = doc(db, 'leaderboard', currentUser.uid + '_overall');
      const [existing, overall] = await Promise.all([transaction.get(scoreRef), transaction.get(overallRef)]);
      const previous = existing.exists() ? existing.data().score ?? 0 : 0;
      if (previous >= score) return false;
      const overallData = overall.exists() ? overall.data() : {};
      transaction.set(scoreRef, sanitizeFirestoreData(payload));
      transaction.set(overallRef, sanitizeFirestoreData({ ...payload, id: currentUser.uid + '_overall', mode: 'overall',
        score: Math.max(0, (overallData.score ?? 0) + score - previous),
        streak: Math.max(overallData.streak ?? 0, streak),
      }));
      return true;
    });
  } catch (error) {
    console.warn("Could not submit score to cloud leaderboard:", error);
    return false;
  }
}

export { submitScoreToCloud as submitScore };

// Subscribe to real-time leaderboard entries for any mode or overall
export function subscribeToLeaderboard(
  mode: string,
  callback: (entries: LeaderboardRecord[]) => void,
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
      (snapshot) => {
        if (snapshot.empty) {
          callback([]);
          return;
        }

        const list: LeaderboardRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as LeaderboardRecord);
        });

        callback(list);
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
