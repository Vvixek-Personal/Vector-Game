import { auth, db, sanitizeFirestoreData } from "../firebase/config";
import { doc, setDoc } from "firebase/firestore";
import type { Stats } from "./storage";
import type { Profile } from "./profile";
import { addPlayerXp } from "./levels";

export interface Mission {
  id: string;
  type: "daily" | "weekly" | "monthly";
  title: string;
  description: string;
  requirement: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  rewardXp: number;
  rewardSparks: number;
  rewardDiamonds: number;
  statKey: string;
}

export const MISSIONS_LIST: Omit<Mission, "progress" | "completed" | "claimed" | "type">[] = [
  { id: "m_runs", title: "Operative Deployment", description: "Complete game runs across any mode", requirement: 5, rewardXp: 400, rewardSparks: 250, rewardDiamonds: 5, statKey: "runs" },
  { id: "m_score", title: "Target Elimination", description: "Score points across game runs", requirement: 3500, rewardXp: 800, rewardSparks: 450, rewardDiamonds: 8, statKey: "score" },
  { id: "m_streak", title: "Unbroken Chain", description: "Achieve a combo streak in a single run", requirement: 25, rewardXp: 600, rewardSparks: 350, rewardDiamonds: 6, statKey: "streak" },
  { id: "m_perfect", title: "Precision Reflex", description: "Land lightning-fast perfect inputs", requirement: 12, rewardXp: 500, rewardSparks: 300, rewardDiamonds: 5, statKey: "perfectHits" },
  { id: "m_boss", title: "Raid Breaker", description: "Successfully conquer Boss Sequence Raids", requirement: 2, rewardXp: 1200, rewardSparks: 700, rewardDiamonds: 12, statKey: "bossRaids" },
  { id: "m_overdrive", title: "Hyperdrive Flow", description: "Enter Overdrive state during gameplay", requirement: 3, rewardXp: 700, rewardSparks: 400, rewardDiamonds: 7, statKey: "overdriveCount" },
];

export interface MissionsState {
  daily: Mission[];
  weekly: Mission[];
  monthly: Mission[];
  lastUpdate: number;
}

export function generateMissions(type: "daily" | "weekly" | "monthly"): Mission[] {
  const d = new Date();
  const seedString = `${type}-${d.getFullYear()}-${d.getMonth()}-${type === "daily" ? d.getDate() : Math.floor(d.getDate() / 7)}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);

  const count = type === "daily" ? 3 : type === "weekly" ? 2 : 1;
  const multiplier = type === "daily" ? 1 : type === "weekly" ? 4 : 12;

  const shuffled = [...MISSIONS_LIST].sort((a, b) => {
    const ha = (seed + a.id.charCodeAt(2)) % 100;
    const hb = (seed + b.id.charCodeAt(2)) % 100;
    return ha - hb;
  });

  return shuffled.slice(0, count).map((m, idx) => ({
    ...m,
    id: `${m.id}_${type}_${idx}`,
    type,
    requirement: m.requirement * multiplier,
    rewardXp: m.rewardXp * multiplier,
    rewardSparks: m.rewardSparks * multiplier,
    rewardDiamonds: m.rewardDiamonds * multiplier,
    progress: 0,
    completed: false,
    claimed: false,
  }));
}

export function loadMissions(): MissionsState {
  try {
    const raw = localStorage.getItem("vector_missions_v2");
    if (raw) {
      const parsed = JSON.parse(raw) as MissionsState;
      const now = new Date();
      const last = new Date(parsed.lastUpdate);
      
      let needsUpdate = false;
      if (now.getDate() !== last.getDate() || now.getMonth() !== last.getMonth()) {
        parsed.daily = generateMissions("daily");
        needsUpdate = true;
      }
      
      if (now.getTime() - last.getTime() > 7 * 24 * 60 * 60 * 1000) {
        parsed.weekly = generateMissions("weekly");
        needsUpdate = true;
      }
      if (now.getMonth() !== last.getMonth()) {
        parsed.monthly = generateMissions("monthly");
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        parsed.lastUpdate = now.getTime();
        saveMissions(parsed);
      }
      
      return parsed;
    }
  } catch {}
  
  const initial: MissionsState = {
    daily: generateMissions("daily"),
    weekly: generateMissions("weekly"),
    monthly: generateMissions("monthly"),
    lastUpdate: Date.now()
  };
  saveMissions(initial);
  return initial;
}

export function saveMissions(state: MissionsState) {
  localStorage.setItem("vector_missions_v2", JSON.stringify(state));
  if (auth?.currentUser) {
    setDoc(doc(db, "users", auth.currentUser.uid), sanitizeFirestoreData({ missions: state }), { merge: true }).catch(console.warn);
  }
}

export function claimMissionReward(
  missionId: string,
  state: MissionsState,
  profile: Profile,
  stats: Stats
): { nextState: MissionsState; nextProfile: Profile; nextStats: Stats; mission: Mission } | null {
  const allMissions = [...state.daily, ...state.weekly, ...state.monthly];
  const target = allMissions.find((m) => m.id === missionId);
  if (!target || !target.completed || target.claimed) return null;

  target.claimed = true;

  const nextState: MissionsState = {
    ...state,
    daily: state.daily.map((m) => (m.id === missionId ? { ...m, claimed: true } : m)),
    weekly: state.weekly.map((m) => (m.id === missionId ? { ...m, claimed: true } : m)),
    monthly: state.monthly.map((m) => (m.id === missionId ? { ...m, claimed: true } : m)),
  };

  const nextStats: Stats = {
    ...stats,
    sparks: (stats.sparks || 0) + target.rewardSparks,
    sparksEarned: (stats.sparksEarned || 0) + target.rewardSparks,
    diamonds: (stats.diamonds || 0) + target.rewardDiamonds,
  };

  const nextProfile = addPlayerXp(profile, target.rewardXp);

  saveMissions(nextState);
  return { nextState, nextProfile, nextStats, mission: target };
}

export function updateMissionsProgress(state: MissionsState, runStats: Record<string, number>): MissionsState {
  const next = { ...state };
  let changed = false;

  const check = (m: Mission) => {
    if (m.completed) return;
    
    if (m.statKey === "streak") {
      const best = runStats.streak || runStats.bestStreak || 0;
      if (best > m.progress) {
        m.progress = best;
        changed = true;
      }
    } else {
      const added = runStats[m.statKey] || 0;
      if (added > 0) {
        m.progress += added;
        changed = true;
      }
    }
    
    if (m.progress >= m.requirement) {
      m.progress = m.requirement;
      m.completed = true;
      changed = true;
    }
  };

  next.daily.forEach(check);
  next.weekly.forEach(check);
  next.monthly.forEach(check);

  if (changed) saveMissions(next);
  return next;
}
