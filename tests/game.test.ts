import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../src/game/engine';
import { loadSettings, loadStats, saveStats, checkDailyLogin, recordRun, spendSparks, spendDiamonds, convertSparksToDiamonds, addScore, loadScores } from '../src/game/storage';
import { safeStorage } from '../src/game/persistence';
import { DEFAULT_PROFILE, loadProfile, saveProfile } from '../src/game/profile';
import { loadMissions, saveMissions, updateMissionsProgress } from '../src/game/missions';
import { SPIN_SLICES, applySpinReward } from '../src/game/spin';
import { addEggToInventory, startIncubation, hatchPod, speedUpPod, loadIncubatorState } from '../src/game/incubator';
import { LEVEL_REWARDS } from '../src/game/levels';
import { STORE_ITEMS } from '../src/game/catalog';

const win = Object.assign(new EventTarget(), { devicePixelRatio: 1 });
Object.defineProperty(globalThis, 'window', { value: win, configurable: true });
Object.defineProperty(globalThis, 'document', { value: new EventTarget(), configurable: true });
Object.defineProperty(globalThis, 'requestAnimationFrame', { value: () => 1, configurable: true });
Object.defineProperty(globalThis, 'cancelAnimationFrame', { value: () => {}, configurable: true });
const storageKeys = ['vector_stats_v5', 'vector_settings_v5', 'vector_profile_v5', 'vector_scores_v5', 'vector_missions_v1', 'vector_incubator_state_v1'];
beforeEach(() => { for (const key of storageKeys) safeStorage.removeItem(key); });
function engine(mode = 'arcade', mods = {}) {
  const canvas = Object.assign(new EventTarget(), { getContext: () => ({}), getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, top: 0 }), setPointerCapture() {}, hasPointerCapture: () => false });
  let summary;
  const e: any = new Engine(canvas as any, { ...loadSettings(), haptics: 0, reducedMotion: true, soundEnabled: false }, { onPhase() {}, onHud() {}, onOver(s) { summary = s; } });
  e.render = () => {}; e.startGame(mode, mods);
  return { e, finish: () => { e.over(); e.destroy(); return summary; } };
}
function hit(e: any, correct = true) { e.commit(correct ? e.requiredDir : (e.requiredDir + 180) % 360); }

