'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { corpusFieldClassName } from '@/components/sections/labs/console/corpus/corpus-field-styles';
import { jobMarketLab } from '@/data';
import type { JobDescriptionCorpusRecord } from '@/lib/job-market-corpus';
import {
  compensationSummary,
  displayTitle,
  hasMissingPay,
} from '@/lib/job-market-corpus-table';
import {
  JOB_DESCRIPTION_ROLE_FAMILIES,
  JOB_DESCRIPTION_SENIORITIES,
  updateJobDescriptionStructuredFields,
  type EmployerRecord,
  type JobDescriptionRoleFamily,
  type JobDescriptionSeniority,
  type JobDescriptionStructuredFieldsPatch,
  type UpdateJobDescriptionStructuredFieldsDeps,
} from '@/lib/job-market-employers';
import {
  archiveJobDescription,
  restoreJobDescription,
  type ArchiveJobDescriptionDeps,
} from '@/lib/job-market-corpus';
import { cn } from '@/lib/utils';

export type JobMarketCorpusJdTableProps = {
  records: JobDescriptionCorpusRecord[];
  employers: EmployerRecord[];
  selectedId: string | null;
  metadataDeps: UpdateJobDescriptionStructuredFieldsDeps;
  corpusDeps: ArchiveJobDescriptionDeps;
  onSelect: (id: string) => void;
  onRecordsChanged: () => void | Promise<void>;
};

type RowDraft = {
  seniority: string;
  roleFamily: string;
  employerId: string;
};

function toDraft(record: JobDescriptionCorpusRecord): RowDraft {
  return {
    seniority: record.seniority ?? '',
    roleFamily: record.roleFamily ?? '',
    employerId: record.employerId ?? '',
  };
}

