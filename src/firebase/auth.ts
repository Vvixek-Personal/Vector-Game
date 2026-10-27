import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db, sanitizeFirestoreData } from "./config";
import { flushCloudSave } from "./cloudSave";
import { flushAccountState } from "./accounts";
import { retryPendingScores } from "./leaderboard";
import type { Profile } from "../game/profile";
import { useEffect, useState } from "react";

export interface UserProfileData {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  operativeName?: string;
  level?: number;
  avatarId?: string;
  titleId?: string;
  bannerId?: string;
  frameId?: string;
  updatedAt?: any;
}

// Sign in with Google Popup
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Immediately trigger cloud profile sync for Google user
    try {
      await syncUserProfileToCloud(user);
    } catch {
      /* ignore background profile sync failure */
    }

    return user;
  } catch (error: any) {
    console.error("Google sign-in error:", error);
    if (error?.code === "auth/popup-blocked") {
      throw new Error("Popup blocked by browser. Please allow popups or open the app in a new tab.");
    }
    if (error?.code === "auth/cancelled-popup-request" || error?.code === "auth/popup-closed-by-user") {
      throw new Error("Sign-in popup was closed.");
    }
    if (error?.code === "auth/network-request-failed") {
      throw new Error("Network request failed. Please check your internet connection.");
    }
    if (error?.code === "auth/unauthorized-domain") {
      throw new Error("Current app domain is not yet authorized in Firebase Auth settings.");
    }
    throw error;
  }
}

// Sign in anonymously (for guest runners who still want cloud score tracking)
export async function signInAsGuest(): Promise<User> {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Guest sign-in error:", error);
    throw error;
  }
}

// Sign out: persist the account snapshot first, then switch back to the
// isolated guest save. Account progress remains in its own cloud/device slot.
export async function signOut(): Promise<void> {
  try {
    await Promise.race([
      Promise.allSettled([flushAccountState(), flushCloudSave(), retryPendingScores()]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Sync timeout")), 6000)),
    ]);
  } catch {
    /* Per-account device save is retained and retried on the next sign-in. */
  }
  await firebaseSignOut(auth);
}

// Publish the small public player record used by the gift directory.
// Private account state is written only by the account service/fallback.
export async function syncUserProfileToCloud(
  user: User,
  inGameName?: string,
  profile?: Profile,
  level?: number
): Promise<void> {
  if (!user || user.isAnonymous) return;
  const name = (inGameName || user.displayName || "Operative").slice(0, 30);
  const owner = user.emailVerified && String(user.email || "").toLowerCase() === "personal.me.vivek@gmail.com";
  const player = {
    uid: user.uid,
    name,
    displayName: name,
    searchName: name.toLowerCase(),
    email: user.email || "",
    avatarId: profile?.avatarId || "spark",
    frameId: profile?.frameId || "none",
    photoURL: owner ? profile?.customPhotoURL || null : null,
    role: owner ? "developer" : "player",
    ownerAccount: owner,
    developerUntil: 0,
    level: Math.max(1, Number(level) || 1),
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(doc(db, "players", user.uid), sanitizeFirestoreData(player), { merge: true });
  } catch (err) {
    console.warn("Could not publish the public player record:", err);
  }
}

// React Hook for Auth State
export function useAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading, isAnonymous: user?.isAnonymous ?? false };
}
