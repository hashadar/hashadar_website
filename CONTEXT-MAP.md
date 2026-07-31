# Context Map

## Contexts

- [Job OS](./CONTEXT.md) — private job-hunting operating system (Employer → Opportunity → Application)
- [Site](./docs/site/CONTEXT.md) — public site content, Admin, and site-wide sign-in

## Relationships

- **Site → Job OS**: One **Site Admin** identity (Cognito) signs in via Site; Job OS and future Labs consume that session. Labs do not own auth or Admin.
- **Site ↛ Job OS content**: Blog, portfolio, and Admin content storage are Site-owned. Job OS Bodies stay in the Job OS content store.
- **Job OS → Site**: Job OS does not publish to the public blog/portfolio.
