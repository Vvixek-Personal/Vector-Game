# VECTOR review before repairs

Confirmed defects: paid spin rewards refund their cost and can be lost on navigation; delayed hatch rewards overwrite newer balances; mission streak fields mismatch, perfect hits count all hits, weekly resets never occur with daily play, and claims award Sparks while announcing XP; completed runs discard login streaks; currency helpers accept invalid amounts; cloud restore uses obsolete local keys and initial effects overwrite saves; Google sign-in overwrites profile fields; private user saves are public and leaderboard writes do not validate existing ownership; concurrent personal best writes race; co-op attempts and versus hits/scores are miscounted; rapid versus inputs lock turns; incorrect hits grant reaction records; Waves progress survives mistakes; Memory reveals answers through hints; hyper-speed recall and timer rings use incorrect durations; canceled pointer gestures submit taps; bought themes do not equip and audio pack selection disappears on reload; some level rewards reference missing items; preferences do not cover effects; mute controls are coupled; menu keys operate behind dialogs; mobile HUD and dialogs can overflow; PWA icons have wrong dimensions, configuration references missing files, first-paint theme uses an obsolete key, and fullscreen install detection fails; build skips type checking and README requires an unused AI key.

The supplied archive is preserved. Existing style and modes are retained. New gameplay additions require the owner's choice after repairs.

Cloud authentication and deployed rules need a configured Firebase project. Local rules are not automatically deployed. Client-generated scores are not a trusted anti-cheat system.

## Additional analytics issues found and repaired

The old dashboard displayed invented sample curves on empty history and synthesized a prior observation at 70% of a single run. Charts could overshoot the actual observed values, and the hours-played bar rounded small durations to zero. The new dashboard uses real observations only, bounded interpolation, a fixed 0–100 accuracy scale, precise duration formatting, mode/range/rule filters, hit-weighted reaction means and complete-sample comparisons. Older missing timing remains missing.

## User-approved additions

The user selected Practice mode, a start countdown and clearer hit feedback, then requested analytics/parameter/animation improvements. Those additions are implemented. Other proposed bundles (boss waves, difficulty redesign, progression rebalance) were not selected and were not added.
