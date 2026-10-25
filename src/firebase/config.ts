import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Initialize Cloud Firestore using the designated databaseId if present
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Verify connection per Firebase integration guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore connection check: client is offline or initializing.");
    }
    return false;
  }
}

// Connection checks are explicit; startup must work offline.

/**
 * Recursively strips any `undefined` values from an object or array before
 * writing to Firestore, preventing "Unsupported field value: undefined" errors.
 * Preserves Date, FieldValue (serverTimestamp, deleteField, etc.), and primitives.
 */
export function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof data === "function") {
    return undefined as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined && typeof item !== "function")
      .map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }
  if (typeof data === "object") {
    // Keep special non-plain objects as-is (e.g. FieldValue, Timestamp, Date)
    if (data.constructor && data.constructor.name !== "Object") {
      return data;
    }
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined && typeof value !== "function") {
        clean[key] = sanitizeFirestoreData(value);
      }
    }
    return clean as unknown as T;
  }
  return data;
}
