# WMW shows Paired Accounts as one net position by default

[ADR 0010](./0010-wmw-v1-scope.md) models a financed asset as an Asset Account plus a Liability Account sharing a Pair ID. This ADR refines that decision, it does not reverse it: Pair ID stays the only link, and nothing about the Workbook changes. What changes is presentation. Showing the two Accounts separately split one financed asset across By Account, By Class, the Class mix chart, `% NW`, MoM, the sidebar and two detail pages, and inflated gross shares (an asset can exceed 100% of Net Worth).

Paired Accounts are therefore presented as one **net position** by default, with a **Gross** view that keeps every Account separate. The rule is generic: car plus car loan, and property plus mortgage, behave identically.

- **Grouping is derived, in the core calculation.** One position per non-empty Pair ID, one per unpaired Account. No new Workbook tab, column or Snapshot field, and no stored third Account.
- **Contribution is the sum of the legs' Balance × Sign.** This handles any number of legs (for example a refinance with two liabilities) and Signs other than exactly ±1. A leg with no Balance in the month contributes £0 (no carry-forward), as for any Account.
- **Class and name come from the asset leg.** The net figure sits in the asset's Class (for example Cars), so a financed asset no longer produces a Loans row. Unpaired liabilities still appear under their own Class.
- **Net Worth, KPIs, MWR and the Workbook contract are unchanged.** Net and Gross differ only in how the same total is broken down.
- **Negative equity is shown as a negative figure with a label**, not an error.
- **Detail is combined.** The position has one sidebar entry and one detail page keyed on the asset Account, showing the net position and every leg's Balance, Units, Mileage, Cashflows and metadata. A leg's own Account ID resolves to the same page, so existing links do not break.
- **The Net/Gross choice is per-visit state**, defaulting to Net. It is not persisted in the URL or storage.

Rejected: a manually netted Account in the Workbook (loses the leg detail and double-handles data), a new Workbook tab or columns (breaks the frozen contract), and ingest-time netting (hides Gross and couples storage to presentation). Validation of malformed pairs (one leg, two assets, two liabilities) is a separate follow-up.
