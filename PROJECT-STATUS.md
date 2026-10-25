# VECTOR 1.2 status

The UI refresh, store/scoreboard rewrites, hero avatars, saved favorites and profile improvements are complete. The source builds on GitHub main commit 35e1f18c9f1b8c6b0cabc41758d727f547b6f7bf and preserves its recent settings and character additions.

Validation: 45 regression tests, 16 browser scenarios, 3 production checks, and the type-check/production/PWA build pass. See REFRESH-REPORT.md for details and live Firebase limitations.

The playable ZIP includes dist/. Run Play-Vector.cmd with Node.js 22.12+. A source-only GitHub checkout needs npm ci and npm run build first.

Update branch: codex/vector-1-2-ui-heroes.