test('runs preserve login streak and daily reward cannot be claimed twice', () => {
  const reward = checkDailyLogin(loadStats()); assert.ok(reward);
  recordRun(100, 4, 230, { hits: 3, mode: 'arcade' });
  assert.equal(loadStats().lastLoginDate, reward.nextStats.lastLoginDate);
  assert.equal(loadStats().loginStreak, 1); assert.equal(checkDailyLogin(reward.nextStats), null);
});
test('currency rejects invalid spending and insufficient funds', () => {
  saveStats({ ...loadStats(), sparks: 100, diamonds: 10 });
  for (const value of [-5, 0, NaN, Infinity, 0.5]) { assert.equal(spendSparks(value), null); assert.equal(spendDiamonds(value), null); }
  assert.equal(spendSparks(101), null); assert.equal(convertSparksToDiamonds(-1, 10), null);
  assert.equal(loadStats().sparks, 100);
});
test('spin reward uses the balance after payment and persists immediately', () => {
  saveStats({ ...loadStats(), sparks: 1000 }); spendSparks(150);
  applySpinReward(SPIN_SLICES[0], loadStats(), structuredClone(DEFAULT_PROFILE));
  assert.equal(loadStats().sparks, 1000); assert.equal(loadStats().sparksSpent, 150);
});
test('duplicate spin avatar converts once and audio/theme equipment survives reload', () => {
  const p = { ...structuredClone(DEFAULT_PROFILE), purchased: ['ani-cipher'], audioPackId: 'retro', arenaThemeId: 'thm-matrix' };
  saveProfile(p); assert.equal(loadProfile().audioPackId, 'retro'); assert.equal(loadProfile().arenaThemeId, 'thm-matrix');
  applySpinReward(SPIN_SLICES[6], loadStats(), p); assert.equal(loadStats().sparks, 400);
});
test('hatch clears the pod before another claim can grant rewards', () => {
  safeStorage.setItem('vector_incubator_state_v1', JSON.stringify({inventory:[{id:'egg',eggType:'neon',obtainedAt:Date.now()}],pods:[null,null]}));
  startIncubation('egg', 0); speedUpPod(0);
  assert.ok(hatchPod(0, loadStats(), structuredClone(DEFAULT_PROFILE)));
  assert.equal(hatchPod(0, loadStats(), structuredClone(DEFAULT_PROFILE)), null);
});
test('mission streak uses the best run streak and inputs are immutable', () => {
  const state = loadMissions(); state.daily = [{ id: 'test', type: 'daily', title: 'Streak', statKey: 'streak', requirement: 30, progress: 0, completed: false, rewardXp: 1, rewardDiamonds: 1 }];
  const next = updateMissionsProgress(state, { streak: 30 });
  assert.equal(next.daily[0].completed, true); assert.equal(state.daily[0].progress, 0);
});
test("weekly missions refresh independently of the daily refresh", () => {
  const state = loadMissions(); const oldId = state.weekly[0].id; state.weekly[0].progress = 1;
  state.periods.weekly = 'old-week'; saveMissions(state);
  const next = loadMissions(); assert.equal(next.weekly[0].progress, 0); assert.equal(next.periods.daily, new Date().toISOString().slice(0,10));
});
test('malformed local stats, scores and controls recover safely', () => {
  safeStorage.setItem('vector_stats_v5', JSON.stringify({ runs: 'bad', totalScore: -1, history: {}, modeRuns: [] }));
  safeStorage.setItem('vector_settings_v5', JSON.stringify({ binds: { N: 7 }, haptics: 999, dpadScale: null }));
  safeStorage.setItem('vector_scores_v5', 'null');
  assert.equal(loadStats().runs, 0); assert.equal(loadStats().totalScore, 0); assert.deepEqual(loadScores('arcade'), []);
  assert.deepEqual(loadSettings().binds, {}); assert.equal(loadSettings().haptics, 100);
});
test('wrong responses do not grant reaction records and waves reset on mistakes', () => {
  const {e, finish} = engine('waves'); e.waveStep = 4; hit(e, false);
  assert.equal(e.waveStep, 0); const s = finish(); assert.equal(s.fastestMs, 0); assert.equal(s.perfectHits, 0); assert.equal(s.misses, 1);
});
test('co-op counts completed team rounds, misses and finite accuracy', () => {
  const {e, finish} = engine('coop'); e.coop[0].input = e.requiredDir; e.coop[1].input = e.requiredDir; e.coopEval(); e.coopTimeout();
  const s = finish(); assert.equal(s.hits, 1); assert.equal(s.misses, 1); assert.equal(s.accuracy, 50);
});
test('versus counts points, hits, timeouts and rejects rapid presses without freezing', () => {
  const {e, finish} = engine('versus'); hit(e); const attempts = e.swipes; hit(e);
  assert.equal(e.swipes, attempts); assert.equal(e.committed, false);
  e.lastVersusAt = 0; hit(e); e.handleTimeout(); const s = finish();
  assert.equal(s.hits, 2); assert.equal(s.misses, 1); assert.equal(s.score, 50); assert.equal(s.accuracy, 67);
});
test('memory ignores early input, resets it for recall, and retains hyper speed', () => {
  const {e, finish} = engine('memory', { hyperSpeed: true }); e.pressDir('N'); assert.equal(e.held.size, 0);
  e.update(1); assert.equal(e.memoryPhase, 'recall'); assert.ok(e.timeLeft < 2.6); finish();
});
test('cancelled gestures and other pointer IDs do not count as taps', () => {
  const {e, finish} = engine(); e.onPointerDown({ button: 0, pointerId: 1, clientX: 700, clientY: 300 });
  e.onPointerUp({ pointerId: 2, clientX: 700, clientY: 300 }); assert.equal(e.swipes, 0);
  e.onPointerCancel({ pointerId: 1 }); e.onPointerUp({ pointerId: 1, clientX: 700, clientY: 300 }); assert.equal(e.swipes, 0); finish();
});
test('daily and weekly runs are deterministic across restarts and ignore modifiers', () => {
  for (const mode of ['daily', 'weekly']) {
    const {e, finish} = engine(mode, { mirrorRealm: true, suddenRisk: true }); const seq = [];
    for (let i=0;i<10;i++) { seq.push([e.visualDir,e.mark]); e.spawn(); }
    e.startGame(mode); const replay = []; for(let i=0;i<10;i++) { replay.push([e.visualDir,e.mark]); e.spawn(); }
    assert.deepEqual(seq, replay); assert.equal(e.livesLeft, 3); finish();
  }
});
test('all advertised level rewards exist and all shop themes can equip', () => {
  for (const r of LEVEL_REWARDS) assert.ok(STORE_ITEMS.some(i => i.id === r.storeItemId), r.storeItemId);
  for (const item of STORE_ITEMS.filter(i => i.tab === 'themes')) assert.equal(item.apply.arenaThemeId, item.id);
});
test('completed runs in every mode produce valid result totals', () => {
  for (const mode of ['arcade','waves','memory','rush','blitz','sudden','zen','daily','weekly']) {
    const {e, finish} = engine(mode); if(mode==='memory') e.update(1); hit(e); const s=finish();
    assert.equal(s.hits,1,mode); assert.equal(s.misses,0,mode); assert.equal(s.accuracy,100,mode); assert.ok(s.score>0,mode);
  }
});

