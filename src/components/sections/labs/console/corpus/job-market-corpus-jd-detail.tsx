'use client';

import { useEffect, useState } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import { corpusFieldClassName } from '@/components/sections/labs/console/corpus/corpus-field-styles';
import { jobMarketLab } from '@/data';
import { displayTitle } from '@/lib/job-market-corpus-table';
import type { JobDescriptionCorpusRecord } from '@/lib/job-market-corpus';
import {
  COMPENSATION_DISCLOSURES,
  COMPENSATION_PERIODS,
  JOB_DESCRIPTION_ROLE_FAMILIES,
  JOB_DESCRIPTION_SENIORITIES,
  resolveCompensationDisclosure,
  updateJobDescriptionStructuredFields,
  type CompensationDisclosure,
  type CompensationPeriod,
  type EmployerRecord,
  type JobDescriptionRoleFamily,
  type JobDescriptionSeniority,
  type JobDescriptionStructuredFieldsPatch,
  type UpdateJobDescriptionStructuredFieldsDeps,
} from '@/lib/job-market-employers';
import {
  fetchJobDescriptionMarkdown,
  type FetchJobDescriptionMarkdownDeps,
} from '@/lib/fetch-job-description-markdown';
import {
  overwriteJobDescriptionMarkdown,
  type UploadJobDescriptionDeps,
} from '@/lib/upload-job-description';
import {
  checkEmployerInRegistry,
  mergeModelFieldsIntoMarkdown,
} from '@/lib/job-description-frontmatter';
import { cn } from '@/lib/utils';

export type JobMarketCorpusJdDetailProps = {
  record: JobDescriptionCorpusRecord;
  employers: EmployerRecord[];
  metadataDeps: UpdateJobDescriptionStructuredFieldsDeps;
  markdownDeps: FetchJobDescriptionMarkdownDeps;
  uploadDeps?: UploadJobDescriptionDeps;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
};

type MetadataDraft = {
  employerId: string;
  seniority: string;
  roleFamily: string;
  compensationDisclosure: CompensationDisclosure;
  compensationCurrency: string;
  compensationMin: string;
  compensationMax: string;
  compensationPeriod: string;
};

function toMetadataDraft(record: JobDescriptionCorpusRecord): MetadataDraft {
  return {
    employerId: record.employerId ?? '',
    seniority: record.seniority ?? '',
    roleFamily: record.roleFamily ?? '',
    compensationDisclosure: resolveCompensationDisclosure(record),
    compensationCurrency: record.compensationCurrency ?? '',
    compensationMin:
      record.compensationMin != null ? String(record.compensationMin) : '',
    compensationMax:
      record.compensationMax != null ? String(record.compensationMax) : '',
    compensationPeriod: record.compensationPeriod ?? '',
  };
}

