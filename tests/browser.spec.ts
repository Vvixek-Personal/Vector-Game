import { test, expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.route('https://**/*', route => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vector_tutorial_seen_v2','1');
    const d=new Date();
    if (!localStorage.getItem('vector_stats_v5')) localStorage.setItem('vector_stats_v5',JSON.stringify({ sparks: 3000, diamonds: 50, lastLoginDate: d.toISOString().slice(0,10), loginStreak: 2 }));
  });
});

test('desktop navigation, settings persistence, game and pause', async ({page}) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('button',{name:'Play Arcade',exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/desktop-home.png',fullPage:true});
  await page.getByRole('button',{name:'Tune',exact:true}).click();
  await page.getByRole('button',{name:'Light',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.getByRole('button',{name:'Tune',exact:true}).click();
  await page.getByRole('button',{name:'Dark',exact:true}).click();
  await page.getByRole('button',{name:'Play',exact:true}).click();
  await page.getByRole('button',{name:'Play Arcade',exact:true}).click();
  await page.getByRole('button',{name:'Start Run',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible({timeout:8000});
  await page.keyboard.press('Escape'); await expect(page.getByText('Resume',{exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/desktop-pause.png'});
  await page.getByText('Resume',{exact:true}).click();
  await expect(page.getByRole('button',{name:'Play again',exact:true})).toBeVisible({timeout:15000});
  await page.screenshot({path:'test-results/desktop-results.png'});
  await page.getByRole('button',{name:'Play again',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Get ready'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible({timeout:8000});
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Home',exact:true}).click();
  for (const name of ['Store','Stats','Tune']) { await page.getByRole('button',{name,exact:true}).click(); await page.waitForTimeout(350); await page.screenshot({path:'test-results/desktop-'+name.toLowerCase()+'.png',fullPage:true}); }
  expect(errors).toEqual([]);
});

test('phone home, Memory hints and small-screen pause', async ({page}) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844}); await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.screenshot({path:'test-results/phone-home.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole('button',{name:'Select Memory',exact:true}).click();
  await page.getByRole('button',{name:'Play Memory',exact:true}).click();
  await page.getByRole('button',{name:'Start Run',exact:true}).click();
  await expect(page.getByText('Recall',{exact:true})).toBeVisible();
  await expect(page.getByText(/^Hold /)).toHaveCount(0);
  await page.screenshot({path:'test-results/phone-memory.png'});
  await page.keyboard.press('Escape'); await page.setViewportSize({width:667,height:375});
  await expect(page.getByText('Resume',{exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/phone-landscape.png'});
  expect(errors).toEqual([]);
});

test('paid spin persists payment and reward when immediately navigating away', async ({page}) => {
  await page.goto('/',{waitUntil:'domcontentloaded'}); await page.getByRole('button',{name:'Store',exact:true}).click();
  await page.getByRole('button',{name:/Spin/}).first().click();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('vector_stats_v5')));
  const paid=page.getByRole('button').filter({hasText:/150/}).last();
  await paid.click(); await page.getByRole('button',{name:'Stats',exact:true}).click();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('vector_stats_v5')));
  expect(after.sparksSpent).toBe((before.sparksSpent||0)+150);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('vector_spin_history')).length)).toBe(1);
});

async function seedAnalytics(page) {
  await page.evaluate(()=> {
    const base=JSON.parse(localStorage.getItem('vector_stats_v5'));
    const history=Array.from({length:20},(_,i)=>({
      id:'qa-'+i,runNumber:20-i,createdAt:Date.now()-i*3600000,date:'Oct 25',mode:i%3===0?'zen':'arcade',
      score:2000-i*60,acc:Math.max(30,98-i),sparks:100-i,streak:20-i,
      hits:20,misses:2,perfectHits:8,avgReactionMs:240+i*12,fastestMs:190+i,playSeconds:60+i,modifierMultiplier:i%4===0?1.35:1,
    }));
    localStorage.setItem('vector_stats_v5',JSON.stringify({...base,runs:20,totalScore:history.reduce((n,r)=>n+r.score,0),hits:400,misses:40,bestStreak:20,fastestMs:190,reactionTotal:120000,reactionCount:400,playSeconds:1600,modeRuns:{arcade:13,zen:7},history}));
  });
  await page.reload();
}

test('practice countdown can cancel and real practice gives feedback without rewards',async({page})=> {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Select Practice',exact:true}).click();await page.getByRole('button',{name:'Play Practice',exact:true}).click();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('vector_stats_v5')));
  await page.getByRole('button',{name:'Start Run',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Get ready'})).toBeVisible();
  await page.screenshot({path:'test-results/countdown.png'});
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Play Practice',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Play Practice',exact:true}).click();await page.getByRole('button',{name:'Start Run',exact:true}).click();
  await expect(page.getByRole('button',{name:'Finish practice',exact:true})).toBeVisible({timeout:8000});
  const need=(await page.locator('[data-practice-direction]').getAttribute('data-practice-direction')).split(',');
  const keys={N:'ArrowUp',E:'ArrowRight',S:'ArrowDown',W:'ArrowLeft'};
  for(const d of need)await page.keyboard.down(keys[d]);for(const d of need)await page.keyboard.up(keys[d]);
  await expect(page.locator('.hit-feedback')).toContainText('pts');
  await page.screenshot({path:'test-results/practice-feedback.png'});
  await page.getByRole('button',{name:'Finish practice',exact:true}).click();
  await expect(page.getByText('Practice complete',{exact:true})).toBeVisible();
  await expect(page.getByText('UNRANKED · TRAINING ONLY',{exact:true})).toBeVisible();
  await expect(page.getByText(/XP Gained/)).toHaveCount(0);
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('vector_stats_v5')));
  expect(after.runs||0).toBe(before.runs||0);expect(after.sparks).toBe(before.sparks);expect(after.totalScore||0).toBe(before.totalScore||0);
  expect(errors).toEqual([]);
});

test('analytics empty state and one measured run never invent results',async({page})=> {
  await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Stats',exact:true}).click();
  await expect(page.getByText('No score data yet',{exact:true})).toBeVisible();await expect(page.locator('[data-chart-point]')).toHaveCount(0);
  await page.evaluate(()=> {const s=JSON.parse(localStorage.getItem('vector_stats_v5'));s.runs=1;s.history=[{score:1234,mode:'arcade',acc:75,sparks:100,streak:5,date:'Today'}];localStorage.setItem('vector_stats_v5',JSON.stringify(s));});
  await page.reload();await page.getByRole('button',{name:'Stats',exact:true}).click();
  await expect(page.locator('[data-chart-point]')).toHaveCount(1);await expect(page.getByText('1 real run recorded')).toBeVisible();
  await page.getByRole('button',{name:'Reaction',exact:true}).click();
  await expect(page.getByText('No reaction time data yet',{exact:true})).toBeVisible();
});

test('analytics filters, keyboard chart, light theme and reduced-motion display work',async({page})=> {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/',{waitUntil:'domcontentloaded'});await seedAnalytics(page);
  await page.getByRole('button',{name:'Stats',exact:true}).click();
  await expect(page.locator('[data-chart-point]')).toHaveCount(10);
  await page.getByLabel('Analytics game mode').selectOption('arcade');await page.getByLabel('Analytics run range').selectOption('5');
  await expect(page.locator('[data-chart-point]')).toHaveCount(5);await expect(page.getByText(/previous 5 matching runs/)).toBeVisible();
  await page.getByRole('button',{name:'Accuracy',exact:true}).click();
  const chart=page.getByRole('group',{name:'Accuracy history. Use left and right arrow keys to inspect runs.'});
  await chart.focus();await page.keyboard.press('Home');await expect(chart.getByText(/Run #/)).toContainText('Run #');
  await page.keyboard.press('End');await page.screenshot({path:'test-results/analytics-desktop.png'});
  await page.getByLabel('Analytics rules').selectOption('modified');await expect(page.locator('.analytics-table tbody tr')).toHaveCount(3);
  await page.evaluate(()=> {const s=JSON.parse(localStorage.getItem('vector_settings_v5'));s.uiMode='light';s.reducedMotion=true;localStorage.setItem('vector_settings_v5',JSON.stringify(s));});
  await page.reload();await page.getByRole('button',{name:'Stats',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');await expect(page.locator('html')).toHaveClass(/reduce-game-motion/);
  await expect(page.locator('[data-chart-point]')).toHaveCount(10);
  await expect.poll(async()=>page.locator('.performance-chart svg').evaluate(svg=>{const dots=svg.querySelectorAll('[data-chart-point]');return Number(dots[dots.length-1].getAttribute('cx'))>(svg as SVGSVGElement).viewBox.baseVal.width*.85;})).toBeTruthy();
  await page.screenshot({path:'test-results/analytics-light.png'});
  expect(errors).toEqual([]);
});

test('phone analytics controls and recent run table remain usable',async({page})=> {
  await page.setViewportSize({width:390,height:844});await page.goto('/',{waitUntil:'domcontentloaded'});await seedAnalytics(page);await page.getByRole('button',{name:'Stats',exact:true}).click();
  await expect(page.getByLabel('Analytics game mode')).toBeVisible();
  await page.getByRole('button',{name:'Reaction',exact:true}).click();await expect(page.locator('[data-chart-point]')).toHaveCount(10);
  await page.getByRole('group',{name:'Reaction time history. Use left and right arrow keys to inspect runs.'}).scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/analytics-phone.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole('region',{name:'Recent run details'}).scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/analytics-phone-details.png'});
});
