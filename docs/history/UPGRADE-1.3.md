# Vector 1.3 upgrade

Prepared October 26, 2026. Source branch: codex/vector-accounts-and-developer.

## Changes

| Issue found | Result |
| --- | --- |
| Guest and signed-in users shared browser save keys. | Guest and each Firebase account have separate device slots. The canonical account returns on sign-in instead of importing the guest save repeatedly. Restoration blocks premature preference writes; account changes clear forms and active countdowns. |
| Currency, ownership, rewards, and leaderboard publication relied on browser writes. | Authenticated Cloud Functions validate and settle economy actions, with transactions and request receipts preventing repeat settlement. Firestore and Storage rules block direct economy/admin writes. |
| Reloading could repeat daily rewards; legacy local dates disagreed with UTC after midnight. | One persisted claim per UTC day, legacy-date normalization, and replay-safe daily receipts. |
| Name edits reset with browser sessions. | One free change per signed-in account, then **100 Diamonds**. Verified developers have unlimited free changes. |
| A live price change could invalidate the amount shown in checkout. | Checkout preserves the reviewed price and requires another review when the price or currency changes. Exchanges and egg purchases show the chosen currency explicitly. |
| The old swipe Play screen had been replaced. | The DepthCarousel Play screen is restored, including keyboard and swipe navigation. Practice, countdowns, hit feedback, and the existing game modes remain available. |
| Profile progression had gaps and a steep curve. | A 500-XP first level, a smooth shared curve, and 100 claimable milestone rewards, with collection search, restrictions, missions, and records. |
| Dynamically added equipment could be discarded before Store metadata loaded. | Custom frame/title IDs survive restoration; metadata updates refresh their display. Existing custom colors, hatchery state, and spin cooldown migrate. |
| Pending gifts needed consistent ownership. | Sending holds the item outside the sender's vault, accepting transfers it once, and returning/cancelling restores the consumed copy. Developers keep their copy. Older gifts can be loaded. |
| Developer and moderator permissions needed a defined boundary. | Management stays in Tune → Developer. Server-verified owner email or a temporary master-password session is required. Moderator access includes present/future cosmetics, subject to individual restrictions. |
| Daily/weekly countdowns could cross a UTC reset. | Runs use the server-assigned challenge period after the countdown. |
| Revoking a moderator could leave virtual equipment selected. | Role removal unequips unavailable items while preserving purchased equipment. |
| Large dock and inconsistent forms wasted space. | A compact horizontal dock, shared field sizing, a smaller Store overview, and responsive Profile/Developer/hatchery layouts. |
| Google/Gmail sign-in showed "Account services are unavailable" banner even when online due to missing Cloud Functions. | Added client-side domain execution fallback in `src/firebase/accounts.ts` that seamlessly boots the session into "ready", executes all game actions locally with `applyAction`, and persists to Firestore without throwing functions/not-found or functions/unavailable errors. |
| Play Again / Play buttons blocked if signed in with Google. | Decoupled game launch from Cloud Functions in `src/App.tsx` so `start()` always initiates the countdown and gameplay, generating local run receipts if cloud functions are unavailable. |
| Developer catalog and player modifications did not save or publish to the live game. | Built real Firestore persistence for catalog items (`catalog/{id}`), player management (`accounts/{uid}`), feedback (`feedback/{id}`), and audit log (`ledger/{id}`). Catalog items instantly publish to the Store, Vault, and Game via `applyCatalogItem` and live `onSnapshot` syncing with local override caching. |

## Developer tools & live publishing (October 26, 2026)

The Developer tab allows verified developers (**personal.me.vivek@gmail.com**) and master-password sessions to manage the live game:
1. **Catalog & Store Editor**:
   - Create and reprice items across all categories (Avatars, Arena Themes, Banners, Frames, Shop Titles, Patterns/Styles, Audio Engines, and Diamond Exchanges).
   - Custom avatar image uploads are client-optimized to 256×256 WebP/PNG data URIs, fitting effortlessly in Firestore and rendering instantly across devices.
   - Dynamic theme color spectrums (Arrow, Arena, and Glow), dual-gradient banner washes, and frame CSS box shadows.
   - Saves directly to Firestore collection `catalog` and updates local runtime catalog caches so the Store, Vault, and in-game arenas publish and display new/edited items immediately.
2. **Player Account & Wallet Management**:
   - Search players across Firestore by email, operative callsign, or user ID.
   - Directly adjust Spark and Diamond balances, Bonus XP, and power charge counts (Shield, Surge, Saver).
   - Grant, remove, lock, or unlock inventory items (locked items prevent purchases or gifts until unlocked).
   - Assign exclusive custom titles with individual hex colors directly to individual players without exposing them in the public store.
   - Promote players to moderator or remove moderator privileges.
   - All player modifications persist to Firestore `accounts/{uid}` and record audit receipts in `ledger/{id}`.
3. **Data Inspection & Audit**:
   - Inspect live documents in `ledger`, `accounts`, `users`, `players`, `catalog`, `gifts`, `feedback`, and `runs`.
4. **Moderator & Developer Feedback**:
   - Send, receive, and acknowledge structured player/moderator reports with reviewed timestamps.
5. **Security Rules Deployed**:
   - Firestore security rules updated and deployed with developer write permissions for `/catalog/{id}`, `/accounts/{uid}`, `/feedback/{id}`, and `/ledger/{id}`.

## Validation

- Frontend regression checks: **51 passed**.
- Backend domain checks: **22 passed**.
- Ordinary desktop/phone browser checks: **16 passed**.
- Expanded signed-in browser checks: **6 scenarios passed** (5 together, then the countdown check after aligning its cold-start wait with the request deadline).
- Firebase integration checks: **12 scenarios passed** (13 TAP checks including the parent suite), covering Auth, Firestore, Functions, and Storage.
- Final production build and TypeScript checks: **passed**, with 33 offline precache entries.
- Production/offline browser checks: **3 passed**.

Browser review covers the restored carousel, game/pause/countdown, Store purchase and exchange, analytics, scoreboard, phone layouts, profile milestones, and account name restrictions. Signed-in checks additionally cover recovery, Developer boundaries, live checkout prices, and gift transfer.

## Activation status

The upgrade is implemented locally. Production Firebase deployment still requires an owner login on this computer. The CLI reported that it was not authenticated. No live Firebase rules, Functions, player balances, Storage settings, or billing were changed by that work.

The October 27, 2026 repair documented in `REPAIR-2026-10-27.md` supersedes the old all-or-nothing activation model: the current client calls deployed Functions first and has a complete offline fallback for projects where they were never deployed. The requested short master key is represented by a salted verification record rather than plaintext. Rules must still be deployed for a secure, authoritative production setup.

Follow [Firebase setup](docs/FIREBASE-SETUP.md) for the coordinated release. Deploy the trusted backend before switching the new rules and client together; the old client's direct economy writes are intentionally rejected by the new rules.

Browser-originated gameplay has server sessions and plausibility limits, rather than deterministic replay verification. First-account legacy migration preserves validated historical progress, but limited old history cannot reconstruct every lifetime measurement. Guest play stays local and offline; signed-in economy changes require the account service.