export function JobMarketCorpusJdTable({
  records,
  employers,
  selectedId,
  metadataDeps,
  corpusDeps,
  onSelect,
  onRecordsChanged,
}: JobMarketCorpusJdTableProps) {
  const copy = jobMarketLab.console.corpusWorkspace;
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>(() =>
    Object.fromEntries(records.map((record) => [record.id, toDraft(record)])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function draftFor(record: JobDescriptionCorpusRecord): RowDraft {
    return drafts[record.id] ?? toDraft(record);
  }

  function updateDraft(
    id: string,
    patch: Partial<RowDraft>,
    fallback: JobDescriptionCorpusRecord,
  ) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? toDraft(fallback)), ...patch },
    }));
  }

  async function handleSaveRow(record: JobDescriptionCorpusRecord) {
    const draft = draftFor(record);
    setSavingId(record.id);
    setMessage(null);
    setError(null);
    const patch: JobDescriptionStructuredFieldsPatch = {
      employerId: draft.employerId || null,
      seniority: (draft.seniority || null) as JobDescriptionSeniority | null,
      roleFamily: (draft.roleFamily || null) as JobDescriptionRoleFamily | null,
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
        setError(copy.rowSaveError);
        return;
      }
      setMessage(copy.rowSavedMessage);
      await onRecordsChanged();
    } catch {
      setError(copy.rowSaveError);
    } finally {
      setSavingId(null);
    }
  }

  async function handleArchive(id: string) {
    setStatusBusyId(id);
    setError(null);
    try {
      await archiveJobDescription(id, corpusDeps);
      await onRecordsChanged();
    } catch {
      setError(copy.rowSaveError);
    } finally {
      setStatusBusyId(null);
    }
  }

  async function handleRestore(id: string) {
    setStatusBusyId(id);
    setError(null);
    try {
      await restoreJobDescription(id, corpusDeps);
      await onRecordsChanged();
    } catch {
      setError(copy.rowSaveError);
    } finally {
      setStatusBusyId(null);
    }
  }

  if (records.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border border-[var(--border)]">
        <table className="min-w-full border-collapse text-left font-body text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/30">
            <tr>
              <th className="px-3 py-2 font-medium">{copy.columnTitle}</th>
              <th className="px-3 py-2 font-medium">{copy.columnStatus}</th>
              <th className="px-3 py-2 font-medium">{copy.columnSeniority}</th>
              <th className="px-3 py-2 font-medium">{copy.columnRoleFamily}</th>
              <th className="px-3 py-2 font-medium">{copy.columnEmployer}</th>
              <th className="px-3 py-2 font-medium">{copy.columnCompensation}</th>
              <th className="px-3 py-2 font-medium">{copy.columnCollectedAt}</th>
              <th className="px-3 py-2 font-medium">{copy.columnGaps}</th>
              <th className="px-3 py-2 font-medium">{copy.columnActions}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const draft = draftFor(record);
              const selected = selectedId === record.id;
              const gaps = [
                !record.employerId ? copy.gapEmployer : null,
                hasMissingPay(record) ? copy.gapPay : null,
              ].filter(Boolean);
              return (
                <tr
                  key={record.id}
                  className={cn(
                    'border-b border-[var(--border)] border-l-2',
                    selected
                      ? 'border-l-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]'
                      : 'border-l-transparent hover:bg-[color-mix(in_oklab,var(--primary)_3%,transparent)]',
                  )}
                >
                  <td className="max-w-[14rem] px-3 py-2">
                    <button
                      type="button"
                      className={cn(
                        'text-left font-medium underline-offset-2 hover:underline',
                        selected && 'text-[var(--primary)]',
                      )}
                      onClick={() => onSelect(record.id)}
                    >
                      {displayTitle(record)}
                    </button>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex rounded px-1.5 py-0.5 text-xs font-medium',
                        record.status === 'active'
                          ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]'
                          : 'bg-[var(--muted)] text-[var(--mono-500)]',
                      )}
                    >
                      {record.status === 'active'
                        ? copy.statusActive
                        : copy.statusArchived}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className={corpusFieldClassName}
                      value={draft.seniority}
                      onChange={(event) =>
                        updateDraft(
                          record.id,
                          { seniority: event.target.value },
                          record,
                        )
                      }
                      aria-label={`${copy.columnSeniority} ${displayTitle(record)}`}
                    >
                      <option value="">{copy.unsetOption}</option>
                      {JOB_DESCRIPTION_SENIORITIES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className={corpusFieldClassName}
                      value={draft.roleFamily}
                      onChange={(event) =>
                        updateDraft(
                          record.id,
                          { roleFamily: event.target.value },
                          record,
                        )
                      }
                      aria-label={`${copy.columnRoleFamily} ${displayTitle(record)}`}
                    >
                      <option value="">{copy.unsetOption}</option>
                      {JOB_DESCRIPTION_ROLE_FAMILIES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className={corpusFieldClassName}
                      value={draft.employerId}
                      onChange={(event) =>
                        updateDraft(
                          record.id,
                          { employerId: event.target.value },
                          record,
                        )
                      }
                      aria-label={`${copy.columnEmployer} ${displayTitle(record)}`}
                    >
                      <option value="">{copy.noEmployerOption}</option>
                      {employers.map((employer) => (
                        <option key={employer.id} value={employer.id}>
                          {employer.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {compensationSummary(record)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {record.collectedAt.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2">
                    {gaps.length > 0 ? gaps.join(', ') : copy.gapNone}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onSelect(record.id)}
                      >
                        {copy.openDetailLabel}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleSaveRow(record)}
                        disabled={savingId === record.id}
                      >
                        {savingId === record.id
                          ? copy.savingRowLabel
                          : copy.saveRowLabel}
                      </Button>
                      {record.status === 'active' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void handleArchive(record.id)}
                          disabled={statusBusyId === record.id}
                        >
                          {statusBusyId === record.id
                            ? copy.archivingLabel
                            : copy.archiveLabel}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void handleRestore(record.id)}
                          disabled={statusBusyId === record.id}
                        >
                          {statusBusyId === record.id
                            ? copy.restoringLabel
                            : copy.restoreLabel}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
}
