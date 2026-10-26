import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture=JSON.parse(readFileSync(new URL("../.vector-emulator-data/fixtures.json",import.meta.url),"utf8"));
async function signIn(page:Page,user=fixture.player){
  await page.evaluate(async credentials=>{
    const config=await new Function("return import('/src/firebase/config.ts')")();
    const sdk=await new Function("return import('/node_modules/.vite/deps/firebase_auth.js')")();
    await sdk.signInWithEmailAndPassword(config.auth,credentials.email,credentials.password);
  },user);
  await expect.poll(()=>page.evaluate(async()=>{const sdk=await new Function("return import('/src/firebase/accounts.ts')")();return sdk.getAccountSession().status;}),{timeout:45000}).toMatch(/ready|offline/);
  if(await page.getByRole("button",{name:"Reconnect",exact:true}).isVisible())await page.getByRole("button",{name:"Reconnect",exact:true}).click();
  await expect.poll(async()=>page.evaluate(async()=>{const sdk=await new Function("return import('/src/firebase/accounts.ts')")();const account=sdk.getAccountSession();return account.status==="ready"&&account.account.daily.day===new Date().toISOString().slice(0,10);}),{timeout:45000}).toBe(true);
  await page.evaluate(uid=>localStorage.setItem("vector_account:"+uid+":vector_tutorial_seen_v2","1"),user.uid||fixture.player.uid);
  const reward=page.getByRole("button",{name:"Claim reward",exact:true});if(await reward.isVisible())await reward.click();
}
async function signOut(page:Page){
  await page.evaluate(async()=>{
    const sdk=await new Function("return import('/src/firebase/auth.ts')")();await sdk.signOut();
  });
  await expect.poll(()=>page.evaluate(async()=>{const sdk=await new Function("return import('/src/firebase/accounts.ts')")();return sdk.getAccountSession().status;})).toBe("guest");
}
test.beforeEach(async({page})=>{
  await page.route("https://**/*",route=>route.abort());
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.addInitScript(()=>localStorage.setItem("vector_tutorial_seen_v2","1"));
});
test("cloud name, collection and currency recover after sign-out and reload",async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/",{waitUntil:"domcontentloaded"});await signIn(page);
  await page.getByRole("button",{name:"Open your profile and level progression",exact:true}).click();
  await expect(page.locator(".profile-account-line")).toContainText(fixture.player.uid,{timeout:45000});
  await expect(page.locator(".profile-account-line")).toContainText("Cloud account connected");
  await expect(page.locator(".profile-name-row h2")).toHaveText("Alpha Two");
  await page.getByRole("button",{name:"Edit player name",exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("100 Diamonds");
  await page.keyboard.press("Escape");
  const before=await page.evaluate(uid=>{
    const prefix="vector_account:"+uid+":";
    return {stats:JSON.parse(localStorage.getItem(prefix+"vector_stats_v5")!),profile:JSON.parse(localStorage.getItem(prefix+"vector_profile_v5")!)};
  },fixture.player.uid);
  await page.getByRole("navigation",{name:"Main navigation"}).getByRole("button",{name:"Store",exact:true}).click();
  await page.getByLabel("Search store").fill("Batman");
  const removeWish=page.getByRole("button",{name:"Remove Batman from wishlist",exact:true});if(await removeWish.isVisible())await removeWish.click();
  const wishButton=page.getByRole("button",{name:"Save Batman to wishlist",exact:true});
  const wishId=await wishButton.evaluate(el=>el.closest("[data-store-item]")!.getAttribute("data-store-item"));
  await wishButton.click();
  await signOut(page);
  await page.evaluate(uid=>{const prefix="vector_account:"+uid+":";for(const key of Object.keys(localStorage))if(key.startsWith(prefix))localStorage.removeItem(key);},fixture.player.uid);
  await page.reload({waitUntil:"domcontentloaded"});await signIn(page);
  await page.getByRole("button",{name:"Open your profile and level progression",exact:true}).click();
  await expect(page.locator(".profile-name-row h2")).toHaveText("Alpha Two",{timeout:45000});
  const after=await page.evaluate(uid=>JSON.parse(localStorage.getItem("vector_account:"+uid+":vector_stats_v5")!),fixture.player.uid);
  expect(after.diamonds).toBe(before.stats.diamonds);expect(after.sparks).toBe(before.stats.sparks);
  const restoredProfile=await page.evaluate(uid=>JSON.parse(localStorage.getItem("vector_account:"+uid+":vector_profile_v5")!),fixture.player.uid);
  expect(restoredProfile.wishlist).toContain(wishId);expect(restoredProfile.purchased).toEqual(before.profile.purchased);
  await page.getByRole("tab",{name:"Gifts",exact:true}).click();await expect(page.getByRole("tab",{name:/^Received/})).toBeVisible();
  expect(errors).toEqual([]);
});
test("developer tools stay inside Tune and manage existing players",async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/",{waitUntil:"domcontentloaded"});await signIn(page,fixture.owner);
  await page.getByRole("button",{name:"Tune",exact:true}).click();
  await page.getByRole("tab",{name:"Developer",exact:true}).click();
  await expect(page.getByRole("heading",{name:/Developer workspace/})).toBeVisible({timeout:45000});
  await expect(page.locator(".role-badge.developer").first()).toBeVisible();
  await page.getByPlaceholder("Email or player ID").fill(fixture.player.email);
  await page.getByRole("button",{name:"Find",exact:true}).click();
  await page.locator(".admin-player-list>button").first().click();
  await expect(page.getByRole("heading",{name:"Wallet & progression",exact:true})).toBeVisible();
  await page.screenshot({path:"test-results/developer-players-desktop.png",fullPage:true});
  await page.getByRole("tab",{name:"Store editor",exact:true}).click();
  await expect(page.getByRole("button",{name:/Review|Save/}).last()).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  const editor=await page.locator(".admin-panel").last().boundingBox();expect(editor!.x+editor!.width).toBeLessThanOrEqual(390);
  await page.screenshot({path:"test-results/developer-store-phone.png",fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole("button",{name:"Play",exact:true}).click();
  await expect(page.getByRole("heading",{name:/Developer workspace/})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Play Arcade",exact:true})).toBeVisible();
  const height=await page.locator(".v-dock").evaluate(el=>el.getBoundingClientRect().height).catch(()=>0);
  expect(height).toBeLessThanOrEqual(60);
  expect(errors).toEqual([]);
});
test("player sees developer gate and explicit egg payment choices",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});await signIn(page);
  await page.getByRole("button",{name:"Tune",exact:true}).click();await page.getByRole("tab",{name:"Developer",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Are you a Developer?",exact:true})).toBeVisible();
  await expect(page.getByLabel("Master password", {exact:true})).toBeVisible();
  await expect(page.getByRole("tab",{name:"Store editor",exact:true})).toHaveCount(0);
  await page.getByLabel("Master password",{exact:true}).fill("Session-only typed value");
  await signOut(page);await signIn(page);
  await page.getByRole("tab",{name:"Developer",exact:true}).click();
  await expect(page.getByLabel("Master password",{exact:true})).toHaveValue("");
  await page.getByRole("button",{name:"Store",exact:true}).click();
  await page.getByRole("button",{name:/Incubator/}).first().click();
  await expect(page.getByRole("button",{name:"Buy · 750 Sparks",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Buy · 10 Diamonds",exact:true})).toBeVisible();
  await page.screenshot({path:"test-results/hatchery-desktop.png",fullPage:true});
});

async function ownerCall(name:string,data:any){
  const signed=await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...fixture.owner,returnSecureToken:true})}).then(r=>r.json());
  const result=await fetch("http://127.0.0.1:5001/demo-vector/us-central1/"+name,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+signed.idToken},body:JSON.stringify({data})}).then(r=>r.json());
  if(result.error)throw new Error(result.error.message);return result.result;
}
test("checkout requires review again if a live store price changes",async({page})=>{
  const id="custom-quote-"+Date.now(),item={id,tab:"titles",name:"Quote Check "+Date.now(),desc:"A disposable emulator item.",cost:200,currency:"sparks",rarity:"rare"};
  await ownerCall("saveCatalogItem",{item});
  await page.goto("/",{waitUntil:"domcontentloaded"});await signIn(page);await page.getByRole("button",{name:"Store",exact:true}).click();
  await page.getByLabel("Search store").fill(item.name);await page.getByRole("button",{name:"Preview "+item.name,exact:true}).click();
  const before=await page.evaluate(uid=>JSON.parse(localStorage.getItem("vector_account:"+uid+":vector_stats_v5")!).sparks,fixture.player.uid);
  await ownerCall("saveCatalogItem",{item:{...item,cost:400}});
  await expect(page.locator('[data-store-item="'+id+'"] .v-price')).toContainText("400");
  await page.getByRole("dialog").getByRole("button",{name:"Buy & equip",exact:true}).click();
  await expect(page.getByRole("dialog")).toBeVisible();await expect(page.locator(".v-notice")).toContainText("price changed");
  expect(await page.evaluate(uid=>JSON.parse(localStorage.getItem("vector_account:"+uid+":vector_stats_v5")!).sparks,fixture.player.uid)).toBe(before);
  await page.getByRole("dialog").getByRole("button",{name:"Buy & equip",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(uid=>JSON.parse(localStorage.getItem("vector_account:"+uid+":vector_stats_v5")!).sparks,fixture.player.uid)).toBe(before-400);
});
test("a gift transfers through the sender and recipient screens",async({page})=>{
  const id="custom-gift-"+Date.now(),item={id,tab:"titles",name:"Gift Check "+Date.now(),desc:"A disposable gift for the emulator.",cost:200,currency:"sparks",rarity:"rare"};
  await ownerCall("saveCatalogItem",{item});
  await ownerCall("gameAction",{action:"adminInventory",payload:{userId:fixture.player.uid,itemId:id,operation:"grant"},requestId:crypto.randomUUID()});
  await page.goto("/",{waitUntil:"domcontentloaded"});await signIn(page);
  await page.getByRole("button",{name:"Open your profile and level progression",exact:true}).click();await page.getByRole("tab",{name:"Gifts",exact:true}).click();
  await page.getByRole("tab",{name:"Send a gift",exact:true}).click();await page.getByPlaceholder("Player name or exact player ID").fill(fixture.recipient.uid);
  await page.getByRole("button",{name:"Search",exact:true}).click();await page.locator(".player-pick-list>button").first().click();
  await page.getByRole("combobox",{name:"Item from your vault",exact:true}).selectOption(id);await page.getByRole("button",{name:"Review gift",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"Send gift",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(({uid,id})=>JSON.parse(localStorage.getItem("vector_account:"+uid+":vector_profile_v5")!).purchased.includes(id),{uid:fixture.player.uid,id})).toBe(false);
  await signOut(page);await page.getByRole("button",{name:"Play",exact:true}).click();await signIn(page,fixture.recipient);
  await page.getByRole("button",{name:"Open your profile and level progression",exact:true}).click();await page.getByRole("tab",{name:"Gifts",exact:true}).click();
  const gift=page.locator(".gift-card").filter({hasText:item.name});await gift.getByRole("button",{name:"Accept",exact:true}).click();
  await expect(gift).toContainText("claimed");
  expect(await page.evaluate(({uid,id})=>JSON.parse(localStorage.getItem("vector_account:"+uid+":vector_profile_v5")!).purchased.includes(id),{uid:fixture.recipient.uid,id})).toBe(true);
});

test("changing accounts cancels a running start countdown",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});await signIn(page);
  await page.getByRole("button",{name:"Play Arcade",exact:true}).click();
  await page.getByRole("button",{name:"Start Run",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Get ready",exact:true})).toBeVisible({timeout:90000});
  await page.evaluate(async()=>{
    const config=await new Function("return import('/src/firebase/config.ts')")();
    const sdk=await new Function("return import('/node_modules/.vite/deps/firebase_auth.js')")();
    await sdk.signOut(config.auth);
  });
  await expect(page.getByRole("button",{name:"Play Arcade",exact:true})).toBeVisible();
  await page.waitForTimeout(3500);
  await expect(page.getByRole("button",{name:"Pause",exact:true})).toHaveCount(0);
});
