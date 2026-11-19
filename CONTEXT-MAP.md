# Context Map

## Contexts

- [Job OS](./CONTEXT.md) — private job-hunting operating system (Employer → Opportunity → Application)
- [Site](./docs/site/CONTEXT.md) — public site content, Admin, and site-wide sign-in
- [WMW](./docs/wmw/CONTEXT.md) — private net-worth lab (What’s My Worth): Accounts, Balances, Cashflows, MWR
- [Court Board](./docs/court-board/CONTEXT.md) — public club-session signup lab: Sessions, Seats, Order, Release, Penalties (no Sign-in, self-declared Tier; see ADR 0013)
- [CFA](./docs/cfa/CONTEXT.md) — private CFA Level I practice bank: Question, Capture, Extraction, Attempt, Set, Mistakes deck (content only in private storage; see ADR 0014)

## Relationships

- **Site → Job OS**: One **Site Admin** identity (Cognito) signs in via Site; Job OS and future Labs consume that session. Labs do not own auth or Admin.
- **Site → WMW**: Same Site Admin session; WMW is a Lab under `/labs/wmw` and does not own auth or Admin.
- **Site ↛ Job OS content**: Blog, portfolio, and Admin content storage are Site-owned. Job OS Bodies stay in the Job OS content store.
- **WMW → Workbook**: The Site Admin’s equity Workbook is the system of record; WMW holds read-only Snapshots for display and MWR.
- **Job OS → Site**: Job OS does not publish to the public blog/portfolio.
- **WMW ↛ Site Content**: WMW does not publish to the public blog/portfolio.
- **Job OS ↛ WMW**: No shared domain; both only share Site Admin identity.
- **Site → Court Board**: Site Admin may create a Club; Players and Organisers use capability links, not Sign-in. Court Board is the only Lab with public writes.
- **Court Board ↛ Job OS / WMW / Site Content**: No shared domain or data.
- **Site → CFA**: Same Site Admin session; CFA is a Lab under `/labs/cfa` and does not own auth or Admin.
- **CFA ↛ Site Content / repo**: Question content and screenshots never become Site Content or repo data; only syllabus names, exam weights and copy live in `src/data/pages/cfa.json` (ADR 0014).
- **CFA ↛ Job OS / WMW / Court Board**: No shared domain or data. CFA reuses Job OS's Bedrock IAM grant, not its models.
