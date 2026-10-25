import { persistSave } from '../firebase/cloudSave';
import { safeStorage } from './persistence';
import { getWeeklyId } from './storage';

export interface Mission {
  id: string; type: 'daily' | 'weekly' | 'monthly'; title: string; requirement: number;
  progress: number; completed: boolean; claimed?: boolean; rewardXp: number;
  rewardDiamonds: number; statKey: string;
}
export const MISSIONS_LIST: Omit<Mission, 'progress' | 'completed' | 'type'>[] = [
  { id: 'm_runs_10', title: 'Complete 10 Runs', requirement: 10, rewardXp: 500, rewardDiamonds: 5, statKey: 'runs' },
  { id: 'm_score_5000', title: 'Score 5,000 Total', requirement: 5000, rewardXp: 1000, rewardDiamonds: 10, statKey: 'score' },
  { id: 'm_streak_30', title: 'Hit a 30 Streak', requirement: 30, rewardXp: 800, rewardDiamonds: 8, statKey: 'streak' },
  { id: 'm_perfect_5', title: 'Get 5 Perfect Hits', requirement: 5, rewardXp: 600, rewardDiamonds: 5, statKey: 'perfectHits' },
];
export interface MissionsState {
  daily: Mission[]; weekly: Mission[]; monthly: Mission[]; lastUpdate: number;
  periods?: { daily: string; weekly: string; monthly: string };
}
function periods(date = new Date()) {
  return { daily: date.toISOString().slice(0, 10), weekly: getWeeklyId(), monthly: date.toISOString().slice(0, 7) };
}
export function generateMissions(type: Mission['type']): Mission[] {
  const pool = [...MISSIONS_LIST];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const count = type === 'daily' ? 3 : type === 'weekly' ? 2 : 1;
  const multiplier = type === 'daily' ? 1 : type === 'weekly' ? 5 : 20;
  return pool.slice(0, count).map(m => ({ ...m,
    title: m.title.replace(/[0-9,]+/, n => (Number(n.replaceAll(',', '')) * multiplier).toLocaleString()),
    id: m.id + '_' + type + '_' + periods()[type], type, requirement: m.requirement * multiplier,
    rewardXp: m.rewardXp * multiplier, rewardDiamonds: m.rewardDiamonds * multiplier,
    progress: 0, completed: false, claimed: false,
  }));
}
export function loadMissions(): MissionsState {
  const current = periods();
  let state: MissionsState;
  try {
    state = JSON.parse(safeStorage.getItem('vector_missions_v1') || 'null');
    if (!state || !['daily', 'weekly', 'monthly'].every(k => Array.isArray(state[k]))) throw Error('Invalid missions');
  } catch {
    state = { daily: [], weekly: [], monthly: [], lastUpdate: 0 };
  }
  const previous = state.periods ?? {
    daily: new Date(state.lastUpdate || 0).toISOString().slice(0, 10),
    weekly: '', monthly: new Date(state.lastUpdate || 0).toISOString().slice(0, 7),
  };
  let changed = false;
  for (const type of ['daily', 'weekly', 'monthly'] as const) {
    if (previous[type] !== current[type] || state[type].length === 0) {
      state[type] = generateMissions(type); changed = true;
    }
  }
  state.periods = current;
  if (changed) { state.lastUpdate = Date.now(); saveMissions(state); }
  return state;
}
export function saveMissions(state: MissionsState) { persistSave('missions', state); }
export function updateMissionsProgress(state: MissionsState, run: Record<string, number>): MissionsState {
  const update = (m: Mission): Mission => {
    if (m.completed) return { ...m };
    const delta = Math.max(0, Number(run[m.statKey]) || 0);
    const progress = Math.min(m.requirement, m.statKey === 'streak' ? Math.max(m.progress, run.bestStreak ?? delta) : m.progress + delta);
    return { ...m, progress, completed: progress >= m.requirement };
  };
  const next = { ...state, daily: state.daily.map(update), weekly: state.weekly.map(update), monthly: state.monthly.map(update) };
  saveMissions(next); return next;
}
