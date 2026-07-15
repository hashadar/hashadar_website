# Job market lab console

Owner-authenticated surface at `/labs/job-market/console`. Routes use a dedicated layout shell (not the public `SitePage` chrome).

## Layout and appearance

- Full-width authenticated shell with in-console navigation (overview, corpus, HITL, runs, fit, analytics).
- Brand green accents on nav, overview, and console panels so authenticated tooling reads consistently with the lab brand.

## Corpus workspace

- Structured corpus UI: JD table, detail editor, ingest toolbar, and employers modal under `src/components/sections/labs/console/corpus/`.
- Supporting helpers live in `src/lib/job-market-corpus-table.ts`.

## Compensation currency

- Currency is an optional free-text field (`compensationCurrency`). Prefer ISO-like codes (e.g. `GBP`, `USD`); do not treat the field as a closed enum in the UI.
