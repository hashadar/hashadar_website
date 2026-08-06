# hashadar.com

Personal site for [Hasha Dar](https://hashadar.com): public marketing pages, Site Admin content management, and gated Labs products.

This is a production system I design, ship, and operate — not a static brochure repo.

## What it demonstrates

- **Public site** — portfolio photography, blog, and page content driven from a data layer + live Site Content storage
- **Site Admin** — authenticated CMS for Posts, portfolio Photos, and the Home Photo (`/admin`)
- **Labs** — separate gated products under `/labs` that reuse site-wide sign-in; currently **Job OS**, a private job-hunting graph (Employer → Opportunity → Application) with fit analysis behind a facade
- **Cloud backend** — AWS Amplify Gen 2 (Cognito auth, Amplify Data, Storage, and Functions such as Bedrock-backed fit analysis)
- **Engineering hygiene** — TypeScript throughout, Vitest, GitHub Actions CI, Amplify Hosting CD, domain language in `CONTEXT.md` / ADRs

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Motion / UI | Framer Motion, site design tokens |
| Backend | AWS Amplify Gen 2 (`amplify/`) |
| CI | GitHub Actions — lint, typecheck, tests on PRs; `next build` on `main` |
| CD | Amplify Hosting autobuild (`amplify.yml`) only |

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Public marketing pages run without `amplify_outputs.json`. For a live backend:

```bash
npm run sandbox
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Docs

- [CI and deployment](docs/CI-AND-DEPLOYMENT.md)
- [Codebase conventions](docs/CODEBASE-CONVENTIONS.md)
- Site domain language: `docs/site/CONTEXT.md`
- Job OS domain language: `CONTEXT.md` + `docs/adr/`
