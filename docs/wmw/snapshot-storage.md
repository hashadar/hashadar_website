# WMW Snapshot storage

Private Amplify Storage for last-good Workbook Snapshots. Distinct from public Site Content (`siteContent`) and Job OS Body storage (`jobOsBodies`).

## Bucket

| `defineStorage` name | Access |
|----------------------|--------|
| `wmwSnapshots` | Authenticated Site Admin only (`read` / `write` / `delete`). No guest access. |

Defined in `amplify/storage/resource.ts` and registered in `amplify/backend.ts`.

## Object key layout

Keys are relative to the `wmwSnapshots` bucket:

| Key | Purpose |
|-----|---------|
| `snapshots/last-good.json` | Last-good Snapshot payload (normalised Workbook tabs after Refresh ingest). |
| `snapshots/last-good.meta.json` | As-of metadata for that Snapshot (`asOf` ISO-8601 timestamp, and any small ingest notes). |

Helpers: `src/lib/wmw/paths.ts`. JSON facade: `src/lib/wmw/snapshot-storage.ts`.

Typed ingest store: `createSnapshotStoreFromJsonStorage` / `createDefaultWmwSnapshotStore` in `src/lib/wmw/snapshot-store.ts` (Refresh persist path). Vitest uses `createMemoryWmwSnapshotStorage` or `createMemoryWmwSnapshotStore` — no live AWS.

## Recommended Amplify Hosting + IAM setup

One recommended production story for WMW Refresh:

1. **Amplify env vars** (non-secret): `WMW_SPREADSHEET_ID`, `WMW_GOOGLE_SA_SECRET_NAME` (default leaf `wmw.google-service-account`).
2. **Amplify Hosting secret** (shared across branches): leaf name `wmw.google-service-account` holding the Google service-account JSON.
3. **Amplify build** runs `scripts/write-amplify-ssr-env.ts`, which writes non-secret fields into `src/lib/wmw/wmw-ssr-config.ts` (bundled into `.next/server`). The SA JSON is **not** written into build artifacts.
4. **SSR Compute IAM role** on the Amplify app can `ssm:GetParameter` (with decrypt) on the shared secret parameter. Attach under Amplify Console → App settings → IAM roles → Compute role. Trust principal: `amplify.amazonaws.com`.

### SSM parameter patterns (placeholders)

Do not hardcode environment-specific app IDs in docs or runbooks. Use:

| Kind | Pattern |
|------|---------|
| **Recommended (shared)** | `/amplify/shared/{appId}/{secretName}` |
| Optional branch fallback | `/amplify/{appId}/{branch}/{secretName}` |

Example with placeholders:

- `/amplify/shared/{appId}/wmw.google-service-account`
- `/amplify/{appId}/{branch}/wmw.google-service-account`

At runtime, Refresh tries the **branch** path first (when `AWS_BRANCH` is set), then the **shared** path. Prefer creating the secret once under the **shared** path so every branch can read it; branch secrets are an optional override only.

`{appId}` comes from Amplify (`AWS_APP_ID` at build). `{secretName}` defaults to `wmw.google-service-account`. `{branch}` is the Hosting branch name (e.g. `main`).

### Env variables

| Variable | Role |
|----------|------|
| `WMW_SPREADSHEET_ID` | Equity Workbook spreadsheet ID (Amplify **env var**, non-secret) |
| `WMW_GOOGLE_SA_SECRET_NAME` | Leaf name of the Hosting secret (default `wmw.google-service-account`) |
| `WMW_GOOGLE_SERVICE_ACCOUNT_JSON` | Server-only raw SA JSON for `next dev` |
| `WMW_GOOGLE_SERVICE_ACCOUNT_FILE` | Server-only path to SA JSON file (e.g. `.secrets/wmw-google-sa.json`) |

Default Amplify secret name (documented in `.env.example`, not a credential): `wmw.google-service-account`.

Refresh pulls Sheets through a **Server Action** (`pullWmwWorkbookTabs`) so the private key never enters the browser.

**Credential resolution (server):**

1. Local: `WMW_GOOGLE_SERVICE_ACCOUNT_JSON` or `WMW_GOOGLE_SERVICE_ACCOUNT_FILE`
2. Production: Amplify Hosting secret via **SSM** using the app’s **SSR Compute IAM role** (branch path, then shared path)

**Spreadsheet ID (server):** written into `src/lib/wmw/wmw-ssr-config.ts` at Amplify build time (bundled into `.next/server`). Amplify WEB_COMPUTE does not receive a build-time `.env.production` for these Server Actions at runtime.

### Local testing (`npm run sandbox` + `npm run dev`)

1. Share the Workbook read-only with the service account email.
2. In `.env.local` set `WMW_SPREADSHEET_ID` and `WMW_GOOGLE_SA_SECRET_NAME=wmw.google-service-account`.
3. Put the SA JSON in `.env.local` as `WMW_GOOGLE_SERVICE_ACCOUNT_JSON=...` **or** on disk and set `WMW_GOOGLE_SERVICE_ACCOUNT_FILE=.secrets/wmw-google-sa.json`.
4. Restart `npm run dev` after changing env.
5. Optionally also `npx ampx sandbox secret set wmw.google-service-account` for Hosting/backend parity — that alone does **not** inject the JSON into Next.js.

### Amplify secret naming

Sandbox CLI and Amplify Hosting secrets both store the leaf name in SSM Parameter Store. Use a name that matches `[a-zA-Z0-9_.-]+` (letters, digits, `_`, `.`, `-` only — no `/`).

| Environment | How to set |
|-------------|------------|
| Local sandbox | `npx ampx sandbox secret set wmw.google-service-account` (backend/SSM; Next.js still needs JSON/FILE above) |
| Amplify Hosting | App → Hosting → Secrets → Manage secrets (prefer **shared** secret with the same leaf name) |

### Site Admin follow-up

Attaching or updating the SSR Compute role in the Amplify console is a one-time Hosting IAM step outside this repo’s Amplify Gen 2 backend definitions. Confirm the role can read the shared SSM parameter (and KMS decrypt if the SecureString uses a customer key) after each Hosting IAM change.

Do not commit spreadsheet IDs or service account JSON.
