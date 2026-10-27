import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Transaction,
} from "firebase/firestore";
import { auth, db, sanitizeFirestoreData } from "./config";
import { safeStorage, getSaveScope } from "../game/persistence";
import { SAVE_KEYS, completeCloudSync } from "./cloudSave";
import { scoreBucket } from "../game/storage";
import { retryPendingScores } from "./leaderboard";
import { applyCatalogItem } from "./catalog";
import { STORE_ITEMS, type StoreItem } from "../game/catalog";
import { levelFor } from "../../functions/src/progression.mjs";
import {
  OWNER_EMAIL,
  MODES,
  aliases,
  applyAction,
  base as domainBase,
  catalogFor,
  dayFor,
  newAccount,
  policyFor,
  publicPlayer,
  refreshMissions,
  roleFor,
  accountView,
  validateCatalogItem,
} from "../../functions/src/domain.mjs";
import {
  MASTER_KEY_MAX_LENGTH,
  MASTER_KEY_MIN_LENGTH,
  verifyMasterKey,
} from "../../functions/src/master-key.mjs";
import type { AccountData, Session } from "./accounts";

export interface FallbackContext {
  getSession(): Session;
  setSession(next: Session): void;
  persistCanonical(account: AccountData): void;
  notify(): void;
}

interface RunSession {
  id: string;
  uid: string;
  mode: string;
  bucket: string;
  multiplier: number;
  startedAt: number;
  completedAt?: number;
}

interface ActionReceipt {
  hash: string;
  result: Record<string, any>;
  createdAt: number;
}

interface CatalogOutboxEntry {
  item: Record<string, any>;
  createdAt: number;
  savedBy: string;
}

const RECEIPTS_KEY = "vector_action_receipts_v2";
const RUN_SESSIONS_KEY = "vector_run_sessions_v1";
const CATALOG_OUTBOX_KEY = "vector_catalog_outbox_v1";
const INSPECT_COLLECTIONS = new Set(["accounts", "users", "players", "catalog", "gifts", "ledger", "feedback", "runs"]);

const globalMemory = new Map<string, string>();
const globalStore = {
  getItem(key: string): string | null {
    try {
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) ?? globalMemory.get(key) ?? null : globalMemory.get(key) ?? null;
    } catch {
      return globalMemory.get(key) ?? null;
    }
  },
  setItem(key: string, value: string) {
    globalMemory.set(key, value);
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    } catch {
      /* memory cache remains available */
    }
  },
};

