# VECTOR — improved edition

A browser reflex game with 12 modes, local progression, optional Firebase sign-in, and offline installation.

## Play on Windows

If you cloned this repository, run `npm ci` and `npm run build` first to generate **dist/**. The packaged ZIP supplied in the Codex chat already contains that build.

### Launch the built game

Unzip the whole folder and double-click **Play-Vector.cmd**. It uses Node.js 22.12 or later to serve the included production build and opens **http://127.0.0.1:3000**. Keep its window open while playing. This launcher needs no package download.

**Start-Vector.cmd** starts the editable development version; it downloads dependencies the first time.

## Controls

Use arrow keys or WASD, two keys for diagonals, or tap/swipe the arena. F activates Focus. P or Escape pauses. Co-op uses WASD for Player 1 and arrow keys for Player 2. The white swap badge means go opposite; a gold star gives a bonus.

- **Practice:** untimed and unranked, with direction coaching and a Finish practice button. It does not award currency, XP, missions or leaderboard scores.
- **Countdown:** every start/restart gives you three seconds to prepare. Cancel or Escape returns to the menu. Switching away cancels it safely.
- **Feedback:** successful responses show their reaction rating, points and milliseconds; misses show a retry cue.
- **Daily / Weekly:** fixed rules and UTC challenge periods.

## Analytics

Open **Stats** for real performance history. Filter by mode, run range and standard/modified rules; inspect Score, Accuracy, Reaction, Streak or Sparks. Hover, touch, or focus the chart and use the arrow keys. Two complete equal groups of matching runs enable average comparisons.

New runs record timing, hit/miss counts, perfect hits, rule multipliers and active duration. The newest 100 scored runs are retained; lifetime totals continue accumulating. Older runs remain compatible; missing measurements appear as —. Empty and single-run charts contain no invented data. Practice is excluded.

Animations follow the app's reduced-motion setting and the operating system preference. Moving particles, arena flashes, long counters and wheel spins are suppressed when reduced motion is active.

## Text and motion

VECTOR keeps one typography and one motion system so every screen, dialog and overlay feels like the same product.

- **Type ramp:** `.t-eyebrow`, `.t-display`, `.t-title`, `.t-heading`, `.t-body`, `.t-caption` (in `src/index.css`) plus `.num` for tabular figures. Sizes multiply the user's text-size setting through `--text-scale`.
- **Case and weight:** sentence case for labels, buttons and headings. Uppercase is reserved for short micro-labels with wider tracking. Nothing goes heavier than semibold (680), and numbers always use tabular figures.
- **Motion tokens:** `--dur-1`…`--dur-4` (110–280 ms) and `--ease-out`/`--ease-standard`/`--ease-in-out`. The same values are exported for JS animations in `src/utils/motion.ts` (`DURATION`, `EASE`, `SPRING`, shared `backdropVariants`/`panelVariants`/`popoverVariants`).
- **What animates:** transform and opacity only. Entrances settle in 160–200 ms, dialogs rise 12 px once, and lists cascade at 40 ms. There are no endless decorative loops; only true live states (a running timer, unclaimed rewards) keep moving.
- **Reduced motion:** the app's setting and the OS preference both remove travel, loops and long counters while keeping opacity and colour changes, so state changes stay visible.

When adding UI, reuse those classes and variants instead of new keyframes or one-off durations.

## Develop and verify

```text
npm ci
npm run dev
npm test
npm run build
```

- `npm run build`: type checking plus production/PWA build.
- `npm run test:browser`: start the development server first. Tests use Microsoft Edge on Windows; VECTOR_BROWSER can point at another installed Chromium executable.
- `npm run test:production`: serve the built game on port 4173 first (`PORT=4173 node scripts/serve.mjs`; in PowerShell set `$env:PORT = "4173"` before running Node). Checks offline loading, icons and the local server.
- `npm run preview -- --host 127.0.0.1`: inspect a production build.

No Gemini or other AI API key is needed. Guest play works without sign-in. Keep the same browser and address to retain local progress; data on one hosting address is separate from another.

## Install / host

Serve **dist/** over HTTPS for installation on a real device. Localhost also supports testing. Do not open index.html directly from disk. Updates are offered from the menu, so an active run is never force-reloaded.

## Firebase

The original project's public Firebase configuration is retained. Its owner must enable Google sign-in and authorize the hosting domain. Review and deploy **firestore.rules** and **firestore.indexes.json** to the designated Firestore database before relying on the revised access controls. This package does not deploy or modify the live project.

Cloud restoration waits before uploading, keeps a local backup before replacement, and blocks uploads if the initial cloud read fails. Local play remains available. Sign-in, cloud restoration and deployed rules still need verification with the project owner.

Scores and currency are calculated on the client. Strong anti-cheat requires a trusted backend and is outside this local repair pass. Existing historical totals cannot always be reconstructed from old limited history.

See **AUDIT.md** and **REPAIR-REPORT.md** for changes, validation and remaining limitations.
