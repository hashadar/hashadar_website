# WMW shows Paired Accounts as one Net position by default

[ADR 0010](./0010-wmw-v1-scope.md) puts financed pairs via `Pair_ID` in v1 scope but leaves the display open. Net Worth is computed per Account, so a financed car appeared as two items: a car at £77,000 (about 145% of Net Worth) and a loan at -£47,000. The Net Worth total was already net; only the breakdowns were split.

Decision: the Overview presents Accounts sharing a Pair ID as one **Net position**, with a **Net / Gross** choice. This refines ADR 0010 and does not reverse it. The Workbook stays at four tabs and `Pair_ID` stays the only grouping key.

- **Default is Net.** Gross restores one row per Account and the Class totals of the Category-driven view. The choice is local to the page visit.
- **Contribution is the sum of signed legs** (Balance × Sign) over every Account in the pair, so a second loan or a refinance is netted correctly rather than keeping the last leg. A leg with no Balance that month counts as £0, per the Net Worth rule.
- **Name and Class come from the asset leg.** The net sits in the asset's Class (for example Cars). A Class is therefore a Category sum only on the Gross basis. Liability Classes such as Loans remain for unpaired liabilities.
- **Negative equity** (liabilities above assets) is a negative figure with an explicit label, not hidden or clamped.
- **One detail page and one sidebar entry per position**, keyed on the asset Account. The page shows net equity, then every leg's own detail (Balance history, Mileage, Units, Cashflows including Loan Repayment). Any leg's Account ID opens the same page, and search matches any leg's name or ID.
- **Generic over pair shape.** The same rule serves property plus mortgage; no car-specific logic.
- **Unchanged:** Net Worth total and history, KPI figures, MWR, the Workbook contract, and the stored Snapshot shape (positions are derived at read time from `pairId` and Categories).

Not decided here: ingest warnings for malformed pairs (one leg, two assets, case-mismatched IDs). Positions tolerate them, so that stays a separate hardening change.

## Considered options

- **Net Account in the Workbook** (one Account holding car minus loan): rejected. It loses loan history and the Gross view, needs manual double entry, and contradicts the pair model.
- **Display-only netting of the Account table**: rejected. The Class table and Class mix chart would still show Cars and Loans separately, so the one-asset view would be inconsistent.
- **New Workbook structure for positions**: rejected. It breaks the frozen four-tab contract of [ADR 0009](./0009-wmw-workbook-source-of-record.md) with no benefit over `Pair_ID`.
