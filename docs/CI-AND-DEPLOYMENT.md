# CI and deployment

## Where things run

| Concern | Where | Notes |
|---------|--------|--------|
| **PR checks** | [GitHub Actions](https://docs.github.com/en/actions) | Workflow: `.github/workflows/ci.yml` — `npm ci`, production `npm audit` (critical), lint, typecheck, tests. **No `next build` on PRs** (except see main push below). Does not deploy. Does not require live AWS or `amplify_outputs.json`. This is the required merge gate. |
| **Push to `main`** | GitHub Actions | Same quality suite **plus** `next build` as a cheap post-ship safety net. Still does not deploy. |
| **Production build and deploy** | **AWS Amplify** autobuild | On push to connected branches: runs `amplify.yml` (conditional Gen 2 `ampx pipeline-deploy` or `ampx generate outputs`, reuse or `npm ci`, `npm run build`), publishes `.next`. **This is the only CD path** unless the team explicitly changes strategy. Prefer **`main` only** for Amplify autobuild. |

There is **no** Actions CI on push to `develop` — that would duplicate the PR `quality` run after every squash-merge.

### Actions concurrency and path filters

- **Concurrency:** new pushes to the same PR/ref cancel in-progress CI runs (`cancel-in-progress: true`).
- **Required check:** `quality` is required by branch rulesets. The workflow therefore runs on **every** `pull_request` (no `paths-ignore` on that event) so the check is never left pending. Optional `workflow_dispatch` can re-run CI on a branch.

## Amplify Gen 2 backend

Backend definitions live in `amplify/` (Cognito Site Admin auth, Job OS data/storage, and **Site Content** storage for Posts/Photos). Hosting deploys them via `npx ampx pipeline-deploy` in the `backend` phase of `amplify.yml` **when the backend changed**, then runs the frontend `preBuild` and `build`.

### Conditional backend deploy

`scripts/amplify-backend-changed.ts` compares the current commit to its parent (deepening Amplify’s shallow clone when needed). A backend redeploy runs when:

- anything under `amplify/` changed, or
- root `package.json` / `package-lock.json` changed for Amplify/CDK-related deps (`@aws-amplify/*`, `aws-amplify`, `aws-cdk`, `aws-cdk-lib`, `constructs`, `@aws-sdk/*`).

When those are unchanged, Amplify skips `pipeline-deploy` and runs `npx ampx generate outputs --branch $AWS_BRANCH --app-id $AWS_APP_ID` so the frontend still gets a valid `amplify_outputs.json`.

| Environment | Outputs file |
|-------------|----------------|
| **GitHub Actions / marketing-only local** | `amplify_outputs.json` is absent (gitignored). `readAmplifyOutputs()` returns null; `configureSiteAmplify` no-ops so public pages stay up (empty Site Content lists). |
| **Local sandbox** | `npm run sandbox` (`npx ampx sandbox`) writes `amplify_outputs.json` at the repo root. |
| **Amplify Hosting (backend changed)** | `pipeline-deploy` generates outputs for the frontend build. |
| **Amplify Hosting (frontend-only)** | `ampx generate outputs` writes outputs without redeploying CloudFormation. |

Contract tests in `amplify.yml.test.ts` lock the gated Gen 2 deploy / generate-outputs paths into CI and assert the retired blog-repo sync is absent.

## Node.js versions

| Place | How it is set |
|--------|----------------|
| **Local / CI** | Repository root **`.nvmrc`** (`22`). GitHub Actions uses `actions/setup-node` with `node-version-file: '.nvmrc'`. |
| **`package.json`** | `"engines": { "node": ">=22" }` — run `npm ci` on Node 22 or newer. |
| **Amplify** | **`amplify.yml`** runs **`nvm use 22`** at the start of backend `build` and frontend `preBuild` so `ampx`, install, and `npm run build` all use Node 22. |

### Amplify install and cache

- Backend `npm ci` installs the lockfile (needed for `ampx pipeline-deploy` / `generate outputs`).
- Frontend reuses that `node_modules` when the backend phase left it in place; otherwise it runs `npm ci` (frontend-only rebuilds).
- Cache paths: `.npm/**/*` (npm download cache), `node_modules/**/*`, `.next/cache/**/*` (Next.js build cache). Stay on the **Standard** Amplify build instance.

**Check in the AWS Amplify console**

1. **Build image:** Prefer **Amazon Linux 2023** (AL2023). AL2 does not ship modern Node by default; migrate to AL2023 or a custom image per [AWS guidance](https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-general.html).
2. **Live package updates:** If you set Node there, remember that **`nvm use` in `amplify.yml` overrides** live package updates for the shell that runs your commands.
3. **Autobuild branches:** Prefer connecting **`main` only** so Dependabot/feature branches do not burn Amplify build minutes. Disable PR/branch preview builds unless deliberately kept.
4. **`AMPLIFY_DIFF_DEPLOY`:** optional after the in-repo backend gate lands; do not enable blindly if it conflicts with Gen 2 outputs generation.

If `nvm use 22` fails on the build image (version not installed), add a line before it: `nvm install 22` (then keep `nvm use 22`).

## Branching

- Day-to-day integration branch: **`develop`**. Production: **`main`**.
- Squash-only merges; hotfixes branch from `main`. Details: [BRANCHING.md](./BRANCHING.md).
- After every push to `main`, `.github/workflows/sync-develop.yml` resets or rebases `develop` onto `main` (force-with-lease).

## Dependency updates

- **Dependabot**: `.github/dependabot.yml` opens weekly npm PRs (grouped production patches and Amplify-related packages) and monthly GitHub Actions PRs, targeting **`develop`**.
- **CI audit gate**: `npm audit --omit=dev --audit-level=critical` fails the quality job on production criticals.
- Photos stay on `images.unoptimized: true` without a direct `sharp` dependency until an image CDN / optimisation pipeline is added.
- **Amplify OpenTelemetry `npm ls` warnings:** Nested `@aws-amplify/data-construct` / `graphql-api-construct` trees still report `invalid` peer ranges for `@opentelemetry/core` (mixed `2.0.0` / `2.8.0` / `2.9.0`). Root `overrides` did not unify that tree and were removed; install, typecheck, and `ampx` still succeed. Treat remaining `npm ls` noise as an upstream Amplify limitation until those packages align their OTEL peers.

## Amplify environment variables

Site Content no longer requires private blog-repo SSH secrets. Remove obsolete `SSH_PRIVATE_KEY` / `BLOG_REPO_*` console variables when convenient.

WMW (What's My Worth) expects `WMW_SPREADSHEET_ID` and `WMW_GOOGLE_SA_SECRET_NAME` (secret name only — not the service account JSON). Placeholders live in `.env.example`; real values are set in [#181](https://github.com/hashadar/hashadar_website/issues/181). See [docs/wmw/snapshot-storage.md](./wmw/snapshot-storage.md).

## CI vs Site Content

GitHub Actions builds without `amplify_outputs.json`. Public blog/portfolio readers return **empty** lists; Vitest covers markdown processing and fixtures. Production Posts/Photos are uploaded via **Admin** after deploy.

## Branch protection (repository owner)

Canonical settings live in [BRANCHING.md](./BRANCHING.md) (squash-only, **do not** enable delete-head-on-merge, slim rulesets for `main` / `develop`).

Minimum for CI:

1. Protect `main`: require PR + check name **`quality`**.
2. Protect `develop`: block deletion and force-push (admin bypass OK for sync).
3. Actions workflow permissions: **Read and write** so `sync-develop` can push.

## Related

- [BRANCHING.md](./BRANCHING.md) — `develop` / `main`, hotfixes, sync
- `amplify.yml` — Amplify build phases
- `scripts/amplify-backend-changed.ts` — backend redeploy gate
- `.github/workflows/ci.yml` — GitHub Actions quality checks
- `.github/workflows/sync-develop.yml` — align `develop` after `main` updates
- `.github/dependabot.yml` — weekly npm / monthly Actions update PRs → `develop`
- [docs/adr/0003-site-content-and-admin.md](./adr/0003-site-content-and-admin.md) — Site Content + Admin vs Labs
- [#113](https://github.com/hashadar/hashadar_website/issues/113) — re-enable Next image optimisation with sharp
- [#136](https://github.com/hashadar/hashadar_website/issues/136) — CI/CD speed and Amplify cost (**shipped** via PRs [#138](https://github.com/hashadar/hashadar_website/pull/138)/[#139](https://github.com/hashadar/hashadar_website/pull/139); remaining Amplify console checklist above is still human-owned)
