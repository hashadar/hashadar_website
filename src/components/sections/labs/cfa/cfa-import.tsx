'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCfa } from '@/components/sections/labs/cfa/cfa-context';
import { CfaPageHeader, CfaReady } from '@/components/sections/labs/cfa/cfa-page-state';
import { useCaptureDefaults } from '@/components/sections/labs/cfa/use-capture-defaults';
import {
  cfaCardClassName,
  cfaErrorClassName,
  cfaFieldClassName,
  cfaLabelClassName,
  cfaLinkClassName,
  cfaMutedClassName,
  cfaPrimaryButtonClassName,
  cfaSecondaryButtonClassName,
  cfaWarningClassName,
} from '@/components/sections/labs/cfa/cfa-ui';
import { cfa } from '@/data';
import { findNearDuplicates } from '@/lib/cfa/duplicates';
import { IMPORT_SCHEMA_EXAMPLE, parseImportJson, type ImportResult } from '@/lib/cfa/extraction';
import { fill } from '@/lib/cfa/format';
import { findModule } from '@/lib/cfa/syllabus';
import type { CfaQuestion } from '@/lib/cfa/types';
import { cn } from '@/lib/utils';

export function CfaImport() {
  const copy = cfa.import;
  return (
    <div className="space-y-5">
      <CfaPageHeader
        heading={copy.heading}
        description={copy.description}
        actions={
          <Link href="/labs/cfa/capture" className={cfaLinkClassName}>
            {cfa.capture.heading}
          </Link>
        }
      />
      <CfaReady>
        <ImportFlow />
      </CfaReady>
    </div>
  );
}

function ImportFlow() {
  const copy = cfa.import;
  const { lab, syllabus, bank, updateBank } = useCfa();
  const [defaults, setDefaults] = useCaptureDefaults();
  const [text, setText] = useState('');
  const [checked, setChecked] = useState<ImportResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const selectedModule = findModule(syllabus, defaults.moduleId);

  function check() {
    setMessage(null);
    setConfirmed(false);
    setChecked(
      parseImportJson(text, syllabus, {
        moduleId: defaults.moduleId,
        readingId: defaults.readingId,
        source: defaults.source.trim() || null,
      }),
    );
  }

  const duplicateCount = checked
    ? checked.items.filter((item) => findNearDuplicates(item.stem, bank.questions).length > 0)
        .length
    : 0;

  async function runImport() {
    if (!lab || !checked || checked.items.length === 0 || !confirmed) return;
    setImporting(true);
    setMessage(null);
    const created: CfaQuestion[] = [];
    let failed = 0;
    for (const item of checked.items) {
      try {
        created.push(await lab.service.createQuestion(item));
      } catch {
        failed += 1;
      }
    }
    updateBank((current) => ({ ...current, questions: [...current.questions, ...created] }));
    setImporting(false);
    setChecked(null);
    setConfirmed(false);
    if (failed === 0) setText('');
    setMessage(
      failed > 0
        ? { kind: 'error', text: copy.importErrorLabel }
        : { kind: 'ok', text: fill(copy.importedLabel, { count: created.length }) },
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={cfaLabelClassName}>
          {cfa.capture.moduleLabel}
          <select
            className={cfaFieldClassName}
            value={defaults.moduleId}
            onChange={(event) => {
              const next = findModule(syllabus, event.target.value);
              setDefaults({ ...defaults, moduleId: event.target.value, readingId: next?.readings[0]?.id ?? '' });
              setChecked(null);
            }}
          >
            {syllabus.modules.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className={cfaLabelClassName}>
          {cfa.capture.readingLabel}
          <select
            className={cfaFieldClassName}
            value={defaults.readingId}
            onChange={(event) => {
              setDefaults({ ...defaults, readingId: event.target.value });
              setChecked(null);
            }}
          >
            {(selectedModule?.readings ?? []).map((reading) => (
              <option key={reading.id} value={reading.id}>
                {reading.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={cfaLabelClassName}>
        {cfa.capture.sourceLabel}
        <input
          className={cfaFieldClassName}
          value={defaults.source}
          placeholder={cfa.capture.sourcePlaceholder}
          onChange={(event) => {
            setDefaults({ ...defaults, source: event.target.value });
            setChecked(null);
          }}
        />
      </label>

      <label className={cfaLabelClassName}>
        {copy.textareaLabel}
        <textarea
          className={cn(cfaFieldClassName, 'min-h-56 font-mono text-sm')}
          value={text}
          spellCheck={false}
          onChange={(event) => {
            setText(event.target.value);
            setChecked(null);
          }}
        />
      </label>

      <details className={cn(cfaCardClassName, 'p-3')}>
        <summary className="cursor-pointer font-body text-sm font-medium">{copy.schemaHeading}</summary>
        <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-[var(--mono-500)]">
          {IMPORT_SCHEMA_EXAMPLE}
        </pre>
      </details>

      <button
        type="button"
        className={cfaSecondaryButtonClassName}
        disabled={!text.trim() || importing}
        onClick={check}
      >
        {copy.checkLabel}
      </button>

      {checked ? (
        <section className="space-y-3" aria-live="polite">
          <p className="font-body text-sm font-medium">
            {fill(copy.readyLabel, { count: checked.items.length })}
          </p>
          {duplicateCount > 0 ? (
            <p className={cfaWarningClassName}>{fill(copy.duplicatesLabel, { count: duplicateCount })}</p>
          ) : null}
          {checked.errors.length > 0 ? (
            <div className="space-y-1">
              <p className={cn(cfaErrorClassName, 'font-medium')}>{copy.errorsHeading}</p>
              <ul className="space-y-0.5">
                {checked.errors.map((error) => (
                  <li key={`${error.index}-${error.message}`} className={cfaMutedClassName}>
                    {fill(copy.errorItemLabel, { index: error.index, message: error.message })}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {checked.items.length > 0 ? (
            <>
              <label className="flex min-h-11 items-center gap-3 rounded-lg bg-[var(--muted)] px-3 py-2 font-body text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="h-5 w-5 accent-[var(--primary)]"
                />
                {copy.confirmAnswersLabel}
              </label>
              <button
                type="button"
                className={cfaPrimaryButtonClassName}
                disabled={!confirmed || importing}
                onClick={() => void runImport()}
              >
                {importing ? copy.importingLabel : fill(copy.importLabel, { count: checked.items.length })}
              </button>
            </>
          ) : null}
        </section>
      ) : null}

      {message ? (
        <p
          className={message.kind === 'error' ? cfaErrorClassName : 'font-body text-sm'}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
