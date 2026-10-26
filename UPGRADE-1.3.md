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

## Developer tools

The Developer tab includes Firebase player lookup and preparation, wallet/bonus XP/charge management, inventory grants/removals/locks, moderator assignment/removal, player-specific titles, Store creation/repricing/availability, avatar uploads, theme color controls, custom developer pictures, feedback review, and application-data/activity inspection.

Private titles belong to assigned players and are excluded from the Store and gifting. Moderator feedback reaches the Developer workspace. Catalog changes appear in the Store without requiring a new build. Hidden catalog items remain in existing collections.

Permanent Developer access requires Firebase Auth to verify **personal.me.vivek@gmail.com**. A configured server master password grants one hour of access to a signed-in account. Its salted hash is kept in Secret Manager; no production password is bundled. Role, balance, price, and gift checks run on the server for every operation.

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

The upgrade is implemented locally. Production Firebase deployment still requires an owner login on this computer and private master-password configuration. The CLI reported that it was not authenticated. No live Firebase rules, Functions, player balances, Storage settings, or billing were changed.

Follow [Firebase setup](docs/FIREBASE-SETUP.md) for the coordinated release. Deploy the trusted backend before switching the new rules and client together; the old client's direct economy writes are intentionally rejected by the new rules.

Browser-originated gameplay has server sessions and plausibility limits, rather than deterministic replay verification. First-account legacy migration preserves validated historical progress, but limited old history cannot reconstruct every lifetime measurement. Guest play stays local and offline; signed-in economy changes require the account service.
