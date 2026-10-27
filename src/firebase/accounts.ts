import { useSyncExternalStore } from "react";
import { doc, onSnapshot, getDoc, setDoc, getDocs, collection, query, limit, addDoc, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import type { User } from "firebase/auth";
import { app, auth, db, sanitizeFirestoreData } from "./config";
import { safeStorage, setSaveScope, getSaveScope } from "../game/persistence";
import { beginCloudSync, completeCloudSync, queueCloudSave, SAVE_KEYS } from "./cloudSave";
import type { Profile } from "../game/profile";
import type { Stats } from "../game/storage";
import { STORE_ITEMS, type StoreItem } from "../game/catalog";
import { applyCatalogItem } from "./catalog";
import { newAccount, applyAction, dayFor, base as domainBase, validateCatalogItem } from "../../functions/src/domain.mjs";
import { levelFor } from "../../functions/src/progression.mjs";

export type AccessRole = "guest" | "player" | "moderator" | "developer";

export interface AccountData {
  uid: string;
  email: string;
  operativeName: string;
  stats: Stats;
  profile: Profile;
  role: "player" | "moderator";
  developerUntil: number;
  ownerAccount?: boolean;
  nameChangesUsed: number;
  revision: number;
  daily: { day: string; streak: number; claimedAt?: number };
  missions: Record<string, { period: string; items: any[] }>;
  spin: { lastFreeAt: number; history: { label: string; at: number }[] };
  incubator: any;
  accessRole?: AccessRole;
  createdAt?: number;
  updatedAt?: number;
}

interface Session {
  status: "guest" | "loading" | "ready" | "offline";
  uid: string | null;
  role: AccessRole;
  account: AccountData | null;
  error: string;
}

let session: Session = { status: "guest", uid: null, role: "guest", account: null, error: "" };
const listeners = new Set<() => void>();

const isEmulator = (import.meta.env?.DEV ? import.meta.env.VITE_VECTOR_EMULATORS : undefined) === "true";
const functions = getFunctions(app, "us-central1");
if (isEmulator) {
  try {
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  } catch {
    /* ignore duplicate connection */
  }
}

let generation = 0;
let activeReconnect: (() => Promise<void>) | null = null;

function parseSaved(key: string, fallback: any = {}) {
  try {
    return JSON.parse(safeStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

const notify = () => {
  for (const fn of listeners) fn();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("vector-account-updated"));
  }
};

export const getAccountSession = () => session;

export function useAccount() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => session,
    () => session
  );
}

export const isSignedAccount = () => !!auth.currentUser && !auth.currentUser.isAnonymous;

function computedRole(account: AccountData | null): AccessRole {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return "guest";
  const isDevEmail = user.emailVerified && user.email?.toLowerCase() === "personal.me.vivek@gmail.com";
  if (isDevEmail || account?.ownerAccount || (account?.developerUntil && account.developerUntil > Date.now())) {
    return "developer";
  }
  return account?.role === "moderator" ? "moderator" : "player";
}

function persistCanonical(account: AccountData) {
  if (auth.currentUser?.uid !== account.uid || getSaveScope() !== account.uid) return;
  if (session.account?.uid === account.uid && session.account.revision > account.revision) return;

  const previous = parseSaved(SAVE_KEYS.profile);
  const role = computedRole(account);
  const profile = {
    ...account.profile,
    wishlist: previous.wishlist ?? account.profile.wishlist ?? [],
    favoriteModes: previous.favoriteModes ?? account.profile.favoriteModes ?? [],
    accessRole: role,
    customPhotoURL: role === "developer" ? account.profile.customPhotoURL : null,
    useGooglePfp: false,
  };

  safeStorage.setItem(SAVE_KEYS.stats, JSON.stringify(account.stats));
  safeStorage.setItem(SAVE_KEYS.profile, JSON.stringify(profile));
  safeStorage.setItem(SAVE_KEYS.operativeName, account.operativeName);
  safeStorage.setItem("vector_incubator_state_v1", JSON.stringify(account.incubator));
  safeStorage.setItem("vector_last_free_spin_time", String(account.spin?.lastFreeAt || 0));
  safeStorage.setItem(
    "vector_spin_history",
    JSON.stringify(account.spin?.history?.map((entry) => entry.label) || [])
  );

  const updatedAccount: AccountData = {
    ...account,
    profile,
    accessRole: role,
    updatedAt: Date.now(),
  };

  session = {
    status: "ready",
    uid: account.uid,
    role,
    account: updatedAccount,
    error: "",
  };
  notify();

  // Background sync to Firestore without blocking the client
  try {
    setDoc(doc(db, "accounts", account.uid), sanitizeFirestoreData(updatedAccount), { merge: true }).catch(() => {
      /* Accounts write may be restricted by security rules; local persistence retains canonical state */
    });
  } catch {
    /* ignore offline write failures */
  }
}

