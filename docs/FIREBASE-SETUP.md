# Vector 1.3 Firebase activation

The account, gift, and Developer tools prefer trusted Cloud Functions, with a complete client fallback when those Functions have not been deployed. Guest play remains available without Firebase. The original 1.3 implementation was tested against local emulators; that is separate from deploying the live project. Rerun the emulator suite after applying the October 27, 2026 rule and fallback changes.

## Owner setup

Use Node.js 22 and Java 21+ for the local emulators. Install both sets of dependencies:

    npm ci
    npm --prefix functions ci

Sign into Firebase as an account that can manage the existing project:

    npx --prefix functions firebase login
    npx --prefix functions firebase projects:list

The public configuration targets project **steel-scanner-8xfhk**, database **ai-studio-vectorgame-560ec9bd-4e7c-4177-8021-3f5fed39406a**, and bucket **steel-scanner-8xfhk.firebasestorage.app**. Verify these against the Firebase console before deploying. Google sign-in must be enabled and the game's hosting domain authorized. Functions and Storage deployment require the appropriate Firebase plan and permissions; do not change billing automatically.

The server grants permanent Developer access only when Firebase Auth verifies **personal.me.vivek@gmail.com**. A normal player's email field, local save, or submitted role cannot grant access.

## Master key

The owner requested a short numeric Developer key. That key is now configured through a salted PBKDF2-SHA256 verification record in `functions/src/master-key.mjs`; the plaintext is not present in the frontend bundle. The Developer form accepts 8–256 characters, and the session lasts one hour.

Security note: an eight-digit numeric key is weak and the verification record is public code. Treat this as a convenience gate only. For a production project, deploy the trusted `unlockDeveloper` Cloud Function and set a longer, private override using `VECTOR_MASTER_PASSWORD_HASH`. The setup script now accepts 8–256 characters:

    node scripts/set-master-password.mjs

It derives a salted scrypt hash and stores only that hash. `VECTOR_MASTER_PASSWORD_HASH` can contain either the legacy `scrypt$salt$hash` record or a `pbkdf2-sha256$iterations$salt$hash` record; when set, it replaces the default key rather than adding a second valid key. The emulator uses a separate ignored, test-only fixture. Rotating the key requires changing the verification record or environment value and redeploying the backend/client together.

Password Developer sessions can be revoked from Tune → Developer → Players. Server attempts are rate-limited per account and IP. Signing out hides all management tools; server checks still apply to every operation.

## Coordinated release

Back up the existing database through the project's normal backup process. Existing legacy **users** documents are retained; the first authenticated bootstrap creates the canonical **accounts** document once. Repeated sign-ins return that account instead of importing another local save.

If you override the default master-key record, configure that value first. Deploy the backend and rules before the new client:

    node --import tsx scripts/export-domain.mjs
    npx --prefix functions firebase deploy --only functions:vector-game --project steel-scanner-8xfhk
    npx --prefix functions firebase deploy --only firestore,storage --project steel-scanner-8xfhk
    npm run build

Publish **dist/** through the existing hosting workflow after backend deployment succeeds. The client now tries the trusted account service first and falls back to a complete Firestore/domain implementation only when those Functions are missing or unreachable. The checked-in rules support that fallback while still rejecting role escalation, cross-account leaderboard writes, gift redirection, and unauthorised legacy balance writes. Deploy rules and client together; an old cached client may need to accept the game's update notice.

The Firebase CLI is not authenticated on the development computer at the time this upgrade was prepared. No live database, rules, Functions, Storage settings, billing, or player balances have been changed by this repair.

## Verify after deployment

1. Sign in as the verified owner. Open Tune → Developer; check the Admin badge.
2. Use a test player to buy/equip an item, reload, sign out, and sign in. Balances, name, inventory, and milestone claims should return.
3. Claim the daily reward, reload several times, and confirm it is credited once for the UTC day.
4. Rename once for free and again for 100 Diamonds. Developers remain free.
5. Send a cosmetic to a second test player. It leaves the sender's vault while pending; accepting transfers it, returning/cancelling restores it. Developers retain their copy.
6. Appoint a moderator; verify current and newly created Store items are available, a locked item is unavailable, and feedback reaches the developer. Revoke the role.
7. Create/reprice a small test Store item and verify the live Store updates. Check developer-only custom picture upload and player-specific titles.
8. Inspect Data & activity for application accounts, catalog, gifts, runs, feedback, and balance changes.
9. Finish runs in Arcade and Daily while signed in. Confirm device scores, live global mode/challenge boards, and overall points update without duplicates; go offline for one run and verify the queued best publishes on reconnect.
10. Sign out from a high-level account, confirm guest progress appears instead, then sign back in and confirm the high-level account returns from its own slot.

The data inspector covers this game's application collections. It is not a replacement for the Firebase console, infrastructure configuration, Auth passwords, or secret access.

## Local verification

Run **node scripts/prepare-emulators.mjs** to generate ignored local configuration. This replaces emulator-only settings and uses a demo project so tests cannot access production:

- functions/.env.local: VECTOR_DATABASE_ID as above, VECTOR_STORAGE_BUCKET=demo-vector.appspot.com, and VECTOR_MASTER_PASSWORD_HASH in scrypt$salt$hash format.
- functions/.secret.local: the same VECTOR_MASTER_PASSWORD_HASH record for tooling that still reads secret files; it matches the emulator test passphrase in the integration test.

    npx --prefix functions firebase emulators:start --project demo-vector --only auth,firestore,functions,storage
    node --test functions/test/domain.test.mjs
    node --test functions/test/emulator.test.mjs

For signed-in browser tests, first run the integration test to create disposable fixtures, then start Vite with **VITE_VECTOR_EMULATORS=true**. This switch is accepted only in development builds. Run **npm run test:accounts**. Ordinary UI tests run without emulator fixtures using **npm run test:browser**.

Server transactions and request receipts protect purchases, rewards, transfers, and role changes. Gameplay still originates in a browser; score bounds and server run sessions are not a deterministic replay anti-cheat system. Historical progress is imported once with validation, and old limited history cannot reconstruct every lifetime measurement.

Official references: [callable functions](https://firebase.google.com/docs/functions/callable), [secrets](https://firebase.google.com/docs/functions/config-env), [transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), and [emulators](https://firebase.google.com/docs/emulator-suite/connect_firestore).
