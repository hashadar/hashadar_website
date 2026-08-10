# Branching and hotfixes

Simple two-branch flow. Prefer **merge commits** (create a merge commit) when landing PRs.

## Branches

| Branch | Role | Deploy |
|--------|------|--------|
| `main` | Production | AWS Amplify |
| `develop` | Pre-prod / integration — test here locally, then promote | No Amplify branch |
| `feature/*`, `fix/*`, `chore/*`, `docs/*`, `cursor/*` | Day-to-day work | None |
| `hotfix/*` | Urgent prod fix | None until merged to `main` |

Default GitHub branch is **`main`**. Day-to-day PRs target **`develop`**.

When `develop` looks good, open a PR **`develop` → `main`**. There is no intermediate branch.

## Flow

### Feature work

1. Branch from `develop`.
2. PR → `develop` (CI `quality` should pass).
3. Merge with a **merge commit** (preferred). Squash or rebase merges are allowed when a one-commit history is genuinely clearer; do not treat squash as the default.

### Promote to prod

1. Open PR **`develop` → `main`**.
2. Merge with a **merge commit** (preferred).
3. Amplify deploys from `main`.
4. Sync workflow aligns `develop` to `main` when needed (see below).

### Hotfix

1. Branch `hotfix/…` from **`main`**.
2. PR → `main`, merge (merge commit preferred), deploy.
3. Sync brings the fix onto `develop`.

Never land a prod hotfix on `develop` first.

## Repo settings (intentional)

| Setting | Value | Why |
|---------|--------|-----|
| Allow merge commits | **On** (preferred) | Keeps branch topology and PR context |
| Allow squash / rebase merges | On (optional) | Available when useful; not the default workflow |
| Delete head branches on merge | **Off** | Must stay off — a `develop` → `main` PR would otherwise delete long-lived `develop` |
| Protect `main` | No delete, no force-push, PR required, CI `quality` required | Prod guardrail |
| Protect `develop` | No delete, no force-push | Keeps the pre-prod branch alive |

After merging a **feature** PR, delete the feature branch yourself (GitHub UI “Delete branch”, or `git push origin --delete <branch>`).

## Sync: `main` → `develop`

Workflow: `.github/workflows/sync-develop.yml` (on push to `main`, or manual dispatch).

After hotfixes on `main`, or when histories diverge, the job:

1. If `develop` is missing → recreate from `main`.
2. If refs already match → no-op.
3. If trees match but tips differ → reset `develop` to `main`.
4. If `develop` has commits not yet on `main` → rebase onto `main`.
5. If rebase conflicts → open a `ready-for-human` issue.

With merge-commit promotes, `develop` and `main` often already share history after a full promote; the workflow still covers hotfix catch-up.

After a sync locally:

```bash
git fetch origin
git checkout develop
git reset --hard origin/develop
```

## Dependabot

Targets **`develop`** (see `.github/dependabot.yml`).

## Related

- [CI-AND-DEPLOYMENT.md](./CI-AND-DEPLOYMENT.md) — Actions vs Amplify
- `.github/workflows/sync-develop.yml`
- `.github/workflows/ci.yml`
