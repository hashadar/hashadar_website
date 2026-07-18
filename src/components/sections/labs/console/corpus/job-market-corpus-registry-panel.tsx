'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import { corpusFieldClassName } from '@/components/sections/labs/console/corpus/corpus-field-styles';
import { jobMarketLab } from '@/data';
import type { JobDescriptionCorpusRecord } from '@/lib/job-market-corpus';
import { hasMissingPay } from '@/lib/job-market-corpus-table';
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
import {
  listPendingScrapeCandidates,
  type ScrapeCandidateRecord,
} from '@/lib/scrape-candidates';
import {
  createDefaultAmplifyScrapeCandidateDeps,
} from '@/lib/scrape-candidates-amplify';
import {
  listAnalysisRuns,
  type AnalysisRunRecord,
} from '@/lib/job-market-analysis-runs';
import {
  createDefaultAmplifyAnalysisRunDeps,
} from '@/lib/job-market-analysis-runs-amplify';
import { cn } from '@/lib/utils';

export type JobMarketCorpusRegistryPanelProps = {
  records: JobDescriptionCorpusRecord[];
  employers: EmployerRecord[];
  employerDeps: AmplifyEmployerDeps;
  onChanged: () => void | Promise<void>;
  listPendingCandidates?: () => Promise<ScrapeCandidateRecord[]>;
  listRuns?: () => Promise<AnalysisRunRecord[]>;
};

type AuditLoad =
  | { status: 'idle' | 'loading' }
  | {
      status: 'ready';
      pendingIntake: number;
      runsTotal: number;
      runsFailed: number;
      lastRunStatus?: string;
    }
  | { status: 'error' };

export function JobMarketCorpusRegistryPanel({
  records,
  employers,
  employerDeps,
  onChanged,
  listPendingCandidates,
  listRuns,
}: JobMarketCorpusRegistryPanelProps) {
  const copy = jobMarketLab.console.corpusWorkspace;
  const [open, setOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSize, setCreateSize] = useState<EmployerSizeTier>('startup');
  const [createPrestige, setCreatePrestige] =
    useState<EmployerPrestigeTier>('low');
  const [drafts, setDrafts] = useState<Record<string, EmployerRecord>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditLoad>({ status: 'idle' });

  useEffect(() => {
    setDrafts(
      Object.fromEntries(employers.map((record) => [record.id, { ...record }])),
    );
  }, [employers]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setAudit({ status: 'loading' });

    void (async () => {
      try {
        const pendingFn =
          listPendingCandidates ??
          (() =>
            listPendingScrapeCandidates(
              createDefaultAmplifyScrapeCandidateDeps(),
            ));
        const runsFn =
          listRuns ??
          (async () =>
            listAnalysisRuns(await createDefaultAmplifyAnalysisRunDeps()));

        const [pending, runs] = await Promise.all([pendingFn(), runsFn()]);
        if (cancelled) {
          return;
        }
        const failed = runs.filter((run) => run.status === 'failed').length;
        const last = runs[0];
        setAudit({
          status: 'ready',
          pendingIntake: pending.length,
          runsTotal: runs.length,
          runsFailed: failed,
          lastRunStatus: last?.status,
        });
      } catch {
        if (!cancelled) {
          setAudit({ status: 'error' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, listPendingCandidates, listRuns]);

  const jdAudit = useMemo(() => {
    const active = records.filter((record) => record.status === 'active').length;
    const archived = records.filter(
      (record) => record.status === 'archived',
    ).length;
    const missingEmployer = records.filter(
      (record) => record.status === 'active' && !record.employerId,
    ).length;
    const missingPay = records.filter(
      (record) => record.status === 'active' && hasMissingPay(record),
    ).length;
    return {
      total: records.length,
      active,
      archived,
      missingEmployer,
      missingPay,
      employers: employers.length,
    };
  }, [records, employers]);

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
    <section className="rounded-md border border-[var(--border)] border-l-4 border-l-[var(--primary)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <div className="space-y-0.5">
          <Heading as="h3" size="sm">
            {copy.registryHeading}
          </Heading>
          <Text as="span" size="xs" variant="muted">
            {copy.registryDescription}
          </Text>
        </div>
        <Text as="span" size="sm" variant="muted">
          {open ? copy.registryCollapseLabel : copy.registryExpandLabel}
        </Text>
      </button>

      <div
        className={cn(
          'space-y-6 border-t border-[var(--border)] px-4 py-4',
          !open && 'hidden',
        )}
      >
        <div className="space-y-3">
          <Heading as="h4" size="sm">
            {copy.auditHeading}
          </Heading>
          <Text size="sm" variant="muted">
            {copy.auditDescription}
          </Text>
          <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <AuditStat
              label={copy.auditJobDescriptionsLabel}
              value={String(jdAudit.total)}
            />
            <AuditStat
              label={copy.auditActiveLabel}
              value={String(jdAudit.active)}
            />
            <AuditStat
              label={copy.auditArchivedLabel}
              value={String(jdAudit.archived)}
            />
            <AuditStat
              label={copy.auditMissingEmployerLabel}
              value={String(jdAudit.missingEmployer)}
            />
            <AuditStat
              label={copy.auditMissingPayLabel}
              value={String(jdAudit.missingPay)}
            />
            <AuditStat
              label={copy.auditEmployersLabel}
              value={String(jdAudit.employers)}
            />
            {audit.status === 'ready' ? (
              <>
                <AuditStat
                  label={copy.auditPendingIntakeLabel}
                  value={String(audit.pendingIntake)}
                />
                <AuditStat
                  label={copy.auditRunsLabel}
                  value={String(audit.runsTotal)}
                />
                <AuditStat
                  label={copy.auditFailedRunsLabel}
                  value={String(audit.runsFailed)}
                />
              </>
            ) : null}
          </dl>
          {audit.status === 'loading' ? (
            <Text size="sm" variant="muted">
              {copy.auditLoadingLabel}
            </Text>
          ) : null}
          {audit.status === 'error' ? (
            <p role="alert" className="font-body text-sm text-[var(--foreground)]">
              {copy.auditErrorLabel}
            </p>
          ) : null}
        </div>

        <div className="space-y-3 border-t border-[var(--border)] pt-4">
          <Heading as="h4" size="sm">
            {copy.employersModalHeading}
          </Heading>
          <Text size="sm" variant="muted">
            {copy.employersModalDescription}
          </Text>

          <div className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem_auto]">
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
              size="sm"
              onClick={() => void handleCreate()}
              disabled={creating || !createName.trim()}
            >
              {creating ? copy.employersCreatingLabel : copy.employersCreateLabel}
            </Button>
          </div>

          {employers.length === 0 ? (
            <Text size="sm" variant="muted">
              {copy.employersEmpty}
            </Text>
          ) : (
            <ul className="space-y-2">
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
                      size="sm"
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
            <p
              role="status"
              className="font-body text-sm text-[var(--foreground)]"
            >
              {message}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="font-body text-sm text-[var(--foreground)]"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AuditStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] px-3 py-2">
      <dt className="font-body text-xs text-[var(--mono-500)]">{label}</dt>
      <dd className="font-body text-sm font-medium text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}