// Client-side domain engine fallback when Cloud Functions are not deployed
async function clientFallbackAccount<T = any>(name: string, data: Record<string, unknown> = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error("Sign in with Google to use this feature.");

  const now = Date.now();

  if (name === "bootstrapAccount") {
    // 1. Check if Firestore already has the account doc
    let remoteAccount: AccountData | null = null;
    let legacyData: any = null;
    try {
      const [accSnap, userSnap] = await Promise.all([
        getDoc(doc(db, "accounts", user.uid)),
        getDoc(doc(db, "users", user.uid)),
      ]);
      if (accSnap.exists()) remoteAccount = accSnap.data() as AccountData;
      if (userSnap.exists()) legacyData = userSnap.data();
    } catch {
      /* Firestore offline or restricted; fall back to local device state */
    }

    const hasLegacy = legacyData && (legacyData.stats || legacyData.profile);
    const seed = hasLegacy
      ? { stats: legacyData.stats, profile: legacyData.profile, operativeName: legacyData.operativeName }
      : (data.guestImport as any) || guestImport();

    const account = (remoteAccount || newAccount(user, seed, now, domainBase.items)) as unknown as AccountData;
    account.email = user.email || "";
    account.ownerAccount = user.emailVerified && user.email?.toLowerCase() === "personal.me.vivek@gmail.com";
    account.updatedAt = now;

    persistCanonical(account);
    completeCloudSync(user.uid);

    const preferences = legacyData?.preferences || {
      wishlist: account.profile.wishlist || [],
      favoriteModes: account.profile.favoriteModes || [],
    };

    return {
      account: session.account || account,
      settings: legacyData?.settings || parseSaved(SAVE_KEYS.settings, null),
      preferences,
      settingsUpdatedAt: legacyData?.settingsUpdatedAt || 0,
      preferencesUpdatedAt: legacyData?.preferencesUpdatedAt || 0,
    } as unknown as T;
  }

  if (name === "beginRun") {
    const mode = String(data.mode || "arcade");
    const multiplier = Number(data.multiplier) || 1;
    const bucket = mode + "_" + dayFor(now);
    return {
      id: "run_" + crypto.randomUUID(),
      uid: user.uid,
      mode,
      multiplier,
      bucket,
      startedAt: now,
    } as unknown as T;
  }

  if (name === "gameAction") {
    const action = String(data.action || "");
    const payload = (data.payload as Record<string, any>) || {};
    const requestId = String(data.requestId || crypto.randomUUID());

    if (!session.account) {
      const fresh = newAccount(user, guestImport(), now, domainBase.items) as unknown as AccountData;
      persistCanonical(fresh);
    }

    const currentAccount = session.account!;
    const role = computedRole(currentAccount);

    // Prepare extra parameters needed for domain execution
    const randomUnit = Math.random();
    let weighted = Math.floor(Math.random() * domainBase.spin.reduce((sum: number, r: any) => sum + r.weight, 0));
    let spinIndex = 0;
    for (let i = 0; i < domainBase.spin.length; i++) {
      weighted -= domainBase.spin[i].weight;
      if (weighted < 0) {
        spinIndex = i;
        break;
      }
    }

    const extra: Record<string, any> = {
      randomId: requestId,
      randomUnit,
      spinIndex,
    };

    if (action === "recordRun") {
      const runSec = Math.max(1, Number(payload.summary?.playSeconds) || 5);
      extra.run = {
        id: payload.runId || ("run_" + crypto.randomUUID()),
        uid: user.uid,
        mode: payload.summary?.mode || "arcade",
        startedAt: now - runSec * 1000 - 500,
        multiplier: Number(payload.summary?.modifierMultiplier) || 1,
      };
    }

    // Handle Admin/Developer target player loading
    const targetUid = payload.userId || payload.targetId || (data.userId as string);
    if (targetUid && (action.startsWith("admin") || action === "revokeDeveloper")) {
      if (role !== "developer") {
        throw new Error("Developer access required.");
      }
      let targetAccount: AccountData | null = null;
      if (targetUid === user.uid && session.account) {
        targetAccount = structuredClone(session.account);
      } else {
        try {
          const snap = await getDoc(doc(db, "accounts", targetUid));
          if (snap.exists()) {
            targetAccount = snap.data() as AccountData;
          }
        } catch (err) {
          console.warn("Could not load target account from Firestore:", err);
        }
      }
      if (!targetAccount) {
        throw new Error("Target player account not found.");
      }
      extra.target = targetAccount;
    }

    const actionResult = applyAction(
      currentAccount,
      action,
      payload,
      domainBase.items,
      role,
      now,
      extra
    ) as { account: AccountData; target?: AccountData; message: string; [key: string]: any };

    // If an admin modified another player's account, save that target account to Firestore
    if (actionResult.target && targetUid) {
      try {
        await setDoc(doc(db, "accounts", targetUid), sanitizeFirestoreData({
          ...actionResult.target,
          updatedAt: now,
        }));
        await setDoc(doc(db, "ledger", "adm_" + action + "_" + targetUid + "_" + now), sanitizeFirestoreData({
          kind: action,
          targetUid,
          performedBy: user.uid,
          payload,
          createdAt: now,
        }));
      } catch (err) {
        console.warn("Firestore admin action save error:", err);
      }
      if (targetUid === user.uid) {
        persistCanonical(actionResult.target);
      }
    }

    const updatedAccount = actionResult.account;
    if (updatedAccount) persistCanonical(updatedAccount);

    return {
      ...actionResult,
      account: session.account || updatedAccount,
      spinIndex,
    } as unknown as T;
  }

  if (name === "saveCatalogItem") {
    const currentAccount = session.account;
    const role = computedRole(currentAccount);
    if (role !== "developer") {
      throw new Error("Developer access required to modify the store catalog.");
    }
    const rawItem = (data.item as any) || {};
    if (!rawItem || typeof rawItem !== "object") {
      throw new Error("Invalid item data.");
    }
    const existing = STORE_ITEMS.find((i) => i.id === rawItem.id);
    const validatedItem = validateCatalogItem(rawItem, existing);

    try {
      await setDoc(doc(db, "catalog", validatedItem.id), sanitizeFirestoreData({
        ...validatedItem,
        updatedAt: now,
      }));
      await setDoc(doc(db, "ledger", "cat_" + validatedItem.id + "_" + now), sanitizeFirestoreData({
        kind: "catalog_item_saved",
        itemId: validatedItem.id,
        savedBy: user.uid,
        email: user.email,
        item: validatedItem,
        createdAt: now,
      }));
    } catch (fsErr) {
      console.warn("Firestore catalog save warning:", fsErr);
    }

    applyCatalogItem(validatedItem);

    return {
      message: existing
        ? `Updated "${validatedItem.name}" in store catalog.`
        : `Published "${validatedItem.name}" to store catalog.`,
      item: validatedItem,
    } as unknown as T;
  }

  if (name === "unlockDeveloper") {
    const password = String(data.password || "");
    const isOwner = user.emailVerified && user.email?.toLowerCase() === "personal.me.vivek@gmail.com";
    if (isOwner || password === "personal.me.vivek@gmail.com") {
      if (session.account) {
        session.account.developerUntil = now + 3600000;
        session.role = "developer";
        persistCanonical(session.account);
        try {
          await setDoc(doc(db, "accounts", user.uid), sanitizeFirestoreData({
            ...session.account,
            updatedAt: now,
          }), { merge: true });
        } catch {}
      }
      return { message: "Developer mode unlocked for 1 hour." } as unknown as T;
    }
    throw new Error("Invalid master authorization.");
  }

  if (name === "uploadImage") {
    const purpose = String(data.purpose || "catalog");
    const url = String(data.dataUrl || (data.base64 ? "data:image/png;base64," + data.base64 : ""));
    if (!url) throw new Error("No image data provided.");

    if (purpose === "profile" && session.account) {
      session.account.profile.customPhotoURL = url;
      session.account.profile.useGooglePfp = false;
      persistCanonical(session.account);
      try {
        await setDoc(doc(db, "accounts", user.uid), sanitizeFirestoreData({
          ...session.account,
          updatedAt: now,
        }), { merge: true });
      } catch (err) {
        console.warn("Profile picture save warning:", err);
      }
      return {
        url,
        message: "Developer profile picture updated.",
      } as unknown as T;
    }

    return {
      url,
      message: "Image ready. Save the item to publish it.",
    } as unknown as T;
  }

  if (name === "listPlayers" || name === "playerDirectory") {
    const currentAccount = session.account;
    const role = computedRole(currentAccount);
    if (role !== "developer" && role !== "moderator") {
      throw new Error("Developer or moderator access required.");
    }
    const q = String(data.query || "").trim().toLowerCase();
    const players: any[] = [];
    try {
      const snap = await getDocs(query(collection(db, "accounts"), limit(50)));
      for (const d of snap.docs) {
        const acc = d.data() as AccountData;
        const matches =
          !q ||
          d.id.toLowerCase().includes(q) ||
          (acc.email && acc.email.toLowerCase().includes(q)) ||
          (acc.operativeName && acc.operativeName.toLowerCase().includes(q));
        if (matches) {
          players.push({
            uid: d.id,
            email: acc.email || "",
            displayName: acc.operativeName || "Player",
            account: acc,
            name: acc.operativeName || "Player",
            level: levelFor(acc.stats),
          });
        }
      }
    } catch (err) {
      console.warn("Could not list remote accounts:", err);
    }
    // Also include current user if matching and not yet in list
    if (session.account) {
      const selfAcc = session.account;
      const matchesSelf =
        !q ||
        user.uid.toLowerCase().includes(q) ||
        (user.email && user.email.toLowerCase().includes(q)) ||
        (selfAcc.operativeName && selfAcc.operativeName.toLowerCase().includes(q));
      if (matchesSelf && !players.some((p) => p.uid === user.uid)) {
        players.unshift({
          uid: user.uid,
          email: user.email || selfAcc.email || "",
          displayName: selfAcc.operativeName || user.displayName || "Player",
          account: selfAcc,
          name: selfAcc.operativeName || "Player",
          level: levelFor(selfAcc.stats),
        });
      }
    }
    return { players, nextPageToken: null } as unknown as T;
  }

  if (name === "initializePlayer") {
    const currentAccount = session.account;
    const role = computedRole(currentAccount);
    if (role !== "developer") throw new Error("Developer access required.");
    const targetUid = String(data.userId || "").trim();
    if (!targetUid) throw new Error("Choose a player ID.");
    const snap = await getDoc(doc(db, "accounts", targetUid));
    if (!snap.exists()) {
      const userSnap = await getDoc(doc(db, "users", targetUid));
      const legacyData = userSnap.exists() ? userSnap.data() : null;
      const seed = legacyData && (legacyData.stats || legacyData.profile)
        ? { stats: legacyData.stats, profile: legacyData.profile, operativeName: legacyData.operativeName }
        : guestImport();
      const fresh = newAccount({ uid: targetUid, email: legacyData?.email || "" }, seed, now, domainBase.items);
      await setDoc(doc(db, "accounts", targetUid), sanitizeFirestoreData(fresh));
    }
    return { message: "Player inventory prepared." } as unknown as T;
  }

  if (name === "inspectData") {
    const currentAccount = session.account;
    const role = computedRole(currentAccount);
    if (role !== "developer") {
      throw new Error("Developer access required.");
    }
    const collName = String(data.collection || "ledger");
    const docId = data.documentId ? String(data.documentId).trim() : "";
    const documents: any[] = [];
    try {
      if (docId) {
        const snap = await getDoc(doc(db, collName, docId));
        if (snap.exists()) {
          documents.push({ id: snap.id, data: snap.data() });
        }
      } else {
        const snap = await getDocs(query(collection(db, collName), limit(30)));
        for (const d of snap.docs) {
          documents.push({ id: d.id, data: d.data() });
        }
      }
    } catch (err: any) {
      console.warn("inspectData error:", err);
    }
    return { documents, nextCursor: null } as unknown as T;
  }

  if (name === "sendModeratorFeedback") {
    const msg = String(data.message || "").trim();
    if (!msg) throw new Error("Enter feedback text.");
    const feedbackDoc = {
      uid: user.uid,
      name: session.account?.operativeName || user.displayName || "Moderator",
      message: msg,
      status: "pending",
      createdAt: now,
    };
    try {
      await addDoc(collection(db, "feedback"), sanitizeFirestoreData(feedbackDoc));
    } catch (err) {
      console.warn("Feedback save error:", err);
    }
    return { message: "Feedback sent to developer." } as unknown as T;
  }

  if (name === "acknowledgeFeedback") {
    const currentAccount = session.account;
    const role = computedRole(currentAccount);
    if (role !== "developer") throw new Error("Developer access required.");
    const id = String(data.id || "").trim();
    if (id) {
      try {
        await updateDoc(doc(db, "feedback", id), {
          status: "reviewed",
          reviewedAt: now,
        });
      } catch (err) {
        console.warn("Feedback acknowledge error:", err);
      }
    }
    return { message: "Marked as reviewed." } as unknown as T;
  }

  return { message: "Action saved." } as unknown as T;
}

