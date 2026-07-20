# CI and deployment

## Where things run

| Concern | Where | Notes |
|---------|--------|--------|
| **PR and push checks** | [GitHub Actions](https://docs.github.com/en/actions) | Workflow: `.github/workflows/ci.yml` — `npm ci`, lint, typecheck, tests, `next build`. **Does not deploy.** Does not require live AWS or `amplify_outputs.json`. |
| **Production build and deploy** | **AWS Amplify** autobuild | On push to connected branches: runs `amplify.yml` (Gen 2 `ampx pipeline-deploy`, blog clone, `sync-blogs`, `npm ci`, `npm run build`), publishes `.next`. **This is the only CD path** unless the team explicitly changes strategy. |

There is **no accidental double-deploy** from GitHub Actions: Actions do not push artefacts or run Amplify CLI deploy in the baseline setup.

## Amplify Gen 2 backend

Backend definitions live in `amplify/` (auth, data, storage, and the job-market ingest function for the lab). Hosting deploys them via `npx ampx pipeline-deploy` in the `backend` phase of `amplify.yml`, then runs the existing frontend `preBuild` (blog sync) and `build`.

Script-first JD ingest: with sandbox/Hosting outputs present, `npm run ingest:jd -- path/to/file.md` uploads markdown to the `raw/` prefix; the ingest Lambda upserts `JobDescription` metadata and does not start recompute.

Owner recompute (Cognito email/password, self-sign-up disabled via `allowAdminCreateUserOnly`): authenticated `startJobMarketRecompute` creates a single-flight `AnalysisRun` (refuses above 150 active docs), then asynchronously invokes the analyse worker. The worker reads active markdown from S3, uses Bedrock embeddings with a `embeddings/{contentHash}.json` cache, writes `CorpusSnapshot` + run metrics, and updates `LabPublication` only on success. Guests read aggregates only via `getPublishedJobMarketSnapshot`.

Owner career-page parse (Intake console): authenticated `parseJobListingFromUrl` fetches the listing (fail-fast before Bedrock), extracts structured JD markdown via Bedrock Converse (`BEDROCK_PARSE_MODEL_ID`, default `qwen.qwen3-32b-v1:0` — in-region in `eu-west-2`; override after enabling model access), and enqueues a pending `ScrapeCandidate` under `candidates/*` — never `raw/`. Token/cost fields are logged and returned on the mutation response.

### Minimal CloudWatch cost / alerting path

After the Gen 2 backend is deployed, configure these in the AWS console (names only; no committed secrets):

| Alarm / metric | Where | Suggested use |
|----------------|--------|----------------|
| `AWS/Lambda` `Errors` on `job-market-analyse` | CloudWatch alarm | Page on repeated worker failures |
| `AWS/Lambda` `Duration` / `Throttles` on analyse + recompute | CloudWatch alarm | Catch runaway or concurrency issues |
| `AWS/Bedrock` `Invocations` / model invocation latency | CloudWatch metrics (region of Bedrock) | Spot unexpected embed or parse volume |
| `AWS/Lambda` `Errors` / `Duration` on `job-market-parse-listing` | CloudWatch alarm | Catch parse fetch/Bedrock failures |
| Estimated cost from `AnalysisRun.estimatedCostUsd` | App metric / log filter on analyse success logs | Spot spend anomalies before the next recompute |
| Parse `estimatedCostUsd` on mutation / CloudWatch logs | Log filter on `job-market-parse-listing` | Spot unexpected parse spend (~$0.01/call typical) |

V1 does not ship a dedicated billing budget in CDK; create a Billing → Budgets alert for Bedrock + Lambda in the account that hosts the Amplify app if spend sensitivity is high. Run-level token/cost fields on `AnalysisRun` are the product-side source of truth for per-recompute cost; parse costs are logged per owner-initiated call.

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
| **Amplify** | **`amplify.yml`** runs **`nvm use 22`** at the start of backend `build` and frontend `preBuild` so `ampx pipeline-deploy`, `node scripts/sync-blogs.js`, `npm ci`, and `npm run build` all use Node 22. |

**Check in the AWS Amplify console**

1. **Build image:** Prefer **Amazon Linux 2023** (AL2023). AL2 does not ship modern Node by default; migrate to AL2023 or a custom image per [AWS guidance](https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-general.html).
2. **Live package updates:** If you set Node there, remember that **`nvm use` in `amplify.yml` overrides** live package updates for the shell that runs your commands.

If `nvm use 22` fails on the build image (version not installed), add a line before it: `nvm install 22` (then keep `nvm use 22`).

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
- [#16](https://github.com/hashadar/hashadar_website/issues/16) — deepen blog reader and CI fixture coverage
