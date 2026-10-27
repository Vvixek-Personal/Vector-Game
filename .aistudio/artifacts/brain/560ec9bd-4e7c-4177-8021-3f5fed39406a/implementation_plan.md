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
- **Developer Tools Persistence & Live Publishing (October 26, 2026)**:
  - *Analysis of Developer Tab Capabilities*:
    1. **Catalog & Store Editor**: Create new items or edit existing items across Avatars, Themes, Banners, Frames, Titles, Patterns/Styles, Audio packs, and Diamond exchanges. Supports avatar photo upload, theme color spectrum adjustments (Arrow, Arena, Glow), gradient banners, frame shadows, custom pricing, rarity, and active availability.
    2. **Player Management**: Search/list players across the database, inspect account stats, adjust Sparks/Diamonds/Bonus XP and power charges, grant/remove/lock/unlock store inventory, assign private player-specific titles with custom colors, promote/demote moderators, and revoke temporary password sessions.
    3. **Data & Activity Inspector**: Audit logs from `ledger`, `accounts`, `users`, `players`, `catalog`, `gifts`, `feedback`, and `runs`.
    4. **Moderator & Feedback Hub**: Send and review feedback reports with reviewed acknowledgments.
    5. **Developer Identity**: Verified developer custom profile picture upload with auto-scaling and Firestore persistence.
  - *Root Causes Found*:
    - `saveCatalogItem` returned a mock message without saving to Firestore or triggering catalog rebuilds.
    - `adminWallet`, `adminInventory`, `adminTitle`, `adminRole`, and `revokeDeveloper` did not fetch the target account from Firestore into `extra.target`, and did not persist modified accounts back to Firestore.
    - `firestore.rules` had `allow write: if false;` on `/catalog/{id}`, `/accounts/{uid}`, `/feedback/{id}`, and `/ledger/{id}`.
    - `domain.mjs` restricted avatar photo URLs to `https://firebasestorage.googleapis.com/`, rejecting data URLs.
  - *Resolution Implemented*:
    - Wired full client fallback and Firestore handlers for `saveCatalogItem`, updating `doc(db, "catalog", item.id)` and calling `applyCatalogItem(item)` for instantaneous publication across the Store, Vault, and Game.
    - Implemented full Firestore read/write and audit logging for player admin operations (`accounts/{uid}` and `ledger/{id}`).
    - Updated `firestore.rules` allowing verified developers (`personal.me.vivek@gmail.com`) write access, and deployed rules via `deploy_firebase`.
    - Added image optimization via offscreen canvas (256x256 WebP/PNG) for fast and compact photo persistence.

---

## 3. Verification & Acceptance Criteria

- [x] **Unified Header**: Header looks identical in height, typography, and visual balance across Play, Store, Ranks, Stats, and Tune tabs.
- [x] **Store Polish**: Store tabs are clean, organized, and free of cluttered badge pills; cards feature interactive 3D tilt with smooth cursor tracking.
- [x] **Leaderboard Clarity**: Leaderboard presents an intuitive category switcher, an elegant Top 3 podium, and accurate Firestore real-time rankings.
- [x] **Smooth Transitions**: Screen changes transition with zero layout jumping, using fluid Framer Motion spring physics.
- [x] **Google Account & Connectivity Fix**: Google sign-in connects cleanly without "services unavailable" error banners; profile and progress sync directly to Firestore.
- [x] **Play Again Button**: Countdown and gameplay start reliably on click/tap in every mode.
- [x] **Developer Tab Persistence & Live Publishing**: Developer changes to catalog items, pricing, custom avatars, themes, player balances, inventory rules, and exclusive titles save directly to Firestore and publish immediately to the live game.
- [x] **Compilation & Test Pass**: `npm test` (52 unit tests), `npm run lint`, and `compile_applet` all pass with zero errors.

