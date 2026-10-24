import { auth, db, sanitizeFirestoreData } from "../firebase/config";
import { doc, setDoc } from "firebase/firestore";

export interface Mission {
  id: string;
  type: "daily" | "weekly" | "monthly";
  title: string;
  requirement: number;
  progress: number;
  completed: boolean;
  rewardXp: number;
  rewardDiamonds: number;
  statKey: string; // which stat to track (e.g. 'runs', 'score', 'streak')
  condition?: (stats: any, recentRun: any) => boolean;
}

export const MISSIONS_LIST: Omit<Mission, "progress" | "completed" | "type">[] = [
  { id: "m_runs_10", title: "Complete 10 Runs", requirement: 10, rewardXp: 500, rewardDiamonds: 5, statKey: "runs" },
  { id: "m_score_5000", title: "Score 5,000 Total", requirement: 5000, rewardXp: 1000, rewardDiamonds: 10, statKey: "score" },
  { id: "m_streak_30", title: "Hit a 30 Streak", requirement: 30, rewardXp: 800, rewardDiamonds: 8, statKey: "streak" },
  { id: "m_perfect_5", title: "Get 5 Perfect Hits", requirement: 5, rewardXp: 600, rewardDiamonds: 5, statKey: "perfectHits" },
];

export interface MissionsState {
  daily: Mission[];
  weekly: Mission[];
  monthly: Mission[];
  lastUpdate: number;
}

export function generateMissions(type: "daily" | "weekly" | "monthly"): Mission[] {
  // simple random subset of missions for this demo
  const pool = [...MISSIONS_LIST].sort(() => Math.random() - 0.5);
  const count = type === "daily" ? 3 : type === "weekly" ? 2 : 1;
  const multiplier = type === "daily" ? 1 : type === "weekly" ? 5 : 20;

  return pool.slice(0, count).map(m => ({
    ...m,
    id: `${m.id}_${Date.now()}_${Math.random()}`,
    type,
    requirement: m.requirement * multiplier,
    rewardXp: m.rewardXp * multiplier,
    rewardDiamonds: m.rewardDiamonds * multiplier,
    progress: 0,
    completed: false
  }));
}

export function loadMissions(): MissionsState {
  try {
    const raw = localStorage.getItem("vector_missions_v1");
    if (raw) {
      const parsed = JSON.parse(raw) as MissionsState;
      // Check if need to refresh
      const now = new Date();
      const last = new Date(parsed.lastUpdate);
      
      let needsUpdate = false;
      if (now.getDate() !== last.getDate() || now.getMonth() !== last.getMonth()) {
        parsed.daily = generateMissions("daily");
        needsUpdate = true;
      }
      
      // simplistic weekly/monthly check
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
  localStorage.setItem("vector_missions_v1", JSON.stringify(state));
  if (auth?.currentUser) {
    setDoc(doc(db, "users", auth.currentUser.uid), sanitizeFirestoreData({ missions: state }), { merge: true }).catch(console.warn);
  }
}

export function updateMissionsProgress(state: MissionsState, runStats: Record<string, number>): MissionsState {
  const next = { ...state };
  let changed = false;

  const check = (m: Mission) => {
    if (m.completed) return;
    
    // update progress based on the runStats delta or specific logic
    // for streak, we look at the max streak in this run
    if (m.statKey === "streak") {
      if ((runStats.bestStreak || 0) > m.progress) {
        m.progress = runStats.bestStreak || 0;
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
