# Job OS

Private job-hunting operating system for the **Site Admin** (see [Site context](./docs/site/CONTEXT.md)). The core data model is Employer → Opportunity → Application. Listing evidence lives on Opportunity; the former JobDescription noun and the market-pulse publication pipeline are not part of the hunting-graph product. The authenticated product lives at `/labs/job-os` (Overview attention surface plus Employers | Opportunities | Applications | Profile | Lists); no public Job OS publication is planned. Sign-in is site-wide — Job OS does not own auth or Admin.

## Language

### Operator

**Site Admin**:
The authenticated human operating Job OS; identity is defined in the Site context. Same person as site Sign-in / Admin.
_Avoid_: Owner (as the person noun), user (unqualified)

### Hunting hierarchy

**Employer**:
A company (or hiring organisation) the owner tracks: what it does, how it presents, and any standing notes. Parent of Opportunities. Every Opportunity must reference an Employer; when the company is unknown, use the reserved Anon Employer rather than a null parent.
_Avoid_: Company (as a model name), organisation record, firm

**Anon Employer**:
The single reserved Employer used when an Opportunity’s company is not yet known. Prevents orphan Opportunities.
_Avoid_: null employer, unknown company (as a null), unassigned

**Sector**:
Required Employer classification of industry or market sector for filtering and ledger metrics. Structured field, not Body prose.
_Avoid_: industry (as the field name), tag, category

**Vocabulary term**:
Owner-managed allowed value for a controlled list (size tier, prestige tier, sector, seniority, role family). Stable slug value plus display label; inactive terms stay readable on existing rows but are not offered for new writes.
_Avoid_: enum (as the product concept), tag, dropdown option (UI-only)

**Opportunity**:
A concrete role or listing under an Employer — the absorbed successor to JobDescription. Holds structured listing evidence (compensation, seniority, technologies, source, and similar) plus an optional Body. May exist with no Application; at most one Application ever. A re-apply is a new Opportunity that captures what changed.
_Avoid_: Job, listing (as the model name), inbox item, lead, JobDescription (legacy v2 noun)

**Market pulse**:
The former public themes/tech publication pipeline (embeddings, clustering, guest snapshot). Not planned for Job OS — the graph is personal hunt evidence, not a market corpus; not a synonym for Opportunity evidence.
_Avoid_: corpus recompute, LabPublication (as a Job OS requirement), treating pulse as deferred work

**Application**:
A pursuit of a specific Opportunity: process state, contacts, prep, and debrief. Requires an Opportunity. At most one Application per Opportunity; created when pursuit begins, not automatically with the Opportunity.
_Avoid_: Pursuit (synonym only), candidacy, pipeline item

**Opportunity status**:
Lifecycle of the listing as a market object: `open` or `closed`. Not whether the owner applied or passed. Terminal Application outcomes (`accepted`, `rejected`, `withdrawn`) close the Opportunity; Pass does not; leaving a terminal Application status does not reopen it.
_Avoid_: active/archived as pursuit state, Application status, withdrawn (use closed)

**Application status**:
Lifecycle of a pursuit: researching, applied, interviewing, offer, accepted, rejected, withdrawn. Exists only when an Application exists. `researching` is active pursuit before a formal application is submitted (e.g. recruiter contact, screening, process before interviews); `applied` is the formal submit.
_Avoid_: JobDescription status, Opportunity status, corpus active/archived, a separate pre-application status outside Application

**Tracking note**:
Optional freeform text on an Application for owner micro-status (e.g. interview stage, awaiting response, next action, recruiter screen). Does not replace Application status and does not emit Decision Events when edited.
_Avoid_: interview sub-status enum, second state machine, encoding tracker text as Application status

**Pass**:
An owner decision not to pursue an Opportunity, recorded without creating an Application (typically via a Decision Event while the Opportunity may remain open).
_Avoid_: rejected (Application outcome), withdrawn (ambiguous across layers)

**Decision Event**:
An append-only database record of a meaningful owner action. v3.0 mandatory kinds: opportunity passed; application started; application status changed (with from/to). No Body. Not a substitute for Opportunity or Application status. Distinct offer-response events are out of scope while offer outcomes are Application status transitions.
_Avoid_: audit log (generic), analytics event, preference score

**Body**:
The freeform prose document for an Employer, Opportunity, Application, or Hunt Profile (narrative, pasted listing, prep/debrief writing, CV/projects/aspirations prose). Optional until prose exists. Structured graph fields are never authoritative in the Body.
_Avoid_: frontmatter as source of truth, treating the Body as the join model, requiring a Body on every row

### Fit (v3.1)

**Hunt Profile**:
The singleton private substrate for fit analysis: structured hunt targets and constraints (seniority, role family, location/flexibility, compensation floor, must-haves, deal-breakers, escape pains, seek desires) plus an optional Body for narrative experience, projects, and aspirations. Distinct from Site career marketing content.
_Avoid_: Canonical CV, Current Role Dossier, Preference Profile, Owner Profile, treating Site careerProfile as the substrate

**Structural checklist**:
A pure, always-on comparison of Hunt Profile structured fields to an Opportunity (compensation, seniority, role family, must-haves, deal-breakers), each row pass, fail, or unknown. Shown beside the Opportunity evidence fields that feed it. Not an LLM output and not a Decision Event.
_Avoid_: Fit Insight, scorecard weights, preference score

**Fit Insight**:
The latest structured analysis of an Opportunity against the Hunt Profile (summary, advantages, disadvantages, fit notes, gaps), produced on demand. Uses Hunt Profile, Opportunity, Employer (including Bodies), and structural checklist context; may apply well-established public knowledge about a named Employer when it changes the judgment. Owner-only; analysing does not emit a Decision Event.
_Avoid_: Preference Profile scorecard, learned ranker, treating analyse as Pass or Pursue, live web enrichment as the Employer source of truth

**Current Role Dossier** / **Preference Profile** (stated Layer-1 scorecard):
Cancelled product path. Superseded by Hunt Profile, Structural checklist, and Fit Insight.
_Avoid_: reviving these nouns; treating them as synonyms for Hunt Profile or Fit Insight

**Canonical CV** / **JobDescription** / **ScrapeCandidate** / **AnalysisRun** / **CorpusSnapshot** / **LabPublication** / **ThemeLabelOverride**:
Retired v2 lab concepts. Removed in the v3.0 teardown; not part of the hunting graph.
_Avoid_: reviving these nouns for Opportunity evidence, Decision Events, or Hunt Profile

### Surfaces (v3.2+)

**Overview**:
The Job OS landing attention surface: what needs the Site Admin next. Rows are non-terminal Applications only (`researching`, `applied`, `interviewing`, `offer`). Each row shows Employer, Opportunity title, Application status, and Tracking note; ordered by pursuit urgency (`offer` → `interviewing` → `applied` → `researching`), then within a status by latest Decision Event for that Application (fallback: Opportunity `noticedAt`). Page composition is heading, one-line description, and that list only (plus empty state linking to Opportunities). No KPI strip, secondary feeds, or inline edits — row opens the Application detail. Undecided open Opportunities (not yet Pursue/Pass) stay on the Opportunities ledger. Not a metrics or funnel view.
_Avoid_: dashboard (unqualified), Status map, KPI tiles as the Overview’s job, bare Opportunities or Employer-only rows as Overview content

**Status map**:
A separate surface for where-the-hunt-stands aggregates (counts, funnels, breakdowns). Distinct from Overview; not part of the Overview attention job.
_Avoid_: Overview, treating Overview as the metrics home
