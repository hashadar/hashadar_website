# CI and deployment

## Where things run

| Concern | Where | Notes |
|---------|--------|--------|
| **PR and push checks** | [GitHub Actions](https://docs.github.com/en/actions) | Workflow: `.github/workflows/ci.yml` — `npm ci`, production `npm audit` (critical), lint, typecheck, tests, `next build`. **Does not deploy.** Does not require live AWS or `amplify_outputs.json`. |
| **Production build and deploy** | **AWS Amplify** autobuild | On push to connected branches: runs `amplify.yml` (Gen 2 `ampx pipeline-deploy`, reuse or `npm ci`, `npm run build`), publishes `.next`. **This is the only CD path** unless the team explicitly changes strategy. |

There is **no accidental double-deploy** from GitHub Actions: Actions do not push artefacts or run Amplify CLI deploy in the baseline setup.

## Amplify Gen 2 backend

Backend definitions live in `amplify/` (Cognito Site Admin auth, Job OS data/storage, and **Site Content** storage for Posts/Photos). Hosting deploys them via `npx ampx pipeline-deploy` in the `backend` phase of `amplify.yml`, then runs the frontend `preBuild` and `build`.

| Environment | Outputs file |
|-------------|----------------|
| **GitHub Actions / marketing-only local** | `amplify_outputs.json` is absent (gitignored). `readAmplifyOutputs()` returns null; `configureSiteAmplify` no-ops so public pages stay up (empty Site Content lists). |
| **Local sandbox** | `npm run sandbox` (`npx ampx sandbox`) writes `amplify_outputs.json` at the repo root. |
| **Amplify Hosting** | `pipeline-deploy` generates outputs for the frontend build. |

Contract tests in `amplify.yml.test.ts` lock Gen 2 `pipeline-deploy` into CI and assert the retired blog-repo sync is absent.

## Node.js versions

| Place | How it is set |
|--------|----------------|
| **Local / CI** | Repository root **`.nvmrc`** (`22`). GitHub Actions uses `actions/setup-node` with `node-version-file: '.nvmrc'`. |
| **`package.json`** | `"engines": { "node": ">=22" }` — run `npm ci` on Node 22 or newer. |
| **Amplify** | **`amplify.yml`** runs **`nvm use 22`** at the start of backend `build` and frontend `preBuild` so `ampx pipeline-deploy`, install, and `npm run build` all use Node 22. |

### Amplify install and cache

- Backend `npm ci` installs the lockfile (needed for `ampx pipeline-deploy`).
- Frontend reuses that `node_modules` when the backend phase left it in place; otherwise it runs `npm ci` (frontend-only rebuilds).
- Cache paths: `.npm/**/*` (npm download cache), `node_modules/**/*`.

**Check in the AWS Amplify console**

1. **Build image:** Prefer **Amazon Linux 2023** (AL2023). AL2 does not ship modern Node by default; migrate to AL2023 or a custom image per [AWS guidance](https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-general.html).
2. **Live package updates:** If you set Node there, remember that **`nvm use` in `amplify.yml` overrides** live package updates for the shell that runs your commands.

If `nvm use 22` fails on the build image (version not installed), add a line before it: `nvm install 22` (then keep `nvm use 22`).

## Dependency updates

- **Dependabot**: `.github/dependabot.yml` opens weekly npm PRs (grouped production patches and Amplify-related packages) and monthly GitHub Actions PRs.
- **CI audit gate**: `npm audit --omit=dev --audit-level=critical` fails the quality job on production criticals.
- Photos stay on `images.unoptimized: true` without a direct `sharp` dependency until an image CDN / optimisation pipeline is added.

## Amplify environment variables

Site Content no longer requires private blog-repo SSH secrets. Remove obsolete `SSH_PRIVATE_KEY` / `BLOG_REPO_*` console variables when convenient.

## CI vs Site Content

GitHub Actions builds without `amplify_outputs.json`. Public blog/portfolio readers return **empty** lists; Vitest covers markdown processing and fixtures. Production Posts/Photos are uploaded via **Admin** after deploy.

## Branch protection (repository owner)

After CI is merged and green on `main`:

1. GitHub → **Settings** → **Rules** (rulesets) or **Branches** → branch protection for `main`.
2. Require the **CI** workflow (job `quality` / check name as shown on PRs) to pass before merge.

AI agents cannot apply this in the UI; use the checklist above.

## Related

- `amplify.yml` — Amplify build phases
- `.github/workflows/ci.yml` — GitHub Actions quality checks
- `.github/dependabot.yml` — weekly npm / monthly Actions update PRs
- [docs/adr/0003-site-content-and-admin.md](./adr/0003-site-content-and-admin.md) — Site Content + Admin vs Labs
- [#113](https://github.com/hashadar/hashadar_website/issues/113) — re-enable Next image optimisation with sharp