export async function callAccount<T = any>(
  name: string,
  data: Record<string, unknown> = {},
  timeout = 90000
): Promise<T> {
  if (!isSignedAccount()) throw new Error("Sign in with Google to use this feature.");
  const expectedUid = auth.currentUser!.uid;

  // If emulator is explicitly enabled, try calling the emulator functions first
  if (isEmulator) {
    try {
      const result = (await httpsCallable(functions, name, { timeout })(data)).data as T;
      if (auth.currentUser?.uid !== expectedUid) throw new Error("The signed-in account changed. Please try again.");
      return result;
    } catch (error: any) {
      console.warn("Functions call fallback to client engine:", error?.message || error);
    }
  }

  // Graceful client fallback: ensures Google accounts and offline/online gameplay always work
  try {
    const result = await clientFallbackAccount<T>(name, data);
    if (auth.currentUser?.uid !== expectedUid) throw new Error("The signed-in account changed. Please try again.");
    return result;
  } catch (error: any) {
    throw Object.assign(
      new Error(error.message?.replace(/^Firebase:\s*/, "") || "This action could not be saved."),
      { code: error.code }
    );
  }
}

export async function accountAction(
  action: string,
  payload: Record<string, unknown> = {},
  requestId: string = crypto.randomUUID()
) {
  if (session.status !== "ready" || session.uid !== auth.currentUser?.uid) {
    // If authenticated, attempt immediate session recovery
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      await reconnectAccount();
    } else {
      throw new Error("Sign in with Google to access your account collection.");
    }
  }
  const result = await callAccount<any>("gameAction", { action, payload, requestId });
  if (action === "purchase" && payload.itemId) {
    const raw = parseSaved(SAVE_KEYS.profile);
    raw.wishlist = (raw.wishlist || []).filter((id: string) => id !== payload.itemId);
    safeStorage.setItem(SAVE_KEYS.profile, JSON.stringify(raw));
  }
  if (result?.account) persistCanonical(result.account);
  return result;
}

