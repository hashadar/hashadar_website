'use client';

import { useState } from 'react';
import { Button, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import type { JobDescriptionCorpusRecord } from '@/lib/job-market-corpus';
import {
  compensationSummary,
  displayTitle,
  hasMissingPay,
} from '@/lib/job-market-corpus-table';
import type { EmployerRecord } from '@/lib/job-market-employers';
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
  corpusDeps: ArchiveJobDescriptionDeps;
  onSelect: (id: string) => void;
  onRecordsChanged: () => void | Promise<void>;
};

function employerName(
  record: JobDescriptionCorpusRecord,
  employers: EmployerRecord[],
): string | null {
  if (!record.employerId) {
    return null;
  }
  return (
    employers.find((employer) => employer.id === record.employerId)?.name ??
    null
  );
}

function displayOrDash(value: string | null | undefined, dash: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : dash;
}

function gapLabels(
  record: JobDescriptionCorpusRecord,
  copy: (typeof jobMarketLab)['console']['corpusWorkspace'],
): string[] {
  return [
    !record.employerId ? copy.gapEmployer : null,
    hasMissingPay(record) ? copy.gapPay : null,
  ].filter((value): value is string => Boolean(value));
}

export function JobMarketCorpusJdTable({
  records,
  employers,
  selectedId,
  corpusDeps,
  onSelect,
  onRecordsChanged,
}: JobMarketCorpusJdTableProps) {
  const copy = jobMarketLab.console.corpusWorkspace;
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-2">
      <ul className="space-y-2 md:hidden">
        {records.map((record) => {
          const selected = selectedId === record.id;
          const employer = employerName(record, employers);
          const gaps = gapLabels(record, copy);
          const metaBits = [
            displayOrDash(record.seniority, copy.gapNone),
            displayOrDash(record.roleFamily, copy.gapNone),
            compensationSummary(record),
            record.collectedAt.slice(0, 10),
          ];

          return (
            <li key={record.id}>
              <div
                className={cn(
                  'rounded-md border border-[var(--border)] border-l-2 p-2.5',
                  selected
                    ? 'border-l-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]'
                    : 'border-l-transparent',
                )}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onSelect(record.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        'min-w-0 flex-1 text-sm font-medium leading-snug break-words',
                        selected && 'text-[var(--primary)]',
                      )}
                    >
                      {displayTitle(record)}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-medium leading-none',
                        record.status === 'active'
                          ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]'
                          : 'bg-[var(--muted)] text-[var(--mono-500)]',
                      )}
                    >
                      {record.status === 'active'
                        ? copy.statusActive
                        : copy.statusArchived}
                    </span>
                  </div>
                  <Text
                    as="span"
                    size="xs"
                    variant="muted"
                    className="mt-0.5 block leading-snug"
                  >
                    {employer ?? copy.noEmployerOption}
                  </Text>
                  <p className="mt-1.5 font-body text-xs leading-snug text-[var(--mono-500)]">
                    {metaBits.join(' · ')}
                  </p>
                  {gaps.length > 0 ? (
                    <p className="mt-1 font-body text-xs text-[var(--foreground)]">
                      {gaps.join(', ')}
                    </p>
                  ) : null}
                </button>
                <div className="mt-2 flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onSelect(record.id)}
                  >
                    {copy.openDetailLabel}
                  </Button>
                  {record.status === 'active' ? (
                    <Button
                      type="button"
                      size="sm"
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
                      size="sm"
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
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-md border border-[var(--border)] md:block">
        <table className="w-full border-collapse text-left font-body text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/30">
            <tr>
              <th className="px-2.5 py-1.5 font-medium">{copy.columnTitle}</th>
              <th className="px-2.5 py-1.5 font-medium whitespace-nowrap">
                {copy.columnStatus}
              </th>
              <th className="px-2.5 py-1.5 font-medium whitespace-nowrap">
                {copy.columnSeniority}
              </th>
              <th className="px-2.5 py-1.5 font-medium whitespace-nowrap">
                {copy.columnRoleFamily}
              </th>
              <th className="px-2.5 py-1.5 font-medium whitespace-nowrap">
                {copy.columnCompensation}
              </th>
              <th className="px-2.5 py-1.5 font-medium whitespace-nowrap">
                {copy.columnCollectedAt}
              </th>
              <th className="px-2.5 py-1.5 font-medium whitespace-nowrap">
                {copy.columnGaps}
              </th>
              <th className="px-2.5 py-1.5 font-medium whitespace-nowrap">
                {copy.columnActions}
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const selected = selectedId === record.id;
              const employer = employerName(record, employers);
              const gaps = gapLabels(record, copy);
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
                  <td className="max-w-[18rem] px-2.5 py-1.5 align-top">
                    <button
                      type="button"
                      className={cn(
                        'block text-left font-medium leading-snug underline-offset-2 hover:underline',
                        selected && 'text-[var(--primary)]',
                      )}
                      onClick={() => onSelect(record.id)}
                    >
                      {displayTitle(record)}
                    </button>
                    <Text
                      as="span"
                      size="xs"
                      variant="muted"
                      className="mt-0.5 block leading-snug"
                    >
                      {employer ?? copy.noEmployerOption}
                    </Text>
                  </td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap align-top">
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
                  <td className="px-2.5 py-1.5 whitespace-nowrap align-top text-[var(--mono-500)]">
                    {displayOrDash(record.seniority, copy.gapNone)}
                  </td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap align-top text-[var(--mono-500)]">
                    {displayOrDash(record.roleFamily, copy.gapNone)}
                  </td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap align-top">
                    {compensationSummary(record)}
                  </td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap align-top text-[var(--mono-500)]">
                    {record.collectedAt.slice(0, 10)}
                  </td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap align-top text-[var(--mono-500)]">
                    {gaps.length > 0 ? gaps.join(', ') : copy.gapNone}
                  </td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onSelect(record.id)}
                      >
                        {copy.openDetailLabel}
                      </Button>
                      {record.status === 'active' ? (
                        <Button
                          type="button"
                          size="sm"
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
                          size="sm"
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
      {error ? (
        <p role="alert" className="font-body text-sm text-[var(--foreground)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
