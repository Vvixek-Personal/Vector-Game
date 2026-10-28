# VECTOR

VECTOR is a browser-based arrow-reflex game built with React, TypeScript, and Vite. Read the prompt, respond with the matching direction, and try to improve your score and reaction time.

This repository contains the source code and the scripts used to develop and test the game. It is a personal project in active development; the documentation is being kept aligned with the code rather than presenting every planned or historical feature as shipped.

## Gameplay

- **12 modes:** Arcade, Practice, Co-op, Waves, Memory, Rush, Blitz, Sudden, Zen, Versus, Daily, and Weekly.
- **Keyboard and touch input:** use the arrow keys or WASD; the arena also supports touch/swipe input.
- **Progression:** local profile, settings, scores, statistics, missions, and cosmetic inventory.
- **Performance feedback:** run summaries and reaction-time analytics.
- **Installable web app:** the Vite PWA setup supports installation when served from a supported origin.

Practice is intended for learning without affecting ranked progress. Daily and Weekly use fixed challenge rules. Reduced-motion preferences are respected.

> **Current scope:** the latest main-branch commit removed the account sign-in and leaderboard UI. Older repair reports and Firebase notes may describe an earlier version and are not a reliable description of the current user interface. Firebase catalog-sync code still exists, so review the configuration before deploying or changing cloud behavior.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite (the configured development port is 3000).

To create and inspect a production build:

```bash
npm run build
npm run preview
```

The build script runs TypeScript checking before Vite builds the app.

## Tests

Run the unit tests with:

```bash
npm test
```

Other available checks:

| Command | Purpose |
| --- | --- |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm run test:browser` | Playwright browser tests; requires a supported browser setup |
| `npm run test:production` | Playwright checks against a served production build |
| `npm run test:backend` | Backend domain tests |
| `npm run test:integration` | Firebase emulator integration tests; requires emulator setup |
| `npm run test:accounts` | Historical account-flow browser tests; confirm they match current scope before relying on them |

These are instructions, not a claim that every suite has passed on every machine. Record the Node version, command, result, and any environment requirements when reporting a verification run.

## Project map

- `src/App.tsx` — application-level screen and game flow.
- `src/game/` — game engine, modes, profile, progression, and browser storage.
- `src/components/` — reusable UI and screens.
- `src/utils/` — shared utilities, including motion tokens.
- `tests/` — unit and browser tests.
- `functions/` — Firebase/backend code retained in the repository.
- `docs/` — setup and implementation notes.

For a concise explanation of the main design choices and the current verification checklist, see [Architecture](docs/ARCHITECTURE.md) and [Testing](docs/TESTING.md).

## Data and configuration

Guest progression is stored in the browser, so it is tied to that browser and origin. Clearing browser data or switching origins can remove or separate local progress. Do not assume local data is backed up to a server.

The repository includes Firebase-related code and historical setup documentation. Do not deploy backend rules or functions just because setup instructions exist: first confirm that the feature is part of the current product scope, review the configuration, and test against a disposable Firebase emulator project.

Never commit real credentials, private keys, production exports, or local environment files. The provided `.env.example` is a template; create local environment files that remain ignored by Git.

## Project notes

- [Architecture and design notes](docs/ARCHITECTURE.md)
- [Testing and verification checklist](docs/TESTING.md)
- [Firebase setup notes](docs/FIREBASE-SETUP.md) — historical; read the warning at the top before using
- [Audit history](AUDIT.md)
- [Repair reports](REPAIR-REPORT.md) and [upgrade notes](UPGRADE-1.3.md) — historical reports may refer to features no longer present in the current UI

## Contributing / feedback

Bug reports are most useful when they include the browser and operating system, steps to reproduce, expected behavior, actual behavior, and whether the issue happens in a fresh browser profile. Please avoid including personal data, tokens, or production database contents in an issue.

VECTOR is developed iteratively. Feature descriptions and docs should be updated alongside code changes, and test results should only be reported after the corresponding command has actually been run.
