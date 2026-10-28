# Security and secret handling

## Public repository model

This is a public source repository. Source code, configuration templates, documentation, and test fixtures are visible by design. Do not place credentials, production data exports, private keys, or local environment files in Git.

## Firebase web configuration

Firebase web API keys and project identifiers are client configuration; they are not server secrets and cannot be made secret inside a browser app. The app now reads these values from local `VITE_FIREBASE_*` variables. Any `VITE_*` variable is still embedded in the client bundle. Restrict the Firebase API key to the required APIs and applicable web origins in Google Cloud, enable Firebase App Check where appropriate, and enforce access through Firestore/Storage Rules.

## Server-only secrets

- Developer-key verification now requires the `VECTOR_MASTER_PASSWORD_HASH` Secret Manager value on the trusted Cloud Function. No default verifier hash is shipped in the source module or client fallback.
- Set the server secret using the interactive `node scripts/set-master-password.mjs` utility after installing the functions dependencies and authenticating with Firebase CLI. Review the target project before running deployment commands.
- Do not store a Gemini key in `VITE_*`, source code, `.env.example`, or any file tracked by Git. For one-off analysis, provide `GEMINI_API_KEY` through the shell environment on a trusted local machine.
- If a real Gemini/API provider key or service credential was ever committed, revoke/rotate it with its provider. Removing a file from the latest commit does not invalidate the credential or erase historical copies.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the Firebase web configuration values from the Firebase console if cloud features are required.
3. Leave the values unset for local/offline play; cloud catalog synchronization will be skipped.
4. Never copy a server-only secret into the Vite environment.

## Verification

Run `npm run security:scan` from a full Git checkout. It scans tracked files for common credential patterns and hides matched values in its output. This is a convenience check, not a substitute for provider-side secret scanning, Firebase Rules review, or Git history scanning. A pattern match must be reviewed because some values, including Firebase web keys, may be public client configuration.

## Scope and limitations

This change removes the source-controlled default developer verifier and disables developer unlock through the client-side fallback. The trusted backend requires a configured Secret Manager value. Firebase project rules and provider-side API restrictions still need to be reviewed in the console; this repository change does not rotate keys, change cloud rules, or rewrite old Git history.
