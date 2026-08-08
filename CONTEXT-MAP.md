# Context Map

## Contexts

- [Job OS](./CONTEXT.md) — private job-hunting operating system (Employer → Opportunity → Application)
- [Site](./docs/site/CONTEXT.md) — public site content, Admin, and site-wide sign-in
- [WMW](./docs/wmw/CONTEXT.md) — private net-worth lab (What’s My Worth): Accounts, Balances, Cashflows, MWR

## Relationships

- **Site → Job OS**: One **Site Admin** identity (Cognito) signs in via Site; Job OS and future Labs consume that session. Labs do not own auth or Admin.
- **Site → WMW**: Same Site Admin session; WMW is a Lab under `/labs/wmw` and does not own auth or Admin.
- **Site ↛ Job OS content**: Blog, portfolio, and Admin content storage are Site-owned. Job OS Bodies stay in the Job OS content store.
- **WMW → Workbook**: The Site Admin’s equity Workbook is the system of record; WMW holds read-only Snapshots for display and MWR.
- **Job OS → Site**: Job OS does not publish to the public blog/portfolio.
- **WMW ↛ Site Content**: WMW does not publish to the public blog/portfolio.
- **Job OS ↛ WMW**: No shared domain; both only share Site Admin identity.
