'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import { jobOsFieldClassName } from '@/components/sections/labs/job-os/job-os-field-styles';
import {
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
  type EmployerPrestigeTier,
  type EmployerRecord,
  type EmployerSector,
  type EmployerSizeTier,
  type JobOs,
  type OpportunityRecord,
  type VocabularyTermRecord,
} from '@/lib/job-os';
import { getDefaultJobOs } from '@/lib/job-os-default';

export type JobOsEmployersWorkspaceProps = {
  jobOsClient?: JobOs;
  selectedId?: string;
};

type CaptureBeat = 1 | 2;

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

export function JobOsEmployersWorkspace({
  jobOsClient,
  selectedId,
}: JobOsEmployersWorkspaceProps) {
  const copy = jobOs.employers;
  const [client, setClient] = useState<JobOs | null>(jobOsClient ?? null);
  const [employers, setEmployers] = useState<EmployerRecord[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyTermRecord[]>([]);
  const [selected, setSelected] = useState<EmployerRecord | null>(null);
  const [body, setBody] = useState('');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureBeat, setCaptureBeat] = useState<CaptureBeat>(1);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [sizeTier, setSizeTier] = useState<EmployerSizeTier>('startup');
  const [prestigeTier, setPrestigeTier] =
    useState<EmployerPrestigeTier>('low');
  const [sector, setSector] = useState<EmployerSector>('technology');
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
        const [listed, listedOpportunities, terms] = await Promise.all([
          resolved.listEmployers(),
          resolved.listOpportunities(),
          resolved.listVocabularyTerms(),
        ]);
        if (cancelled) {
          return;
        }
        setEmployers(listed);
        setOpportunities(listedOpportunities);
        setVocabulary(terms);
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
      setSector(result.employer.sector);
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
      setName('');
      setSizeTier('startup');
      setPrestigeTier('low');
      setSummary('');
      setWebsiteUrl('');
      setLinkedinUrl('');
      setNotes('');
      setCaptureBeat(1);
      setCapturing(true);
      setMessage(null);
      setError(null);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId]);

  function resetCaptureFields() {
    setName('');
    setSizeTier('startup');
    setPrestigeTier('low');
    setSector('technology');
    setSummary('');
    setWebsiteUrl('');
    setLinkedinUrl('');
    setNotes('');
    setCaptureBeat(1);
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
    const [listed, listedOpportunities, terms] = await Promise.all([
      active.listEmployers(),
      active.listOpportunities(),
      active.listVocabularyTerms(),
    ]);
    setEmployers(listed);
    setOpportunities(listedOpportunities);
    setVocabulary(terms);
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
      sector,
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
    setHighlightId(result.employer.id);
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
      const result = await client.updateEmployer({
        id: selected.id,
        name,
        sizeTier,
        prestigeTier,
        sector,
        summary,
        websiteUrl,
        linkedinUrl,
        notes,
      });
      if (result.status === 'rejected' || result.status === 'not_found') {
        setError(result.status === 'rejected' ? result.reason : copy.errorLabel);
        return;
      }

      if (body.trim()) {
        const bodyResult = await client.updateEmployerBody(selected.id, body);
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
        setSelected(bodyResult.employer);
        setMessage(copy.bodySavedLabel);
      } else {
        setSelected(result.employer);
        setMessage(copy.savedLabel);
      }

      await refresh(client);
    } finally {
      setBusy(false);
    }
  }

  function openCountFor(employerId: string): number {
    return opportunities.filter(
      (opportunity) =>
        opportunity.employerId === employerId && opportunity.status === 'open',
    ).length;
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
              {selected.name}
            </Heading>
            {selected.isAnon ? (
              <JobOsPill tone="anon">{copy.anonBadge}</JobOsPill>
            ) : null}
          </div>
          <Link
            href="/labs/job-os/employers"
            className="font-body text-sm text-[var(--mono-500)] underline underline-offset-4"
          >
            {copy.backLabel}
          </Link>
        </div>

        <JobOsFocusSection title={copy.focusIdentityHeading}>
          <EmployerIdentityFields
            copy={copy}
            name={name}
            setName={setName}
            sizeTier={sizeTier}
            setSizeTier={setSizeTier}
            prestigeTier={prestigeTier}
            setPrestigeTier={setPrestigeTier}
            sector={sector}
            setSector={setSector}
            sizeOptions={activeTerms(vocabulary, 'size_tier')}
            prestigeOptions={activeTerms(vocabulary, 'prestige_tier')}
            sectorOptions={activeTerms(vocabulary, 'sector')}
            readOnly={selected.isAnon}
          />
        </JobOsFocusSection>

        <JobOsFocusSection title={copy.focusPresenceHeading}>
          <EmployerPresenceFields
            copy={copy}
            summary={summary}
            setSummary={setSummary}
            websiteUrl={websiteUrl}
            setWebsiteUrl={setWebsiteUrl}
            linkedinUrl={linkedinUrl}
            setLinkedinUrl={setLinkedinUrl}
            notes={notes}
            setNotes={setNotes}
            readOnly={selected.isAnon}
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
              disabled={selected.isAnon}
              onChange={(event) => setBody(event.target.value)}
              placeholder={copy.noBodyLabel}
            />
          </label>
        </JobOsFocusSection>

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
    <div className="space-y-6">
      <JobOsWorkspaceIntro
        heading={copy.heading}
        description={copy.description}
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void handleEnsureAnon()}
            >
              {busy ? copy.ensuringAnonLabel : copy.ensureAnonLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy || capturing}
              onClick={openCapture}
            >
              {copy.addLabel}
            </Button>
          </>
        }
      />

      <JobOsCaptureStrip
        open={capturing}
        title={copy.createHeading}
        dismissLabel={copy.dismissCaptureLabel}
        onDismiss={dismissCapture}
      >
        <div className="space-y-4">
          <EmployerIdentityFields
            copy={copy}
            name={name}
            setName={setName}
            sizeTier={sizeTier}
            setSizeTier={setSizeTier}
            prestigeTier={prestigeTier}
            setPrestigeTier={setPrestigeTier}
            sector={sector}
            setSector={setSector}
            sizeOptions={activeTerms(vocabulary, 'size_tier')}
            prestigeOptions={activeTerms(vocabulary, 'prestige_tier')}
            sectorOptions={activeTerms(vocabulary, 'sector')}
          />
          {captureBeat >= 2 ? (
            <EmployerPresenceFields
              copy={copy}
              summary={summary}
              setSummary={setSummary}
              websiteUrl={websiteUrl}
              setWebsiteUrl={setWebsiteUrl}
              linkedinUrl={linkedinUrl}
              setLinkedinUrl={setLinkedinUrl}
              notes={notes}
              setNotes={setNotes}
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
              disabled={busy || !name.trim()}
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
          copy.columnName,
          copy.columnSize,
          copy.columnPrestige,
          copy.columnSector,
          copy.columnOpen,
          copy.columnBody,
          copy.columnActions,
        ]}
        isEmpty={employers.length === 0}
        empty={copy.emptyList}
      >
        {employers.map((employer) => (
          <JobOsLedgerRow
            key={employer.id}
            highlighted={employer.id === highlightId}
          >
            <JobOsLedgerCell>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{employer.name}</span>
                {employer.isAnon ? (
                  <JobOsPill tone="anon">{copy.anonBadge}</JobOsPill>
                ) : null}
              </div>
              {employer.summary ? (
                <Text
                  variant="muted"
                  className="mt-1 line-clamp-1 text-xs"
                >
                  {employer.summary}
                </Text>
              ) : null}
            </JobOsLedgerCell>
            <JobOsLedgerCell>
              {vocabularyLabel(vocabulary, employer.sizeTier)}
            </JobOsLedgerCell>
            <JobOsLedgerCell>
              {vocabularyLabel(vocabulary, employer.prestigeTier)}
            </JobOsLedgerCell>
            <JobOsLedgerCell>
              {vocabularyLabel(vocabulary, employer.sector)}
            </JobOsLedgerCell>
            <JobOsLedgerCell mono>
              {openCountFor(employer.id)}
            </JobOsLedgerCell>
            <JobOsLedgerCell>
              {employer.s3Key ? copy.hasBodyLabel : copy.noBodyShortLabel}
            </JobOsLedgerCell>
            <JobOsLedgerCell>
              <Link
                href={`/labs/job-os/employers/${employer.id}`}
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

type EmployerCopy = (typeof jobOs)['employers'];

function EmployerIdentityFields({
  copy,
  name,
  setName,
  sizeTier,
  setSizeTier,
  prestigeTier,
  setPrestigeTier,
  sector,
  setSector,
  sizeOptions,
  prestigeOptions,
  sectorOptions,
  readOnly = false,
}: {
  copy: EmployerCopy;
  name: string;
  setName: (value: string) => void;
  sizeTier: EmployerSizeTier;
  setSizeTier: (value: EmployerSizeTier) => void;
  prestigeTier: EmployerPrestigeTier;
  setPrestigeTier: (value: EmployerPrestigeTier) => void;
  sector: EmployerSector;
  setSector: (value: EmployerSector) => void;
  sizeOptions: VocabularyTermRecord[];
  prestigeOptions: VocabularyTermRecord[];
  sectorOptions: VocabularyTermRecord[];
  readOnly?: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label className="block font-body text-sm md:col-span-2 lg:col-span-1">
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
          onChange={(event) => setSizeTier(event.target.value)}
        >
          {sizeOptions.map((term) => (
            <option key={term.id} value={term.value}>
              {term.label}
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
          onChange={(event) => setPrestigeTier(event.target.value)}
        >
          {prestigeOptions.map((term) => (
            <option key={term.id} value={term.value}>
              {term.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-body text-sm">
        {copy.sectorLabel}
        <select
          className={jobOsFieldClassName}
          value={sector}
          disabled={readOnly}
          onChange={(event) => setSector(event.target.value)}
        >
          {sectorOptions.map((term) => (
            <option key={term.id} value={term.value}>
              {term.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function EmployerPresenceFields({
  copy,
  summary,
  setSummary,
  websiteUrl,
  setWebsiteUrl,
  linkedinUrl,
  setLinkedinUrl,
  notes,
  setNotes,
  readOnly = false,
}: {
  copy: EmployerCopy;
  summary: string;
  setSummary: (value: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (value: string) => void;
  linkedinUrl: string;
  setLinkedinUrl: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
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
    </div>
  );
}
