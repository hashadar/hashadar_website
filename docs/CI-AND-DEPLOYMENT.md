# CI and deployment

## Where things run

| Concern | Where | Notes |
|---------|--------|--------|
| **PR and push checks** | [GitHub Actions](https://docs.github.com/en/actions) | Workflow: `.github/workflows/ci.yml` — `npm ci`, lint, typecheck, tests, `next build`. **Does not deploy.** |
| **Production build and deploy** | **AWS Amplify** autobuild | On push to connected branches: runs `amplify.yml` (blog clone, `sync-blogs`, `npm ci`, `npm run build`), publishes `.next`. **This is the only CD path** unless the team explicitly changes strategy. |

There is **no accidental double-deploy** from GitHub Actions: Actions do not push artefacts or run Amplify CLI deploy in the baseline setup.

## Amplify environment variables (names only)

These are configured in the Amplify console, not committed:

| Variable | Role |
|----------|------|
| `SSH_PRIVATE_KEY` | SSH key (base64) for cloning the private blog repository |
| `BLOG_REPO_URL` | Git URL of the blog content repository |
| `BLOG_REPO_BRANCH` | Optional branch to check out when cloning the blog repo |

## CI vs blog content (WP-D1)

GitHub Actions **does not** clone the private blog repo. `getAllBlogPosts()` returns an empty list when `public/blog` is missing, so `next build` in CI can succeed **without** validating real blog markdown. Blog correctness is covered by the **Amplify** build (with secrets) plus manual checks. Optional parity (fixtures or clone in Actions) is described in `docs/SOW-CI-VS-CD.md` (WP-D2 / WP-D3).

## Branch protection (repository owner)

After CI is merged and green on `main`:

1. GitHub → **Settings** → **Rules** (rulesets) or **Branches** → branch protection for `main`.
2. Require the **CI** workflow (job `quality` / check name as shown on PRs) to pass before merge.

AI agents cannot apply this in the UI; use the checklist above.

## Related docs

- `amplify.yml` — Amplify build phases
- `docs/SOW-CI-VS-CD.md` — full scope and verification checklist
- `docs/ARCHITECTURE-ONE-PAGER.md` — CI beside Amplify overview
