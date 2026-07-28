'use client';

import { useEffect, useState } from 'react';
import { Button, Text } from '@/components/ui';
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
  VOCABULARY_KINDS,
  type JobOs,
  type VocabularyKind,
  type VocabularyTermRecord,
} from '@/lib/job-os';
import { getDefaultJobOs } from '@/lib/job-os-default';

export type JobOsListsWorkspaceProps = {
  jobOsClient?: JobOs;
};

export function JobOsListsWorkspace({ jobOsClient }: JobOsListsWorkspaceProps) {
  const copy = jobOs.lists;
  const [client, setClient] = useState<JobOs | null>(jobOsClient ?? null);
  const [kind, setKind] = useState<VocabularyKind>('sector');
  const [terms, setTerms] = useState<VocabularyTermRecord[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [editingLabels, setEditingLabels] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resolved = jobOsClient ?? (await getDefaultJobOs());
        if (cancelled) {
          return;
        }
        setClient(resolved);
        await resolved.ensureVocabularyDefaults();
        const listed = await resolved.listVocabularyTerms();
        if (cancelled) {
          return;
        }
        setTerms(listed);
        setEditingLabels(
          Object.fromEntries(listed.map((term) => [term.id, term.label])),
        );
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

  async function refresh(active: JobOs) {
    const listed = await active.listVocabularyTerms();
    setTerms(listed);
    setEditingLabels(
      Object.fromEntries(listed.map((term) => [term.id, term.label])),
    );
  }

  async function handleAdd() {
    if (!client) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await client.createVocabularyTerm({
        kind,
        value: newValue,
        label: newLabel,
      });
      if (result.status === 'rejected') {
        setError(result.reason);
        return;
      }
      setNewValue('');
      setNewLabel('');
      await refresh(client);
      setMessage(copy.createdLabel);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveLabel(term: VocabularyTermRecord) {
    if (!client) {
      return;
    }
    const label = editingLabels[term.id] ?? term.label;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await client.updateVocabularyTerm({
        id: term.id,
        label,
      });
      if (result.status === 'rejected') {
        setError(result.reason);
        return;
      }
      if (result.status === 'not_found') {
        setError(copy.errorLabel);
        return;
      }
      await refresh(client);
      setMessage(copy.updatedLabel);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(term: VocabularyTermRecord) {
    if (!client) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await client.updateVocabularyTerm({
        id: term.id,
        active: !term.active,
      });
      if (result.status !== 'updated') {
        setError(
          result.status === 'rejected' ? result.reason : copy.errorLabel,
        );
        return;
      }
      await refresh(client);
      setMessage(copy.updatedLabel);
    } finally {
      setBusy(false);
    }
  }

  const visible = terms.filter((term) => term.kind === kind);

  if (loadState === 'loading') {
    return <Text variant="muted">{copy.loadingLabel}</Text>;
  }

  if (loadState === 'error') {
    return <Text variant="muted">{copy.errorLabel}</Text>;
  }

  return (
    <div className="space-y-8">
      <JobOsWorkspaceIntro
        heading={copy.heading}
        description={copy.description}
      />

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={copy.kindTabsAriaLabel}
      >
        {VOCABULARY_KINDS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={kind === item}
            className={`rounded-sm px-3 py-1.5 font-body text-sm ${
              kind === item
                ? 'bg-[var(--mono-900)] text-[var(--mono-50)]'
                : 'bg-[var(--mono-100)] text-[var(--mono-700)]'
            }`}
            onClick={() => setKind(item)}
          >
            {copy.kindLabels[item] ?? item}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block font-body text-sm">
          {copy.valueLabel}
          <input
            className={jobOsFieldClassName}
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
          />
        </label>
        <label className="block font-body text-sm">
          {copy.labelLabel}
          <input
            className={jobOsFieldClassName}
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
          />
        </label>
        <Button type="button" disabled={busy} onClick={() => void handleAdd()}>
          {busy ? copy.addingLabel : copy.addLabel}
        </Button>
      </div>

      <JobOsLedger
        caption={copy.kindLabels[kind] ?? kind}
        columns={[
          copy.columnValue,
          copy.columnLabel,
          copy.columnActive,
          copy.columnActions,
        ]}
        isEmpty={visible.length === 0}
        empty={copy.emptyList}
      >
        {visible.map((term) => (
          <JobOsLedgerRow key={term.id}>
            <JobOsLedgerCell mono>{term.value}</JobOsLedgerCell>
            <JobOsLedgerCell>
              <input
                className={jobOsFieldClassName}
                value={editingLabels[term.id] ?? term.label}
                onChange={(event) =>
                  setEditingLabels((current) => ({
                    ...current,
                    [term.id]: event.target.value,
                  }))
                }
              />
            </JobOsLedgerCell>
            <JobOsLedgerCell>
              {term.active ? (
                <Text className="text-sm">Yes</Text>
              ) : (
                <JobOsPill tone="anon">{copy.inactiveBadge}</JobOsPill>
              )}
            </JobOsLedgerCell>
            <JobOsLedgerCell>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void handleSaveLabel(term)}
                >
                  {busy ? copy.savingLabel : copy.saveLabel}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void handleToggleActive(term)}
                >
                  {term.active ? copy.deactivateLabel : copy.activateLabel}
                </Button>
              </div>
            </JobOsLedgerCell>
          </JobOsLedgerRow>
        ))}
      </JobOsLedger>

      {message ? <Text>{message}</Text> : null}
      {error ? <Text>{error}</Text> : null}
    </div>
  );
}
