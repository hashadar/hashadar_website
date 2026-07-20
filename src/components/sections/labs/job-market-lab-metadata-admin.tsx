'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Heading, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import type { JobDescriptionCorpusRecord } from '@/lib/job-market-corpus';
import type { AmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
import { createDefaultAmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
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
  type UpdateJobDescriptionStructuredFieldsDeps,
} from '@/lib/job-market-employers';
import {
  createAmplifyMetadataDeps,
  createDefaultAmplifyEmployerDeps,
  type AmplifyEmployerDeps,
} from '@/lib/job-market-employers-amplify';

export type JobMarketLabMetadataAdminProps = {
  corpus?: AmplifyCorpusDeps;
  employers?: AmplifyEmployerDeps;
  metadata?: UpdateJobDescriptionStructuredFieldsDeps;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; records: JobDescriptionCorpusRecord[]; employers: EmployerRecord[] }
  | { status: 'error' };

type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; title: string }
  | { status: 'rejected'; reason: string };

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

const fieldClassName =
  'w-full rounded-md border border-[color-mix(in_oklab,var(--foreground)_20%,transparent)] bg-transparent px-3 py-2 font-body text-base text-[var(--foreground)]';

function toDraft(record: JobDescriptionCorpusRecord): MetadataDraft {
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

export function JobMarketLabMetadataAdmin({
  corpus: corpusProp,
  employers: employersProp,
  metadata: metadataProp,
}: JobMarketLabMetadataAdminProps) {
  const { session, isLoading } = useSiteAuth();
  const [corpus] = useState(() => corpusProp ?? createDefaultAmplifyCorpusDeps());
  const [employers] = useState(() => employersProp ?? createDefaultAmplifyEmployerDeps());
  const [metadata] = useState(
    () => metadataProp ?? createAmplifyMetadataDeps(corpus, employers),
  );
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const [drafts, setDrafts] = useState<Record<string, MetadataDraft>>({});

  const loadData = useCallback(async () => {
    const [records, employerRecords] = await Promise.all([
      corpus.listJobDescriptions(),
      employers.listEmployers(),
    ]);
    return { records, employerRecords };
  }, [corpus, employers]);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const { records, employerRecords } = await loadData();
        if (!cancelled) {
          setLoadState({ status: 'ready', records, employers: employerRecords });
          setDrafts(Object.fromEntries(records.map((record) => [record.id, toDraft(record)])));
        }
      } catch {
        if (!cancelled) {
          setLoadState({ status: 'error' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, session, loadData]);

  if (isLoading || session?.status !== 'authenticated') {
    return null;
  }

  function updateDraft(id: string, patch: Partial<MetadataDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  async function handleSave(record: JobDescriptionCorpusRecord) {
    const draft = drafts[record.id] ?? toDraft(record);
    setSaveState({ status: 'saving' });

    const disclosure = draft.compensationDisclosure;
    const isRange = disclosure === 'range';

    const result = await updateJobDescriptionStructuredFields(
      record.id,
      {
        employerId: draft.employerId ? draft.employerId : null,
        seniority: draft.seniority
          ? (draft.seniority as JobDescriptionSeniority)
          : null,
        roleFamily: draft.roleFamily
          ? (draft.roleFamily as JobDescriptionRoleFamily)
          : null,
        compensationDisclosure: disclosure,
        compensationCurrency: isRange
          ? draft.compensationCurrency.trim() || null
          : null,
        compensationMin: isRange
          ? parseOptionalNumber(draft.compensationMin)
          : null,
        compensationMax: isRange
          ? parseOptionalNumber(draft.compensationMax)
          : null,
        compensationPeriod: isRange
          ? draft.compensationPeriod
            ? (draft.compensationPeriod as CompensationPeriod)
            : null
          : null,
      },
      metadata,
    );

    if (result.status === 'rejected') {
      setSaveState({ status: 'rejected', reason: result.reason });
      return;
    }

    if (result.status === 'not_found') {
      setSaveState({ status: 'rejected', reason: 'Job description not found' });
      return;
    }

    setSaveState({
      status: 'saved',
      title: record.title?.trim() || jobMarketLab.corpusAdmin.untitledLabel,
    });
  }

  return (
    <section className="mt-16 space-y-6" aria-labelledby="job-market-metadata-admin-heading">
      <div className="max-w-2xl space-y-4">
        <SectionHeader
          id="job-market-metadata-admin-heading"
          as="h2"
          size="md"
          animated={false}
          showLeftAccent={false}
        >
          {jobMarketLab.metadataAdmin.heading}
        </SectionHeader>
        <Text variant="muted">{jobMarketLab.metadataAdmin.description}</Text>
      </div>

      {loadState.status === 'loading' || loadState.status === 'idle' ? (
        <Text variant="muted">{jobMarketLab.metadataAdmin.loadingLabel}</Text>
      ) : null}

      {loadState.status === 'error' ? (
        <p role="alert" className="font-body text-lg leading-relaxed text-[var(--foreground)]">
          {jobMarketLab.metadataAdmin.errorLabel}
        </p>
      ) : null}

      {loadState.status === 'ready' && loadState.records.length === 0 ? (
        <Text variant="muted">{jobMarketLab.metadataAdmin.emptyList}</Text>
      ) : null}

      {loadState.status === 'ready' && loadState.records.length > 0 ? (
        <ul className="space-y-8">
          {loadState.records.map((record) => {
            const draft = drafts[record.id] ?? toDraft(record);
            const title = record.title?.trim() || jobMarketLab.corpusAdmin.untitledLabel;
            return (
              <li
                key={record.id}
                className="space-y-4 border-b border-[color-mix(in_oklab,var(--foreground)_12%,transparent)] py-4"
              >
                <Text className="font-medium">{title}</Text>
                <Text size="sm" variant="muted" className="font-mono">
                  {record.id}
                </Text>

                <label className="block space-y-2">
                  <Text size="sm">{jobMarketLab.metadataAdmin.employerLabel}</Text>
                  <select
                    className={fieldClassName}
                    value={draft.employerId}
                    onChange={(event) =>
                      updateDraft(record.id, { employerId: event.target.value })
                    }
                    aria-label={`${jobMarketLab.metadataAdmin.employerLabel} (${record.id})`}
                  >
                    <option value="">{jobMarketLab.metadataAdmin.noEmployerOption}</option>
                    {loadState.employers.map((employer) => (
                      <option key={employer.id} value={employer.id}>
                        {employer.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <Text size="sm">{jobMarketLab.metadataAdmin.seniorityLabel}</Text>
                  <select
                    className={fieldClassName}
                    value={draft.seniority}
                    onChange={(event) =>
                      updateDraft(record.id, { seniority: event.target.value })
                    }
                    aria-label={`${jobMarketLab.metadataAdmin.seniorityLabel} (${record.id})`}
                  >
                    <option value="">{jobMarketLab.metadataAdmin.unsetOption}</option>
                    {JOB_DESCRIPTION_SENIORITIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <Text size="sm">{jobMarketLab.metadataAdmin.roleFamilyLabel}</Text>
                  <select
                    className={fieldClassName}
                    value={draft.roleFamily}
                    onChange={(event) =>
                      updateDraft(record.id, { roleFamily: event.target.value })
                    }
                    aria-label={`${jobMarketLab.metadataAdmin.roleFamilyLabel} (${record.id})`}
                  >
                    <option value="">{jobMarketLab.metadataAdmin.unsetOption}</option>
                    {JOB_DESCRIPTION_ROLE_FAMILIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2 sm:col-span-2">
                    <Text size="sm">
                      {jobMarketLab.metadataAdmin.compensationDisclosureLabel}
                    </Text>
                    <select
                      className={fieldClassName}
                      value={draft.compensationDisclosure}
                      onChange={(event) =>
                        updateDraft(record.id, {
                          compensationDisclosure: event.target
                            .value as CompensationDisclosure,
                        })
                      }
                      aria-label={`${jobMarketLab.metadataAdmin.compensationDisclosureLabel} (${record.id})`}
                    >
                      {COMPENSATION_DISCLOSURES.map((value) => (
                        <option key={value} value={value}>
                          {
                            jobMarketLab.metadataAdmin
                              .compensationDisclosureOptions[value]
                          }
                        </option>
                      ))}
                    </select>
                  </label>
                  {draft.compensationDisclosure === 'range' ? (
                    <>
                      <label className="block space-y-2">
                        <Text size="sm">
                          {jobMarketLab.metadataAdmin.compensationCurrencyLabel}
                        </Text>
                        <input
                          className={fieldClassName}
                          value={draft.compensationCurrency}
                          onChange={(event) =>
                            updateDraft(record.id, {
                              compensationCurrency: event.target.value,
                            })
                          }
                          aria-label={`${jobMarketLab.metadataAdmin.compensationCurrencyLabel} (${record.id})`}
                        />
                      </label>
                      <label className="block space-y-2">
                        <Text size="sm">
                          {jobMarketLab.metadataAdmin.compensationPeriodLabel}
                        </Text>
                        <select
                          className={fieldClassName}
                          value={draft.compensationPeriod}
                          onChange={(event) =>
                            updateDraft(record.id, {
                              compensationPeriod: event.target.value,
                            })
                          }
                          aria-label={`${jobMarketLab.metadataAdmin.compensationPeriodLabel} (${record.id})`}
                        >
                          <option value="">
                            {jobMarketLab.metadataAdmin.unsetOption}
                          </option>
                          {COMPENSATION_PERIODS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-2">
                        <Text size="sm">
                          {jobMarketLab.metadataAdmin.compensationMinLabel}
                        </Text>
                        <input
                          className={fieldClassName}
                          inputMode="decimal"
                          value={draft.compensationMin}
                          onChange={(event) =>
                            updateDraft(record.id, {
                              compensationMin: event.target.value,
                            })
                          }
                          aria-label={`${jobMarketLab.metadataAdmin.compensationMinLabel} (${record.id})`}
                        />
                      </label>
                      <label className="block space-y-2">
                        <Text size="sm">
                          {jobMarketLab.metadataAdmin.compensationMaxLabel}
                        </Text>
                        <input
                          className={fieldClassName}
                          inputMode="decimal"
                          value={draft.compensationMax}
                          onChange={(event) =>
                            updateDraft(record.id, {
                              compensationMax: event.target.value,
                            })
                          }
                          aria-label={`${jobMarketLab.metadataAdmin.compensationMaxLabel} (${record.id})`}
                        />
                      </label>
                    </>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={saveState.status === 'saving'}
                  onClick={() => void handleSave(record)}
                >
                  {saveState.status === 'saving'
                    ? jobMarketLab.metadataAdmin.savingLabel
                    : jobMarketLab.metadataAdmin.saveButtonLabel}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {saveState.status === 'saved' ? (
        <Text>
          {jobMarketLab.metadataAdmin.savedMessage.replace('{title}', saveState.title)}
        </Text>
      ) : null}

      {saveState.status === 'rejected' ? (
        <div role="alert" className="space-y-2">
          <Heading as="h3" size="sm">
            {jobMarketLab.metadataAdmin.rejectedHeading}
          </Heading>
          <Text>{saveState.reason}</Text>
        </div>
      ) : null}
    </section>
  );
}
