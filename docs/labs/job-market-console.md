# Job market lab console

Owner-authenticated surface at `/labs/job-market/console`. Routes use a dedicated layout shell (not the public `SitePage` chrome).

The **public** lab at `/labs/job-market` is the published results surface (app-like pulse layout; themes use PCA projection). See [job-market-lab.md](./job-market-lab.md).

## Layout and appearance

- Full-width authenticated shell with in-console navigation (overview, corpus, Intake, runs, fit, analytics).
- Brand green accents on nav, overview, and console panels so authenticated tooling reads consistently with the lab brand.

## Corpus workspace

- Structured corpus UI: JD table, detail editor, and expandable registry/audit panel under `src/components/sections/labs/console/corpus/`.
- New listings enter via the Intake tab; corpus is for review, metadata, employers, and table health.
- Supporting helpers live in `src/lib/job-market-corpus-table.ts`.

## Compensation disclosure

- Every job description has a `compensationDisclosure` enum: `range` | `competitive` | `unknown`.
- **`range`:** a numeric pay band is stated. Currency is optional free text (`compensationCurrency`); prefer ISO-like codes (e.g. `GBP`, `USD`). Also store `compensationMin`, `compensationMax`, and `compensationPeriod` when known. Do not treat currency as a closed enum in the UI.
- **`competitive`:** one bucket for competitive / DOE / negotiable / attractive package phrasing. Numeric band fields are cleared.
- **`unknown`:** pay was not disclosed (including legacy rows with no disclosure field and no valid numerics).
- Readers resolve unset legacy rows as `range` when both min and max are present, otherwise `unknown`. Prefer writing an explicit disclosure on save or parse.
- Analytics treat `competitive` as disclosed (not missing compensation). Only `unknown` counts as missing / not disclosed.
- Intake may defer disclosure; the corpus detail and metadata editors must set it. Bedrock listing parse maps bands → `range`, competitive phrases → `competitive`, and absent pay → `unknown`.

## Analytics and runs

- **Analytics** is the insights dashboard (coverage summary, pay/prestige metrics, theme labels, pulse filters) and the primary place to start a recompute.
- **Runs** is the audit/history view of analysis runs, with a secondary recompute control for power users.
