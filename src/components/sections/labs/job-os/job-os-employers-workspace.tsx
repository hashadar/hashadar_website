'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import { jobOsFieldClassName } from '@/components/sections/labs/job-os/job-os-field-styles';
import { jobOs } from '@/data';
import {
  EMPLOYER_PRESTIGE_TIERS,
  EMPLOYER_SIZE_TIERS,
  type EmployerPrestigeTier,
  type EmployerRecord,
  type EmployerSizeTier,
  type JobOs,
} from '@/lib/job-os';
import { getDefaultJobOs } from '@/lib/job-os-default';

export type JobOsEmployersWorkspaceProps = {
  jobOsClient?: JobOs;
  selectedId?: string;
};

export function JobOsEmployersWorkspace({
  jobOsClient,
  selectedId,
}: JobOsEmployersWorkspaceProps) {
  const copy = jobOs.employers;
  const [client, setClient] = useState<JobOs | null>(jobOsClient ?? null);
  const [employers, setEmployers] = useState<EmployerRecord[]>([]);
  const [selected, setSelected] = useState<EmployerRecord | null>(null);
  const [body, setBody] = useState('');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [sizeTier, setSizeTier] = useState<EmployerSizeTier>('startup');
  const [prestigeTier, setPrestigeTier] =
    useState<EmployerPrestigeTier>('low');
  const [summary, setSummary] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [notes, setNotes] = useState('');

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
        const listed = await resolved.listEmployers();
        if (cancelled) {
          return;
        }
        setEmployers(listed);
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
      const result = await client.getEmployerBody(selectedId);
      if (cancelled || result.status !== 'ok') {
        return;
      }
      setSelected(result.employer);
      setName(result.employer.name);
      setSizeTier(result.employer.sizeTier);
      setPrestigeTier(result.employer.prestigeTier);
      setSummary(result.employer.summary ?? '');
      setWebsiteUrl(result.employer.websiteUrl ?? '');
      setLinkedinUrl(result.employer.linkedinUrl ?? '');
      setNotes(result.employer.notes ?? '');
      setBody(result.body ?? '');
    })();

    return () => {
      cancelled = true;
    };
  }, [client, selectedId, employers]);

  async function refresh(active: JobOs) {
    const listed = await active.listEmployers();
    setEmployers(listed);
  }

  async function handleEnsureAnon() {
    if (!client) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await client.ensureAnonEmployer();
      await refresh(client);
      setMessage(copy.anonReadyLabel);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorLabel);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!client) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await client.createEmployer({
      name,
      sizeTier,
      prestigeTier,
      summary,
      websiteUrl,
      linkedinUrl,
      notes,
    });
    setBusy(false);
    if (result.status === 'rejected') {
      setError(result.reason);
      return;
    }
    await refresh(client);
    setMessage(copy.createdLabel);
    setName('');
    setSummary('');
    setWebsiteUrl('');
    setLinkedinUrl('');
    setNotes('');
  }

  async function handleSave() {
    if (!client || !selected) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await client.updateEmployer({
      id: selected.id,
      name,
      sizeTier,
      prestigeTier,
      summary,
      websiteUrl,
      linkedinUrl,
      notes,
    });
    if (result.status === 'rejected' || result.status === 'not_found') {
      setBusy(false);
      setError(result.status === 'rejected' ? result.reason : copy.errorLabel);
      return;
    }

    if (body.trim()) {
      const bodyResult = await client.updateEmployerBody(selected.id, body);
      if (bodyResult.status === 'rejected' || bodyResult.status === 'not_found') {
        setBusy(false);
        setError(
          bodyResult.status === 'rejected' ? bodyResult.reason : copy.errorLabel,
        );
        return;
      }
      setSelected(bodyResult.employer);
      setMessage(copy.bodySavedLabel);
    } else {
      setSelected(result.employer);
      setMessage(copy.savedLabel);
    }

    await refresh(client);
    setBusy(false);
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
            href="/labs/job-os/employers"
            className="font-body text-sm underline underline-offset-4"
          >
            {copy.backLabel}
          </Link>
        </div>
        {selected.isAnon ? (
          <Text variant="muted">{copy.anonBadge}</Text>
        ) : null}
        <EmployerFields
          copy={copy}
          name={name}
          setName={setName}
          sizeTier={sizeTier}
          setSizeTier={setSizeTier}
          prestigeTier={prestigeTier}
          setPrestigeTier={setPrestigeTier}
          summary={summary}
          setSummary={setSummary}
          websiteUrl={websiteUrl}
          setWebsiteUrl={setWebsiteUrl}
          linkedinUrl={linkedinUrl}
          setLinkedinUrl={setLinkedinUrl}
          notes={notes}
          setNotes={setNotes}
          body={body}
          setBody={setBody}
          readOnly={selected.isAnon}
        />
        {!selected.isAnon ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void handleSave()}
          >
            {busy ? copy.savingLabel : copy.saveLabel}
          </Button>
        ) : null}
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

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void handleEnsureAnon()}
        >
          {busy ? copy.ensuringAnonLabel : copy.ensureAnonLabel}
        </Button>
      </div>

      <div className="space-y-4">
        <Heading size="sm" as="h3">
          {copy.createHeading}
        </Heading>
        <EmployerFields
          copy={copy}
          name={name}
          setName={setName}
          sizeTier={sizeTier}
          setSizeTier={setSizeTier}
          prestigeTier={prestigeTier}
          setPrestigeTier={setPrestigeTier}
          summary={summary}
          setSummary={setSummary}
          websiteUrl={websiteUrl}
          setWebsiteUrl={setWebsiteUrl}
          linkedinUrl={linkedinUrl}
          setLinkedinUrl={setLinkedinUrl}
          notes={notes}
          setNotes={setNotes}
          body={body}
          setBody={setBody}
          showBody={false}
        />
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void handleCreate()}
        >
          {busy ? copy.creatingLabel : copy.createLabel}
        </Button>
      </div>

      <ul className="space-y-2">
        {employers.length === 0 ? (
          <li>
            <Text variant="muted">{copy.emptyList}</Text>
          </li>
        ) : (
          employers.map((employer) => (
            <li
              key={employer.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] py-2"
            >
              <div>
                <Text>
                  {employer.name}
                  {employer.isAnon ? ` (${copy.anonBadge})` : ''}
                </Text>
              </div>
              <Link
                href={`/labs/job-os/employers/${employer.id}`}
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

type EmployerFieldsProps = {
  copy: (typeof jobOs)['employers'];
  name: string;
  setName: (value: string) => void;
  sizeTier: EmployerSizeTier;
  setSizeTier: (value: EmployerSizeTier) => void;
  prestigeTier: EmployerPrestigeTier;
  setPrestigeTier: (value: EmployerPrestigeTier) => void;
  summary: string;
  setSummary: (value: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (value: string) => void;
  linkedinUrl: string;
  setLinkedinUrl: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  showBody?: boolean;
  readOnly?: boolean;
};

function EmployerFields({
  copy,
  name,
  setName,
  sizeTier,
  setSizeTier,
  prestigeTier,
  setPrestigeTier,
  summary,
  setSummary,
  websiteUrl,
  setWebsiteUrl,
  linkedinUrl,
  setLinkedinUrl,
  notes,
  setNotes,
  body,
  setBody,
  showBody = true,
  readOnly = false,
}: EmployerFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block font-body text-sm">
        {copy.nameLabel}
        <input
          className={jobOsFieldClassName}
          value={name}
          disabled={readOnly}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="block font-body text-sm">
        {copy.sizeTierLabel}
        <select
          className={jobOsFieldClassName}
          value={sizeTier}
          disabled={readOnly}
          onChange={(event) =>
            setSizeTier(event.target.value as EmployerSizeTier)
          }
        >
          {EMPLOYER_SIZE_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {copy.sizeTierOptions[tier] ?? tier}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-body text-sm">
        {copy.prestigeTierLabel}
        <select
          className={jobOsFieldClassName}
          value={prestigeTier}
          disabled={readOnly}
          onChange={(event) =>
            setPrestigeTier(event.target.value as EmployerPrestigeTier)
          }
        >
          {EMPLOYER_PRESTIGE_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {copy.prestigeTierOptions[tier] ?? tier}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-body text-sm md:col-span-2">
        {copy.summaryLabel}
        <textarea
          className={jobOsFieldClassName}
          rows={2}
          value={summary}
          disabled={readOnly}
          onChange={(event) => setSummary(event.target.value)}
        />
      </label>
      <label className="block font-body text-sm">
        {copy.websiteUrlLabel}
        <input
          className={jobOsFieldClassName}
          value={websiteUrl}
          disabled={readOnly}
          onChange={(event) => setWebsiteUrl(event.target.value)}
        />
      </label>
      <label className="block font-body text-sm">
        {copy.linkedinUrlLabel}
        <input
          className={jobOsFieldClassName}
          value={linkedinUrl}
          disabled={readOnly}
          onChange={(event) => setLinkedinUrl(event.target.value)}
        />
      </label>
      <label className="block font-body text-sm md:col-span-2">
        {copy.notesLabel}
        <textarea
          className={jobOsFieldClassName}
          rows={2}
          value={notes}
          disabled={readOnly}
          onChange={(event) => setNotes(event.target.value)}
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
            disabled={readOnly}
            onChange={(event) => setBody(event.target.value)}
            placeholder={copy.noBodyLabel}
          />
        </label>
      ) : null}
    </div>
  );
}
