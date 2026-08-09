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
| `snapshots/last-good.json` | Last-good Snapshot payload (normalised Workbook tabs; ingest shape lands in #183). |
| `snapshots/last-good.meta.json` | As-of metadata for that Snapshot (`asOf` ISO-8601 timestamp, and any small ingest notes). |

Helpers: `src/lib/wmw/paths.ts`. JSON facade: `src/lib/wmw/snapshot-storage.ts`.

Typed ingest store: `createSnapshotStoreFromJsonStorage` / `createDefaultWmwSnapshotStore` in `src/lib/wmw/snapshot-store.ts` (Refresh persist path for #183). Vitest uses `createMemoryWmwSnapshotStorage` or `createMemoryWmwSnapshotStore` — no live AWS.

## App config / secrets

Env wiring ([#181](https://github.com/hashadar/hashadar_website/issues/181)):

| Variable | Role |
|----------|------|
| `WMW_SPREADSHEET_ID` | Equity Workbook spreadsheet ID |
| `WMW_GOOGLE_SA_SECRET_NAME` | Name of the Amplify secret that holds the Google service account JSON |
| `WMW_GOOGLE_SERVICE_ACCOUNT_JSON` | Server-only raw SA JSON (preferred for `next dev`) |
| `WMW_GOOGLE_SERVICE_ACCOUNT_FILE` | Server-only path to SA JSON file (e.g. `.secrets/wmw-google-sa.json`) |

Default Amplify secret name (documented in `.env.example`, not a credential): `wmw.google-service-account`.

Refresh pulls Sheets through a **Server Action** (`pullWmwWorkbookTabs`) so the private key never enters the browser. Credential resolution order: inline JSON → file path → Amplify Hosting `process.env.secrets[name]`.

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
| Amplify Hosting | App → Hosting → Secrets → Manage secrets (same leaf name); expose via `process.env.secrets` for SSR |

### Amplify Hosting SSR wiring

Amplify loads console env vars and Hosting secrets into the **build** environment (you should see `Setting Up SSM Secrets` in BUILD logs). Next.js Server Actions do **not** see those by default — Amplify only forwards vars written to `.env.production` before `next build`.

`amplify.yml` runs `npx tsx scripts/write-amplify-ssr-env.ts`, which appends:

- `WMW_SPREADSHEET_ID`
- `WMW_GOOGLE_SA_SECRET_NAME`
- `secrets` (the Amplify Hosting secrets JSON map)

without logging values. Redeploy after changing Hosting secrets or env vars.

**Shared vs branch secrets:** Amplify’s build loader only reads SSM under `/amplify/{appId}/{branch}/`. Secrets created for all branches live under `/amplify/shared/{appId}/` and often yield an empty `process.env.secrets` (`{}`). The write script then seeds `wmw.google-service-account` from shared (or branch) SSM via `aws ssm get-parameter` so Refresh can resolve the Google SA. BUILD should log `seeded wmw.google-service-account from SSM /amplify/shared/...` when that path runs.

Do not commit spreadsheet IDs or service account JSON.
