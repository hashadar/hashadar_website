# Branching, releases, and hotfixes

Linear history via **squash-only** merges. Long-lived branches: `develop` (integration) and `main` (production).

## Branch roles

| Branch | Role | Deploy |
|--------|------|--------|
| `main` | Production | AWS Amplify only |
| `develop` | Default integration | No Amplify branch in the baseline setup |
| `feature/*`, `cursor/*` | Day-to-day work | None |
| `hotfix/*` | Prod fixes | None until merged to `main` |

Default GitHub branch stays `main`. **Day-to-day PRs target `develop`.**

## Merge style

Repository setting: **allow squash merging only** (disable merge commits and rebase-and-merge). Enable **delete branch on merge**.

| PR | Squash commit title |
|----|---------------------|
| Feature → `develop` | Meaningful summary (issue/PR title) |
| `develop` → `main` | `Release: …` (`vX.Y.Z`) |
| `hotfix/*` → `main` | `Hotfix: …` (`vX.Y.Z`) |

## Normal flow

1. Branch from **`develop`**.
2. Open PR → **`develop`** (CI must pass). Prefer `closes #N` in the body.
3. Squash-merge into `develop`.

## Release flow (`develop` → `main`)

1. Open PR **`develop` → `main`** when ready to ship.
2. Squash-merge as `Release: …`.
3. Amplify deploys from `main`.
4. Cut the GitHub Release / tag (see [RELEASES.md](./RELEASES.md)).
5. **Sync workflow** aligns `develop` to `main` (see below). Do not merge `main` back into `develop` by hand.

## Hotfix flow

1. Branch `hotfix/…` from **`main`** (not from `develop`).
2. PR → **`main`** (CI must pass).
3. Squash-merge; Amplify deploys.
4. Cut a patch release tag (e.g. `v2.0.1`).
5. Sync workflow brings the fix onto `develop`.

Never land a prod hotfix on `develop` first.

## Sync: `main` → `develop`

Workflow: `.github/workflows/sync-develop.yml` (runs on every push to `main`).

Because releases are **squashed**, commit graphs diverge even when trees match. The job:

1. If `develop` and `main` have the **same tree** → reset `develop` to `main` (`--force-with-lease`).
2. If `develop` has **different content** (unreleased work) → rebase `develop` onto `main` and force-with-lease.
3. If rebase conflicts → open a `ready-for-human` issue; do not push a broken sync.

### After a sync (local clones)

```bash
git fetch origin
git checkout develop
git reset --hard origin/develop
```

Rebase any open feature branches onto the updated `develop`.

## Agent / cloud base branches

| Work | Base branch | PR target |
|------|-------------|-----------|
| Feature / chore / docs | `develop` | `develop` |
| Prod hotfix | `main` | `main` |
| Cut a release | open PR `develop` → `main` | `main` |

## Dependabot

Dependabot PRs target **`develop`** (see `.github/dependabot.yml`).

## Owner checklist (GitHub UI)

Agents cannot always apply these. Do once after this model lands:

1. **Settings → General → Pull Requests**
   - Allow squash merging only
   - Delete head branches on merge
2. **Settings → Rules → Rulesets** (or classic branch protection)
   - **`main`:** PRs required; CI `quality` required; restrict pushes; allow PR heads from `develop` and `hotfix/*` where the UI supports it; no force-push
   - **`develop`:** PRs required; CI `quality` required; allow force-push for `github-actions[bot]` (sync workflow) or bypass for Actions
3. **Projects:** one board with columns matching triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`)
4. **Milestones (optional):** e.g. “Next release”

## Jira → GitHub (thin mapping)

| Jira-ish idea | Here |
|---------------|------|
| Backlog item | GitHub Issue |
| Status | Triage labels + Project columns |
| In progress | Open PR linked to the issue |
| Epic / theme | Milestone (or a parent issue) |
| Release | `develop` → `main` + semver tag |
| Sprint / points | Not used |

See [agents/triage-labels.md](./agents/triage-labels.md) and [agents/issue-tracker.md](./agents/issue-tracker.md).

## Related

- [RELEASES.md](./RELEASES.md) — tags and GitHub Releases
- [CI-AND-DEPLOYMENT.md](./CI-AND-DEPLOYMENT.md) — Actions vs Amplify
- `.github/workflows/sync-develop.yml`
- `.github/workflows/ci.yml`
