'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import { jobOsFieldClassName } from '@/components/sections/labs/job-os/job-os-field-styles';
import {
  formatCompensation,
  formatNoticedAge,
  fromDatetimeLocalValue,
  JobOsCaptureStrip,
  JobOsFocusSection,
  JobOsLedger,
  JobOsLedgerCell,
  JobOsLedgerRow,
  JobOsPill,
  JobOsWorkspaceIntro,
  toDatetimeLocalValue,
} from '@/components/sections/labs/job-os/job-os-ledger';
import { jobOs } from '@/data';
import { processMarkdown } from '@/lib/blog-markdown';
import {
  COMPENSATION_DISCLOSURES,
  COMPENSATION_PERIODS,
  isHuntProfileUsable,
  OPPORTUNITY_STATUSES,
  type ApplicationRecord,
  type CompensationDisclosure,
  type CompensationPeriod,
  type CreateOpportunityInput,
  type DecisionEventRecord,
  type EmployerRecord,
  type FitInsightView,
  type HuntProfileRecord,
  type JobOs,
  type OpportunityRecord,
  type OpportunityRoleFamily,
  type OpportunitySeniority,
  type OpportunityStatus,
  type UpdateOpportunityInput,
  type VocabularyTermRecord,
} from '@/lib/job-os';
import {
  evaluateStructuralChecklist,
  type StructuralChecklistDimension,
  type StructuralChecklistVerdict,
} from '@/lib/job-os-structural-checklist';
import { getDefaultJobOs } from '@/lib/job-os-default';
import { cn } from '@/lib/utils';

export type JobOsOpportunitiesWorkspaceProps = {
  jobOsClient?: JobOs;
  selectedId?: string;
};

type CaptureBeat = 1 | 2;
type PursuitState =
  | { kind: 'none' }
  | { kind: 'passed' }
  | {
      kind: 'application';
      status: ApplicationRecord['status'];
      applicationId: string;
    };

function vocabularyLabel(
  terms: VocabularyTermRecord[],
  value: string,
): string {
  return terms.find((term) => term.value === value)?.label ?? value;
}

function activeTerms(
  terms: VocabularyTermRecord[],
  kind: VocabularyTermRecord['kind'],
): VocabularyTermRecord[] {
  return terms.filter((term) => term.kind === kind && term.active);
}

