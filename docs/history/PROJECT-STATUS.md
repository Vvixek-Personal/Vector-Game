# Historical project status — VECTOR 1.3

> **Archived context, not the current feature specification.** This document describes an earlier version of VECTOR. The latest main-branch commit removed the Google sign-in/account UI and leaderboard UI. Do not use the feature claims below as proof that those flows are present or production-ready.

Date of original notes: October 26–27, 2026.

## What the earlier notes reported

The previous 1.3 iteration included work on account-session handling, local/offline gameplay, store and inventory flows, reward claims, challenge scoring, and Firebase-backed developer tools. The original notes reported passing unit/type/build checks, but those results were not re-run as part of this documentation update and should not be treated as current verification.

The repository still contains some Firebase code, backend functions, tests, and setup notes from that earlier scope. Their presence does not establish that they are wired into the current UI, deployed, or supported.

## How to verify the current state

1. Read the current [README](../../README.md) and [architecture notes](../ARCHITECTURE.md).
2. Inspect the current call sites and screens before relying on an old report.
3. Run `npm ci`, `npm test`, `npm run lint`, and `npm run build` in the current checkout.
4. Treat Firebase deployment as a separate release decision. Use a disposable emulator project for tests; do not deploy old instructions without reviewing the current code, rules, and product scope.

Historical audit and repair documents are retained to preserve context. They are not a substitute for a fresh code review or reproducible test results.
