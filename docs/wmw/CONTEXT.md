# WMW (What's My Worth)

Private personal net-worth lab for the **Site Admin** (see [Site context](../site/CONTEXT.md)). Tracks Accounts over time, explains Net Worth, and computes Money-Weighted Return on investable Accounts. The authenticated product is planned at `/labs/wmw`. Sign-in is site-wide — WMW does not own auth or Admin. Day-to-day data entry lives in the Site Admin’s equity Workbook; the lab is read-only.

## Language

### Product

**WMW**:
The Lab “What’s My Worth” — a gated net-worth and return dashboard under `/labs/wmw` (Overview) with Account detail at `/labs/wmw/accounts/[accountId]`.
_Avoid_: Equity Tracker (workbook nickname only), Wealth Lab, personal finance app (as budgeting), Finance Lab, multi-workspace shell like Job OS for v1

**Workbook**:
The Site Admin’s spreadsheet that remains the system of record for Accounts, Categories, Balances, and Cashflows. The lab reads from it; it does not replace editing there. v1 binds to four tabs — `dim_Accounts` (including `Pair_ID`), `dim_Categories`, `fact_Balances`, `fact_Cashflows` — with the agreed column sets; Currency is present but values are GBP-only. Sheet cells may use date/currency formatting for editing; the lab’s API pull uses unformatted values (numeric money and date serials).
_Avoid_: CMS, lab editor, dual source of truth, ad-hoc extra tabs as part of the v1 contract, depending on formatted £/date strings from the API

**Snapshot**:
A point-in-time copy of Workbook data held in private lab storage for the lab to display, with a known as-of time. Used so the dashboard can show last-good data without editing the Workbook and without depending on a live Google call every view.
_Avoid_: backup, export (as the product noun), live-only read with no retained copy, Site Content (public) as the Snapshot home

### Portfolio structure

**Account**:
A named store of value or obligation (e.g. ISA, SIPP, savings, crypto wallet, vehicle, loan), identified stably and classified by a Category. The grain at which Money-Weighted Return is computed when the Account is investable. v1 values are GBP only.
_Avoid_: portfolio (unqualified), holding, pot, wallet (as the model name), multi-currency Net Worth (v1)

**Category**:
Classification of an Account: whether it is an Asset or Liability, its Class for grouping, and a Sign used when rolling Balances into Net Worth.
_Avoid_: tag, type alone (Type is only one field of Category), account group (vague)

**Class**:
Human grouping within Categories (e.g. Cash & Savings, Retirement, Cryptocurrency, Cars). Used for Net Worth breakdowns, not as the MWR grain.
_Avoid_: Category (the parent concept), asset class as a synonym without the Category record

**Sign**:
The multiplier applied to an Account’s Balance when contributing to Net Worth (+1 for assets, −1 for liabilities).
_Avoid_: weight, direction (vague)

### Facts

**Balance**:
A dated observation of an Account’s value in currency, with optional **Units** (e.g. crypto quantity) and **Mileage** (vehicle). Currency Balance drives Net Worth and MWR; Units and Mileage are first-class history on Account detail (quantity/mileage trends and sanity checks), not inputs to MWR.
_Avoid_: valuation (synonym only), position (vague), transaction, treating Units as the MWR basis

**Cashflow**:
A dated external money movement on an Account, used as an input to Money-Weighted Return — not a day-to-day spending ledger. v1 `Transaction_Type` values are only **Contribution**, **Withdrawal**, and **Loan Repayment**; subtypes (personal, employer, tax relief) stay in Description. Cash & Savings Accounts do not carry Cashflows; funding an Investable Account from cash is recorded only on the investable leg. Transfer is not a v1 Cashflow type. Unknown Types are excluded from MWR.
_Avoid_: transaction (unqualified), expense, budget line, Transfer as a v1 type, Cashflows on CAT_CASH, open-ended Type vocabulary in v1

**Net Worth**:
The sum across Accounts of Balance × Category Sign for a **calendar month**. Each Account contributes its latest Balance dated in that month; if it has no Balance that month, it contributes **£0** (no carry-forward — missing means stopped tracking or exited). The headline figure is the latest month that has any Balances. A final £0 Balance on exit is preferred so closure is explicit.
_Avoid_: equity (unqualified), wealth (vague), portfolio value (investable-only), carrying forward last known Balance, mixing different months into one total without a month grain

### Return

**Money-Weighted Return (MWR)**:
The return measure for an Investable Account that treats the timing and size of Cashflows as under the Site Admin’s control (IRR-style). Reported **annualised** for calendar periods **YTD**, **1Y**, and **Max** (first Balance → latest Balance on that Account). For each period, opening Balance is the last Balance on or before period start; if none exists, MWR is unavailable for that period. Cashflows dated before that Account’s first Balance are excluded — the lab does not invent a zero opening. Workbook Amounts are account-perspective (into Account positive, out negative); the lab converts to investor IRR. If an Account has no usable Cashflows in the period, MWR is unavailable — Balances alone do not invent return (e.g. legacy crypto with no Cashflow history).
_Avoid_: TWR, simple gain as the headline return, ROI (unqualified), performance (vague), synthesising a £0 open, interpolating Balances, requiring an exact period-start Balance, inventing MWR from Balance series only, showing non-annualised IRR as the headline

**Investable Account**:
An Account for which MWR is meaningful. Membership is by Category allow-list (today: brokerage, pension, crypto) — not by Asset Type alone. Cash & Savings, vehicle, and loan (and future mortgage) Categories are outside the list; those Accounts still contribute to Net Worth. Cash is a store of value, not an investment Class.
_Avoid_: every Account has a return, performance Account, treating cash as investable, inferring investable from Type=Asset


### Financed assets

**Paired Accounts**:
How a financed asset is modelled: one Asset Account plus one Liability Account sharing a **Pair ID** (e.g. car + car loan; later property + mortgage). Net equity in that asset is implied by the pair, not stored as a third Account. Unpaired Accounts leave Pair ID empty.
_Avoid_: FinancedAsset as a v1 noun, single combined position, liability-only when the asset is also tracked, inferring pairs from Category alone

**Pair ID**:
Stable Workbook key on an Account that links it to its counterpart in a financed pair (e.g. `PAIR_TAYCAN`). Same value on both legs; empty means unpaired.
_Avoid_: Finances_Account_ID as the v1 link, pair-by-name convention
