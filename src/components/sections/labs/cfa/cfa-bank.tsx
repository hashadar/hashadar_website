'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { useCfa } from '@/components/sections/labs/cfa/cfa-context';
import { CfaPageHeader, CfaReady } from '@/components/sections/labs/cfa/cfa-page-state';
import {
  cfaBadgeClassName,
  cfaFieldClassName,
  cfaLabelClassName,
  cfaLinkClassName,
  cfaMutedClassName,
} from '@/components/sections/labs/cfa/cfa-ui';
import { cfa } from '@/data';
import { fill, stemPreview } from '@/lib/cfa/format';
import { attemptCounts } from '@/lib/cfa/sets';
import { moduleName, readingName } from '@/lib/cfa/syllabus';
import { cn } from '@/lib/utils';

export type CfaBankProps = {
  initialFlaggedOnly?: boolean;
};

export function CfaBank({ initialFlaggedOnly = false }: CfaBankProps) {
  const copy = cfa.bank;
  return (
    <div className="space-y-5">
      <CfaPageHeader
        heading={copy.heading}
        description={copy.description}
        actions={
          <div className="flex gap-4">
            <Link href="/labs/cfa/capture" className={cfaLinkClassName}>
              {cfa.capture.heading}
            </Link>
            <Link href="/labs/cfa/import" className={cfaLinkClassName}>
              {copy.importLinkLabel}
            </Link>
          </div>
        }
      />
      <CfaReady>
        <BankList initialFlaggedOnly={initialFlaggedOnly} />
      </CfaReady>
    </div>
  );
}

function BankList({ initialFlaggedOnly }: { initialFlaggedOnly: boolean }) {
  const copy = cfa.bank;
  const { bank, syllabus } = useCfa();
  const [search, setSearch] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(initialFlaggedOnly);
  const deferredSearch = useDeferredValue(search);

  const flagged = useMemo(
    () => new Set(bank.flags.filter((flag) => !flag.resolvedAt).map((flag) => flag.questionId)),
    [bank.flags],
  );
  const decks = useMemo(
    () => new Map(bank.reviewStates.map((state) => [state.questionId, state])),
    [bank.reviewStates],
  );
  const counts = useMemo(() => attemptCounts(bank.attempts), [bank.attempts]);

  const rows = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return [...bank.questions]
      .filter((question) => !moduleId || question.module === moduleId)
      .filter((question) => !flaggedOnly || flagged.has(question.id))
      .filter(
        (question) =>
          !needle ||
          question.stem.toLowerCase().includes(needle) ||
          (question.los ?? '').toLowerCase().includes(needle),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [bank.questions, deferredSearch, flagged, flaggedOnly, moduleId]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <label className={cfaLabelClassName}>
          {copy.searchLabel}
          <input
            type="search"
            className={cfaFieldClassName}
            value={search}
            placeholder={copy.searchPlaceholder}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className={cfaLabelClassName}>
          {copy.moduleFilterLabel}
          <select
            className={cfaFieldClassName}
            value={moduleId}
            onChange={(event) => setModuleId(event.target.value)}
          >
            <option value="">{copy.allModulesLabel}</option>
            {syllabus.modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-11 items-center gap-2 font-body text-sm">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(event) => setFlaggedOnly(event.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          {copy.flaggedOnlyLabel}
        </label>
        <p className={cfaMutedClassName}>{fill(copy.countLabel, { count: rows.length })}</p>
      </div>

      {rows.length === 0 ? (
        <p className={cfaMutedClassName}>{copy.emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {rows.map((question) => {
            const deck = decks.get(question.id);
            return (
              <li key={question.id}>
                <Link
                  href={`/labs/cfa/questions/${encodeURIComponent(question.id)}`}
                  className="block space-y-1 px-3 py-3 hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
                >
                  <p className="font-body text-sm text-[var(--foreground)]">{stemPreview(question.stem)}</p>
                  <p className="font-body text-xs text-[var(--mono-500)]">
                    {moduleName(syllabus, question.module)} ·{' '}
                    {readingName(syllabus, question.module, question.reading)}
                    {counts[question.id] ? ` · ${counts[question.id]}×` : ''}
                  </p>
                  <div className={cn('flex flex-wrap gap-1.5', !flagged.has(question.id) && !deck && !question.explanationIsAiDrafted && 'hidden')}>
                    {flagged.has(question.id) ? (
                      <span className={cfaBadgeClassName}>{cfa.common.flaggedBadge}</span>
                    ) : null}
                    {deck ? (
                      <span className={cfaBadgeClassName}>{fill(copy.deckBadgeLabel, { box: deck.box })}</span>
                    ) : null}
                    {question.explanationIsAiDrafted && question.explanation ? (
                      <span className={cfaBadgeClassName}>{cfa.common.aiDraftedBadge}</span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
