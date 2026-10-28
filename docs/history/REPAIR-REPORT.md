# VECTOR — completed repair and improvement report

Prepared October 25, 2026. The supplied archive is unchanged. This edition includes the repaired source, a fresh production build and a local Windows launcher.

## Added with your approval

- **Practice:** an untimed, unranked training mode with direction coaching and a Finish practice control. Training does not award currency, XP, mission progress or leaderboard scores.
- **Start countdown:** three seconds before a new run or restart; Cancel/Escape returns home. Switching away cancels the countdown.
- **Clear hit feedback:** reaction rating, points and measured milliseconds for correct responses; readable retry/timeout cues.

## Better analytics and animations

- Real charts replace the old invented sample history and synthetic previous observation. A single run stays a single point.
- Filter by game mode, recent-run range and standard/modified rules. Inspect score, accuracy, reaction time, streak and Sparks.
- Average comparisons use two equal complete groups of matching runs. Reaction averages use measured hit counts; missing older values stay missing.
- New history records timestamps, hit/miss counts, perfect hits, reaction timing, active duration and rule multipliers. It retains 100 scored runs while lifetime totals continue accumulating.
- Charts support mouse, touch and keyboard inspection, bounded curves and a fixed accuracy scale. Recent-run details remain usable on phones.
- Transitions and counters are more consistent. Reduced motion follows both the app setting and the operating system, and suppresses moving particles, arena flashes and long wheel spins.

## Main repairs

- Paid spins now preserve their cost, settle rewards before animation, and survive navigation. Hatch rewards no longer overwrite newer balances. Duplicate claims and invalid currency spending are guarded.
- Mission streak/perfect-hit tracking, independent weekly/monthly renewal and XP claims are corrected. Completed runs preserve login streaks.
- Co-op/Versus attempts, hits, accuracy and points are counted correctly. Rapid Versus input no longer locks a turn. Wrong inputs no longer grant fastest-reaction records. Waves progress resets on mistakes.
- Memory no longer reveals required directions through hints, and its recall timer retains speed modifiers. Pointer cancellation does not count as a tap; touch capture and keyboard D-pad activation are repaired.
- Purchased themes equip, audio packs survive reload, and shop frames/titles remain consistent with their saved equipment. Invalid level reward references were corrected.
- Daily and weekly runs use shared fixed rules and retain the challenge period in which they started, even if a UTC reset occurs before completion.
- Cloud restore uses current local keys, waits before uploads, preserves a local pre-restore backup and avoids replacing active-run changes. A failed initial read leaves uploads blocked to protect remote data.
- Local Firestore rules restrict private saves to their owner and validate leaderboard ownership. Personal-best/overall score updates use a transaction.
- Phone navigation, short-screen dialogs, motion preferences, independent sound/music mute and several accessibility controls are repaired.
- Correctly sized PNG app icons, menu-time update prompts, offline precaching and separate screen bundles improve installation and loading. The unused external font request and AI-key requirement are removed.

## Validation

- **29 regression tests passed:** game modes, rewards, persistence, Practice, hit feedback, analytics calculations and challenge-reset scoring.
- **7 desktop/phone browser checks passed:** navigation/settings, actual runs and pause, Memory hints, paid-spin persistence, Practice/countdown/feedback, analytics edge cases and responsive layouts.
- **3 production checks passed:** service-worker precaching and offline analytics loading, icon dimensions, and the local server's build delivery/path protections.
- **Production build passed**, including TypeScript checking and PWA generation.
- Visual previews were inspected in dark/light and phone layouts. Preview analytics uses synthetic test fixtures; those results are not bundled as player progress.

## Play

Unzip the folder and double-click **Play-Vector.cmd**. It serves the included build using Node.js and opens the game locally. No development package download is required. See README.md for editing, tests and hosting.

## Remaining limits

Google sign-in, cloud restoration and deployed Firestore permissions still require verification against the owner's live Firebase project. The included rule/index files have not been deployed or emulator-tested. Scores and currency remain calculated on the client; strong anti-cheat requires a trusted backend. Some old historical totals cannot be reconstructed from the original limited history. The Firebase vendor bundle still produces a non-blocking size warning.

Implementation references: [Firestore rule conditions](https://firebase.google.com/docs/firestore/security/rules-conditions) and [PWA update behavior](https://vite-pwa-org.netlify.app/guide/auto-update).
