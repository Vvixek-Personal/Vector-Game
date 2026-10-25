import { doc, setDoc } from 'firebase/firestore';
import { auth, db, sanitizeFirestoreData } from './config';
import { safeStorage } from '../game/persistence';

let readyUid: string | null = null;
let pending: Record<string, unknown> = {};
let timer: ReturnType<typeof setTimeout> | undefined;
export function beginCloudSync() {
  readyUid = null; pending = {}; clearTimeout(timer);
}
export function completeCloudSync(uid: string) {
  if (auth.currentUser?.uid === uid) readyUid = uid;
}
export function queueCloudSave(patch: Record<string, unknown>) {
  if (!readyUid || auth.currentUser?.uid !== readyUid) return;
  pending = { ...pending, ...patch };
  clearTimeout(timer);
  const uid = readyUid;
  timer = setTimeout(() => {
    if (auth.currentUser?.uid !== uid || readyUid !== uid) return;
    const data = { ...pending, userId: uid };
    pending = {};
    void setDoc(doc(db, 'users', uid), sanitizeFirestoreData(data), { merge: true }).catch(err => {
      console.warn('Cloud save unavailable; progress is saved on this device.', err);
    });
  }, 200);
}
export const SAVE_KEYS = {
  stats: 'vector_stats_v5', profile: 'vector_profile_v5',
  settings: 'vector_settings_v5', missions: 'vector_missions_v1',
  operativeName: 'vector_player_name',
} as const;
export function persistSave(field: keyof typeof SAVE_KEYS, value: unknown) {
  const key = SAVE_KEYS[field];
  const raw = field === 'operativeName' ? String(value) : JSON.stringify(value);
  if (safeStorage.getItem(key) === raw) return;
  const timestamp = Date.now();
  safeStorage.setItem(key, raw);
  safeStorage.setItem(key + '_updatedAt', String(timestamp));
  queueCloudSave({ [field]: value, [field + 'UpdatedAt']: timestamp });
}
