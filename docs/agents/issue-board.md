# Issue Board

User project: [hashadar.com Issue Board](https://github.com/users/hashadar/projects/3).

Triage **labels** on issues remain the AFK source of truth (see [triage-labels.md](./triage-labels.md)). Board **Status** should stay aligned with those labels once triaged, plus delivery columns that labels do not cover.

## Status columns

| Status | Meaning |
|--------|---------|
| `needs-triage` | Maintainer needs to evaluate |
| `needs-info` | Waiting on reporter |
| `ready-for-agent` | Fully specified, AFK-ready |
| `ready-for-human` | Requires human implementation |
| `in progress` | Work started (PR open or actively building) |
| `done` | Closed / shipped |
| `wontfix` | Will not be actioned |

Flow: `needs-triage` → (`needs-info` ↔) → `ready-for-agent` | `ready-for-human` → `in progress` → `done` (or `wontfix` at any point after triage).

When you change Status to a triage bucket (`needs-*`, `ready-*`, `wontfix`), keep the matching issue label in sync. When you move to `in progress` or `done`, leave the triage label as it was unless the issue is closed/`wontfix`.

## Workflows

Configure under **Project → … → Workflows** (API cannot enable/configure these today).

| Workflow | Desired |
|----------|---------|
| Auto-add to project | On for `hashadar/hashadar_website` |
| Auto-add sub-issues to project | On |
| Item added to project | Set Status → `needs-triage` |
| Pull request linked to issue | Set Status → `in progress` (**enable if off**) |
| Item closed | Set Status → `done` |
| Pull request merged | Set Status → `done` |
| Auto-close issue | On when Status → `done` is acceptable; otherwise leave as-is and close issues via `gh` |
| Auto-archive items | Optional; prefer leaving `done` / `wontfix` visible until you tidy |

New issues still land in `needs-triage` even if created with `ready-for-agent` — after create, set Status to match the label (or triage in the UI).

## Agent habits

- Prefer filtering ready work by **issue label** (`ready-for-agent`), not only board Status.
- After opening a PR for an issue, move the board item to `in progress` if the linked-PR workflow did not.
- Do not invent extra Status names; change this doc if the board options change.
