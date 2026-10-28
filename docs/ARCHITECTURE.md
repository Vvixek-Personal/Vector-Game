# Architecture notes

These notes describe the current source layout and observable implementation. They are a starting point for maintainers, not a claim that every subsystem has been independently audited.

## Runtime shape

- **React + TypeScript** render the application and its screens.
- **Vite** runs the development server and creates the production bundle.
- **Canvas/game engine:** game rules and direction/scoring helpers live under `src/game/`; the top-level app coordinates screen state and the active run.
- **Browser persistence:** profile, settings, scores, and progression use browser storage. Local data belongs to the browser profile and origin where it was created.
- **Motion and accessibility:** shared motion helpers and reduced-motion preferences are used to keep transitions consistent and avoid unnecessary animation for users who request reduced motion.
- **PWA:** Vite's PWA plugin configures the installable web-app manifest and service worker.

## Current feature boundaries

The latest main-branch change removed the account sign-in and leaderboard UI. Older documents still describe account sessions, global score boards, and developer/admin workflows; treat those as historical until the relevant code and screens are reintroduced and tested.

Firebase-related catalog-sync code and backend files remain in the repository. Their presence alone does not mean every old cloud feature is part of the current supported product. Before changing cloud behavior, trace the call sites, inspect the rules and functions, and test against a demo/emulator project.

## Design choices worth preserving

1. **Keep game rules separate from presentation.** Direction math, mode definitions, scoring, and persistence logic belong in the game modules rather than being duplicated across screens.
2. **Keep local play useful.** A player should be able to start the core game without first creating a cloud account.
3. **Use shared design tokens.** Reuse the typography, spacing, and motion conventions already present instead of adding one-off values for each screen.
4. **Respect reduced motion.** Check both the app preference and the operating-system preference when adding animation.
5. **Treat persisted data as untrusted input.** Browser storage can be edited, corrupted, unavailable, or left over from an older version. Parse defensively and provide safe defaults.
6. **Document trade-offs honestly.** Local browser data is convenient but is not a backup and does not automatically move between devices or origins.

## Before a substantial change

- Identify the screen, game module, and tests that own the behavior.
- Confirm whether the behavior is local-only or depends on Firebase.
- Add or update a focused test for the bug or rule.
- Run the relevant test and type/build checks.
- Update the README if the supported feature set or setup changes.
- Avoid claiming production security or anti-cheat guarantees based only on client-side checks.