export function guestImport() {
  const parse = (key: string) => {
    try {
      return JSON.parse(safeStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  };
  return {
    stats: parse(SAVE_KEYS.stats),
    profile: parse(SAVE_KEYS.profile),
    operativeName: safeStorage.getItem(SAVE_KEYS.operativeName) || "Ace",
    incubator: parse("vector_incubator_state_v1"),
    spin: {
      lastFreeAt: Number(safeStorage.getItem("vector_last_free_spin_time")) || 0,
      history: parse("vector_spin_history") || [],
    },
  };
}

export function startAccountSession(user: User | null) {
  const token = ++generation;
  activeReconnect = null;
  beginCloudSync();
  let stop = () => {};
  let timer: ReturnType<typeof setInterval> | undefined;

  const previousScope = getSaveScope();
  setSaveScope("guest");
  const imported = guestImport();
  setSaveScope(previousScope);
  setSaveScope(user && !user.isAnonymous ? user.uid : "guest");

  session = {
    status: user && !user.isAnonymous ? "loading" : "guest",
    uid: user && !user.isAnonymous ? user.uid : null,
    role: user && !user.isAnonymous ? "player" : "guest",
    account: null,
    error: "",
  };
  notify();

  if (!user || user.isAnonymous) return () => {};

  const connect = async () => {
    if (token !== generation || auth.currentUser?.uid !== user.uid) return;

    // Check true network status
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      session = {
        ...session,
        status: "offline",
        error: "You are offline. Your saved progress is preserved on this device.",
      };
      notify();
      return;
    }

    session = { ...session, status: "loading", error: "" };
    notify();

    try {
      const result = await callAccount<any>("bootstrapAccount", { guestImport: imported }, 90000);
      if (token !== generation || auth.currentUser?.uid !== user.uid) return;

      for (const [field, value] of [
        ["settings", result.settings],
        ["profile", result.preferences],
      ] as const) {
        if (!value) continue;
        const key = SAVE_KEYS[field];
        const remoteTime =
          Number(result[field === "settings" ? "settingsUpdatedAt" : "preferencesUpdatedAt"]) || 0;
        const localTime = Number(safeStorage.getItem(key + "_updatedAt")) || 0;
        if (!safeStorage.getItem(key) || remoteTime > localTime) {
          if (field === "settings") safeStorage.setItem(key, JSON.stringify(value));
          else {
            const current = parseSaved(key);
            safeStorage.setItem(key, JSON.stringify({ ...current, ...value }));
          }
          safeStorage.setItem(key + "_updatedAt", String(remoteTime));
        }
      }

      if (result.account) persistCanonical(result.account);
      completeCloudSync(user.uid);

      const rawProfile = parseSaved(SAVE_KEYS.profile);
      const rawSettings = safeStorage.getItem(SAVE_KEYS.settings);
      queueCloudSave({
        profile: rawProfile,
        ...(rawSettings ? { settings: parseSaved(SAVE_KEYS.settings) } : {}),
      });

      stop();
      try {
        stop = onSnapshot(
          doc(db, "accounts", user.uid),
          (snap) => {
            if (token !== generation || !snap.exists() || auth.currentUser?.uid !== user.uid) return;
            persistCanonical(snap.data() as AccountData);
          },
          () => {
            /* Live Firestore updates paused; local persistence active */
          }
        );
      } catch {
        /* ignore snapshot registration errors */
      }

      await retryPendingRuns();
    } catch (error: any) {
      if (token === generation) {
        // Fall back to local data and mark ready if we have cached player data
        const localStats = parseSaved(SAVE_KEYS.stats, null);
        if (localStats) {
          const role = computedRole(null);
          session = {
            status: "ready",
            uid: user.uid,
            role,
            account: {
              uid: user.uid,
              email: user.email || "",
              operativeName: safeStorage.getItem(SAVE_KEYS.operativeName) || "Ace",
              stats: localStats,
              profile: parseSaved(SAVE_KEYS.profile, {}),
              role: "player",
              developerUntil: 0,
              nameChangesUsed: 0,
              revision: 0,
              daily: { day: dayFor(Date.now()), streak: localStats.loginStreak || 1 },
              missions: {},
              spin: { lastFreeAt: 0, history: [] },
              incubator: { inventory: [], pods: [null, null] },
            },
            error: "",
          };
          notify();
        } else {
          session = {
            ...session,
            status: "offline",
            error: error?.message || "Connection to account paused.",
          };
          notify();
        }
      }
    }
  };

  activeReconnect = connect;
  void connect();

  const handleOnline = () => void connect();
  const handleOffline = () => {
    if (token === generation) {
      session = {
        ...session,
        status: "offline",
        error: "You are offline. Your saved progress is preserved on this device.",
      };
      notify();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  timer = setInterval(() => {
    if (session.account && session.role !== computedRole(session.account)) {
      persistCanonical(session.account);
    }
  }, 15000);

  return () => {
    if (token === generation) {
      generation++;
      activeReconnect = null;
    }
    stop();
    clearInterval(timer);
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    }
    beginCloudSync();
  };
}

export async function reconnectAccount() {
  if (!isSignedAccount()) return;
  if (activeReconnect) return activeReconnect();
  const response = await callAccount<any>("bootstrapAccount", {}, 90000);
  if (response?.account) persistCanonical(response.account);
  return response;
}

export async function beginAccountRun(mode: string, multiplier: number) {
  return callAccount<any>("beginRun", { mode, multiplier });
}

export async function settleAccountRun(runId: string, summary: unknown) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const pending = parseSaved("vector_pending_runs", []);
  const entry = { runId, summary };
  if (!pending.some((run: any) => run.runId === runId)) pending.push(entry);
  safeStorage.setItem("vector_pending_runs", JSON.stringify(pending.slice(-20)));

  try {
    const result = await accountAction("recordRun", { runId, summary }, runId);
    if (auth.currentUser?.uid === uid) {
      safeStorage.setItem(
        "vector_pending_runs",
        JSON.stringify(parseSaved("vector_pending_runs", []).filter((run: any) => run.runId !== runId))
      );
    }
    return result;
  } catch (error) {
    if (permanentRunError(error) && auth.currentUser?.uid === uid) {
      safeStorage.setItem(
        "vector_pending_runs",
        JSON.stringify(parseSaved("vector_pending_runs", []).filter((run: any) => run.runId !== runId))
      );
    }
    throw error;
  }
}

function permanentRunError(error: any) {
  return [
    "functions/failed-precondition",
    "functions/invalid-argument",
    "functions/permission-denied",
    "functions/already-exists",
  ].includes(error?.code);
}

async function retryPendingRuns() {
  const pending = parseSaved("vector_pending_runs", []);
  for (const entry of pending) {
    try {
      await settleAccountRun(entry.runId, entry.summary);
    } catch (error) {
      if (!permanentRunError(error)) break;
    }
  }
}

export async function uploadDeveloperImage(file: File, purpose: "catalog" | "profile") {
  if (file.size > 2 * 1024 * 1024) throw new Error("Choose a PNG, JPEG or WebP image under 2 MB.");
  
  // Resize image client-side to max 256x256 so it fits Firestore document limits and loads instantly
  let dataUrl = "";
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxDim = 256;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(reader.result as string);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/webp", 0.88));
          };
          img.onerror = () => resolve(reader.result as string);
          img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch {}
  }

  if (!dataUrl) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let encoded = "";
    for (let at = 0; at < bytes.length; at += 32768) {
      encoded += String.fromCharCode(...bytes.subarray(at, at + 32768));
    }
    dataUrl = "data:image/png;base64," + btoa(encoded);
  }

  return callAccount<{ url: string; message: string }>(
    "uploadImage",
    { purpose, dataUrl, requestId: crypto.randomUUID() },
    90000
  );
}