function parseOptionalNumber(value: string): number | null | undefined {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function JobMarketCorpusJdDetail({
  record,
  employers,
  metadataDeps,
  markdownDeps,
  uploadDeps,
  onClose,
  onChanged,
}: JobMarketCorpusJdDetailProps) {
  const copy = jobMarketLab.console.corpusWorkspace;
  const frontmatterMergedNotice = copy.frontmatterMergedNotice;
  const [markdown, setMarkdown] = useState('');
  const [markdownStatus, setMarkdownStatus] = useState<
    'loading' | 'ready' | 'error' | 'missing'
  >(() => (record.s3Key?.trim() ? 'loading' : 'missing'));
  const [draft, setDraft] = useState<MetadataDraft>(() => toMetadataDraft(record));
  const [savingMarkdown, setSavingMarkdown] = useState(false);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncedRecord, setSyncedRecord] = useState(record);

  if (record !== syncedRecord) {
    setSyncedRecord(record);
    setDraft(toMetadataDraft(record));
    setMessage(null);
    setError(null);
    setMarkdown('');
    setMarkdownStatus(record.s3Key?.trim() ? 'loading' : 'missing');
  }

  useEffect(() => {
    const key = record.s3Key?.trim();
    if (!key) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const body = await fetchJobDescriptionMarkdown(key, markdownDeps);
        if (cancelled) {
          return;
        }
        if (body == null) {
          setMarkdown('');
          setMarkdownStatus('error');
          return;
        }
        const merged = mergeModelFieldsIntoMarkdown(body, {
          title: record.title,
          source: record.source,
          employerId: record.employerId,
          seniority: record.seniority,
          roleFamily: record.roleFamily,
          compensationDisclosure: record.compensationDisclosure,
          compensationCurrency: record.compensationCurrency,
          compensationMin: record.compensationMin,
          compensationMax: record.compensationMax,
          compensationPeriod: record.compensationPeriod,
        });
        setMarkdown(merged);
        setMarkdownStatus('ready');
        if (merged !== body) {
          setMessage(frontmatterMergedNotice);
        }
      } catch {
        if (!cancelled) {
          setMarkdown('');
          setMarkdownStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [record, markdownDeps, frontmatterMergedNotice]);

  async function handleSaveMarkdown() {
    const key = record.s3Key?.trim();
    if (!key) {
      setError(copy.markdownMissingKey);
      return;
    }
    setSavingMarkdown(true);
    setMessage(null);
    setError(null);
    try {
      const result = await overwriteJobDescriptionMarkdown(
        { s3Key: key, body: markdown },
        uploadDeps,
      );
      if (result.status === 'rejected') {
        setError(result.reason);
        return;
      }
      setMessage(copy.markdownSavedMessage);
    } catch {
      setError(copy.markdownSaveError);
    } finally {
      setSavingMarkdown(false);
    }
  }

  async function handleSaveMetadata() {
    setSavingMetadata(true);
    setMessage(null);
    setError(null);

    const disclosure = draft.compensationDisclosure;
    const isRange = disclosure === 'range';
    const min = isRange ? parseOptionalNumber(draft.compensationMin) : null;
    const max = isRange ? parseOptionalNumber(draft.compensationMax) : null;
    if (isRange && (min === undefined || max === undefined)) {
      setError(copy.metadataSaveError);
      setSavingMetadata(false);
      return;
    }

    const patch: JobDescriptionStructuredFieldsPatch = {
      employerId: draft.employerId || null,
      seniority: (draft.seniority || null) as JobDescriptionSeniority | null,
      roleFamily: (draft.roleFamily || null) as JobDescriptionRoleFamily | null,
      compensationDisclosure: disclosure,
      compensationCurrency: isRange
        ? draft.compensationCurrency.trim() || null
        : null,
      compensationMin: min ?? null,
      compensationMax: max ?? null,
      compensationPeriod: isRange
        ? ((draft.compensationPeriod || null) as CompensationPeriod | null)
        : null,
    };

    try {
      const result = await updateJobDescriptionStructuredFields(
        record.id,
        patch,
        metadataDeps,
      );
      if (result.status === 'rejected') {
        setError(result.reason);
        return;
      }
      if (result.status === 'not_found') {
        setError(copy.metadataSaveError);
        return;
      }
      setMessage(copy.metadataSavedMessage);
      await onChanged();
    } catch {
      setError(copy.metadataSaveError);
    } finally {
      setSavingMetadata(false);
    }
  }

  const employerCheck = checkEmployerInRegistry(
    draft.employerId || undefined,
    employers.map((employer) => employer.id),
  );

  const panel = (
    <div className="flex min-h-0 flex-col gap-3 sm:gap-4">
      <div className="sticky top-0 z-10 -mx-3 flex items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--background)] px-3 pb-3 pt-0 sm:-mx-4 sm:px-4 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="min-w-0 space-y-0.5">
          <Heading as="h3" size="sm">
            {copy.detailHeading}
          </Heading>
          <Text size="sm" variant="muted" className="break-words">
            {displayTitle(record)}
          </Text>
        </div>
        <Button type="button" variant="ghost" className="shrink-0" onClick={onClose}>
          {copy.closeDetailLabel}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <div className="order-2 flex min-h-0 min-w-0 flex-col gap-2 lg:order-1">
          <Text size="sm">{copy.markdownLabel}</Text>
          {markdownStatus === 'loading' ? (
            <Text variant="muted">{copy.markdownLoading}</Text>
          ) : null}
          {markdownStatus === 'error' ? (
            <p role="alert" className="font-body text-sm">
              {copy.markdownError}
            </p>
          ) : null}
          {markdownStatus === 'missing' ? (
            <Text variant="muted">{copy.markdownMissingKey}</Text>
          ) : null}
          {markdownStatus === 'ready' || markdownStatus === 'error' ? (
            <>
              <textarea
                className={cn(
                  corpusFieldClassName,
                  'min-h-[11rem] w-full max-w-full flex-1 resize-y font-mono text-xs leading-relaxed lg:min-h-[20rem]',
                )}
                value={markdown}
                onChange={(event) => setMarkdown(event.target.value)}
                aria-label={copy.markdownLabel}
              />
              <Button
                type="button"
                onClick={() => void handleSaveMarkdown()}
                disabled={savingMarkdown || !record.s3Key}
              >
                {savingMarkdown
                  ? copy.savingMarkdownLabel
                  : copy.saveMarkdownLabel}
              </Button>
            </>
          ) : null}
        </div>

        <div className="order-1 min-w-0 space-y-2.5 lg:order-2 lg:space-y-3">
          <Heading as="h4" size="sm">
            {copy.metadataHeading}
          </Heading>
          <label className="block space-y-1">
            <Text size="sm">{copy.employerLabel}</Text>
            <select
              className={corpusFieldClassName}
              value={draft.employerId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  employerId: event.target.value,
                }))
              }
            >
              <option value="">{copy.noEmployerOption}</option>
              {employers.map((employer) => (
                <option key={employer.id} value={employer.id}>
                  {employer.name}
                </option>
              ))}
            </select>
          </label>
          {employerCheck.status === 'unset' ? (
            <p role="status" className="font-body text-sm text-[var(--mono-500)]">
              {copy.employerUnsetWarning}
            </p>
          ) : null}
          {employerCheck.status === 'unknown' ? (
            <p role="alert" className="font-body text-sm text-[var(--foreground)]">
              {copy.employerUnknownWarning.replace('{id}', employerCheck.employerId)}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <label className="block min-w-0 space-y-1">
              <Text size="sm">{copy.seniorityLabel}</Text>
              <select
                className={corpusFieldClassName}
                value={draft.seniority}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    seniority: event.target.value,
                  }))
                }
              >
                <option value="">{copy.unsetOption}</option>
                {JOB_DESCRIPTION_SENIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 space-y-1">
              <Text size="sm">{copy.roleFamilyLabel}</Text>
              <select
                className={corpusFieldClassName}
                value={draft.roleFamily}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    roleFamily: event.target.value,
                  }))
                }
              >
                <option value="">{copy.unsetOption}</option>
                {JOB_DESCRIPTION_ROLE_FAMILIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block min-w-0 space-y-1 col-span-2">
              <Text size="sm">{copy.compensationDisclosureLabel}</Text>
              <select
                className={corpusFieldClassName}
                value={draft.compensationDisclosure}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    compensationDisclosure: event.target
                      .value as CompensationDisclosure,
                  }))
                }
              >
                {COMPENSATION_DISCLOSURES.map((value) => (
                  <option key={value} value={value}>
                    {copy.compensationDisclosureOptions[value]}
                  </option>
                ))}
              </select>
            </label>
            {draft.compensationDisclosure === 'range' ? (
              <>
                <label className="block min-w-0 space-y-1">
                  <Text size="sm">{copy.compensationCurrencyLabel}</Text>
                  <input
                    className={corpusFieldClassName}
                    value={draft.compensationCurrency}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        compensationCurrency: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block min-w-0 space-y-1">
                  <Text size="sm">{copy.compensationPeriodLabel}</Text>
                  <select
                    className={corpusFieldClassName}
                    value={draft.compensationPeriod}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        compensationPeriod: event.target.value,
                      }))
                    }
                  >
                    <option value="">{copy.unsetOption}</option>
                    {COMPENSATION_PERIODS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-0 space-y-1">
                  <Text size="sm">{copy.compensationMinLabel}</Text>
                  <input
                    className={corpusFieldClassName}
                    inputMode="decimal"
                    value={draft.compensationMin}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        compensationMin: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block min-w-0 space-y-1">
                  <Text size="sm">{copy.compensationMaxLabel}</Text>
                  <input
                    className={corpusFieldClassName}
                    inputMode="decimal"
                    value={draft.compensationMax}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        compensationMax: event.target.value,
                      }))
                    }
                  />
                </label>
              </>
            ) : null}
          </div>
          {record.source ? (
            <Text size="sm" variant="muted" className="break-all">
              {copy.sourceLabel}: {record.source}
            </Text>
          ) : null}
          <Button
            type="button"
            onClick={() => void handleSaveMetadata()}
            disabled={savingMetadata}
          >
            {savingMetadata
              ? copy.savingMetadataLabel
              : copy.saveMetadataLabel}
          </Button>
        </div>
      </div>

      {message ? (
        <p role="status" className="font-body text-sm text-[var(--foreground)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="font-body text-sm text-[var(--foreground)]">
          {error}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="fixed inset-x-0 bottom-0 top-20 z-40 overflow-x-hidden overflow-y-auto border border-[var(--border)] border-l-4 border-l-[var(--primary)] bg-[var(--background)] p-3 shadow-lg sm:p-4 lg:static lg:inset-auto lg:z-auto lg:mt-4 lg:max-w-none lg:rounded-md lg:shadow-none">
      {panel}
    </div>
  );
}
