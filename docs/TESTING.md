# Testing and verification

This file is a checklist for producing reproducible evidence. It intentionally does not claim that commands have passed in the current environment.

## Baseline

Use Node.js 22 or newer. From the repository root:

```bash
npm ci
npm test
npm run lint
npm run build
```

Run one command at a time and keep the complete output if something fails. `npm run build` already includes `tsc --noEmit`, so it checks types before creating the Vite production build.

## Browser tests

```bash
npm run test:browser
```

The Playwright configuration may require an installed browser. If a test fails, record whether the failure is due to missing browser dependencies, an app assertion, or a server/setup problem; do not label all failures as product bugs without checking.

For production-mode tests, build first and follow the port/server instructions in the relevant Playwright configuration and scripts:

```bash
npm run build
npm run test:production
```

## Firebase tests

Firebase integration tests require emulator setup and should use a demo/test project, never production data. Review `docs/FIREBASE-SETUP.md` before attempting them: that file contains historical instructions and the account/leaderboard UI was removed from the latest main-branch change.

Do not deploy functions, rules, or storage settings as part of a routine test run. Deployment is a separate, deliberate release step.

## What to record

For each meaningful verification run, record:

- Date and operating system.
- `node --version` and `npm --version`.
- Exact command executed.
- Pass/fail result and relevant error summary.
- Any environment-specific requirement or test skipped.

A test file existing is not proof that it passes. A successful local build is not proof that deployed Firebase rules, authentication, cross-device persistence, or production hosting work.