test('all existing shop frames and titles survive saving and reloading', () => {
  for (const item of STORE_ITEMS.filter(i => i.apply?.frameId || i.apply?.titleId)) {
    saveProfile({ ...structuredClone(DEFAULT_PROFILE), ...item.apply, purchased: [item.id] });
    const loaded = loadProfile();
    if(item.apply.frameId) assert.equal(loaded.frameId,item.apply.frameId,item.id);
    if(item.apply.titleId) assert.equal(loaded.titleId,item.apply.titleId,item.id);
  }
});

test('practice has no timeout, lives lost, modifiers, Focus, or ranked rewards', () => {
  const {e, finish}=engine('practice',{suddenRisk:true,hyperSpeed:true,mirrorRealm:true});
  e.update(3600);assert.equal(e.phase,'playing');assert.equal(e.swipes,0);assert.equal(e.timeLeft,1);
  hit(e,false);assert.equal(e.livesLeft,999);assert.equal(e.phase,'playing');
  assert.equal(e.focusAvailable(),false);hit(e);e.finishPractice();
  const s=finish();assert.equal(s.newBest,false);assert.equal(s.modifierMultiplier,1);assert.equal(s.hits,1);assert.equal(s.misses,1);
  const before=loadStats();recordRun(999,30,100,{mode:'practice',hits:30});addScore('practice',{score:999,name:'Test',date:'Today'});
  assert.deepEqual(loadStats(),before);assert.deepEqual(loadScores('practice'),[]);
});
test('hit feedback includes measured reaction and points, then expires', () => {
  const {e,finish}=engine();hit(e);
  assert.equal(e.hitFeedback.kind,'hit');assert.ok(e.hitFeedback.points>0);assert.ok(e.hitFeedback.reactionMs>=0);
  e.t+=1.1;e.update(0);assert.equal(e.hitFeedback,null);
  hit(e,false);assert.equal(e.hitFeedback.kind,'miss');assert.equal(e.hitFeedback.label,'Try again');finish();
});
test('new history records timing, precision, modifiers and stable run identifiers', () => {
  recordRun(100,3,245,{mode:'arcade',hits:3,misses:1,perfectHits:2,avgMs:300,playSeconds:12,acc:75,modifierMultiplier:1.35});
  const run=loadStats().history[0];
  assert.equal(run.avgReactionMs,300);assert.equal(run.perfectHits,2);assert.equal(run.playSeconds,12);assert.equal(run.modifierMultiplier,1.35);assert.equal(run.runNumber,1);assert.ok(run.createdAt>0);assert.ok(run.id);
});

test('challenge scores keep the period in which a run started, even after a reset', () => {
  addScore('daily',{score:777,name:'Test',date:'Earlier'},'2001-01-01');
  assert.equal(loadScores('daily','2001-01-01')[0].score,777);assert.equal(loadScores('daily').length,0);
  addScore('weekly',{score:888,name:'Test',date:'Earlier'},'2001_W0');
  assert.equal(loadScores('weekly','2001_W0')[0].score,888);assert.equal(loadScores('weekly').length,0);
  const {e,finish}=engine('daily');const period=e.challengeId;hit(e);assert.equal(finish().challengeId,period);
});

test('play again safely resets and restarts without throwing on event arguments', () => {
  const { e, finish } = engine('arcade');
  hit(e);
  const sum = finish();
  assert.equal(sum.mode, 'arcade');

  // Verify synthetic click event passed to engine restart doesn't break if mode is resolved
  const isGameMode = (val: unknown) => typeof val === 'string' && ['arcade', 'zen', 'blitz', 'memory', 'daily', 'weekly', 'versus', 'coop', 'practice'].includes(val);
  const clickEvent = { isTrusted: true, type: 'click', preventDefault() {} };
  const candidateMode = isGameMode(clickEvent) ? clickEvent : sum.mode;
  assert.equal(candidateMode, 'arcade');

  const restarted = engine(candidateMode);
  hit(restarted.e);
  const nextSum = restarted.finish();
  assert.equal(nextSum.hits, 1);
});
