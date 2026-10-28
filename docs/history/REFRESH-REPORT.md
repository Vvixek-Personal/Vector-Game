# VECTOR 1.2 refresh report

Date: 25 October 2026
Repository: https://github.com/Vvixek-Personal/Vector-Game
Base: main at 35e1f18c9f1b8c6b0cabc41758d727f547b6f7bf
Update branch: codex/vector-1-2-ui-heroes

## Delivered

The home screen now has a searchable 12-mode library, persistent favorite modes, selected-mode details, personal progress, quick Daily/Weekly launches, and links to missions, analytics and the store.

The store has Discover, My collection, Wishlist, Activities and Exchange sections. Item categories are directly accessible. Search, rarity/currency filters, affordability controls and sorting work together. Previews show a proposed appearance without changing equipment or spending currency. Purchases and exchanges show exact post-payment balances and require confirmation. Starter, achievement-unlocked and equivalent owned cosmetics can be equipped without another payment. Transactions read the latest persisted balances and ownership.

Eight locally rendered SVG character avatars were added: Spider-Man, Miles Morales, Spider-Gwen, Iron Man, Black Panther, Batman, Deadpool and Vector Sentinel. They work in the store, equipped profile, vault, home and rankings. The repository's seven recently added anime/cartoon portraits and other new catalog items are preserved.

The scoreboard separates global standings from device scores. Global standings support player search, pagination, tied competition places, profile previews, refresh, a personal-position control, and clear cached/offline states. Search preserves original places and covers the loaded top 50. Device scores are available without sign-in and show saved bests or the eight top runs for a mode. Practice stays unranked.

Challenge timers follow the existing score buckets. Weekly IDs remain the original seven-day blocks from January 1, including the year boundary; no score migration was introduced.

Profile/settings headers and the main dock are refreshed. Shared tabs support left/right arrows, Home and End. Native item/player dialogs trap focus, close with Escape and return focus to their opener. Dark/light layouts, 320px/390px screens, and app/OS reduced motion are supported.

## Verification

- 45 regression tests passed.
- Seven existing browser scenarios passed, covering gameplay, Practice, countdowns, analytics, settings and durable spin rewards.
- Nine refresh browser scenarios passed, covering hero purchase/equipment persistence, wishlist, store filters, exchange balances, favorite modes, local scores, global search/ties/pagination, cached data, phone layouts and profile name editing.
- Three production checks passed: offline reload and lazy analytics/store/hero/device-score views, manifest icon dimensions, and the local launcher server.
- Production type checking, Vite build and PWA generation passed.
- Git whitespace check passed.

Global ranking interface tests use isolated fixtures with an explicit connection state. Screenshots in the supplied preview folder show test data, not a populated production leaderboard or the user's account balance.

The final browser fixture handles Vite's versioned module URLs and waits for the ready interface after reload. These checks do not write test records to Firebase.

## Running it

The packaged download includes dist/. Extract the full folder, then open Play-Vector.cmd with Node.js 22.12 or later installed. Keep the launcher window open while playing. No dependency download is needed for that build.

A GitHub source checkout needs npm ci and npm run build first. Start-Vector.cmd runs the development version. Browser test instructions are in README.md.

## Remaining verification limits

Live Google sign-in, cloud restore, published score writes and deployed Firestore rules/indexes were not exercised against a real account or changed by this update. Existing client-calculated scores/currency remain client authoritative. Strong anti-cheat still requires a trusted backend.

The existing Firebase bundle is about 685 KB and triggers Vite's size warning; the build succeeds. A fresh dependency installation initially failed in this environment's npm cache. Build and tests used the matching existing installed dependencies; the npm lockfile has been restored, and a clean-machine installation still needs a separate check.

Existing save keys and challenge score buckets are retained. Older histories may lack detailed measurements; those fields remain unavailable rather than being invented.
