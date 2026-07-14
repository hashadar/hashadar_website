# ADR 0001: Site page shell

## Status

Accepted

## Context

Every public route duplicated skip link, header, main landmark, and footer wiring. Footer also required callers to pass contact props while already importing navigation and site from the data layer. CODEBASE-CONVENTIONS previously required explicit Header/Footer per page to avoid a root-layout chrome that would also wrap future authenticated routes.

## Decision

Introduce `SitePage` as a shared public-page shell component (not a root App Router layout). Footer loads its own common data via `getCommonData()`. Routes supply children and optional `mainClassName` only.

## Consequences

- Public pages no longer prop-drill footer contact fields.
- Authenticated layouts can remain separate without inheriting public chrome from `app/layout.tsx`.
- Conventions §7.1 documents `SitePage` as the public seam.
