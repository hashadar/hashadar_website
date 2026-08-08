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

Env wiring (placeholders OK until [#181](https://github.com/hashadar/hashadar_website/issues/181)):

| Variable | Role |
|----------|------|
| `WMW_SPREADSHEET_ID` | Equity Workbook spreadsheet ID |
| `WMW_GOOGLE_SA_SECRET_NAME` | Name of the host/Amplify secret that holds the Google service account JSON |

See `.env.example`. Do not commit spreadsheet secrets or service account JSON.
