import type { RunSnap } from './storage';

export type AnalyticsMetric = 'score' | 'accuracy' | 'reaction' | 'streak' | 'sparks';
export const HISTORY_LIMIT = 100;
const valid = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export function metricValue(run: RunSnap, metric: AnalyticsMetric): number | null {
  const value = metric === 'accuracy' ? run.acc : metric === 'reaction' ? run.avgReactionMs : run[metric];
  if (!valid(value) || (metric === 'reaction' && value <= 0)) return null;
  return metric === 'accuracy' ? Math.min(100, value) : value;
}
export function selectRuns(history: RunSnap[], mode: string, limit: number, rules = "all") {
  const filtered = history.filter(r => r.mode !== 'practice' && valid(r.score) && (mode === 'all' || r.mode === mode) && (rules === "all" || (rules === "standard" ? r.modifierMultiplier === 1 : valid(r.modifierMultiplier) && r.modifierMultiplier > 1)));
  const count = Math.max(1, Math.min(HISTORY_LIMIT, Math.floor(limit) || HISTORY_LIMIT));
  return { current: filtered.slice(0, count), previous: filtered.slice(count, count * 2), available: filtered.length };
}
export function summarizeRuns(runs: RunSnap[]) {
  const scores = runs.map(r => r.score).filter(valid);
  const averageScore = scores.length ? scores.reduce((a,b) => a+b,0)/scores.length : null;
  const accuracy = runs.map(r => metricValue(r, 'accuracy')).filter((v): v is number => v !== null);
  const timedHits = runs.filter(r => valid(r.avgReactionMs) && r.avgReactionMs > 0 && (r.hits === undefined || r.hits > 0));
  const reactionWeight = timedHits.reduce((n,r) => n+(r.hits ?? 1),0);
  const reactionMs = reactionWeight ? timedHits.reduce((n,r) => n+r.avgReactionMs*(r.hits ?? 1),0)/reactionWeight : null;
  const timedRuns = runs.filter(r => valid(r.playSeconds) && r.playSeconds > 0);
  const timedSeconds = timedRuns.reduce((n,r) => n+r.playSeconds,0);
  const measured = runs.filter(r => valid(r.perfectHits) && valid(r.hits) && r.hits > 0);
  const measuredHits = measured.reduce((n,r) => n+r.hits,0);
  const perfectRate = measuredHits ? Math.min(100,measured.reduce((n,r) => n+r.perfectHits,0)/measuredHits*100) : null;
  const variation = scores.length >= 2 && averageScore > 0 ? Math.sqrt(scores.reduce((n,s) => n+(s-averageScore)**2,0)/scores.length)/averageScore*100 : null;
  return { count: runs.length, averageScore, meanAccuracy: accuracy.length ? accuracy.reduce((a,b)=>a+b,0)/accuracy.length : null,
    reactionMs, reactionRuns: timedHits.length, scorePerMinute: timedSeconds ? timedRuns.reduce((n,r)=>n+r.score,0)/timedSeconds*60 : null,
    perfectRate, variation, bestStreak: runs.length ? Math.max(...runs.map(r=>valid(r.streak)?r.streak:0)) : null,
  };
}
export function compareSamples(current: RunSnap[], previous: RunSnap[], metric: AnalyticsMetric): number | null {
  if (!current.length || current.length !== previous.length) return null;
  const mean = (runs: RunSnap[]) => { const v=runs.map(r=>metricValue(r,metric)).filter((n):n is number=>n!==null); return v.length===runs.length ? v.reduce((a,b)=>a+b,0)/v.length : null; };
  const a=mean(current), b=mean(previous);
  if(a===null || b===null || b===0) return null;
  return (metric==='reaction' ? b-a : a-b)/b*100;
}
export function formatDuration(seconds?: number): string {
  if (!valid(seconds)) return '—';
  const s=Math.round(seconds);
  if(s>=3600) return Math.floor(s/3600)+'h '+String(Math.floor(s%3600/60)).padStart(2,'0')+'m';
  if(s>=60) return Math.floor(s/60)+'m '+String(s%60).padStart(2,'0')+'s';
  return s+'s';
}
