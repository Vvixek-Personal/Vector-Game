# Historical Firebase setup notes — review before use

> **Important: these instructions describe an earlier VECTOR 1.3 account/leaderboard/developer-tools implementation.** The latest main-branch commit removed the account sign-in and leaderboard UI. Do not follow deployment steps in this document unless you have confirmed that the relevant feature is still in scope, audited the current source and rules, and intentionally chosen to deploy it. This file is retained as historical context, not as an endorsement to deploy the current Firebase project.

The repository contains Firebase configuration, catalog-sync code, Cloud Functions, Firestore rules, and historical account-related tests. Their presence alone does not mean those features are active in the current UI or safe to deploy unchanged.

## Safety checks before any Firebase work

- Confirm the Firebase project, database, and storage bucket in the Firebase console.
- Use a demo project and the Firebase Emulator Suite for tests; do not run experiments against real player data.
- Review current Firestore and Storage rules, Cloud Functions, environment files, and authentication settings before deployment.
- Never commit private keys, service-account JSON, passwords, master keys, production exports, or local environment files.
- Treat any email address or owner identity in local configuration as private configuration; do not copy it into public documentation or client-side authorization logic.
- Do not change billing, deploy rules/functions, or alter production data as part of a routine test run.

## Historical configuration

Earlier versions of this project used a Firebase project with ID `steel-scanner-8xfhk`, a named Firestore database, and a Firebase Storage bucket. Verify every value in the Firebase console before using it; this document may not match the current deployment.

Earlier implementation notes also described an owner-only developer capability and a short numeric key. A short numeric key or a client-side check is not a production security boundary. Authorization must be enforced by trusted server-side code and tested against unauthorized requests.

## Local verification principles

Use Node.js 22 or newer and the Firebase Emulator Suite with a disposable demo project. Run the tests that match the code you are actually testing, and record the exact commands and results. A passing unit test does not prove production authentication, rules, cross-device persistence, or deployment behavior.

Do not deploy functions, Firestore rules, or Storage rules based solely on this historical guide. Confirm the current product scope and complete a fresh security review first.

Official references: [Firebase callable functions](https://firebase.google.com/docs/functions/callable), [Firebase environment configuration and secrets](https://firebase.google.com/docs/functions/config-env), [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), and [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite/connect_firestore).
