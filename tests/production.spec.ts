import { test, expect } from '@playwright/test';

test('production precaches the game and lazy analytics for offline play',async({page,context})=> {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());
  await page.addInitScript(()=> {
    localStorage.setItem('vector_tutorial_seen_v2','1');
    if(!localStorage.getItem('vector_stats_v5')) {const d=new Date();localStorage.setItem('vector_stats_v5',JSON.stringify({lastLoginDate:d.toISOString().slice(0,10)}));}
  });
  await page.goto('/');await expect(page.getByRole('button',{name:'Play Arcade',exact:true})).toBeVisible();
  await page.evaluate(async()=> {await navigator.serviceWorker.ready;});
  await page.reload();await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBeTruthy();
  await context.setOffline(true);await page.reload();
  await expect(page.getByRole('button',{name:'Play Arcade',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Stats',exact:true}).click();await expect(page.getByText('No score data yet',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Store',exact:true}).click();
  await page.getByRole('button',{name:'Preview Spider-Man',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Spider-Man',exact:true}).locator('[data-character="hero-spider"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Ranks',exact:true}).click();
  await page.getByRole('tab',{name:'On this device',exact:true}).click();
  await expect(page.getByRole('tabpanel',{name:'Device scores',exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/production-offline.png'});
  expect(errors).toEqual([]);
});

test('manifest icons match their declared PNG dimensions',async({request})=> {
  const response=await request.get('/manifest.webmanifest');expect(response.ok()).toBeTruthy();const manifest=await response.json();
  expect(manifest.name).toBe('Vector');
  for(const icon of manifest.icons) {
    const result=await request.get(icon.src);expect(result.ok()).toBeTruthy();const bytes=await result.body();
    expect(bytes.subarray(1,4).toString()).toBe('PNG');
    expect(bytes.readUInt32BE(16)+'x'+bytes.readUInt32BE(20)).toBe(icon.sizes);
  }
});

test('local game launcher serves the build and prevents directory traversal',async({request})=> {
  const page=await request.get('/');expect(page.ok()).toBeTruthy();expect(page.headers()['content-type']).toContain('text/html');
  const blocked=await request.get('/..%2fREADME.md');expect(blocked.status()).toBe(403);
  const missing=await request.get('/missing-file.js');expect(missing.status()).toBe(404);
});
