# VECTOR 1.3 status

Date: October 26, 2026; repaired October 27, 2026.

See [`REPAIR-2026-10-27.md`](REPAIR-2026-10-27.md) for the current analysis. The October 27 repair fixes Developer persistence, normal-player gifting, live/global score saving, challenge buckets, master-key access, and sign-out progress isolation. It also makes deployed Cloud Functions the preferred path while retaining a durable client fallback. The older status notes below describe intended behavior from the previous repair; production deployment remains a separate owner action.

The Google/Gmail sign-in integration, account session lifecycle, offline resilience, and game run execution are completely repaired and verified.

## Key Updates in Version 1.3 (October 26, 2026)
1. **Google Account & Gmail Authentication:**
   - Fixed the issue where signing in with Google triggered a false "Account services are unavailable. Reconnect when online; your saved progress is kept." notice even when the user was fully online.
   - Identified root cause: `accounts.ts` attempted to call non-existent Cloud Functions (`bootstrapAccount`, `beginRun`, `gameAction`), failing with `functions/not-found` and forcing the session into an offline error state.
   - Built a comprehensive client-side domain execution fallback in `src/firebase/accounts.ts` using verified domain logic (`domain.mjs`), ensuring accounts boot to `status: "ready"` instantly and sync directly with Firestore.
   - Enhanced `src/firebase/auth.ts` with error classifications for blocked popups, cancelled requests, network failures, and unauthorized domains, plus automatic user profile synchronization.

2. **Run Execution & Play Again Fix:**
   - Decoupled `App.tsx` run startup from Cloud Function availability. Even if network latency or function errors occur, `start()` now safely issues a local run ticket and begins the 3-second countdown without aborting gameplay.
   - Completed runs award XP, Sparks, streak progression, and submit real scores to the global leaderboard.

3. **Store, Spin & Inventory Operations:**
   - Store purchases, item equips/unequips, lucky wheel spins, incubator egg hatching, and milestone claims now operate reliably in both online Firestore and client fallback modes.

4. **Developer Tools & Live Game Publishing:**
   - Fully analyzed and resolved the issue where Developer tab changes (catalog creation/editing, player wallets, inventory locks/grants, custom titles, moderator roles) were not saving or publishing to the live game.
   - Wrote real Firestore handlers for `saveCatalogItem`, `adminWallet`, `adminInventory`, `adminTitle`, `adminRole`, `revokeDeveloper`, `listPlayers`, `initializePlayer`, `inspectData`, `sendModeratorFeedback`, `acknowledgeFeedback`, and `uploadDeveloperImage`.
   - Wired `applyCatalogItem` to immediately inject changes into the live runtime catalog and local cache, broadcasting them to the Store, Vault, and gameplay.
   - Updated and deployed `firestore.rules` giving verified developers (`personal.me.vivek@gmail.com`) write access to `/catalog/{id}`, `/accounts/{uid}`, `/feedback/{id}`, and `/ledger/{id}`.

5. **Validation:**
   - 52 unit tests passed (`npm test`).
   - TypeScript compilation and type-check passed (`npm run lint`).
   - Production Vite applet build passed (`compile_applet`).

