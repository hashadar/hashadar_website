'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import { jobOsFieldClassName } from '@/components/sections/labs/job-os/job-os-field-styles';
import { jobOs } from '@/data';
import {
  COMPENSATION_DISCLOSURES,
  COMPENSATION_PERIODS,
  OPPORTUNITY_ROLE_FAMILIES,
  OPPORTUNITY_SENIORITIES,
  OPPORTUNITY_STATUSES,
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

export function JobOsOpportunitiesWorkspace({
  jobOsClient,
  selectedId,
}: JobOsOpportunitiesWorkspaceProps) {
  const copy = jobOs.opportunities;
  const [client, setClient] = useState<JobOs | null>(jobOsClient ?? null);
  const [employers, setEmployers] = useState<EmployerRecord[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [selected, setSelected] = useState<OpportunityRecord | null>(null);
  const [events, setEvents] = useState<DecisionEventRecord[]>([]);
  const [body, setBody] = useState('');
  const [hasApplication, setHasApplication] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function refresh(active: JobOs) {
    const listed = await active.listOpportunities();
    setOpportunities(listed);
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
    setMessage(copy.createdLabel);
  }

  async function handleSave() {
    if (!client || !selected) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await client.updateOpportunity({
      id: selected.id,
      ...buildInput(),
    });
    if (result.status === 'rejected' || result.status === 'not_found') {
      setBusy(false);
      setError(result.status === 'rejected' ? result.reason : copy.errorLabel);
      return;
    }

    if (body.trim()) {
      const bodyResult = await client.updateOpportunityBody(selected.id, body);
      if (bodyResult.status === 'rejected' || bodyResult.status === 'not_found') {
        setBusy(false);
        setError(
          bodyResult.status === 'rejected' ? bodyResult.reason : copy.errorLabel,
        );
        return;
      }
      setSelected(bodyResult.opportunity);
    } else {
      setSelected(result.opportunity);
    }

    await refresh(client);
    setMessage(copy.savedLabel);
    setBusy(false);
  }

  async function handlePass() {
    if (!client || !selected) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await client.passOpportunity(selected.id);
    setBusy(false);
    if (result.status !== 'passed') {
      setError(result.status === 'rejected' ? result.reason : copy.errorLabel);
      return;
    }
    setSelected(result.opportunity);
    setEvents(await client.listDecisionEvents(selected.id));
    setMessage(copy.passedLabel);
  }

  async function handlePursue() {
    if (!client || !selected) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await client.pursueOpportunity(selected.id);
    setBusy(false);
    if (result.status !== 'pursued') {
      setError(result.status === 'rejected' ? result.reason : copy.errorLabel);
      return;
    }
    setHasApplication(true);
    setEvents(await client.listDecisionEvents(selected.id));
    setMessage(copy.pursuedLabel);
  }

  if (loadState === 'loading') {
    return <Text variant="muted">{copy.loadingLabel}</Text>;
  }
  if (loadState === 'error') {
    return <Text variant="muted">{copy.errorLabel}</Text>;
  }

  if (selectedId && selected) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Heading size="md" as="h2">
            {copy.editHeading}
          </Heading>
          <Link
            href="/labs/job-os/opportunities"
            className="font-body text-sm underline underline-offset-4"
          >
            {copy.backLabel}
          </Link>
        </div>

        <OpportunityFields
          copy={copy}
          employers={employers}
          employerId={employerId}
          setEmployerId={setEmployerId}
          title={title}
          setTitle={setTitle}
          source={source}
          setSource={setSource}
          noticedAt={noticedAt}
          setNoticedAt={setNoticedAt}
          status={status}
          setStatus={setStatus}
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
          body={body}
          setBody={setBody}
        />

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void handleSave()}
          >
            {busy ? copy.savingLabel : copy.saveLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void handlePass()}
          >
            {busy ? copy.passingLabel : copy.passLabel}
          </Button>
          {!hasApplication ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void handlePursue()}
            >
              {busy ? copy.pursuingLabel : copy.pursueLabel}
            </Button>
          ) : (
            <Button
              href={`/labs/job-os/applications`}
              size="sm"
              variant="ghost"
            >
              {jobOs.applications.heading}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Heading size="sm" as="h3">
            {copy.timelineHeading}
          </Heading>
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
        </div>

        {message ? <Text>{message}</Text> : null}
        {error ? <Text>{error}</Text> : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Heading size="md" as="h2">
          {copy.heading}
        </Heading>
        <Text variant="muted">{copy.description}</Text>
      </div>

      <div className="space-y-4">
        <Heading size="sm" as="h3">
          {copy.createHeading}
        </Heading>
        <OpportunityFields
          copy={copy}
          employers={employers}
          employerId={employerId}
          setEmployerId={setEmployerId}
          title={title}
          setTitle={setTitle}
          source={source}
          setSource={setSource}
          noticedAt={noticedAt}
          setNoticedAt={setNoticedAt}
          status={status}
          setStatus={setStatus}
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
          body={body}
          setBody={setBody}
          showBody={false}
        />
        <Button
          type="button"
          size="sm"
          disabled={busy || !employerId}
          onClick={() => void handleCreate()}
        >
          {busy ? copy.creatingLabel : copy.createLabel}
        </Button>
      </div>

      <ul className="space-y-2">
        {opportunities.length === 0 ? (
          <li>
            <Text variant="muted">{copy.emptyList}</Text>
          </li>
        ) : (
          opportunities.map((opportunity) => (
            <li
              key={opportunity.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] py-2"
            >
              <Text>
                {opportunity.title || copy.untitledLabel} · {opportunity.status}
              </Text>
              <Link
                href={`/labs/job-os/opportunities/${opportunity.id}`}
                className="font-body text-sm underline underline-offset-4"
              >
                {copy.openLabel}
              </Link>
            </li>
          ))
        )}
      </ul>

      {message ? <Text>{message}</Text> : null}
      {error ? <Text>{error}</Text> : null}
    </div>
  );
}

type OpportunityFieldsProps = {
  copy: (typeof jobOs)['opportunities'];
  employers: EmployerRecord[];
  employerId: string;
  setEmployerId: (value: string) => void;
  title: string;
  setTitle: (value: string) => void;
  source: string;
  setSource: (value: string) => void;
  noticedAt: string;
  setNoticedAt: (value: string) => void;
  status: OpportunityStatus;
  setStatus: (value: OpportunityStatus) => void;
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
  body: string;
  setBody: (value: string) => void;
  showBody?: boolean;
};

function OpportunityFields({
  copy,
  employers,
  employerId,
  setEmployerId,
  title,
  setTitle,
  source,
  setSource,
  noticedAt,
  setNoticedAt,
  status,
  setStatus,
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
  body,
  setBody,
  showBody = true,
}: OpportunityFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
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
        {copy.sourceLabel}
        <input
          className={jobOsFieldClassName}
          value={source}
          onChange={(event) => setSource(event.target.value)}
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
      {showBody ? (
        <label className="block font-body text-sm md:col-span-2">
          {copy.bodyLabel}
          <Text variant="muted" className="mt-1 block text-sm">
            {copy.bodyHint}
          </Text>
          <textarea
            className={jobOsFieldClassName}
            rows={6}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={copy.noBodyLabel}
          />
        </label>
      ) : null}
    </div>
  );
}