export function JobOsOpportunitiesWorkspace({
  jobOsClient,
  selectedId,
}: JobOsOpportunitiesWorkspaceProps) {
  const copy = jobOs.opportunities;
  const router = useRouter();
  const [client, setClient] = useState<JobOs | null>(jobOsClient ?? null);
  const [employers, setEmployers] = useState<EmployerRecord[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyTermRecord[]>([]);
  const [pursuitById, setPursuitById] = useState<Record<string, PursuitState>>(
    {},
  );
  const [selected, setSelected] = useState<OpportunityRecord | null>(null);
  const [events, setEvents] = useState<DecisionEventRecord[]>([]);
  const [body, setBody] = useState('');
  const [bodyEditing, setBodyEditing] = useState(true);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [huntProfile, setHuntProfile] = useState<HuntProfileRecord | null>(
    null,
  );
  const [fitInsight, setFitInsight] = useState<FitInsightView | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureBeat, setCaptureBeat] = useState<CaptureBeat>(1);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const [employerId, setEmployerId] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [noticedAt, setNoticedAt] = useState(() =>
    toDatetimeLocalValue(new Date()),
  );
  const [status, setStatus] = useState<OpportunityStatus>('open');
  const [seniority, setSeniority] = useState<OpportunitySeniority | ''>('');
  const [roleFamily, setRoleFamily] = useState<OpportunityRoleFamily | ''>('');
  const [compensationDisclosure, setCompensationDisclosure] =
    useState<CompensationDisclosure>('unknown');
  const [compensationCurrency, setCompensationCurrency] = useState('');
  const [compensationMin, setCompensationMin] = useState('');
  const [compensationMax, setCompensationMax] = useState('');
  const [compensationPeriod, setCompensationPeriod] = useState<
    CompensationPeriod | ''
  >('');
  const [technologies, setTechnologies] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resolved = jobOsClient ?? (await getDefaultJobOs());
        if (cancelled) {
          return;
        }
        setClient(resolved);
        await resolved.ensureAnonEmployer();
        const [listedEmployers, listedOpportunities, terms] = await Promise.all(
          [
            resolved.listEmployers(),
            resolved.listOpportunities(),
            resolved.listVocabularyTerms(),
          ],
        );
        if (cancelled) {
          return;
        }
        setEmployers(listedEmployers);
        setOpportunities(listedOpportunities);
        setVocabulary(terms);
        if (!employerId && listedEmployers[0]) {
          setEmployerId(listedEmployers[0].id);
        }
        await refreshPursuit(resolved, listedOpportunities);
        if (cancelled) {
          return;
        }
        setLoadState('ready');
      } catch {
        if (!cancelled) {
          setLoadState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // employerId intentionally omitted — only seed once from first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobOsClient]);

  useEffect(() => {
    if (!client || !selectedId) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const [detail, timeline, application] = await Promise.all([
        client.getOpportunityBody(selectedId),
        client.listDecisionEvents(selectedId),
        client.listApplications().then((apps) =>
          apps.find((app) => app.opportunityId === selectedId),
        ),
      ]);
      if (cancelled || detail.status !== 'ok') {
        return;
      }
      const opportunity = detail.opportunity;
      setSelected(opportunity);
      setEmployerId(opportunity.employerId);
      setTitle(opportunity.title ?? '');
      setSource(opportunity.source ?? '');
      setNoticedAt(toDatetimeLocalValue(new Date(opportunity.noticedAt)));
      setStatus(opportunity.status);
      setSeniority(opportunity.seniority ?? '');
      setRoleFamily(opportunity.roleFamily ?? '');
      setCompensationDisclosure(
        opportunity.compensationDisclosure ?? 'unknown',
      );
      setCompensationCurrency(opportunity.compensationCurrency ?? '');
      setCompensationMin(
        opportunity.compensationMin != null
          ? String(opportunity.compensationMin)
          : '',
      );
      setCompensationMax(
        opportunity.compensationMax != null
          ? String(opportunity.compensationMax)
          : '',
      );
      setCompensationPeriod(opportunity.compensationPeriod ?? '');
      setTechnologies((opportunity.technologies ?? []).join(', '));
      const nextBody = detail.body ?? '';
      setBody(nextBody);
      setBodyEditing(!nextBody.trim());
      setEvents(timeline);
      setApplicationId(application?.id ?? null);

      const [checklistResult, insightResult] = await Promise.all([
        client.getStructuralChecklist(selectedId),
        client.getFitInsight(selectedId),
      ]);
      if (cancelled) {
        return;
      }
      if (checklistResult.status === 'ok') {
        setHuntProfile(checklistResult.profile);
      } else {
        setHuntProfile(null);
      }
      if (insightResult.status === 'ok') {
        setFitInsight(insightResult.insight);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, selectedId, opportunities]);

  async function refreshFitSurfaces(active: JobOs, opportunityId: string) {
    const [checklistResult, insightResult] = await Promise.all([
      active.getStructuralChecklist(opportunityId),
      active.getFitInsight(opportunityId),
    ]);
    if (checklistResult.status === 'ok') {
      setHuntProfile(checklistResult.profile);
    }
    if (insightResult.status === 'ok') {
      setFitInsight(insightResult.insight);
    }
  }

  useEffect(() => {
    if (selectedId) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'n' && event.key !== 'N') {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      setTitle('');
      setSource('');
      setNoticedAt(toDatetimeLocalValue(new Date()));
      setStatus('open');
      setSeniority('');
      setRoleFamily('');
      setCompensationDisclosure('unknown');
      setCompensationCurrency('');
      setCompensationMin('');
      setCompensationMax('');
      setCompensationPeriod('');
      setTechnologies('');
      setCaptureBeat(1);
      if (employers[0]) {
        setEmployerId(employers[0].id);
      }
      setCapturing(true);
      setMessage(null);
      setError(null);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, employers]);

  async function refreshPursuit(active: JobOs, listed: OpportunityRecord[]) {
    const applications = await active.listApplications();
    const appByOpp = new Map(
      applications.map((application) => [
        application.opportunityId,
        application,
      ]),
    );
    const timelines = await Promise.all(
      listed.map(async (opportunity) => ({
        id: opportunity.id,
        events: await active.listDecisionEvents(opportunity.id),
      })),
    );
    const next: Record<string, PursuitState> = {};
    for (const opportunity of listed) {
      const application = appByOpp.get(opportunity.id);
      if (application) {
        next[opportunity.id] = {
          kind: 'application',
          status: application.status,
          applicationId: application.id,
        };
        continue;
      }
      const timeline = timelines.find((entry) => entry.id === opportunity.id);
      const passed = timeline?.events.some(
        (event) => event.kind === 'opportunity_passed',
      );
      next[opportunity.id] = passed ? { kind: 'passed' } : { kind: 'none' };
    }
    setPursuitById(next);
  }

  function buildCreateInput(): CreateOpportunityInput {
    return {
      ...buildSharedInput(),
      noticedAt: fromDatetimeLocalValue(noticedAt),
    };
  }

  function buildUpdateInput(): Omit<UpdateOpportunityInput, 'id'> {
    return buildSharedInput();
  }

  function buildSharedInput() {
    return {
      employerId,
      title,
      source,
      status,
      seniority: seniority || undefined,
      roleFamily: roleFamily || undefined,
      compensationDisclosure,
      compensationCurrency: compensationCurrency || undefined,
      compensationMin: compensationMin ? Number(compensationMin) : undefined,
      compensationMax: compensationMax ? Number(compensationMax) : undefined,
      compensationPeriod: compensationPeriod || undefined,
      technologies: technologies
        .split(',')
        .map((tech) => tech.trim())
        .filter(Boolean),
    };
  }

  function resetCaptureFields() {
    setTitle('');
    setSource('');
    setNoticedAt(toDatetimeLocalValue(new Date()));
    setStatus('open');
    setSeniority('');
    setRoleFamily('');
    setCompensationDisclosure('unknown');
    setCompensationCurrency('');
    setCompensationMin('');
    setCompensationMax('');
    setCompensationPeriod('');
    setTechnologies('');
    setCaptureBeat(1);
    if (employers[0]) {
      setEmployerId(employers[0].id);
    }
  }

  function openCapture() {
    resetCaptureFields();
    setCapturing(true);
    setMessage(null);
    setError(null);
  }

  function dismissCapture() {
    setCapturing(false);
    resetCaptureFields();
  }

  async function refresh(active: JobOs) {
    const [listed, terms] = await Promise.all([
      active.listOpportunities(),
      active.listVocabularyTerms(),
    ]);
    setOpportunities(listed);
    setVocabulary(terms);
    await refreshPursuit(active, listed);
  }

  async function handleCreate() {
    if (!client) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await client.createOpportunity(buildCreateInput());
    setBusy(false);
    if (result.status === 'rejected') {
      setError(result.reason);
      return;
    }
    await refresh(client);
    setHighlightId(result.opportunity.id);
    setMessage(copy.createdLabel);
    dismissCapture();
  }

  async function handleSave() {
    if (!client || !selected) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await client.updateOpportunity({
        id: selected.id,
        ...buildUpdateInput(),
      });
      if (result.status === 'rejected' || result.status === 'not_found') {
        setError(result.status === 'rejected' ? result.reason : copy.errorLabel);
        return;
      }

      if (body.trim()) {
        const bodyResult = await client.updateOpportunityBody(selected.id, body);
        if (
          bodyResult.status === 'rejected' ||
          bodyResult.status === 'not_found'
        ) {
          setError(
            bodyResult.status === 'rejected'
              ? bodyResult.reason
              : copy.errorLabel,
          );
          return;
        }
        setSelected(bodyResult.opportunity);
        setBodyEditing(false);
      } else {
        setSelected(result.opportunity);
      }

      await refresh(client);
      if (selectedId) {
        await refreshFitSurfaces(client, selectedId);
      }
      setMessage(copy.savedLabel);
    } finally {
      setBusy(false);
    }
  }

  async function handlePass(opportunityId: string) {
    if (!client) {
      return;
    }
    setBusyId(opportunityId);
    setError(null);
    try {
      const result = await client.passOpportunity(opportunityId);
      if (result.status !== 'passed') {
        setError(result.status === 'rejected' ? result.reason : copy.errorLabel);
        return;
      }
      if (selected?.id === opportunityId) {
        setSelected(result.opportunity);
        setEvents(await client.listDecisionEvents(opportunityId));
      }
      await refresh(client);
      setMessage(copy.passedLabel);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReopen(opportunityId: string) {
    if (!client) {
      return;
    }
    const opportunity =
      selected?.id === opportunityId
        ? selected
        : opportunities.find((item) => item.id === opportunityId);
    if (!opportunity || opportunity.status !== 'closed') {
      return;
    }
    setBusyId(opportunityId);
    setError(null);
    try {
      const result = await client.updateOpportunity({
        id: opportunity.id,
        employerId: opportunity.employerId,
        title: opportunity.title ?? '',
        source: opportunity.source ?? '',
        status: 'open',
        seniority: opportunity.seniority,
        roleFamily: opportunity.roleFamily,
        compensationDisclosure:
          opportunity.compensationDisclosure ?? 'unknown',
        compensationCurrency: opportunity.compensationCurrency,
        compensationMin: opportunity.compensationMin,
        compensationMax: opportunity.compensationMax,
        compensationPeriod: opportunity.compensationPeriod,
        technologies: opportunity.technologies ?? [],
      });
      if (result.status !== 'updated') {
        setError(
          result.status === 'rejected' ? result.reason : copy.errorLabel,
        );
        return;
      }
      if (selected?.id === opportunityId) {
        setSelected(result.opportunity);
        setStatus('open');
      }
      await refresh(client);
      setMessage(copy.reopenedLabel);
    } finally {
      setBusyId(null);
    }
  }

  async function handlePursue(opportunityId: string) {
    if (!client) {
      return;
    }
    setBusyId(opportunityId);
    setError(null);
    try {
      const result = await client.pursueOpportunity(opportunityId);
      if (result.status !== 'pursued') {
        setError(result.status === 'rejected' ? result.reason : copy.errorLabel);
        return;
      }
      if (selected?.id === opportunityId) {
        setApplicationId(result.application.id);
        setEvents(await client.listDecisionEvents(opportunityId));
      }
      await refresh(client);
      setMessage(copy.pursuedLabel);
      router.push(`/labs/job-os/applications/${result.application.id}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleAnalyseFit() {
    if (!client || !selected) {
      return;
    }
    setAnalysing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await client.analyseOpportunityFit(selected.id);
      if (result.status === 'rejected') {
        setError(result.reason);
        return;
      }
      if (result.status === 'not_found') {
        setError(copy.errorLabel);
        return;
      }
      setFitInsight(result.insight);
      setMessage(copy.analysedLabel);
    } finally {
      setAnalysing(false);
    }
  }

  function employerName(id: string): string {
    return employers.find((employer) => employer.id === id)?.name ?? '—';
  }

  const bodyHtml = useMemo(
    () => (body.trim() ? processMarkdown(body) : ''),
    [body],
  );

  const liveChecklist = useMemo(() => {
    if (!huntProfile || !selected) {
      return null;
    }
    return evaluateStructuralChecklist(huntProfile, {
      ...selected,
      seniority: seniority || undefined,
      roleFamily: roleFamily || undefined,
      compensationDisclosure,
      compensationCurrency: compensationCurrency || undefined,
      compensationMin: compensationMin ? Number(compensationMin) : undefined,
      compensationMax: compensationMax ? Number(compensationMax) : undefined,
      compensationPeriod: compensationPeriod || undefined,
      technologies: technologies
        .split(',')
        .map((tech) => tech.trim())
        .filter(Boolean),
    });
  }, [
    huntProfile,
    selected,
    seniority,
    roleFamily,
    compensationDisclosure,
    compensationCurrency,
    compensationMin,
    compensationMax,
    compensationPeriod,
    technologies,
  ]);

  const hasPassed = events.some(
    (event) => event.kind === 'opportunity_passed',
  );

  function checklistVerdictLabel(verdict: StructuralChecklistVerdict): string {
    if (verdict === 'pass') {
      return copy.checklistVerdictPass;
    }
    if (verdict === 'fail') {
      return copy.checklistVerdictFail;
    }
    return copy.checklistVerdictUnknown;
  }

  function checklistVerdict(
    dimension: StructuralChecklistDimension,
  ): StructuralChecklistVerdict | undefined {
    return liveChecklist?.rows.find((row) => row.dimension === dimension)
      ?.verdict;
  }

  function pursuitLabel(pursuit: PursuitState | undefined): ReactNode {
    if (!pursuit || pursuit.kind === 'none') {
      return <span className="text-[var(--mono-500)]">—</span>;
    }
    if (pursuit.kind === 'passed') {
      return <JobOsPill tone="passed">{copy.pursuitPassedLabel}</JobOsPill>;
    }
    return (
      <JobOsPill tone="pursuit">
        {jobOs.applications.statusOptions[pursuit.status] ?? pursuit.status}
      </JobOsPill>
    );
  }

  if (loadState === 'loading') {
    return <Text variant="muted">{copy.loadingLabel}</Text>;
  }
  if (loadState === 'error') {
    return <Text variant="muted">{copy.errorLabel}</Text>;
  }

  if (selectedId && selected) {
    const listingFields = (
      <OpportunityListingFields
        copy={copy}
        employers={employers}
        employerId={employerId}
        setEmployerId={setEmployerId}
        title={title}
        setTitle={setTitle}
        noticedAtDisplay={formatNoticedAge(selected.noticedAt)}
        status={status}
        setStatus={setStatus}
        compact
      />
    );
    const evidenceFields = (
      <OpportunityEvidenceFields
        copy={copy}
        source={source}
        setSource={setSource}
        seniority={seniority}
        setSeniority={setSeniority}
        roleFamily={roleFamily}
        setRoleFamily={setRoleFamily}
        seniorityOptions={activeTerms(vocabulary, 'seniority')}
        roleFamilyOptions={activeTerms(vocabulary, 'role_family')}
        compensationDisclosure={compensationDisclosure}
        setCompensationDisclosure={setCompensationDisclosure}
        compensationCurrency={compensationCurrency}
        setCompensationCurrency={setCompensationCurrency}
        compensationMin={compensationMin}
        setCompensationMin={setCompensationMin}
        compensationMax={compensationMax}
        setCompensationMax={setCompensationMax}
        compensationPeriod={compensationPeriod}
        setCompensationPeriod={setCompensationPeriod}
        technologies={technologies}
        setTechnologies={setTechnologies}
        compact
        showChecklistHints
        huntProfileMissing={!huntProfile}
        checklistEmptyProfile={copy.checklistEmptyProfile}
        verdictLabel={checklistVerdictLabel}
        seniorityVerdict={checklistVerdict('seniority')}
        roleFamilyVerdict={checklistVerdict('role_family')}
        compensationVerdict={checklistVerdict('compensation')}
        mustHavesVerdict={checklistVerdict('must_haves')}
        dealBreakersVerdict={checklistVerdict('deal_breakers')}
        mustHavesLabel={copy.checklistDimensionLabels.must_haves}
        dealBreakersLabel={copy.checklistDimensionLabels.deal_breakers}
      />
    );
    const fitSection = (
      <JobOsFocusSection title={copy.focusFitInsightHeading}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={
                analysing ||
                busy ||
                !huntProfile ||
                !isHuntProfileUsable(huntProfile)
              }
              onClick={() => void handleAnalyseFit()}
            >
              {analysing
                ? copy.analysingLabel
                : fitInsight
                  ? copy.reanalyseLabel
                  : copy.analyseLabel}
            </Button>
            {!huntProfile || !isHuntProfileUsable(huntProfile) ? (
              <Text variant="muted" className="text-sm">
                {copy.analyseBlockedLabel}
              </Text>
            ) : null}
          </div>
          {fitInsight?.stale ? (
            <Text variant="muted">{copy.fitInsightStaleLabel}</Text>
          ) : null}
          {!fitInsight ? (
            <Text variant="muted">{copy.fitInsightEmpty}</Text>
          ) : (
            <div className="space-y-4">
              <div>
                <Text className="font-medium">
                  {copy.fitInsightSummaryHeading}
                </Text>
                <Text className="mt-1">{fitInsight.summary}</Text>
              </div>
              {(
                [
                  [copy.fitInsightAdvantagesHeading, fitInsight.advantages],
                  [
                    copy.fitInsightDisadvantagesHeading,
                    fitInsight.disadvantages,
                  ],
                  [copy.fitInsightFitNotesHeading, fitInsight.fitNotes],
                  [copy.fitInsightGapsHeading, fitInsight.gaps],
                ] as const
              ).map(([heading, items]) => (
                <div key={heading}>
                  <Text className="font-medium">{heading}</Text>
                  {items.length === 0 ? (
                    <Text variant="muted" className="mt-1">
                      —
                    </Text>
                  ) : (
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {items.map((item) => (
                        <li key={`${heading}-${item}`}>
                          <Text>{item}</Text>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </JobOsFocusSection>
    );
    const timelineSection = (
      <JobOsFocusSection title={copy.timelineHeading}>
        {events.length === 0 ? (
          <Text variant="muted">{copy.timelineEmpty}</Text>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id}>
                <Text>
                  {copy.eventKindLabels[event.kind] ?? event.kind}
                  {event.fromStatus && event.toStatus
                    ? `: ${event.fromStatus} → ${event.toStatus}`
                    : ''}
                  {' · '}
                  {new Date(event.occurredAt).toLocaleString('en-GB')}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </JobOsFocusSection>
    );

    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Heading size="md" as="h2">
              {selected.title || copy.untitledLabel}
            </Heading>
            <JobOsPill tone={selected.status === 'open' ? 'open' : 'closed'}>
              {copy.statusOptions[selected.status] ?? selected.status}
            </JobOsPill>
          </div>
          <Text variant="muted">{employerName(selected.employerId)}</Text>
          <Link
            href="/labs/job-os/opportunities"
            className="inline-block font-body text-sm text-[var(--mono-500)] underline underline-offset-4"
          >
            {copy.backLabel}
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {selected.status === 'closed' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || busyId === selected.id}
              onClick={() => void handleReopen(selected.id)}
            >
              {busyId === selected.id
                ? copy.reopeningLabel
                : copy.reopenLabel}
            </Button>
          ) : null}
          {!applicationId && !hasPassed ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || busyId === selected.id}
              onClick={() => void handlePass(selected.id)}
            >
              {busyId === selected.id ? copy.passingLabel : copy.passLabel}
            </Button>
          ) : null}
          {!applicationId ? (
            <Button
              type="button"
              size="sm"
              disabled={busy || busyId === selected.id}
              onClick={() => void handlePursue(selected.id)}
            >
              {busyId === selected.id ? copy.pursuingLabel : copy.pursueLabel}
            </Button>
          ) : (
            <Button
              href={`/labs/job-os/applications/${applicationId}`}
              size="sm"
              variant="ghost"
            >
              {jobOs.applications.heading}
            </Button>
          )}
        </div>

        {/* Desktop: ~30% metadata rail / ~70% Body + Fit. Mobile: Body & Fit first. */}
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(14rem,3fr)_minmax(0,7fr)] lg:items-start lg:gap-10">
          <aside className="order-2 space-y-6 lg:order-1">
            <JobOsFocusSection title={copy.focusListingHeading}>
              {listingFields}
            </JobOsFocusSection>
            <JobOsFocusSection title={copy.focusEvidenceHeading}>
              {evidenceFields}
            </JobOsFocusSection>
            {timelineSection}
          </aside>

          <div className="order-1 space-y-6 lg:order-2">
            <JobOsFocusSection title={copy.focusBodyHeading}>
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Text variant="muted" className="text-sm">
                    {copy.bodyHint}
                  </Text>
                  {body.trim() ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setBodyEditing((current) => !current)}
                    >
                      {bodyEditing
                        ? copy.previewBodyLabel
                        : copy.editBodyLabel}
                    </Button>
                  ) : null}
                </div>
                {bodyEditing || !body.trim() ? (
                  <textarea
                    className={`${jobOsFieldClassName} min-h-[16rem] lg:min-h-[24rem]`}
                    rows={14}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder={copy.noBodyLabel}
                  />
                ) : (
                  <div
                    className="blog-content min-h-[16rem] lg:min-h-[24rem]"
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />
                )}
              </div>
            </JobOsFocusSection>
            {fitSection}
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void handleSave()}
        >
          {busy ? copy.savingLabel : copy.saveLabel}
        </Button>
        {message ? <Text>{message}</Text> : null}
        {error ? <Text>{error}</Text> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <JobOsWorkspaceIntro
        heading={copy.heading}
        description={copy.description}
        actions={
          <Button
            type="button"
            size="sm"
            disabled={busy || capturing || employers.length === 0}
            onClick={openCapture}
          >
            {copy.addLabel}
          </Button>
        }
      />

      <JobOsCaptureStrip
        open={capturing}
        title={copy.createHeading}
        dismissLabel={copy.dismissCaptureLabel}
        onDismiss={dismissCapture}
      >
        <div className="space-y-4">
          <OpportunityListingFields
            copy={copy}
            employers={employers}
            employerId={employerId}
            setEmployerId={setEmployerId}
            title={title}
            setTitle={setTitle}
            noticedAt={noticedAt}
            setNoticedAt={setNoticedAt}
            status={status}
            setStatus={setStatus}
          />
          {captureBeat >= 2 ? (
            <OpportunityEvidenceFields
              copy={copy}
              source={source}
              setSource={setSource}
              seniority={seniority}
              setSeniority={setSeniority}
              roleFamily={roleFamily}
              setRoleFamily={setRoleFamily}
              seniorityOptions={activeTerms(vocabulary, 'seniority')}
              roleFamilyOptions={activeTerms(vocabulary, 'role_family')}
              compensationDisclosure={compensationDisclosure}
              setCompensationDisclosure={setCompensationDisclosure}
              compensationCurrency={compensationCurrency}
              setCompensationCurrency={setCompensationCurrency}
              compensationMin={compensationMin}
              setCompensationMin={setCompensationMin}
              compensationMax={compensationMax}
              setCompensationMax={setCompensationMax}
              compensationPeriod={compensationPeriod}
              setCompensationPeriod={setCompensationPeriod}
              technologies={technologies}
              setTechnologies={setTechnologies}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {captureBeat < 2 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCaptureBeat(2)}
              >
                {copy.moreFieldsLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={busy || !employerId}
              onClick={() => void handleCreate()}
            >
              {busy ? copy.creatingLabel : copy.createLabel}
            </Button>
          </div>
        </div>
      </JobOsCaptureStrip>

      <JobOsLedger
        caption={copy.heading}
        columns={[
          copy.columnStatus,
          copy.columnTitle,
          copy.columnEmployer,
          copy.columnNoticed,
          copy.columnSignal,
          copy.columnPursuit,
          copy.columnActions,
        ]}
        isEmpty={opportunities.length === 0}
        empty={copy.emptyList}
      >
        {opportunities.map((opportunity) => {
          const pursuit = pursuitById[opportunity.id] ?? { kind: 'none' };
          const rowBusy = busyId === opportunity.id;
          return (
            <JobOsLedgerRow
              key={opportunity.id}
              highlighted={opportunity.id === highlightId}
            >
              <JobOsLedgerCell>
                <JobOsPill
                  tone={opportunity.status === 'open' ? 'open' : 'closed'}
                >
                  {copy.statusOptions[opportunity.status] ?? opportunity.status}
                </JobOsPill>
              </JobOsLedgerCell>
              <JobOsLedgerCell>
                <Link
                  href={`/labs/job-os/opportunities/${opportunity.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {opportunity.title || copy.untitledLabel}
                </Link>
                {opportunity.seniority || opportunity.roleFamily ? (
                  <Text
                    variant="muted"
                    className="mt-1 block text-xs"
                  >
                    {[
                      opportunity.seniority
                        ? vocabularyLabel(vocabulary, opportunity.seniority)
                        : null,
                      opportunity.roleFamily
                        ? vocabularyLabel(vocabulary, opportunity.roleFamily)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
              </JobOsLedgerCell>
              <JobOsLedgerCell>
                {employerName(opportunity.employerId)}
              </JobOsLedgerCell>
              <JobOsLedgerCell mono>
                {formatNoticedAge(opportunity.noticedAt)}
              </JobOsLedgerCell>
              <JobOsLedgerCell mono>
                {formatCompensation({
                  disclosure: opportunity.compensationDisclosure,
                  currency: opportunity.compensationCurrency,
                  min: opportunity.compensationMin,
                  max: opportunity.compensationMax,
                  period: opportunity.compensationPeriod,
                })}
              </JobOsLedgerCell>
              <JobOsLedgerCell>{pursuitLabel(pursuit)}</JobOsLedgerCell>
              <JobOsLedgerCell>
                <div className="flex flex-wrap items-center gap-2">
                  {opportunity.status === 'closed' ? (
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() => void handleReopen(opportunity.id)}
                      className="font-body text-sm underline underline-offset-4 disabled:opacity-50"
                    >
                      {copy.reopenLabel}
                    </button>
                  ) : null}
                  {pursuit.kind === 'none' ? (
                    <>
                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={() => void handlePass(opportunity.id)}
                        className="font-body text-sm text-[var(--mono-500)] underline-offset-4 hover:underline disabled:opacity-50"
                      >
                        {copy.passShortLabel}
                      </button>
                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={() => void handlePursue(opportunity.id)}
                        className="font-body text-sm underline underline-offset-4 disabled:opacity-50"
                      >
                        {copy.pursueShortLabel}
                      </button>
                    </>
                  ) : pursuit.kind === 'application' ? (
                    <Link
                      href={`/labs/job-os/applications/${pursuit.applicationId}`}
                      className="font-body text-sm underline underline-offset-4"
                    >
                      {copy.openApplicationLabel}
                    </Link>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={() => void handlePursue(opportunity.id)}
                        className="font-body text-sm underline underline-offset-4 disabled:opacity-50"
                      >
                        {copy.pursueShortLabel}
                      </button>
                      <Link
                        href={`/labs/job-os/opportunities/${opportunity.id}`}
                        className="font-body text-sm text-[var(--mono-500)] underline underline-offset-4"
                      >
                        {copy.openLabel}
                      </Link>
                    </>
                  )}
                </div>
              </JobOsLedgerCell>
            </JobOsLedgerRow>
          );
        })}
      </JobOsLedger>

      {message ? <Text>{message}</Text> : null}
      {error ? <Text>{error}</Text> : null}
    </div>
  );
}

type OpportunityCopy = (typeof jobOs)['opportunities'];

function OpportunityListingFields({
  copy,
  employers,
  employerId,
  setEmployerId,
  title,
  setTitle,
  noticedAt,
  setNoticedAt,
  noticedAtDisplay,
  status,
  setStatus,
  compact = false,
}: {
  copy: OpportunityCopy;
  employers: EmployerRecord[];
  employerId: string;
  setEmployerId: (value: string) => void;
  title: string;
  setTitle: (value: string) => void;
  noticedAt?: string;
  setNoticedAt?: (value: string) => void;
  noticedAtDisplay?: string;
  status: OpportunityStatus;
  setStatus: (value: OpportunityStatus) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn('grid gap-3', !compact && 'md:grid-cols-2')}
    >
      <label
        className={cn(
          'block font-body text-sm',
          !compact && 'md:col-span-2',
        )}
      >
        {copy.employerLabel}
        <select
          className={jobOsFieldClassName}
          value={employerId}
          onChange={(event) => setEmployerId(event.target.value)}
        >
          {employers.map((employer) => (
            <option key={employer.id} value={employer.id}>
              {employer.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-body text-sm">
        {copy.titleLabel}
        <input
          className={jobOsFieldClassName}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="block font-body text-sm">
        {copy.noticedAtLabel}
        {setNoticedAt && noticedAt != null ? (
          <input
            type="datetime-local"
            className={jobOsFieldClassName}
            value={noticedAt}
            onChange={(event) => setNoticedAt(event.target.value)}
          />
        ) : (
          <Text className="mt-1 block">{noticedAtDisplay ?? '—'}</Text>
        )}
      </label>
      <label className="block font-body text-sm">
        {copy.statusLabel}
        <select
          className={jobOsFieldClassName}
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as OpportunityStatus)
          }
        >
          {OPPORTUNITY_STATUSES.map((value) => (
            <option key={value} value={value}>
              {copy.statusOptions[value] ?? value}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function OpportunityEvidenceFields({
  copy,
  source,
  setSource,
  seniority,
  setSeniority,
  roleFamily,
  setRoleFamily,
  seniorityOptions,
  roleFamilyOptions,
  compensationDisclosure,
  setCompensationDisclosure,
  compensationCurrency,
  setCompensationCurrency,
  compensationMin,
  setCompensationMin,
  compensationMax,
  setCompensationMax,
  compensationPeriod,
  setCompensationPeriod,
  technologies,
  setTechnologies,
  compact = false,
  showChecklistHints = false,
  huntProfileMissing = false,
  checklistEmptyProfile,
  verdictLabel,
  seniorityVerdict,
  roleFamilyVerdict,
  compensationVerdict,
  mustHavesVerdict,
  dealBreakersVerdict,
  mustHavesLabel,
  dealBreakersLabel,
}: {
  copy: OpportunityCopy;
  source: string;
  setSource: (value: string) => void;
  seniority: OpportunitySeniority | '';
  setSeniority: (value: OpportunitySeniority | '') => void;
  roleFamily: OpportunityRoleFamily | '';
  setRoleFamily: (value: OpportunityRoleFamily | '') => void;
  seniorityOptions: VocabularyTermRecord[];
  roleFamilyOptions: VocabularyTermRecord[];
  compensationDisclosure: CompensationDisclosure;
  setCompensationDisclosure: (value: CompensationDisclosure) => void;
  compensationCurrency: string;
  setCompensationCurrency: (value: string) => void;
  compensationMin: string;
  setCompensationMin: (value: string) => void;
  compensationMax: string;
  setCompensationMax: (value: string) => void;
  compensationPeriod: CompensationPeriod | '';
  setCompensationPeriod: (value: CompensationPeriod | '') => void;
  technologies: string;
  setTechnologies: (value: string) => void;
  compact?: boolean;
  showChecklistHints?: boolean;
  huntProfileMissing?: boolean;
  checklistEmptyProfile?: string;
  verdictLabel?: (verdict: StructuralChecklistVerdict) => string;
  seniorityVerdict?: StructuralChecklistVerdict;
  roleFamilyVerdict?: StructuralChecklistVerdict;
  compensationVerdict?: StructuralChecklistVerdict;
  mustHavesVerdict?: StructuralChecklistVerdict;
  dealBreakersVerdict?: StructuralChecklistVerdict;
  mustHavesLabel?: string;
  dealBreakersLabel?: string;
}) {
  function fieldLabel(
    label: string,
    verdict?: StructuralChecklistVerdict,
  ) {
    return (
      <span className="mb-1 flex flex-wrap items-center gap-2">
        <span>{label}</span>
        {showChecklistHints && verdict && verdictLabel ? (
          <JobOsPill
            tone={
              verdict === 'pass'
                ? 'open'
                : verdict === 'fail'
                  ? 'closed'
                  : 'passed'
            }
          >
            {verdictLabel(verdict)}
          </JobOsPill>
        ) : null}
      </span>
    );
  }

  return (
    <div className="space-y-3">
      {showChecklistHints && huntProfileMissing && checklistEmptyProfile ? (
        <Text variant="muted" className="text-sm">
          {checklistEmptyProfile}
        </Text>
      ) : null}
      <div className={cn('grid gap-3', !compact && 'md:grid-cols-2')}>
        <label className="block font-body text-sm">
          {copy.sourceLabel}
          <input
            className={jobOsFieldClassName}
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
        </label>
        <label className="block font-body text-sm">
          {fieldLabel(copy.seniorityLabel, seniorityVerdict)}
          <select
            className={jobOsFieldClassName}
            value={seniority}
            onChange={(event) =>
              setSeniority(event.target.value as OpportunitySeniority | '')
            }
          >
            <option value="">—</option>
            {seniorityOptions.map((term) => (
              <option key={term.id} value={term.value}>
                {term.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block font-body text-sm">
          {fieldLabel(copy.roleFamilyLabel, roleFamilyVerdict)}
          <select
            className={jobOsFieldClassName}
            value={roleFamily}
            onChange={(event) =>
              setRoleFamily(event.target.value as OpportunityRoleFamily | '')
            }
          >
            <option value="">—</option>
            {roleFamilyOptions.map((term) => (
              <option key={term.id} value={term.value}>
                {term.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block font-body text-sm">
          {fieldLabel(copy.compensationDisclosureLabel, compensationVerdict)}
          <select
            className={jobOsFieldClassName}
            value={compensationDisclosure}
            onChange={(event) =>
              setCompensationDisclosure(
                event.target.value as CompensationDisclosure,
              )
            }
          >
            {COMPENSATION_DISCLOSURES.map((value) => (
              <option key={value} value={value}>
                {copy.compensationDisclosureOptions[value] ?? value}
              </option>
            ))}
          </select>
        </label>
        {compensationDisclosure === 'range' ? (
          <>
            <label className="block font-body text-sm">
              {copy.compensationCurrencyLabel}
              <input
                className={jobOsFieldClassName}
                value={compensationCurrency}
                onChange={(event) =>
                  setCompensationCurrency(event.target.value)
                }
              />
            </label>
            <label className="block font-body text-sm">
              {copy.compensationMinLabel}
              <input
                className={jobOsFieldClassName}
                value={compensationMin}
                onChange={(event) => setCompensationMin(event.target.value)}
              />
            </label>
            <label className="block font-body text-sm">
              {copy.compensationMaxLabel}
              <input
                className={jobOsFieldClassName}
                value={compensationMax}
                onChange={(event) => setCompensationMax(event.target.value)}
              />
            </label>
            <label className="block font-body text-sm">
              {copy.compensationPeriodLabel}
              <select
                className={jobOsFieldClassName}
                value={compensationPeriod}
                onChange={(event) =>
                  setCompensationPeriod(
                    event.target.value as CompensationPeriod | '',
                  )
                }
              >
                <option value="">—</option>
                {COMPENSATION_PERIODS.map((value) => (
                  <option key={value} value={value}>
                    {copy.compensationPeriodOptions[value] ?? value}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        <label
          className={cn(
            'block font-body text-sm',
            !compact && 'md:col-span-2',
          )}
        >
          <span className="mb-1 flex flex-wrap items-center gap-2">
            <span>{copy.technologiesLabel}</span>
            {showChecklistHints &&
            mustHavesVerdict &&
            dealBreakersVerdict &&
            verdictLabel ? (
              <>
                <JobOsPill
                  tone={
                    mustHavesVerdict === 'pass'
                      ? 'open'
                      : mustHavesVerdict === 'fail'
                        ? 'closed'
                        : 'passed'
                  }
                >
                  {mustHavesLabel ?? 'Must-haves'}:{' '}
                  {verdictLabel(mustHavesVerdict)}
                </JobOsPill>
                <JobOsPill
                  tone={
                    dealBreakersVerdict === 'pass'
                      ? 'open'
                      : dealBreakersVerdict === 'fail'
                        ? 'closed'
                        : 'passed'
                  }
                >
                  {dealBreakersLabel ?? 'Deal-breakers'}:{' '}
                  {verdictLabel(dealBreakersVerdict)}
                </JobOsPill>
              </>
            ) : null}
          </span>
          <input
            className={jobOsFieldClassName}
            value={technologies}
            onChange={(event) => setTechnologies(event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
