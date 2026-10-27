import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", route => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("vector_tutorial_seen_v2", "1");
    if (!localStorage.getItem("vector_stats_v5")) {
      const d = new Date();
      localStorage.setItem("vector_stats_v5", JSON.stringify({ sparks: 12000, diamonds: 100, lastLoginDate: d.toISOString().slice(0,10), loginStreak: 2 }));
    }
  });
});
async function store(page: Page) {
  await page.goto("/",{waitUntil:"domcontentloaded"}); await page.getByRole("button", { name: "Store", exact: true }).click();
  await expect(page.getByLabel("Search store")).toBeVisible();
}
test("hero preview, purchase, wishlist and collection persist with the right balance", async ({ page }) => {
  const errors: string[]=[]; page.on("pageerror", e=>errors.push(e.message));
  await store(page); await page.getByLabel("Search store").fill("Spider-Man");
  const before = await page.evaluate(()=>JSON.parse(localStorage.getItem("vector_stats_v5")!).sparks);
  await page.getByRole("button",{name:"Save Spider-Man to wishlist",exact:true}).click();
  await page.getByRole("button",{name:"Preview Spider-Man",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Spider-Man",exact:true});
  await expect(dialog.locator('[data-character="hero-spider"]')).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("vector_stats_v5")!).sparks)).toBe(before);
  await expect(dialog.getByText("Balance after",{exact:true})).toBeVisible();
  await page.screenshot({path:"test-results/refresh-hero-preview.png",fullPage:true});
  await dialog.getByRole("button",{name:"Buy & equip",exact:true}).click();
  await expect(dialog).toHaveCount(0);
  const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem("vector_profile_v5")!));
  expect(profile.avatarId).toBe("hero-spider"); expect(profile.wishlist).not.toContain("hero-spider");
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("vector_stats_v5")!).sparks)).toBe(before-500);
  await page.getByRole("button",{name:"Preview Spider-Man",exact:true}).click();
  await expect(page.getByRole("dialog").getByRole("button",{name:"Equipped",exact:true})).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByRole("tab",{name:/My collection/}).click();
  await expect(page.locator('[data-store-item="hero-spider"]')).toBeVisible();
  await page.reload(); await page.getByRole("button",{name:"Store",exact:true}).click();
  await page.getByRole("tab",{name:/My collection/}).click();
  await expect(page.locator('[data-store-item="hero-spider"]')).toBeVisible();
  expect(errors).toEqual([]);
});
test("store filters, keyboard tabs and modal focus remain usable", async ({ page }) => {
  await store(page);
  const discover=page.getByRole("tab",{name:"Discover",exact:true}); await discover.focus(); await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab",{name:/My collection/})).toHaveAttribute("aria-selected","true");
  await page.getByRole("tab",{name:"Discover",exact:true}).click();
  await page.getByLabel("Search store").fill("iron man");
  await expect(page.locator("[data-store-item]")).toHaveCount(1);
  const preview=page.getByRole("button",{name:"Preview Iron Man",exact:true}); await preview.click();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(()=>document.activeElement?.closest("dialog")!==null)).toBeTruthy();
  await page.keyboard.press("Escape"); await expect(preview).toBeFocused();
  await page.getByLabel("Store currency").selectOption("diamonds");
  await expect(page.locator("[data-store-item]")).toHaveCount(0);
  await page.getByRole("button",{name:"Reset filters",exact:true}).click();
  await page.getByRole("tab",{name:"Avatars",exact:true}).click();
  await expect(page.locator('.v-item-art [data-character]')).toHaveCount(8);
  await page.screenshot({path:"test-results/refresh-store-desktop.png",fullPage:true});
});
test("exchange confirms exact balances and closes after one conversion", async ({page})=>{
  await store(page); await page.getByRole("tab",{name:"Exchange",exact:true}).click();
  await page.locator(".v-exchange-card").first().getByRole("button",{name:"Review exchange",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Review exchange",exact:true});
  await expect(dialog.getByText("2,000 Sparks",{exact:true})).toBeVisible();
  await expect(dialog.getByText("200",{exact:true})).toBeVisible();
  await dialog.getByRole("button",{name:"Confirm exchange",exact:true}).click();
  const stats=await page.evaluate(()=>JSON.parse(localStorage.getItem("vector_stats_v5")!));
  expect(stats.sparks).toBe(2000); expect(stats.diamonds).toBe(200);
  await expect(dialog).toHaveCount(0);
});
test("restored swipe carousel supports keyboard and mode selection",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await expect(page.getByRole("region",{name:"Game modes",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Select Practice",exact:true}).click();
  await expect(page.getByRole("button",{name:"Play Practice",exact:true})).toBeVisible();
  await expect(page.getByText("Training mode",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Select Memory",exact:true}).click();
  await expect(page.getByRole("button",{name:"Play Memory",exact:true})).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button",{name:"Play Memory",exact:true})).toHaveCount(0);
  await page.screenshot({path:"test-results/refresh-home-desktop.png",fullPage:true});
});

test("device scoreboard works offline and does not mix practice into rankings",async({page})=>{
  await page.addInitScript(()=>{
    const today=new Date().toISOString().slice(0,10);
    localStorage.setItem("vector_scores_v5",JSON.stringify({arcade:[{score:800,name:"Ace",date:"Today"},{score:800,name:"Ace",date:"Yesterday"},{score:400,name:"Ace",date:"Earlier"}],blitz:[{score:600,name:"Ace",date:"Today"}],["daily_"+today]:[{score:250,name:"Ace",date:"Today"}],daily_2000:[{score:9000,name:"Old",date:"Past"}],practice:[{score:10000,name:"Training",date:"Today"}]}));
  });
  await page.goto("/",{waitUntil:"domcontentloaded"});await page.getByRole("button",{name:"Ranks",exact:true}).click();
  await page.getByRole("tab",{name:"On this device",exact:true}).click();
  await page.getByLabel("Scoreboard game mode").selectOption("overall");
  await expect(page.locator(".v-device-table tbody tr")).toHaveCount(3);
  await expect(page.locator(".v-board-summary strong")).toHaveText("1,650");
  await expect(page.getByLabel("Scoreboard game mode").locator('option[value="practice"]')).toHaveCount(0);
  await page.getByLabel("Scoreboard game mode").selectOption("arcade");
  await expect(page.locator(".v-device-table tbody tr")).toHaveCount(3);
  await expect(page.locator(".v-device-table tbody .v-rank")).toHaveText(["#1","#1","#3"]);
  await page.getByLabel("Scoreboard game mode").selectOption("daily");
  await expect(page.locator(".v-device-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".v-reset")).toContainText("UTC");
  await page.screenshot({path:"test-results/refresh-device-scores.png",fullPage:true});
});
async function mockRankings(page:Page,cached=false) {
  await page.addInitScript(()=>Object.defineProperty(navigator,"onLine",{configurable:true,get:()=>true}));
  const records=Array.from({length:32},(_,index)=>({id:"p"+index,userId:"p"+index,userName:"Player "+String(index+1).padStart(2,"0"),avatarId:index===0?"hero-spider":"spark",frameId:"none",level:5,mode:"arcade",score:index<2?10000:10000-index*100,streak:20-index%10,title:"Operative",updatedAt:{seconds:1792900000}}));
  await page.route("**/src/firebase/leaderboard.ts*",route=>route.fulfill({contentType:"application/javascript",body:
    'export function subscribeToLeaderboard(mode,callback){queueMicrotask(()=>callback('+JSON.stringify(records)+'.map(r=>({...r,mode})),{fromCache:'+cached+'}));return ()=>{}} export async function submitScoreToCloud(){return false} export const submitScore=submitScoreToCloud; export async function retryPendingScores(){return 0} export function pendingScoreCount(){return 0}'}));
}
test("global search and pagination preserve tied places and profile focus",async({page})=>{
  await mockRankings(page); await page.goto("/",{waitUntil:"domcontentloaded"}); await page.getByRole("button",{name:"Ranks",exact:true}).click();
  await expect(page.locator(".v-live-status")).toContainText("Live snapshot");
  await expect(page.locator(".v-score-table tbody tr")).toHaveCount(10);
  await expect(page.locator(".v-score-table tbody .v-rank").first()).toHaveText("#1");
  await expect(page.locator(".v-score-table tbody .v-rank").nth(1)).toHaveText("#1");
  await page.getByRole("button",{name:"Next page",exact:true}).click();
  await expect(page.locator(".v-score-table tbody .v-rank").first()).toHaveText("#11");
  await page.getByLabel("Search players").fill("Player 25");
  await expect(page.locator(".v-score-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".v-score-table tbody .v-rank")).toHaveText("#25");
  const profile=page.getByRole("button",{name:"View Player 25 profile",exact:true}); await profile.click();
  await expect(page.getByRole("dialog",{name:"Player 25",exact:true})).toBeVisible();
  await page.keyboard.press("Escape"); await expect(profile).toBeFocused();
  await page.getByRole("button",{name:"Clear player search",exact:true}).click();
  await page.screenshot({path:"test-results/refresh-rankings-desktop.png",fullPage:true});
});
test("cached rankings never claim to be a live snapshot",async({page})=>{
  await mockRankings(page,true); await page.goto("/",{waitUntil:"domcontentloaded"}); await page.getByRole("button",{name:"Ranks",exact:true}).click();
  await expect(page.locator(".v-live-status")).toContainText("Cached snapshot");
  await expect(page.locator(".v-connection-note")).toContainText("Places may have changed");
});
test("phone layouts fit, character previews scroll, and both themes stay readable",async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});await mockRankings(page);await page.goto("/",{waitUntil:"domcontentloaded"});
  await page.screenshot({path:"test-results/refresh-home-phone.png",fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole("button",{name:"Store",exact:true}).click();await page.getByRole("tab",{name:"Avatars",exact:true}).click();
  await page.screenshot({path:"test-results/refresh-store-phone.png",fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole("button",{name:"Preview Spider-Man",exact:true}).click();
  await expect(page.getByRole("dialog").getByRole("button",{name:"Buy & equip",exact:true})).toBeVisible();
  await page.screenshot({path:"test-results/refresh-hero-phone.png",fullPage:true});await page.keyboard.press("Escape");
  await page.getByRole("button",{name:"Ranks",exact:true}).click();
  await page.screenshot({path:"test-results/refresh-rankings-phone.png",fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole("button",{name:"Tune",exact:true}).click();await page.getByRole("button",{name:"Light",exact:true}).click();
  await page.getByRole("button",{name:"Store",exact:true}).click();await expect(page.locator("html")).toHaveAttribute("data-theme","light");
  await page.screenshot({path:"test-results/refresh-store-light.png",fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.setViewportSize({width:320,height:640});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});

test("phone profile shows progression, inventory and account-only name changes",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>localStorage.setItem("vector_profile_v5",JSON.stringify({avatarId:"hero-spider",purchased:["hero-spider","hero-miles"],bannerId:"dusk",frameId:"none",titleId:"rookie"})));
  await page.goto("/",{waitUntil:"domcontentloaded"});await page.getByRole("button",{name:"Open your profile and level progression",exact:true}).click();
  await expect(page.getByRole("tab",{name:"Collection",exact:true})).toHaveAttribute("aria-selected","true");
  await page.getByRole("button",{name:"Edit player name",exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("later changes cost 100 Diamonds");
  await expect(page.getByRole("textbox",{name:"Player name",exact:true})).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("tab",{name:"Progress",exact:true}).click();
  await page.getByRole("button",{name:"Show all 100 milestones",exact:true}).click();
  await expect(page.locator(".milestone-grid>article")).toHaveCount(100);
  await page.screenshot({path:"test-results/refresh-profile-phone.png",fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole("tab",{name:"Gifts",exact:true}).click();
  await expect(page.getByRole("tabpanel",{name:"gifts",exact:true})).toContainText("Sign in");
});
