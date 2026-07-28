'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import { jobOsFieldClassName } from '@/components/sections/labs/job-os/job-os-field-styles';
import {
  formatCompensation,
  formatNoticedAge,
  JobOsCaptureStrip,
  JobOsFocusSection,
  JobOsLedger,
  JobOsLedgerCell,
  JobOsLedgerRow,
  JobOsPill,
  JobOsWorkspaceIntro,
} from '@/components/sections/labs/job-os/job-os-ledger';
import { jobOs } from '@/data';
import {
  COMPENSATION_DISCLOSURES,
  COMPENSATION_PERIODS,
  OPPORTUNITY_ROLE_FAMILIES,
  OPPORTUNITY_SENIORITIES,
  OPPORTUNITY_STATUSES,
  type ApplicationRecord,
  type CompensationDisclosure,
  type CompensationPeriod,
  type DecisionEventRecord,
  type EmployerRecord,
  type JobOs,
  type OpportunityRecord,
  type OpportunityRoleFamily,
  type OpportunitySeniority,
  type OpportunityStatus,
} from '@/lib/job-os';
import { getDefaultJobOs } from '@/lib/job-os-default';

export type JobOsOpportunitiesWorkspaceProps = {
  jobOsClient?: JobOs;
  selectedId?: string;
};

type CaptureBeat = 1 | 2;
type PursuitState =
  | { kind: 'none' }
  | { kind: 'passed' }
  | { kind: 'application'; status: ApplicationRecord['status'] };

