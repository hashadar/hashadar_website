'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import { jobOsFieldClassName } from '@/components/sections/labs/job-os/job-os-field-styles';
import {
  JobOsLedger,
  JobOsLedgerCell,
  JobOsLedgerRow,
  JobOsPill,
  JobOsWorkspaceIntro,
} from '@/components/sections/labs/job-os/job-os-ledger';
import { jobOs } from '@/data';
import {
  APPLICATION_STATUSES,
  isTerminalApplicationStatus,
  type ApplicationRecord,
  type ApplicationStatus,
  type DecisionEventRecord,
  type EmployerRecord,
  type JobOs,
  type OpportunityRecord,
} from '@/lib/job-os';
import { getDefaultJobOs } from '@/lib/job-os-default';

export type JobOsApplicationsWorkspaceProps = {
  jobOsClient?: JobOs;
  selectedId?: string;
};

export function JobOsApplicationsWorkspace({
  jobOsClient,
  selectedId,
}: JobOsApplicationsWorkspaceProps) {
  const copy = jobOs.applications;
  const eventLabels = jobOs.opportunities.eventKindLabels;
  const [client, setClient] = useState<JobOs | null>(jobOsClient ?? null);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [employers, setEmployers] = useState<EmployerRecord[]>([]);
  const [selected, setSelected] = useState<ApplicationRecord | null>(null);
  const [events, setEvents] = useState<DecisionEventRecord[]>([]);
  const [status, setStatus] = useState<ApplicationStatus>('researching');
  const [trackingNote, setTrackingNote] = useState('');
  const [body, setBody] = useState('');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resolved = jobOsClient ?? (await getDefaultJobOs());
        if (cancelled) {
          return;
        }
        setClient(resolved);
        const [listedApplications, listedOpportunities, listedEmployers] =
          await Promise.all([
            resolved.listApplications(),
            resolved.listOpportunities(),
            resolved.listEmployers(),
          ]);
        if (cancelled) {
          return;
        }
        setApplications(listedApplications);
        setOpportunities(listedOpportunities);
        setEmployers(listedEmployers);
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
  }, [jobOsClient]);

  useEffect(() => {
    if (!client || !selectedId) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const detail = await client.getApplicationBody(selectedId);
      if (cancelled || detail.status !== 'ok') {
        return;
      }
      setSelected(detail.application);
      setStatus(detail.application.status);
      setTrackingNote(detail.application.trackingNote ?? '');
      setBody(detail.body ?? '');
      setEvents(
        await client.listDecisionEvents(detail.application.opportunityId),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [client, selectedId, applications]);

  function opportunityFor(opportunityId: string): OpportunityRecord | undefined {
    return opportunities.find((item) => item.id === opportunityId);
  }

  function opportunityTitle(opportunityId: string): string {
    return (
      opportunityFor(opportunityId)?.title || copy.untitledOpportunityLabel
    );
  }

  function employerName(opportunityId: string): string {
    const opportunity = opportunityFor(opportunityId);
    if (!opportunity) {
      return '—';
    }
    return (
      employers.find((employer) => employer.id === opportunity.employerId)
        ?.name ?? '—'
    );
  }

  function statusPillTone(
    value: ApplicationStatus,
  ): 'open' | 'closed' | 'pursuit' {
    if (isTerminalApplicationStatus(value)) {
      return 'closed';
    }
    if (value === 'researching') {
      return 'pursuit';
    }
    return 'open';
  }

  async function refresh(active: JobOs) {
    setApplications(await active.listApplications());
  }

  async function handleStatusSave() {
    if (!client || !selected) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await client.updateApplicationStatus(selected.id, status);
    setBusy(false);
    if (result.status !== 'updated') {
      setError(result.status === 'rejected' ? result.reason : copy.errorLabel);
      return;
    }
    setSelected(result.application);
    setEvents(
      await client.listDecisionEvents(result.application.opportunityId),
    );
    await refresh(client);
    setMessage(copy.statusUpdatedLabel);
  }

  async function handleNoteSave() {
    if (!client || !selected) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await client.updateTrackingNote(selected.id, trackingNote);
    setBusy(false);
    if (result.status !== 'updated') {
      setError(copy.errorLabel);
      return;
    }
    setSelected(result.application);
    await refresh(client);
    setMessage(copy.noteSavedLabel);
  }

  async function handleBodySave() {
    if (!client || !selected) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await client.updateApplicationBody(selected.id, body);
    setBusy(false);
    if (result.status !== 'updated') {
      setError(result.status === 'rejected' ? result.reason : copy.errorLabel);
      return;
    }
    setSelected(result.application);
    await refresh(client);
    setMessage(copy.bodySavedLabel);
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
            {opportunityTitle(selected.opportunityId)}
          </Heading>
          <Text variant="muted">
            {employerName(selected.opportunityId)}
          </Text>
          <Link
            href="/labs/job-os/applications"
            className="inline-block font-body text-sm text-[var(--mono-500)] underline underline-offset-4"
          >
            {copy.backLabel}
          </Link>
        </div>

        <label className="block font-body text-sm">
          {copy.statusLabel}
          <select
            className={jobOsFieldClassName}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ApplicationStatus)
            }
          >
            {APPLICATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {copy.statusOptions[value] ?? value}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void handleStatusSave()}
        >
          {busy ? copy.savingStatusLabel : copy.saveStatusLabel}
        </Button>

        <label className="block font-body text-sm">
          {copy.trackingNoteLabel}
          <Text variant="muted" className="mb-2 mt-1 block text-sm">
            {copy.trackingNoteHint}
          </Text>
          <textarea
            className={jobOsFieldClassName}
            rows={3}
            value={trackingNote}
            onChange={(event) => setTrackingNote(event.target.value)}
          />
        </label>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void handleNoteSave()}
        >
          {busy ? copy.savingNoteLabel : copy.saveNoteLabel}
        </Button>

        <label className="block font-body text-sm">
          {copy.bodyLabel}
          <Text variant="muted" className="mb-2 mt-1 block text-sm">
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
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void handleBodySave()}
        >
          {busy ? copy.savingBodyLabel : copy.saveBodyLabel}
        </Button>

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
                    {eventLabels[event.kind] ?? event.kind}
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
    <div className="space-y-6">
      <JobOsWorkspaceIntro
        heading={copy.heading}
        description={copy.description}
      />

      <JobOsLedger
        caption={copy.heading}
        columns={[
          copy.columnStatus,
          copy.columnRole,
          copy.columnEmployer,
          copy.columnTracking,
          copy.columnBody,
          copy.columnActions,
        ]}
        isEmpty={applications.length === 0}
        empty={copy.emptyList}
      >
        {applications.map((application) => (
          <JobOsLedgerRow key={application.id}>
            <JobOsLedgerCell>
              <JobOsPill tone={statusPillTone(application.status)}>
                {copy.statusOptions[application.status] ?? application.status}
              </JobOsPill>
            </JobOsLedgerCell>
            <JobOsLedgerCell>
              <span className="font-medium">
                {opportunityTitle(application.opportunityId)}
              </span>
            </JobOsLedgerCell>
            <JobOsLedgerCell>
              {employerName(application.opportunityId)}
            </JobOsLedgerCell>
            <JobOsLedgerCell>
              {application.trackingNote ? (
                <Text className="line-clamp-1 text-sm">
                  {application.trackingNote}
                </Text>
              ) : (
                <span className="text-[var(--mono-500)]">—</span>
              )}
            </JobOsLedgerCell>
            <JobOsLedgerCell>
              {application.s3Key ? copy.hasBodyLabel : copy.noBodyShortLabel}
            </JobOsLedgerCell>
            <JobOsLedgerCell>
              <Link
                href={`/labs/job-os/applications/${application.id}`}
                className="font-body text-sm underline underline-offset-4"
              >
                {copy.openLabel}
              </Link>
            </JobOsLedgerCell>
          </JobOsLedgerRow>
        ))}
      </JobOsLedger>

      {message ? <Text>{message}</Text> : null}
      {error ? <Text>{error}</Text> : null}
    </div>
  );
}
