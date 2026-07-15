'use client';

import { useEffect, useState } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import { corpusFieldClassName } from '@/components/sections/labs/console/corpus/corpus-field-styles';
import { jobMarketLab } from '@/data';
import {
  createEmployer,
  updateEmployer,
  EMPLOYER_PRESTIGE_TIERS,
  EMPLOYER_SIZE_TIERS,
  type EmployerPrestigeTier,
  type EmployerRecord,
  type EmployerSizeTier,
} from '@/lib/job-market-employers';
import type { AmplifyEmployerDeps } from '@/lib/job-market-employers-amplify';

export type JobMarketCorpusEmployersModalProps = {
  open: boolean;
  employers: EmployerRecord[];
  employerDeps: AmplifyEmployerDeps;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
};

export function JobMarketCorpusEmployersModal({
  open,
  employers,
  employerDeps,
  onClose,
  onChanged,
}: JobMarketCorpusEmployersModalProps) {
  const copy = jobMarketLab.console.corpusWorkspace;
  const [createName, setCreateName] = useState('');
  const [createSize, setCreateSize] = useState<EmployerSizeTier>('startup');
  const [createPrestige, setCreatePrestige] =
    useState<EmployerPrestigeTier>('low');
  const [drafts, setDrafts] = useState<Record<string, EmployerRecord>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(employers.map((record) => [record.id, { ...record }])),
    );
  }, [employers]);

  if (!open) {
    return null;
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const result = await createEmployer(
        {
          name: createName,
          sizeTier: createSize,
          prestigeTier: createPrestige,
        },
        employerDeps,
      );
      if (result.status === 'rejected') {
        setError(result.reason);
        return;
      }
      setCreateName('');
      setMessage(copy.employersCreatedMessage);
      await onChanged();
    } catch {
      setError(copy.employersError);
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(id: string) {
    const draft = drafts[id];
    if (!draft) {
      return;
    }
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const result = await updateEmployer(draft, employerDeps);
      if (result.status === 'rejected') {
        setError(result.reason);
        return;
      }
      if (result.status === 'not_found') {
        setError(copy.employersError);
        return;
      }
      setMessage(copy.employersSavedMessage);
      await onChanged();
    } catch {
      setError(copy.employersError);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="corpus-employers-heading"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md border border-[var(--border)] border-l-4 border-l-[var(--primary)] bg-[var(--background)] p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <Heading as="h2" size="md" id="corpus-employers-heading">
              {copy.employersModalHeading}
            </Heading>
            <Text variant="muted" size="sm">
              {copy.employersModalDescription}
            </Text>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            {copy.employersModalCloseLabel}
          </Button>
        </div>

        <div className="mb-6 grid gap-2 sm:grid-cols-[1fr_8rem_8rem_auto]">
          <input
            className={corpusFieldClassName}
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            aria-label={copy.employersNameLabel}
            placeholder={copy.employersNameLabel}
          />
          <select
            className={corpusFieldClassName}
            value={createSize}
            onChange={(event) =>
              setCreateSize(event.target.value as EmployerSizeTier)
            }
            aria-label={copy.employersSizeLabel}
          >
            {EMPLOYER_SIZE_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
          <select
            className={corpusFieldClassName}
            value={createPrestige}
            onChange={(event) =>
              setCreatePrestige(event.target.value as EmployerPrestigeTier)
            }
            aria-label={copy.employersPrestigeLabel}
          >
            {EMPLOYER_PRESTIGE_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || !createName.trim()}
          >
            {creating ? copy.employersCreatingLabel : copy.employersCreateLabel}
          </Button>
        </div>

        {employers.length === 0 ? (
          <Text variant="muted">{copy.employersEmpty}</Text>
        ) : (
          <ul className="space-y-3">
            {employers.map((record) => {
              const draft = drafts[record.id] ?? record;
              return (
                <li
                  key={record.id}
                  className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem_auto]"
                >
                  <input
                    className={corpusFieldClassName}
                    value={draft.name}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [record.id]: { ...draft, name: event.target.value },
                      }))
                    }
                    aria-label={`${copy.employersNameLabel} ${record.id}`}
                  />
                  <select
                    className={corpusFieldClassName}
                    value={draft.sizeTier}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [record.id]: {
                          ...draft,
                          sizeTier: event.target.value as EmployerSizeTier,
                        },
                      }))
                    }
                    aria-label={`${copy.employersSizeLabel} ${record.id}`}
                  >
                    {EMPLOYER_SIZE_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                  <select
                    className={corpusFieldClassName}
                    value={draft.prestigeTier}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [record.id]: {
                          ...draft,
                          prestigeTier: event.target
                            .value as EmployerPrestigeTier,
                        },
                      }))
                    }
                    aria-label={`${copy.employersPrestigeLabel} ${record.id}`}
                  >
                    {EMPLOYER_PRESTIGE_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSave(record.id)}
                    disabled={busyId === record.id}
                  >
                    {busyId === record.id
                      ? copy.employersSavingLabel
                      : copy.employersSaveLabel}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {message ? (
          <p role="status" className="mt-4 font-body text-sm text-[var(--foreground)]">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-4 font-body text-sm text-[var(--foreground)]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
