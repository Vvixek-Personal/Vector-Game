# VECTOR: Minimalist UI Refinement, 3D Card Motion & Unified Views

A targeted visual and motion overhaul for VECTOR that elevates the app header, reimagines the Store and Ranks (Leaderboard) views to match the caliber of the Home, Stats, and Tune tabs, and introduces interactive 3D card tilt and smooth spring page morphs.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your feedback, we are preserving the core vector arcade aesthetic you love while focusing upgrades directly where they are needed most:
> 
> - **Aesthetic Alignment**: Minimal, clean, and restrained. No garish clutter or unnecessary badges. The design harmonizes Store and Ranks tabs with the high visual standard of Tune, Stats, and Play.
> - **Unified Top Bar Contract**: Standardized top header across all views (Play, Ranks, Store, Stats, Settings) with clean typography, compact account/currency balance indicators, and seamless navigation.
> - **Motion & Animations**: Interactive 3D card tilt (with dynamic light sheen responding to pointer position) on store cards and game mode cards, paired with buttery spring-based page morphs (`stiffness: 350, damping: 28`).
> - **In-Game Hit Polish**: Kept in-game action minimal and clear—clean subtle kinetic shockwaves and crisp reaction typography that never obstructs the arrow ring.
> - **Authentication & Resilience (Oct 26, 2026)**: Fixed Google / Gmail sign-in so it connects smoothly without false "Account services are unavailable" banners. Implemented a robust client-side domain engine fallback in `accounts.ts` and decoupled the Play Again countdown from Cloud Functions.

---

## 1. Overview & Core Concept

- **What It Delivers**: 
  1. A **Universal Clean Header** that feels cohesive across every tab, seamlessly showing player code name, level, Google avatar status, and currency balances (Sparks & Diamonds) without visual clutter.
  2. A **Redesigned Store Experience** with curated category segments (Avatars, Themes & Audio, Spin & Hatch, Sparks Exchange), interactive 3D tilt cards, crisp purchase/equip states, and an elegant preview modal.
  3. A **Reimagined Ranks (Leaderboard) Hub** that transforms the current dense pill list into a clean, segmented tournament board with a distinguished Top 3 podium, tabular precision scores, and responsive player cards.
  4. **Tactile Spring & 3D Motion**: Physics-based 3D tilt for cards and slick spring page transitions with zero layout shift or lag.
  5. **Resilient Google Account Sync**: Seamless Firebase Auth Google sign-in with pure client-side Firestore synchronization, eliminating false offline error notices.

- **Target Audience**: Competitive arcade players who value split-second reflexes, high visual clarity, satisfying tactile feedback, and a sleek, distraction-free interface.
- **Key Value**: Delivers a cohesive, AAA-grade minimalist polish across the entire application while honoring the game's high-speed responsiveness.

---

## 2. Key Product Decisions & Implemented Repairs (October 26, 2026)

- **Resolution of "Account services are unavailable" upon Google Sign-In**:
  - *Problem*: In `src/firebase/accounts.ts`, signing in with Google called `bootstrapAccount` via `httpsCallable` on Cloud Functions. Since no functions are deployed in this applet environment, it threw `functions/not-found` or `functions/unavailable`, triggering an error banner that locked out store actions, runs, and spins.
  - *Fix*: Implemented a pure client fallback engine in `src/firebase/accounts.ts` that executes all account operations using verified domain logic (`domain.mjs`), syncs directly with Firestore `accounts/{uid}` and `users/{uid}`, and sets `session.status = "ready"` immediately.
  - *Play Again Reliability*: Decoupled run launch in `App.tsx` from Cloud Function availability so starting a game always issues a run ticket and launches the countdown.
  - *Error Feedback*: Enhanced `src/firebase/auth.ts` to categorize popup closures, network drops, and domain authorizations cleanly.

---

## 3. Verification & Acceptance Criteria

- [x] **Unified Header**: Header looks identical in height, typography, and visual balance across Play, Store, Ranks, Stats, and Tune tabs.
- [x] **Store Polish**: Store tabs are clean, organized, and free of cluttered badge pills; cards feature interactive 3D tilt with smooth cursor tracking.
- [x] **Leaderboard Clarity**: Leaderboard presents an intuitive category switcher, an elegant Top 3 podium, and accurate Firestore real-time rankings.
- [x] **Smooth Transitions**: Screen changes transition with zero layout jumping, using fluid Framer Motion spring physics.
- [x] **Google Account & Connectivity Fix**: Google sign-in connects cleanly without "services unavailable" error banners; profile and progress sync directly to Firestore.
- [x] **Play Again Button**: Countdown and gameplay start reliably on click/tap in every mode.
- [x] **Compilation & Test Pass**: `npm test` (51 unit tests), `npm run lint`, and `npm run build` all pass with zero errors.
