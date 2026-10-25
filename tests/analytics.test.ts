import test from 'node:test';
import assert from 'node:assert/strict';
import { compareSamples, formatDuration, metricValue, selectRuns, summarizeRuns } from '../src/game/analytics';
import { chartMaximum, curveThroughPoints } from '../src/game/chartGeometry';
import type { RunSnap } from '../src/game/storage';
const run=(score=100,extra:Partial<RunSnap>={}):RunSnap=>({score,mode:'arcade',acc:75,sparks:10,streak:5,date:'Today',...extra});

test('analytics excludes practice and filters mode, rules and matching sample groups',()=> {
 const history=[run(1,{mode:'practice'}),run(2,{mode:'zen'}),run(3,{modifierMultiplier:1}),run(4,{modifierMultiplier:1.35}),run(5)];
 assert.deepEqual(selectRuns(history,'arcade',1).current.map(r=>r.score),[3]);
 assert.deepEqual(selectRuns(history,'arcade',1).previous.map(r=>r.score),[4]);
 assert.equal(selectRuns(history,'all',100).available,4);
 assert.deepEqual(selectRuns(history,'arcade',100,'standard').current.map(r=>r.score),[3]);
 assert.deepEqual(selectRuns(history,'arcade',100,'modified').current.map(r=>r.score),[4]);
});
test('no measurements produce null analytics without fabricated history',()=> {
 const summary=summarizeRuns([]);assert.equal(summary.averageScore,null);assert.equal(summary.reactionMs,null);assert.equal(summary.perfectRate,null);assert.equal(summary.scorePerMinute,null);
 assert.deepEqual(selectRuns([],'all',10).current,[]);assert.equal(metricValue(run(),'reaction'),null);
});
test('average reaction uses hit counts and missing legacy measurements are excluded',()=> {
 const summary=summarizeRuns([run(100,{avgReactionMs:200,hits:1}),run(200,{avgReactionMs:400,hits:3}),run(300)]);
 assert.equal(summary.reactionMs,350);assert.equal(summary.reactionRuns,2);assert.equal(summary.averageScore,200);
});
test('points per minute and perfect rate use only runs with known measurements',()=> {
 const summary=summarizeRuns([run(120,{playSeconds:60,hits:10,perfectHits:4}),run(300),run(60,{playSeconds:30,hits:5,perfectHits:2})]);
 assert.equal(summary.scorePerMinute,120);assert.equal(summary.perfectRate,40);
});
test('comparison needs equal complete samples and faster reaction is a positive change',()=> {
 assert.equal(compareSamples([run(200)],[run(100)],'score'),100);
 assert.equal(compareSamples([run(200)],[run(100),run(100)],'score'),null);
 assert.equal(compareSamples([run(200)],[run(0)],'score'),null);
 assert.equal(compareSamples([run(1,{avgReactionMs:200})],[run(1,{avgReactionMs:400})],'reaction'),50);
 assert.equal(compareSamples([run()],[run()],'reaction'),null);
});
test('duration shows seconds/minutes/hours precisely and missing data remains missing',()=> {
 assert.equal(formatDuration(5),'5s');assert.equal(formatDuration(65),'1m 05s');assert.equal(formatDuration(3720),'1h 02m');assert.equal(formatDuration(undefined),'—');assert.equal(formatDuration(0),'0s');
});
test('chart keeps a single real observation and cannot curve above segment endpoints',()=> {
 assert.equal(curveThroughPoints([[5,10]]),'M 5 10');assert.equal(curveThroughPoints([]),'');
 assert.equal(curveThroughPoints([[0,100],[100,0],[200,100]]),'M 0 100 C 50 100, 50 0, 100 0 C 150 0, 150 100, 200 100');
 assert.equal(chartMaximum([75],100),100);assert.equal(chartMaximum([121]),200);
});
test('invalid or unavailable metric values never become chart observations',()=> {
 assert.equal(metricValue(run(1,{avgReactionMs:NaN}),'reaction'),null);assert.equal(metricValue(run(1,{acc:150}),'accuracy'),100);assert.equal(metricValue(run(-1),'score'),null);
});
