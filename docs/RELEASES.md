# Releases

This repo does **not** use GitHub Releases, semver tags, or a changelog as part of shipping.

**Production ship** = squash-merge to `main` → Amplify deploys. That is the release.

Existing tags (`v2.0.0`, `v2.0.1`, …) are historical only; do not create new ones unless you have a concrete reason.

`package.json` `version` is informational and need not track every promote.
