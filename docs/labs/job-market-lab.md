# Job market lab (public)

Public results surface at `/labs/job-market`: **Hasha Dar's Job Signal Lab**.

The `/labs` index is a flagship stage for this lab (hero “Labs” word, purpose line, CTA), not a multi-lab catalogue. Live pulse data stays on the lab page.

## Layout

- Uses `SitePage` (site header + footer) so brand stays lightly present.
- The lab section itself is a denser, near-app shell: edge-to-edge pulse within the content width, time filter + freshness in the first viewport, then a secondary **How this is produced** band (numbered pipeline stages with plain-language + under-the-hood copy), not a collapsible note and not a marketing essay stack.
- Owner tooling lives under `/labs/job-market/console` (see [job-market-console.md](./job-market-console.md)).

## What the page shows

- **Technologies** and **requirement themes** from the published snapshot (time-window filter only), each with a short plain-language caption.
- Theme **ranked sizes** plus a **2D theme map**. Map coordinates are PCA of embedding vectors, computed in the analyse worker and published with the snapshot (not raw first-two embedding dimensions).
- Compact seniority / role-family band (secondary to tech and themes).
- Methodology stages (accessible titles): collect listings → tag context → match technologies → fingerprint requirements into themes → lay out map → publish counts/themes/map. Sensitive fields are redacted in publication.
- No pay, prestige, employers, raw JDs, CV fit, runs, or costs.

## Recompute note

Projection improvements ship with the analyse Lambda. Existing published snapshots keep their prior coordinates until the next successful recompute and publish.
