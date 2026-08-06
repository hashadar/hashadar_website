# Releases

Light hygiene only: **semver tags** on `main` plus **GitHub Releases**. Amplify remains the deploy mechanism; tags label what is in production.

## Versioning

- Semver: `MAJOR.MINOR.PATCH` (`v2.0.0` on GitHub tags).
- `package.json` `version` should match the latest released tag (no leading `v`).
- Baseline: **v2.0.0** — website / Job OS line as of the initial tag on `main`.

| Change on `main` | Bump |
|------------------|------|
| `develop` → `main` with user-facing or substantial work | `MINOR` (or `MAJOR` if you intentionally break a published contract) |
| Hotfix | `PATCH` |
| Process/docs-only release | `PATCH` is fine |

No conventional-commit enforcement and no semantic-release bot in the baseline setup.

## Cut a release (after squash-merge to `main`)

From a machine with `gh` auth (or use the GitHub UI):

```bash
# On main, up to date with origin
git checkout main
git pull origin main

VERSION=2.0.1   # no leading v — adjust as needed
npm pkg set version="$VERSION"   # if not already bumped on the release PR
git add package.json
git commit -m "chore: bump version to $VERSION"   # only if you bumped here
# Prefer bumping package.json on the Release / hotfix PR before merge when possible.

git tag -a "v$VERSION" -m "v$VERSION"
git push origin "v$VERSION"

gh release create "v$VERSION" --title "v$VERSION" --generate-notes --target main
```

Update [CHANGELOG.md](../CHANGELOG.md): move `[Unreleased]` notes under `[X.Y.Z]` with the date.

The sync workflow will align `develop` after the push to `main` (including a version-bump commit if you made one on `main`).

## Hotfix releases

Same tagging steps after the hotfix squash lands on `main`. Use the next `PATCH`.

## Changelog

[CHANGELOG.md](../CHANGELOG.md) follows a simple Keep a Changelog layout. Keep entries short; link issues/PRs when useful.

## Out of scope (deliberately)

- Release branches other than `hotfix/*`
- Automatic changelog from commit messages
- Publishing npm packages
