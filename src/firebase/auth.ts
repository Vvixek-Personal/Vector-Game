import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db, sanitizeFirestoreData } from "./config";
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

    // Account migration is handled atomically by bootstrapAccount.

    return user;
  } catch (error: any) {
    console.error("Google sign-in error:", error);
    if (error?.code === "auth/popup-blocked") {
      throw new Error("Popup blocked by browser. Please allow popups or open the app in a new tab.");
    }
    if (error?.code === "auth/cancelled-popup-request" || error?.code === "auth/popup-closed-by-user") {
      throw new Error("Sign-in popup was closed.");
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

// Sign out
export async function signOut(): Promise<void> {
  const { flushCloudSave } = await import("./cloudSave");
  try { await Promise.race([flushCloudSave(),new Promise((_,reject)=>setTimeout(()=>reject(new Error("Sync timeout")),4000))]); } catch { /* Per-account device save is retained. */ }
  await firebaseSignOut(auth);
}

// Sync user profile document to Firestore
export async function syncUserProfileToCloud(
  user: User,
  inGameName?: string,
  profile?: Profile,
  level?: number
): Promise<void> {
  if (!user) return;
  try {
    const userRef = doc(db, "users", user.uid);
    const data: UserProfileData = {
      userId: user.uid,
      displayName: user.displayName || inGameName || "Operative",
      email: user.email || "guest@vector.run",
      photoURL: user.photoURL || undefined,
      operativeName: inGameName,
      level,
      avatarId: profile?.avatarId,
      titleId: profile?.titleId,
      bannerId: profile?.bannerId,
      frameId: profile?.frameId,
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, sanitizeFirestoreData(data), { merge: true });
  } catch (err) {
    console.warn("Could not sync user profile to cloud:", err);
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
