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
  type Unsubscribe,
} from "firebase/firestore";
import { db, auth, sanitizeFirestoreData } from "./config";
import type { Profile } from "../game/profile";
import type { GameMode } from "../game/types";
import { TITLES } from "../game/profile";
import { getWeeklyId } from "../game/storage";

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

  const modeString = mode === "weekly" ? `weekly_${getWeeklyId()}` : mode;

  if (!currentUser || score <= 0) return false;

  try {
    const docId = `${currentUser.uid}_${modeString}`;
    const scoreRef = doc(db, "leaderboard", docId);

    // Check if existing record is higher
    const existingSnap = await getDoc(scoreRef);
    if (existingSnap.exists()) {
      const prevData = existingSnap.data() as LeaderboardRecord;
      if (prevData.score >= score) {
        // Did not beat personal best in this mode
        return false;
      }
    }

    const payload: LeaderboardRecord = {
      id: docId,
      userId: currentUser.uid,
      userName: operativeName.trim() || currentUser.displayName || "Operative",
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

    await setDoc(scoreRef, sanitizeFirestoreData(payload));

    // Also update Overall Leaderboard record
    await updateOverallScore(currentUser.uid, payload.userName, payload.userPhoto, payload.avatarId, payload.frameId, payload.useGooglePfp, titleName, level);

    return true;
  } catch (error) {
    console.warn("Could not submit score to cloud leaderboard:", error);
    return false;
  }
}

export { submitScoreToCloud as submitScore };

// Calculate and update user's overall leaderboard record
async function updateOverallScore(
  userId: string,
  userName: string,
  userPhoto: string | undefined,
  avatarId: string | undefined,
  frameId: string | undefined,
  useGooglePfp: boolean | undefined,
  title: string,
  level: number
) {
  try {
    const overallDocId = `${userId}_overall`;
    const overallRef = doc(db, "leaderboard", overallDocId);

    // Query all user's mode scores to calculate overall combined score
    const userScoresQuery = query(
      collection(db, "leaderboard"),
      where("userId", "==", userId)
    );

    const scoresSnap = await getDocs(userScoresQuery);
    let totalScore = 0;
    let maxStreak = 0;

    scoresSnap.forEach((docSnap) => {
      const data = docSnap.data() as LeaderboardRecord;
      if (data.mode !== "overall") {
        totalScore += data.score;
        maxStreak = Math.max(maxStreak, data.streak);
      }
    });

    // Update overall with updated score
    await setDoc(
      overallRef,
      sanitizeFirestoreData({
        id: overallDocId,
        userId,
        userName: userName || "Operative",
        userPhoto: userPhoto || null,
        avatarId: avatarId || "spark",
        frameId: frameId || "none",
        useGooglePfp: typeof useGooglePfp === "boolean" ? useGooglePfp : false,
        title: title || "Operative",
        level: level ?? 0,
        mode: "overall",
        score: Math.max(totalScore, 0),
        streak: maxStreak,
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn("Overall score update error:", err);
  }
}

// Subscribe to real-time leaderboard entries for any mode or overall
export function subscribeToLeaderboard(
  mode: string,
  callback: (entries: LeaderboardRecord[]) => void
): Unsubscribe {
  try {
    const modeString = mode === "weekly" ? `weekly_${getWeeklyId()}` : mode;
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
      }
    );
  } catch (err) {
    console.warn("Leaderboard subscription error:", err);
    callback([]);
    return () => {};
  }
}