function globalJSON<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(globalStore.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function globalWrite(key: string, value: unknown) {
  try {
    globalStore.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore storage quota errors */
  }
}

function parseSaved(key: string, fallback: any = {}) {
  try {
    return JSON.parse(safeStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function guestImport() {
  return {
    stats: parseSaved(SAVE_KEYS.stats),
    profile: parseSaved(SAVE_KEYS.profile),
    operativeName: safeStorage.getItem(SAVE_KEYS.operativeName) || "Ace",
    incubator: parseSaved("vector_incubator_state_v1"),
    spin: {
      lastFreeAt: Number(safeStorage.getItem("vector_last_free_spin_time")) || 0,
      history: parseSaved("vector_spin_history", []),
    },
  };
}

function stableHash(value: unknown): string {
  const text = JSON.stringify(value) ?? "null";
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36) + ":" + text.length.toString(36);
}

function isOwner(user: any): boolean {
  return !!user?.emailVerified && String(user.email || "").toLowerCase() === OWNER_EMAIL;
}

function effectiveRole(account: any, user: any, now: number): "player" | "moderator" | "developer" {
  return roleFor(account, isOwner(user), now);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function toStoredAccount(account: any, now: number) {
  const stored = clone(account || {});
  delete stored.accessRole;
  if (stored.profile) {
    delete stored.profile.accessRole;
    if (stored.profile.useGooglePfp === undefined) stored.profile.useGooglePfp = false;
  }
  stored.uid = account.uid;
  stored.updatedAt = now;
  return sanitizeFirestoreData(stored);
}

function normalizeAccount(raw: any, user: any, now: number, catalog: any[], legacy: any = null): AccountData {
  let account: any;
  if (raw && typeof raw === "object") account = clone(raw);
  else {
    const seed = legacy && (legacy.stats || legacy.profile)
      ? { stats: legacy.stats, profile: legacy.profile, operativeName: legacy.operativeName }
      : guestImport();
    account = newAccount(user, seed, now, catalog);
  }
  account.uid = user.uid;
  account.email = user.email || account.email || "";
  account.ownerAccount = isOwner(user);
  account.stats ||= clone(domainBase.defaultStats);
  account.stats.modeRuns ||= {};
  account.stats.history ||= [];
  account.profile ||= clone(domainBase.defaultProfile);
  account.profile.purchased ||= [];
  account.profile.wishlist ||= [];
  account.profile.favoriteModes ||= [];
  account.profile.claimedLevels ||= [];
  account.profile.customTitles ||= [];
  account.profile.inventoryRules ||= {};
  account.profile.charges ||= { shield: 1, surge: 0, saver: 0 };
  account.role = account.role === "moderator" ? "moderator" : "player";
  account.developerUntil = Number(account.developerUntil) || 0;
  account.nameChangesUsed = Number(account.nameChangesUsed) || 0;
  account.revision = Number(account.revision) || 0;
  account.daily ||= { day: dayFor(now), streak: Number(account.stats.loginStreak) || 0 };
  account.missions ||= {};
  account.spin ||= { lastFreeAt: 0, history: [] };
  account.spin.history ||= [];
  account.incubator ||= { inventory: [], pods: [null, null] };
  account.incubator.inventory ||= [];
  account.incubator.pods ||= [null, null];
  account.createdAt ||= now;
  account.updatedAt = now;
  refreshMissions(account, now);
  return account as AccountData;
}

async function currentCatalog(now: number): Promise<any[]> {
  const local = globalJSON<Record<string, any>[]>("vector_catalog_overrides", []);
  let remote: Record<string, any>[] = [];
  try {
    const snap = await getDocs(collection(db, "catalog"));
    remote = snap.docs.map((document) => ({ ...document.data(), id: document.id }));
  } catch {
    /* bundled catalog stays available offline */
  }
  const merged = new Map<string, any>();
  for (const item of Array.isArray(local) ? local : []) if (item?.id) merged.set(item.id, item);
  for (const item of remote) {
    const old = merged.get(item.id);
    if (!old || Number(item.updatedAt || 0) >= Number(old.updatedAt || 0)) merged.set(item.id, item);
  }
  return catalogFor([...merged.values()], now);
}

function writeAccountTx(transaction: Transaction, account: any, role: string, now: number) {
  transaction.set(doc(db, "accounts", account.uid), toStoredAccount(account, now));
  transaction.set(doc(db, "players", account.uid), sanitizeFirestoreData(publicPlayer(account, role)));
}

export async function syncAccountNow(account: AccountData, now = Date.now()) {
  const user = auth.currentUser;
  if (!user || account.uid !== user.uid || getSaveScope() !== user.uid) return;
  const stored = toStoredAccount(account, now);
  const role = effectiveRole(account, user, now);
  await Promise.all([
    setDoc(doc(db, "accounts", account.uid), stored, { merge: true }),
    setDoc(doc(db, "players", account.uid), sanitizeFirestoreData(publicPlayer(account, role)), { merge: true }),
  ]);
}

function readRunSessions(): Record<string, RunSession> {
  return globalJSON<Record<string, RunSession>>(RUN_SESSIONS_KEY, {});
}

function saveRunSession(run: RunSession) {
  const sessions = readRunSessions();
  sessions[`${run.uid}:${run.id}`] = run;
  const entries = Object.entries(sessions).slice(-100);
  globalWrite(RUN_SESSIONS_KEY, Object.fromEntries(entries));
}

function completeRunSession(run: any, now: number) {
  const sessions = readRunSessions();
  const key = `${run.uid}:${run.id}`;
  const existing = sessions[key] || run;
  sessions[key] = { ...existing, ...run, completedAt: now };
  globalWrite(RUN_SESSIONS_KEY, sessions);
}

function readReceipt(uid: string, requestId: string): ActionReceipt | null {
  const receipts = globalJSON<Record<string, ActionReceipt>>(RECEIPTS_KEY, {});
  return receipts[`${uid}:${requestId}`] || null;
}

function writeReceipt(uid: string, requestId: string, hash: string, result: Record<string, any>) {
  const receipts = globalJSON<Record<string, ActionReceipt>>(RECEIPTS_KEY, {});
  receipts[`${uid}:${requestId}`] = { hash, result, createdAt: Date.now() };
  const entries = Object.entries(receipts).slice(-300);
  globalWrite(RECEIPTS_KEY, Object.fromEntries(entries));
}

function queueCatalogOutbox(item: Record<string, any>, uid: string, now: number) {
  const entries = globalJSON<CatalogOutboxEntry[]>(CATALOG_OUTBOX_KEY, []);
  if (!entries.some((entry) => entry.item?.id === item.id)) entries.push({ item, savedBy: uid, createdAt: now });
  globalWrite(CATALOG_OUTBOX_KEY, entries.slice(-30));
}

export async function retryDeveloperOutbox(user: any): Promise<number> {
  const entries = globalJSON<CatalogOutboxEntry[]>(CATALOG_OUTBOX_KEY, []);
  if (!entries.length) return 0;
  const session = auth.currentUser;
  if (!session || session.uid !== user.uid) return 0;
  const accountSnap = await getDoc(doc(db, "accounts", user.uid)).catch(() => null);
  const account = normalizeAccount(accountSnap?.exists() ? accountSnap.data() : null, user, Date.now(), STORE_ITEMS as any);
  if (effectiveRole(account, user, Date.now()) !== "developer" && !isOwner(user)) return 0;
  const remaining: CatalogOutboxEntry[] = [];
  let published = 0;
  for (const entry of entries) {
    try {
      const now = Date.now();
      await setDoc(doc(db, "catalog", entry.item.id), sanitizeFirestoreData({ ...entry.item, updatedAt: now, updatedBy: user.uid }));
      await setDoc(doc(db, "ledger", `outbox_${entry.item.id}_${now}`), sanitizeFirestoreData({
        kind: "catalog_item_saved", itemId: entry.item.id, savedBy: user.uid, source: "device-outbox", createdAt: now,
      }));
      applyCatalogItem(entry.item as StoreItem);
      published++;
    } catch {
      remaining.push(entry);
    }
  }
  globalWrite(CATALOG_OUTBOX_KEY, remaining);
  return published;
}

function leaderboardRecord(account: any, role: string, run: any, now: number) {
  const title = account.profile.customTitles?.find((entry: any) => entry.id === account.profile.titleId)?.name
    || "Rookie";
  const player = publicPlayer(account, role);
  return {
    id: `${account.uid}_${run.bucket}`,
    userId: account.uid,
    userName: account.operativeName,
    mode: run.bucket,
    score: run.score,
    streak: run.streak,
    avatarId: player.avatarId,
    frameId: player.frameId,
    userPhoto: player.photoURL || null,
    useGooglePfp: !!player.photoURL,
    role,
    ownerAccount: !!player.ownerAccount,
    developerUntil: player.developerUntil || 0,
    level: levelFor(account.stats),
    title,
    updatedAt: Timestamp.fromMillis(now),
  };
}

/** Credit gifts returned by recipients once the sender is back online. */
async function settleReturnedGifts(user: any, catalog: any[], now: number) {
  try {
    const snap = await getDocs(query(collection(db, "gifts"), where("sender", "==", user.uid), limit(50)));
    for (const document of snap.docs) {
      const gift: any = document.data();
      if (gift.status !== "returned" || !gift.consumed || gift.returnCredited) continue;
      const item = catalog.find((entry) => entry.id === gift.itemId);
      if (!item) continue;
      await runTransaction(db, async (transaction) => {
        const giftRef = doc(db, "gifts", document.id);
        const accountRef = doc(db, "accounts", user.uid);
        const [giftSnap, accountSnap] = await Promise.all([transaction.get(giftRef), transaction.get(accountRef)]);
        const currentGift: any = giftSnap.data();
        if (!currentGift || currentGift.returnCredited) return;
        const account = normalizeAccount(accountSnap.exists() ? accountSnap.data() : null, user, now, catalog);
        const wasLocked = policyFor(account, item, catalog) === "locked";
        for (const id of aliases(item, catalog)) delete account.profile.inventoryRules![id];
        account.profile.purchased = [...new Set([...account.profile.purchased, item.id])];
        if (wasLocked) for (const id of aliases(item, catalog)) account.profile.inventoryRules![id] = "locked";
        account.revision = (account.revision || 0) + 1;
        account.updatedAt = now;
        writeAccountTx(transaction, account, effectiveRole(account, user, now), now);
        transaction.set(giftRef, sanitizeFirestoreData({ ...currentGift, returnCredited: true, returnCreditedAt: now }));
      });
    }
  } catch (error) {
    console.warn("Returned gift settlement will retry:", error);
  }
}

async function fallbackBootstrap(user: any, data: Record<string, unknown>, ctx: FallbackContext, now: number) {
  const accountRef = doc(db, "accounts", user.uid);
  const legacyRef = doc(db, "users", user.uid);
  const [accountSnap, legacySnap] = await Promise.all([
    getDoc(accountRef).catch(() => null),
    getDoc(legacyRef).catch(() => null),
  ]);
  const legacy = legacySnap?.exists() ? legacySnap.data() : null;
  const catalog = await currentCatalog(now);
  let account = normalizeAccount(accountSnap?.exists() ? accountSnap.data() : null, user, now, catalog, legacy);
  if ((data.guestImport as any)?.stats && !accountSnap?.exists() && !legacy?.stats) {
    account = normalizeAccount(null, { ...user, uid: user.uid }, now, catalog, { ...(legacy || {}), ...(data.guestImport as any) });
  }
  await settleReturnedGifts(user, catalog, now);
  const refreshed = await getDoc(accountRef).catch(() => null);
  if (refreshed?.exists()) account = normalizeAccount(refreshed.data(), user, now, catalog, legacy);
  ctx.persistCanonical(account);
  completeCloudSync(user.uid);
  void retryDeveloperOutbox(user).catch(() => {});
  void retryPendingScores().catch(() => {});
  void Promise.all([
    setDoc(accountRef, toStoredAccount(account, now), { merge: true }),
    setDoc(doc(db, "players", user.uid), sanitizeFirestoreData(publicPlayer(account, effectiveRole(account, user, now))), { merge: true }),
  ]).catch(() => {});
  const preferences = legacy?.preferences || {
    wishlist: account.profile.wishlist || [],
    favoriteModes: account.profile.favoriteModes || [],
  };
  return {
    account: accountView(account, effectiveRole(account, user, now)),
    settings: legacy?.settings || parseSaved(SAVE_KEYS.settings, null),
    preferences,
    settingsUpdatedAt: legacy?.settingsUpdatedAt || 0,
    preferencesUpdatedAt: legacy?.preferencesUpdatedAt || legacy?.profileUpdatedAt || 0,
  };
}

async function fallbackGameAction(user: any, data: Record<string, unknown>, ctx: FallbackContext, now: number) {
  const action = String(data.action || "");
  const payload = (data.payload as Record<string, any>) || {};
  const requestId = String(data.requestId || crypto.randomUUID());
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(requestId)) throw new Error("Invalid request ID.");
  const hash = stableHash({ action, payload });
  const receipt = readReceipt(user.uid, requestId);
  if (receipt) {
    if (receipt.hash !== hash) throw new Error("This request ID belongs to a different action.");
    const snap = await getDoc(doc(db, "accounts", user.uid)).catch(() => null);
    const catalog = await currentCatalog(now);
    const account = normalizeAccount(snap?.exists() ? snap.data() : ctx.getSession().account, user, now, catalog);
    const role = effectiveRole(account, user, now);
    return {
      ...receipt.result,
      account: accountView(account, role),
      ...(action === "claimDaily" ? { alreadyClaimed: true, reward: null } : {}),
    };
  }

  const catalog = await currentCatalog(now);
  const randomUnit = Math.random();
  let weighted = Math.floor(Math.random() * domainBase.spin.reduce((sum: number, reward: any) => sum + reward.weight, 0));
  let spinIndex = 0;
  for (let i = 0; i < domainBase.spin.length; i++) {
    weighted -= domainBase.spin[i].weight;
    if (weighted < 0) { spinIndex = i; break; }
  }
  const extra: Record<string, any> = { randomId: requestId, randomUnit, spinIndex };
  const sessions = readRunSessions();
  const summary = payload.summary || {};
  const localRun = action === "recordRun" ? sessions[`${user.uid}:${payload.runId || ""}`] : null;
  if (action === "recordRun") {
    const mode = String(localRun?.mode || summary.mode || "arcade");
    const playSeconds = Math.max(1, Number(summary.playSeconds) || 5);
    extra.run = localRun || {
      id: String(payload.runId || `run_${requestId}`),
      uid: user.uid,
      mode,
      bucket: scoreBucket(mode as any, summary.challengeId),
      multiplier: Number(summary.modifierMultiplier) || 1,
      startedAt: now - playSeconds * 1000 - 500,
    };
  }

  const transactionResult = await runTransaction(db, async (transaction) => {
    const accountRef = doc(db, "accounts", user.uid);
    const legacyRef = doc(db, "users", user.uid);
    const [accountSnap, legacySnap] = await Promise.all([transaction.get(accountRef), transaction.get(legacyRef)]);
    const account = normalizeAccount(accountSnap.exists() ? accountSnap.data() : null, user, now, catalog, legacySnap.exists() ? legacySnap.data() : null);
    const role = effectiveRole(account, user, now);

    let giftRef: any = null;
    let giftSnap: any = null;
    let scoreRef: any = null;
    let overallRef: any = null;
    let scoreSnap: any = null;
    let overallSnap: any = null;

    if (action === "recordRun") {
      scoreRef = doc(db, "leaderboard", `${user.uid}_${extra.run.bucket}`);
      overallRef = doc(db, "leaderboard", `${user.uid}_overall`);
      [scoreSnap, overallSnap] = await Promise.all([transaction.get(scoreRef), transaction.get(overallRef)]);
    }
    if (action === "sendGift") {
      const recipientId = String(payload.recipient || "");
      if (!/^[A-Za-z0-9:_-]{1,128}$/.test(recipientId)) throw new Error("Choose a valid recipient.");
      const recipientRef = doc(db, "accounts", recipientId);
      const playerRef = doc(db, "players", recipientId);
      const [recipientSnap, playerSnap] = await Promise.all([transaction.get(recipientRef), transaction.get(playerRef)]);
      const player: any = playerSnap.exists() ? playerSnap.data() : null;
      extra.recipient = recipientSnap.exists()
        ? normalizeAccount(recipientSnap.data(), { uid: recipientId, email: recipientSnap.data().email || "" }, now, catalog)
        : player
          ? normalizeAccount(null, { uid: recipientId, email: "" }, now, catalog, { operativeName: player.name })
          : null;
    }
    if (action === "claimGift" || action === "returnGift") {
      const giftId = String(payload.giftId || "");
      if (!/^[A-Za-z0-9_-]{8,100}$/.test(giftId)) throw new Error("Choose a valid gift.");
      giftRef = doc(db, "gifts", giftId);
      giftSnap = await transaction.get(giftRef);
      extra.gift = giftSnap.exists() ? { ...giftSnap.data(), id: giftRef.id } : null;
    }
    if ((action.startsWith("admin") || action === "revokeDeveloper")) {
      if (role !== "developer") throw new Error("Developer access required.");
      const targetId = String(payload.userId || "");
      if (!/^[A-Za-z0-9:_-]{1,128}$/.test(targetId)) throw new Error("Choose a valid player ID.");
      const targetRef = doc(db, "accounts", targetId);
      const playerRef = doc(db, "players", targetId);
      const [targetSnap, playerSnap] = await Promise.all([transaction.get(targetRef), transaction.get(playerRef)]);
      const player: any = playerSnap.exists() ? playerSnap.data() : null;
      extra.target = targetSnap.exists()
        ? normalizeAccount(targetSnap.data(), { uid: targetId, email: targetSnap.data().email || "" }, now, catalog)
        : normalizeAccount(null, { uid: targetId, email: "" }, now, catalog, player ? { operativeName: player.name } : null);
    }

    // A recipient can record a return without writing another player's private
    // account document. The sender credits the item on their next sync.
    if (action === "returnGift" && extra.gift?.status === "pending" && extra.gift.recipient === user.uid && extra.gift.sender !== user.uid) {
      const returnedGift = sanitizeFirestoreData({
        ...extra.gift,
        status: "returned",
        handledAt: now,
        returnCredited: false,
      });
      transaction.set(giftRef, returnedGift);
      return {
        meta: { message: "Gift returned. The sender receives the item on their next sync.", gift: returnedGift },
        account: accountView(account, role),
        gift: returnedGift,
        run: null,
      };
    }

    if (action === "returnGift" && extra.gift?.sender !== user.uid && extra.gift?.sender) {
      const senderSnap = await transaction.get(doc(db, "accounts", extra.gift.sender));
      extra.sender = senderSnap.exists() ? normalizeAccount(senderSnap.data(), { uid: extra.gift.sender }, now, catalog) : null;
    }

    const actionResult = applyAction(account, action, payload, catalog, role, now, extra) as any;
    const changed = actionResult.account || account;
    const changedRole = effectiveRole(changed, user, now);
    writeAccountTx(transaction, changed, changedRole, now);

    if (actionResult.target) {
      const target = actionResult.target;
      writeAccountTx(transaction, target, roleFor(target, !!target.ownerAccount, now), now);
    }
    if (actionResult.other) {
      const other = actionResult.other;
      writeAccountTx(transaction, other, roleFor(other, !!other.ownerAccount, now), now);
    }
    if (actionResult.gift) {
      transaction.set(doc(db, "gifts", actionResult.gift.id), sanitizeFirestoreData(actionResult.gift));
    }
    if (actionResult.run && scoreRef && overallRef) {
      const run = actionResult.run;
      const oldBest = scoreSnap?.exists() ? Number(scoreSnap.data().score) || 0 : 0;
      if (run.score > oldBest) {
        const record = sanitizeFirestoreData(leaderboardRecord(changed, changedRole, run, now));
        const overallData = overallSnap?.exists() ? overallSnap.data() : {};
        transaction.set(scoreRef, record);
        transaction.set(overallRef, sanitizeFirestoreData({
          ...record,
          id: `${user.uid}_overall`,
          mode: "overall",
          score: Math.max(0, (Number(overallData.score) || 0) + run.score - oldBest),
          streak: Math.max(Number(overallData.streak) || 0, run.streak),
        }));
      }
    }

    if (action.startsWith("admin") || action === "revokeDeveloper") {
      transaction.set(doc(db, "ledger", `${requestId}_${user.uid}`), sanitizeFirestoreData({
        kind: action,
        actor: user.uid,
        target: payload.userId || user.uid,
        payload,
        createdAt: now,
      }));
    }

    const meta: Record<string, any> = {
      message: actionResult.message,
      ...(actionResult.reward ? { reward: actionResult.reward } : {}),
      ...(actionResult.alreadyClaimed ? { alreadyClaimed: true } : {}),
      ...(actionResult.spinIndex !== undefined ? { spinIndex: actionResult.spinIndex } : { spinIndex }),
      ...(actionResult.gift ? { gift: actionResult.gift } : {}),
    };
    return {
      meta,
      account: accountView(changed, changedRole),
      gift: actionResult.gift || null,
      run: actionResult.run || null,
      changed,
    };
  });

  writeReceipt(user.uid, requestId, hash, transactionResult.meta);
  if (transactionResult.run) {
    completeRunSession(transactionResult.run, now);
    void setDoc(doc(db, "runs", transactionResult.run.id), sanitizeFirestoreData(transactionResult.run), { merge: true }).catch(() => {});
  }
  if (transactionResult.changed) ctx.persistCanonical(transactionResult.changed);
  return { ...transactionResult.meta, account: transactionResult.account };
}

async function fallbackSaveCatalogItem(user: any, data: Record<string, unknown>, ctx: FallbackContext, now: number) {
  const accountSnap = await getDoc(doc(db, "accounts", user.uid)).catch(() => null);
  const account = normalizeAccount(accountSnap?.exists() ? accountSnap.data() : ctx.getSession().account, user, now, STORE_ITEMS as any);
  if (effectiveRole(account, user, now) !== "developer") throw new Error("Developer access required to modify the store catalog.");
  const rawItem = (data.item as any) || {};
  if (!rawItem || typeof rawItem !== "object") throw new Error("Invalid item data.");
  const existing = STORE_ITEMS.find((item) => item.id === rawItem.id);
  const validatedItem = validateCatalogItem(rawItem, existing) as StoreItem;
  let published = true;
  try {
    await Promise.all([
      setDoc(doc(db, "catalog", validatedItem.id), sanitizeFirestoreData({ ...validatedItem, updatedAt: now, updatedBy: user.uid })),
      setDoc(doc(db, "ledger", `catalog_${validatedItem.id}_${now}`), sanitizeFirestoreData({
        kind: "catalog_item_saved", itemId: validatedItem.id, savedBy: user.uid, email: user.email, item: validatedItem, createdAt: now,
      })),
    ]);
  } catch {
    published = false;
    queueCatalogOutbox(validatedItem as any, user.uid, now);
  }
  applyCatalogItem(validatedItem);
  return {
    message: published
      ? (existing ? `Updated “${validatedItem.name}” in the live store.` : `Published “${validatedItem.name}” to the live store.`)
      : `Saved “${validatedItem.name}” on this device. Cloud publishing will retry when Firebase is available.`,
    item: validatedItem,
  };
}

async function fallbackUnlockDeveloper(user: any, data: Record<string, unknown>, ctx: FallbackContext, now: number) {
  const password = String(data.password || "");
  if (password.length < MASTER_KEY_MIN_LENGTH || password.length > MASTER_KEY_MAX_LENGTH) {
    throw new Error(`Enter the configured master key (${MASTER_KEY_MIN_LENGTH}–${MASTER_KEY_MAX_LENGTH} characters).`);
  }
  if (!isOwner(user) && !(await verifyMasterKey(password))) throw new Error("Invalid master key.");
  const accountRef = doc(db, "accounts", user.uid);
  const accountSnap = await getDoc(accountRef).catch(() => null);
  const catalog = await currentCatalog(now);
  const account = normalizeAccount(accountSnap?.exists() ? accountSnap.data() : ctx.getSession().account, user, now, catalog);
  account.developerUntil = now + 3600000;
  account.ownerAccount = isOwner(user);
  account.revision = (account.revision || 0) + 1;
  ctx.persistCanonical(account);
  try {
    await syncAccountNow(account, now);
    await setDoc(doc(db, "ledger", `developer_unlock_${user.uid}_${now}`), sanitizeFirestoreData({
      kind: "developer.unlock", actor: user.uid, expiresAt: account.developerUntil, createdAt: now,
    }));
  } catch {
    return { message: "Developer mode unlocked on this device. Cloud sync will retry." };
  }
  return { message: "Developer mode unlocked for one hour." };
}

async function fallbackUploadImage(user: any, data: Record<string, unknown>, ctx: FallbackContext, now: number) {
  const accountSnap = await getDoc(doc(db, "accounts", user.uid)).catch(() => null);
  const account = normalizeAccount(accountSnap?.exists() ? accountSnap.data() : ctx.getSession().account, user, now, STORE_ITEMS as any);
  if (effectiveRole(account, user, now) !== "developer") throw new Error("Only verified developers can upload images.");
  const purpose = String(data.purpose || "catalog");
  const url = String(data.dataUrl || (data.base64 ? `data:image/png;base64,${data.base64}` : ""));
  if (!url) throw new Error("No image data provided.");
  if (purpose === "profile") {
    account.profile.customPhotoURL = url;
    account.profile.useGooglePfp = false;
    account.revision = (account.revision || 0) + 1;
    ctx.persistCanonical(account);
    await syncAccountNow(account, now).catch(() => {});
    return { url, message: "Developer profile picture updated." };
  }
  return { url, message: "Image ready. Save the item to publish it." };
}

async function fallbackPlayerDirectory(data: Record<string, unknown>, user: any, ctx: FallbackContext, now: number) {
  const term = String(data.query || "").trim().toLowerCase();
  const players: any[] = [];
  try {
    const snap = await getDocs(query(collection(db, "players"), orderBy("searchName"), limit(50)));
    for (const document of snap.docs) {
      const player: any = document.data();
      const name = player.name || player.displayName || "Player";
      if (!term || document.id.toLowerCase().includes(term) || String(name).toLowerCase().includes(term) || String(player.email || "").toLowerCase().includes(term)) {
        players.push({ uid: document.id, name, displayName: name, email: player.email || "", level: Number(player.level) || 1 });
      }
    }
  } catch {
    /* self remains available below */
  }
  const session = ctx.getSession();
  if (session.account && !players.some((player) => player.uid === session.account!.uid)) {
    const self = session.account;
    const name = self.operativeName || user.displayName || "Player";
    if (!term || user.uid.toLowerCase().includes(term) || name.toLowerCase().includes(term) || String(user.email || "").toLowerCase().includes(term)) {
      players.unshift({ uid: self.uid, name, displayName: name, email: user.email || self.email || "", level: levelFor(self.stats) });
    }
  }
  return { players, nextPageToken: null };
}

async function fallbackListPlayers(data: Record<string, unknown>, user: any, ctx: FallbackContext, now: number) {
  const accountSnap = await getDoc(doc(db, "accounts", user.uid)).catch(() => null);
  const account = normalizeAccount(accountSnap?.exists() ? accountSnap.data() : ctx.getSession().account, user, now, STORE_ITEMS as any);
  if (effectiveRole(account, user, now) !== "developer") throw new Error("Developer access required.");
  const term = String(data.query || "").trim().toLowerCase();
  const players: any[] = [];
  try {
    const snap = await getDocs(query(collection(db, "accounts"), limit(50)));
    for (const document of snap.docs) {
      const record: any = document.data();
      const name = record.operativeName || "Player";
      if (!term || document.id.toLowerCase().includes(term) || String(record.email || "").toLowerCase().includes(term) || name.toLowerCase().includes(term)) {
        players.push({ uid: document.id, email: record.email || "", displayName: name, name, account: record, level: levelFor(record.stats) });
      }
    }
  } catch (error) {
    console.warn("Could not list remote accounts:", error);
  }
  return { players, nextPageToken: null };
}

async function fallbackInitializePlayer(data: Record<string, unknown>, user: any, ctx: FallbackContext, now: number) {
  const accountSnap = await getDoc(doc(db, "accounts", user.uid)).catch(() => null);
  const actor = normalizeAccount(accountSnap?.exists() ? accountSnap.data() : ctx.getSession().account, user, now, STORE_ITEMS as any);
  if (effectiveRole(actor, user, now) !== "developer") throw new Error("Developer access required.");
  const targetUid = String(data.userId || "").trim();
  if (!/^[A-Za-z0-9:_-]{1,128}$/.test(targetUid)) throw new Error("Choose a valid player ID.");
  const targetRef = doc(db, "accounts", targetUid);
  const [existing, playerSnap] = await Promise.all([getDoc(targetRef), getDoc(doc(db, "players", targetUid)).catch(() => null)]);
  if (existing.exists()) return { message: "Player inventory is already ready." };
  const player: any = playerSnap?.exists() ? playerSnap.data() : null;
  const target = normalizeAccount(null, { uid: targetUid, email: "" }, now, STORE_ITEMS as any, player ? { operativeName: player.name } : null);
  await setDoc(targetRef, toStoredAccount(target, now));
  await setDoc(doc(db, "players", targetUid), sanitizeFirestoreData(publicPlayer(target, "player")), { merge: true });
  return { message: "Player inventory prepared." };
}

async function fallbackInspectData(data: Record<string, unknown>, user: any, ctx: FallbackContext, now: number) {
  const accountSnap = await getDoc(doc(db, "accounts", user.uid)).catch(() => null);
  const account = normalizeAccount(accountSnap?.exists() ? accountSnap.data() : ctx.getSession().account, user, now, STORE_ITEMS as any);
  if (effectiveRole(account, user, now) !== "developer") throw new Error("Developer access required.");
  const collectionName = String(data.collection || "ledger");
  if (!INSPECT_COLLECTIONS.has(collectionName)) throw new Error("Choose an application data collection.");
  const documentId = data.documentId ? String(data.documentId).trim() : "";
  const documents: any[] = [];
  try {
    if (documentId) {
      const snap = await getDoc(doc(db, collectionName, documentId));
      if (snap.exists()) documents.push({ id: snap.id, data: snap.data() });
    } else {
      const timeField = collectionName === "runs" ? "startedAt" : ["ledger", "gifts", "feedback"].includes(collectionName) ? "createdAt" : null;
      const snap = await getDocs(timeField
        ? query(collection(db, collectionName), orderBy(timeField, "desc"), limit(30))
        : query(collection(db, collectionName), limit(30)));
      for (const document of snap.docs) documents.push({ id: document.id, data: document.data() });
    }
  } catch (error) {
    console.warn("Data inspector is temporarily unavailable:", error);
  }
  return { documents, nextCursor: null };
}

export async function runClientFallback<T = any>(
  name: string,
  data: Record<string, unknown>,
  ctx: FallbackContext
): Promise<T> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error("Sign in with Google to use this feature.");
  const now = Date.now();
  switch (name) {
    case "bootstrapAccount": return await fallbackBootstrap(user, data, ctx, now) as T;
    case "beginRun": {
      const mode = String(data.mode || "arcade");
      if (!MODES.includes(mode as any)) throw new Error("Choose a scored mode.");
      const run: RunSession = {
        id: `run_${crypto.randomUUID()}`,
        uid: user.uid,
        mode,
        bucket: scoreBucket(mode as any),
        multiplier: Math.max(1, Math.min(3, Number(data.multiplier) || 1)),
        startedAt: now,
      };
      saveRunSession(run);
      void setDoc(doc(db, "runs", run.id), sanitizeFirestoreData(run)).catch(() => {});
      return run as T;
    }
    case "gameAction": return await fallbackGameAction(user, data, ctx, now) as T;
    case "saveCatalogItem": return await fallbackSaveCatalogItem(user, data, ctx, now) as T;
    case "unlockDeveloper": return await fallbackUnlockDeveloper(user, data, ctx, now) as T;
    case "uploadImage": return await fallbackUploadImage(user, data, ctx, now) as T;
    case "playerDirectory": return await fallbackPlayerDirectory(data, user, ctx, now) as T;
    case "listPlayers": return await fallbackListPlayers(data, user, ctx, now) as T;
    case "initializePlayer": return await fallbackInitializePlayer(data, user, ctx, now) as T;
    case "inspectData": return await fallbackInspectData(data, user, ctx, now) as T;
    case "sendModeratorFeedback": {
      const accountSnap = await getDoc(doc(db, "accounts", user.uid)).catch(() => null);
      const account = normalizeAccount(accountSnap?.exists() ? accountSnap.data() : ctx.getSession().account, user, now, STORE_ITEMS as any);
      const role = effectiveRole(account, user, now);
      if (role !== "moderator" && role !== "developer") throw new Error("Moderator access required.");
      const message = String(data.message || "").trim();
      if (!message) throw new Error("Enter feedback text.");
      await addDoc(collection(db, "feedback"), sanitizeFirestoreData({
        uid: user.uid, name: account.operativeName, message, status: "new", createdAt: now,
      }));
      return { message: "Feedback sent to the developer." } as T;
    }
    case "acknowledgeFeedback": {
      const accountSnap = await getDoc(doc(db, "accounts", user.uid)).catch(() => null);
      const account = normalizeAccount(accountSnap?.exists() ? accountSnap.data() : ctx.getSession().account, user, now, STORE_ITEMS as any);
      if (effectiveRole(account, user, now) !== "developer") throw new Error("Developer access required.");
      const id = String(data.id || "").trim();
      if (id) await updateDoc(doc(db, "feedback", id), { status: "reviewed", reviewedAt: now, reviewedBy: user.uid });
      return { message: "Marked as reviewed." } as T;
    }
    default: return { message: "Action saved." } as T;
  }
}
