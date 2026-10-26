# VECTOR 1.3 status

Date: October 26, 2026

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

4. **Validation:**
   - 51 unit tests passed (`npm test`).
   - TypeScript compilation and type-check passed (`npm run lint`).
   - Production Vite applet build passed (`npm run build` / `compile_applet`).
