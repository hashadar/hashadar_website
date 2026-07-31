# CI and deployment

## Where things run

| Concern | Where | Notes |
|---------|--------|--------|
| **PR and push checks** | [GitHub Actions](https://docs.github.com/en/actions) | Workflow: `.github/workflows/ci.yml` — `npm ci`, production `npm audit` (critical), lint, typecheck, tests, `next build`. **Does not deploy.** Does not require live AWS or `amplify_outputs.json`. |
| **Production build and deploy** | **AWS Amplify** autobuild | On push to connected branches: runs `amplify.yml` (Gen 2 `ampx pipeline-deploy`, blog clone, `sync-blogs`, reuse or `npm ci`, `npm run build`), publishes `.next`. **This is the only CD path** unless the team explicitly changes strategy. |

There is **no accidental double-deploy** from GitHub Actions: Actions do not push artefacts or run Amplify CLI deploy in the baseline setup.

## Amplify Gen 2 backend

Backend definitions live in `amplify/` (owner Cognito auth plus a minimal data placeholder until Job OS models land). Hosting deploys them via `npx ampx pipeline-deploy` in the `backend` phase of `amplify.yml`, then runs the existing frontend `preBuild` (blog sync) and `build`.

Job Signal Lab v2 (pulse corpus, HITL, recompute/analyse/publication Lambdas, and lab storage) has been removed from the deploy surface. Job OS hunting-graph models and Body storage are added in follow-up issues.

| Environment | Outputs file |
|-------------|----------------|
| **GitHub Actions / marketing-only local** | `amplify_outputs.json` is absent (gitignored). `readAmplifyOutputs()` returns null; `configureSiteAmplify` no-ops so public pages stay up. |
| **Local sandbox** | `npm run sandbox` (`npx ampx sandbox`) writes `amplify_outputs.json` at the repo root. |
| **Amplify Hosting** | `pipeline-deploy` generates outputs for the frontend build. |

Contract tests in `amplify.yml.test.ts` lock blog-sync steps and Gen 2 `pipeline-deploy` into CI.

## Node.js versions

| Place | How it is set |
|--------|----------------|
| **Local / CI** | Repository root **`.nvmrc`** (`22`). GitHub Actions uses `actions/setup-node` with `node-version-file: '.nvmrc'`. |
| **`package.json`** | `"engines": { "node": ">=22" }` — run `npm ci` on Node 22 or newer. |
| **Amplify** | **`amplify.yml`** runs **`nvm use 22`** at the start of backend `build` and frontend `preBuild` so `ampx pipeline-deploy`, `node scripts/sync-blogs.js`, install, and `npm run build` all use Node 22. |

### Amplify install and cache

- Backend `npm ci` installs the lockfile (needed for `ampx pipeline-deploy`).
- Frontend reuses that `node_modules` when the backend phase left it in place; otherwise it runs `npm ci` (frontend-only rebuilds).
- Cache paths: `.npm/**/*` (npm download cache), `node_modules/**/*`, and `temp-blog-repo/**/*`.

**Check in the AWS Amplify console**

1. **Build image:** Prefer **Amazon Linux 2023** (AL2023). AL2 does not ship modern Node by default; migrate to AL2023 or a custom image per [AWS guidance](https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-general.html).
2. **Live package updates:** If you set Node there, remember that **`nvm use` in `amplify.yml` overrides** live package updates for the shell that runs your commands.

If `nvm use 22` fails on the build image (version not installed), add a line before it: `nvm install 22` (then keep `nvm use 22`).

## Dependency updates

- **Dependabot**: `.github/dependabot.yml` opens weekly npm PRs (grouped production patches and Amplify-related packages) and monthly GitHub Actions PRs.
- **CI audit gate**: `npm audit --omit=dev --audit-level=critical` fails the quality job on production criticals.
- Photos stay on `images.unoptimized: true` without a direct `sharp` dependency until an image CDN / optimisation pipeline is added.

## Amplify environment variables (names only)

These are configured in the Amplify console, not committed:

| Variable | Role |
|----------|------|
| `SSH_PRIVATE_KEY` | SSH key (base64) for cloning the private blog repository |
| `BLOG_REPO_URL` | Git URL of the blog content repository |
| `BLOG_REPO_BRANCH` | Optional branch to check out when cloning the blog repo |

## CI vs blog content

GitHub Actions **does not** clone the private blog repo. `getAllBlogPosts()` returns an empty list when `public/blog` is missing, so `next build` in CI can succeed **without** validating real blog markdown.

| Environment | Blog validation |
|-------------|-----------------|
| **GitHub Actions** | Build passes with an empty blog directory; `processMarkdown` is tested in isolation via Vitest. |
| **Amplify** | Clones the private blog repo (secrets above), runs `sync-blogs`, then builds with real posts. |
| **Local** | Run `node scripts/sync-blogs.js` when you need real posts; otherwise the site builds without them. |

Blog correctness in production therefore depends on the **Amplify** build plus manual checks. In-repo fixture tests for the full read-and-normalise path are tracked in [#16](https://github.com/hashadar/hashadar_website/issues/16).

## Branch protection (repository owner)

After CI is merged and green on `main`:

1. GitHub → **Settings** → **Rules** (rulesets) or **Branches** → branch protection for `main`.
2. Require the **CI** workflow (job `quality` / check name as shown on PRs) to pass before merge.

AI agents cannot apply this in the UI; use the checklist above.

## Related

- `amplify.yml` — Amplify build phases
- `.github/workflows/ci.yml` — GitHub Actions quality checks
- `.github/dependabot.yml` — weekly npm / monthly Actions update PRs
- [#16](https://github.com/hashadar/hashadar_website/issues/16) — deepen blog reader and CI fixture coverage
- [#113](https://github.com/hashadar/hashadar_website/issues/113) — re-enable Next image optimisation with sharp
- [#114](https://github.com/hashadar/hashadar_website/issues/114) — major dependency upgrades (date-fns / Vitest / KaTeX / ESLint)
- [#115](https://github.com/hashadar/hashadar_website/issues/115) — Amplify OpenTelemetry override cleanup
