import test from "node:test";
import assert from "node:assert/strict";
import {
  SURVIVAL_LEVELS,
  getSurvivalLevel,
  evaluateSurvivalStars,
} from "../src/game/survival";
import {
  loadSurvivalProgress,
  recordSurvivalClear,
  loadStats,
} from "../src/game/storage";

test("survival has 10 distinct sectors with varied mechanics", () => {
  assert.equal(SURVIVAL_LEVELS.length, 10);

  // Verify unique sequential IDs
  for (let i = 1; i <= 10; i++) {
    const lvl = getSurvivalLevel(i);
    assert.equal(lvl.id, i);
    assert.ok(lvl.title.length > 0);
    assert.ok(lvl.badge.length > 0);
    assert.ok(lvl.rewardSparks > 0);
    assert.ok(lvl.rewardDiamonds > 0);
    assert.ok(lvl.starGoals.star1.length > 0);
    assert.ok(lvl.starGoals.star2.length > 0);
    assert.ok(lvl.starGoals.star3.length > 0);
  }

  // Level 1: Survive 30s with 3 hearts
  const l1 = getSurvivalLevel(1);
  assert.equal(l1.taskType, "survive_time");
  assert.equal(l1.lives, 3);
  assert.equal(l1.duration, 30);

  // Level 2: 1 Heart sudden death
  const l2 = getSurvivalLevel(2);
  assert.equal(l2.lives, 1);
  assert.equal(l2.targetHits, 20);

  // Level 3: Time trial
  const l3 = getSurvivalLevel(3);
  assert.ok(l3.duration && l3.duration <= 30);
  assert.equal(l3.targetHits, 25);

  // Level 4: No wrong (flawless)
  const l4 = getSurvivalLevel(4);
  assert.equal(l4.noWrong, true);
  assert.equal(l4.targetHits, 25);

  // Level 5: Rush clock mechanics
  const l5 = getSurvivalLevel(5);
  assert.equal(l5.taskType, "rush");
  assert.ok(l5.onHitAddTime && l5.onHitAddTime > 0);
  assert.ok(l5.onMissSubTime && l5.onMissSubTime < 0);

  // Level 6: Mirror inversion (reverse directions)
  const l6 = getSurvivalLevel(6);
  assert.equal(l6.taskType, "opposite_rush");
  assert.ok(l6.oppositeChance && l6.oppositeChance >= 0.7);

  // Level 7: Survive with 1 heart
  const l7 = getSurvivalLevel(7);
  assert.equal(l7.taskType, "survive_time");
  assert.equal(l7.lives, 1);
  assert.equal(l7.duration, 40);

  // Level 8: Memory recall
  const l8 = getSurvivalLevel(8);
  assert.equal(l8.taskType, "memory_recall");
  assert.ok(l8.memoryReveal && l8.memoryReveal > 0);

  // Level 9: Precision blitz (rapid + no wrong)
  const l9 = getSurvivalLevel(9);
  assert.equal(l9.noWrong, true);
  assert.ok(l9.roundTime <= 1.5);

  // Level 10: Overdrive core gauntlet
  const l10 = getSurvivalLevel(10);
  assert.equal(l10.duration, 60);
  assert.equal(l10.lives, 1);
});

test("evaluateSurvivalStars computes stars accurately per level requirements", () => {
  const l1 = getSurvivalLevel(1);
  // Not cleared: 0 stars
  assert.equal(
    evaluateSurvivalStars(l1, {
      cleared: false,
      livesLeft: 0,
      hits: 10,
      accuracy: 50,
      avgReactionMs: 400,
      fastestMs: 300,
      bestStreak: 5,
    }),
    0
  );

  // Cleared with 1 life left and low acc: 1 star
  assert.equal(
    evaluateSurvivalStars(l1, {
      cleared: true,
      livesLeft: 1,
      hits: 15,
      accuracy: 70,
      avgReactionMs: 400,
      fastestMs: 300,
      bestStreak: 5,
    }),
    1
  );

  // Cleared with 3 lives left and 90% acc: 3 stars
  assert.equal(
    evaluateSurvivalStars(l1, {
      cleared: true,
      livesLeft: 3,
      hits: 20,
      accuracy: 92,
      avgReactionMs: 320,
      fastestMs: 220,
      bestStreak: 12,
    }),
    3
  );

  // Level 4 (no wrong): check fast reaction stars
  const l4 = getSurvivalLevel(4);
  assert.equal(
    evaluateSurvivalStars(l4, {
      cleared: true,
      livesLeft: 1,
      hits: 25,
      accuracy: 100,
      avgReactionMs: 280,
      fastestMs: 210,
      bestStreak: 25,
    }),
    3
  );
});

test("survival progress persists, unlocks subsequent sectors, and awards bounties", () => {
  const initial = loadSurvivalProgress();
  assert.ok(initial.unlockedLevel >= 1);

  const initialStats = loadStats();
  const sparksBefore = initialStats.sparks || 0;

  // Clear Sector 1 with 3 stars
  const result = recordSurvivalClear(1, 3, 1200, 95, 28, 40, 1);
  assert.equal(result.progress.levels[1].completed, true);
  assert.equal(result.progress.levels[1].stars, 3);
  assert.ok(result.progress.unlockedLevel >= 2);
  assert.ok(result.sparksAwarded >= 40);
  assert.ok(result.diamondsAwarded >= 1);

  // Check stats updated
  const updatedStats = loadStats();
  assert.ok((updatedStats.sparks || 0) > sparksBefore);

  // Reload progress from storage
  const reloaded = loadSurvivalProgress();
  assert.equal(reloaded.levels[1].stars, 3);
  assert.ok(reloaded.totalStars >= 3);
});
