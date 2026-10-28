import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, connectFirestoreEmulator } from "firebase/firestore";

const env = import.meta.env;
const clientConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: env.VITE_FIREBASE_PROJECT_ID?.trim(),
  appId: env.VITE_FIREBASE_APP_ID?.trim(),
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
};
export const firebaseEnabled = Boolean(clientConfig.apiKey && clientConfig.authDomain && clientConfig.projectId && clientConfig.appId);
export const useFirebaseEmulators = Boolean(env.DEV && env.VITE_VECTOR_EMULATORS === "true");

// Firebase web config is public client configuration, not a server secret.
// VITE_* values are included in browser builds; never put Gemini/service-account secrets here.
const firebaseConfig = firebaseEnabled ? clientConfig : {
  apiKey: "local-disabled-key",
  authDomain: "localhost",
  projectId: "demo-vector",
  appId: "1:000000000000:web:local-disabled",
};

export const app = getApps().length > 0
  ? getApp()
  : initializeApp(useFirebaseEmulators ? { ...firebaseConfig, projectId: "demo-vector" } : firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const databaseId = env.VITE_FIREBASE_DATABASE_ID?.trim();
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

if (useFirebaseEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export async function testFirestoreConnection(): Promise<boolean> {
  if (!firebaseEnabled) return false;
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

/** Recursively strip undefined values before Firestore writes. */
export function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data === "function") return undefined as unknown as T;
  if (Array.isArray(data)) {
    return data.filter((item) => item !== undefined && typeof item !== "function").map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }
  if (typeof data === "object") {
    if (data.constructor && data.constructor.name !== "Object") return data;
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined && typeof value !== "function") clean[key] = sanitizeFirestoreData(value);
    }
    return clean as unknown as T;
  }
  return data;
}