export function JobOsOpportunitiesWorkspace({
  jobOsClient,
  selectedId,
}: JobOsOpportunitiesWorkspaceProps) {
  const copy = jobOs.opportunities;
  const [client, setClient] = useState<JobOs | null>(jobOsClient ?? null);
  const [employers, setEmployers] = useState<EmployerRecord[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [pursuitById, setPursuitById] = useState<Record<string, PursuitState>>(
    {},
  );
  const [selected, setSelected] = useState<OpportunityRecord | null>(null);
  const [events, setEvents] = useState<DecisionEventRecord[]>([]);
  const [body, setBody] = useState('');
  const [hasApplication, setHasApplication] = useState(false);
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
  const [noticedAt, setNoticedAt] = useState(
    () => new Date().toISOString().slice(0, 16),
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
        const [listedEmployers, listedOpportunities] = await Promise.all([
          resolved.listEmployers(),
          resolved.listOpportunities(),
        ]);
        if (cancelled) {
          return;
        }
        setEmployers(listedEmployers);
        setOpportunities(listedOpportunities);
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
      setNoticedAt(opportunity.noticedAt.slice(0, 16));
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
      setBody(detail.body ?? '');
      setEvents(timeline);
      setHasApplication(Boolean(application));
    })();

    return () => {
      cancelled = true;
    };
  }, [client, selectedId, opportunities]);

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
      setNoticedAt(new Date().toISOString().slice(0, 16));
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

  function toIsoNoticedAt(value: string): string {
    const asDate = new Date(value);
    if (Number.isNaN(asDate.getTime())) {
      return new Date().toISOString();
    }
    return asDate.toISOString();
  }

  function buildInput() {
    return {
      employerId,
      title,
      source,
      noticedAt: toIsoNoticedAt(noticedAt),
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
    setNoticedAt(new Date().toISOString().slice(0, 16));
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
    const listed = await active.listOpportunities();
    setOpportunities(listed);
    await refreshPursuit(active, listed);
  }

  async function handleCreate() {
    if (!client) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await client.createOpportunity(buildInput());
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
        ...buildInput(),
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
      } else {
        setSelected(result.opportunity);
      }

      await refresh(client);
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
        setHasApplication(true);
        setEvents(await client.listDecisionEvents(opportunityId));
      }
      await refresh(client);
      setMessage(copy.pursuedLabel);
    } finally {
      setBusyId(null);
    }
  }

  function employerName(id: string): string {
    return employers.find((employer) => employer.id === id)?.name ?? '—';
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || busyId === selected.id}
            onClick={() => void handlePass(selected.id)}
          >
            {busyId === selected.id ? copy.passingLabel : copy.passLabel}
          </Button>
          {!hasApplication ? (
            <Button
              type="button"
              size="sm"
              disabled={busy || busyId === selected.id}
              onClick={() => void handlePursue(selected.id)}
            >
              {busyId === selected.id ? copy.pursuingLabel : copy.pursueLabel}
            </Button>
          ) : (
            <Button href="/labs/job-os/applications" size="sm" variant="ghost">
              {jobOs.applications.heading}
            </Button>
          )}
        </div>

        <JobOsFocusSection title={copy.focusListingHeading}>
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
        </JobOsFocusSection>

        <JobOsFocusSection title={copy.focusEvidenceHeading}>
          <OpportunityEvidenceFields
            copy={copy}
            source={source}
            setSource={setSource}
            seniority={seniority}
            setSeniority={setSeniority}
            roleFamily={roleFamily}
            setRoleFamily={setRoleFamily}
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
        </JobOsFocusSection>

        <JobOsFocusSection title={copy.focusBodyHeading}>
          <label className="block font-body text-sm">
            <Text variant="muted" className="mb-2 block text-sm">
              {copy.bodyHint}
            </Text>
            <textarea
              className={jobOsFieldClassName}
              rows={8}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={copy.noBodyLabel}
            />
          </label>
        </JobOsFocusSection>

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
                        ? (copy.seniorityOptions[opportunity.seniority] ??
                          opportunity.seniority)
                        : null,
                      opportunity.roleFamily
                        ? (copy.roleFamilyOptions[opportunity.roleFamily] ??
                          opportunity.roleFamily)
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
                      href="/labs/job-os/applications"
                      className="font-body text-sm underline underline-offset-4"
                    >
                      {copy.openApplicationLabel}
                    </Link>
                  ) : (
                    <Link
                      href={`/labs/job-os/opportunities/${opportunity.id}`}
                      className="font-body text-sm underline underline-offset-4"
                    >
                      {copy.openLabel}
                    </Link>
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
  status,
  setStatus,
}: {
  copy: OpportunityCopy;
  employers: EmployerRecord[];
  employerId: string;
  setEmployerId: (value: string) => void;
  title: string;
  setTitle: (value: string) => void;
  noticedAt: string;
  setNoticedAt: (value: string) => void;
  status: OpportunityStatus;
  setStatus: (value: OpportunityStatus) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="block font-body text-sm md:col-span-2">
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
        <input
          type="datetime-local"
          className={jobOsFieldClassName}
          value={noticedAt}
          onChange={(event) => setNoticedAt(event.target.value)}
        />
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
}: {
  copy: OpportunityCopy;
  source: string;
  setSource: (value: string) => void;
  seniority: OpportunitySeniority | '';
  setSeniority: (value: OpportunitySeniority | '') => void;
  roleFamily: OpportunityRoleFamily | '';
  setRoleFamily: (value: OpportunityRoleFamily | '') => void;
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
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="block font-body text-sm">
        {copy.sourceLabel}
        <input
          className={jobOsFieldClassName}
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />
      </label>
      <label className="block font-body text-sm">
        {copy.seniorityLabel}
        <select
          className={jobOsFieldClassName}
          value={seniority}
          onChange={(event) =>
            setSeniority(event.target.value as OpportunitySeniority | '')
          }
        >
          <option value="">—</option>
          {OPPORTUNITY_SENIORITIES.map((value) => (
            <option key={value} value={value}>
              {copy.seniorityOptions[value] ?? value}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-body text-sm">
        {copy.roleFamilyLabel}
        <select
          className={jobOsFieldClassName}
          value={roleFamily}
          onChange={(event) =>
            setRoleFamily(event.target.value as OpportunityRoleFamily | '')
          }
        >
          <option value="">—</option>
          {OPPORTUNITY_ROLE_FAMILIES.map((value) => (
            <option key={value} value={value}>
              {copy.roleFamilyOptions[value] ?? value}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-body text-sm">
        {copy.compensationDisclosureLabel}
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
      <label className="block font-body text-sm">
        {copy.compensationCurrencyLabel}
        <input
          className={jobOsFieldClassName}
          value={compensationCurrency}
          onChange={(event) => setCompensationCurrency(event.target.value)}
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
            setCompensationPeriod(event.target.value as CompensationPeriod | '')
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
      <label className="block font-body text-sm md:col-span-2">
        {copy.technologiesLabel}
        <input
          className={jobOsFieldClassName}
          value={technologies}
          onChange={(event) => setTechnologies(event.target.value)}
        />
      </label>
    </div>
  );
}
