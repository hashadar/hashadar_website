'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Heading } from '@/components/ui';
import { useCfa } from '@/components/sections/labs/cfa/cfa-context';
import { CfaPageHeader, CfaReady } from '@/components/sections/labs/cfa/cfa-page-state';
import { CfaPracticeRunner } from '@/components/sections/labs/cfa/cfa-practice-runner';
import { CfaSetReview } from '@/components/sections/labs/cfa/cfa-set-review';
import { CfaTimedRunner } from '@/components/sections/labs/cfa/cfa-timed-runner';
import {
  cfaCardClassName,
  cfaFieldClassName,
  cfaLabelClassName,
  cfaMutedClassName,
  cfaPrimaryButtonClassName,
} from '@/components/sections/labs/cfa/cfa-ui';
import { cfa } from '@/data';
import { fill } from '@/lib/cfa/format';
import { newCfaId } from '@/lib/cfa/paths';
import {
  buildPracticeSet,
  filterByScope,
  lastCaptureSession,
  mistakesDeck,
} from '@/lib/cfa/sets';
import { normaliseLosKey } from '@/lib/cfa/stats';
import { findModule } from '@/lib/cfa/syllabus';
import { SECONDS_PER_QUESTION, type SetResult } from '@/lib/cfa/timed';
import type { CfaAttemptMode, CfaQuestion } from '@/lib/cfa/types';
import { cn } from '@/lib/utils';

export type PracticeDeck = 'mistakes' | 'recent';

export type CfaPracticeProps = {
  deck?: PracticeDeck | null;
  initialModule?: string | null;
  initialReading?: string | null;
  initialLos?: string | null;
};

type Running = {
  setId: string;
  mode: CfaAttemptMode;
  questions: CfaQuestion[];
};

type Finished = Running & {
  results: SetResult[];
  timedOut: boolean;
  saveFailed: boolean;
};

export function CfaPractice(props: CfaPracticeProps) {
  const copy = cfa.practice;
  const heading =
    props.deck === 'mistakes'
      ? copy.mistakesHeading
      : props.deck === 'recent'
        ? copy.recentHeading
        : copy.heading;
  const description =
    props.deck === 'mistakes'
      ? copy.mistakesDescription
      : props.deck === 'recent'
        ? copy.recentDescription
        : copy.description;
  return (
    <div className="space-y-5">
      <CfaPageHeader heading={heading} description={description} />
      <CfaReady>
        <PracticeFlow {...props} />
      </CfaReady>
    </div>
  );
}

function PracticeFlow({ deck, initialModule, initialReading, initialLos }: CfaPracticeProps) {
  const [running, setRunning] = useState<Running | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);

  if (finished) {
    return (
      <CfaSetReview
        questions={finished.questions}
        results={finished.results}
        timedOut={finished.timedOut}
        saveFailed={finished.saveFailed}
        onNewSet={() => {
          setFinished(null);
          setRunning(null);
        }}
      />
    );
  }

  if (running) {
    if (running.mode === 'timed') {
      return (
        <CfaTimedRunner
          questions={running.questions}
          setId={running.setId}
          onFinish={(results, info) => setFinished({ ...running, results, ...info })}
        />
      );
    }
    return (
      <CfaPracticeRunner
        questions={running.questions}
        mode={running.mode}
        setId={running.setId}
        onFinish={(results) =>
          setFinished({ ...running, results, timedOut: false, saveFailed: false })
        }
      />
    );
  }

  if (deck) {
    return <DeckStart deck={deck} onStart={setRunning} />;
  }

  return (
    <SetBuilder
      initialModule={initialModule ?? null}
      initialReading={initialReading ?? null}
      initialLos={initialLos ?? null}
      onStart={setRunning}
    />
  );
}

function DeckStart({ deck, onStart }: { deck: PracticeDeck; onStart: (running: Running) => void }) {
  const copy = cfa.practice;
  const { bank } = useCfa();
  const [now] = useState(() => new Date());
  const questions = useMemo(
    () =>
      deck === 'mistakes'
        ? mistakesDeck(bank.questions, bank.reviewStates, now)
        : lastCaptureSession(bank.questions),
    [bank.questions, bank.reviewStates, deck, now],
  );

  if (questions.length === 0) {
    return (
      <p className={cfaMutedClassName}>
        {deck === 'mistakes' ? copy.mistakesEmptyLabel : copy.recentEmptyLabel}
      </p>
    );
  }

  return (
    <div className={cn(cfaCardClassName, 'space-y-3')}>
      <p className="font-body text-sm">{fill(copy.availableLabel, { count: questions.length })}</p>
      <button
        type="button"
        className={cfaPrimaryButtonClassName}
        onClick={() =>
          onStart({ setId: newCfaId('set'), mode: deck, questions: [...questions] })
        }
      >
        {copy.startLabel}
      </button>
    </div>
  );
}

function SetBuilder({
  initialModule,
  initialReading,
  initialLos,
  onStart,
}: {
  initialModule: string | null;
  initialReading: string | null;
  initialLos: string | null;
  onStart: (running: Running) => void;
}) {
  const copy = cfa.practice;
  const { bank, syllabus } = useCfa();
  const scoped = Boolean(initialModule || initialReading || initialLos);
  const [mode, setMode] = useState<'practice' | 'timed'>('practice');
  const [weighted, setWeighted] = useState(!scoped);
  const [moduleId, setModuleId] = useState(
    initialModule && findModule(syllabus, initialModule) ? initialModule : '',
  );
  const [readingId, setReadingId] = useState(initialReading ?? '');
  const [los, setLos] = useState(initialLos ?? '');
  const [count, setCount] = useState(10);
  const selectedModule = findModule(syllabus, moduleId);

  const scope = { moduleId: moduleId || null, readingId: readingId || null, los: los || null };
  const available = weighted ? bank.questions.length : filterByScope(bank.questions, scope).length;

  const losOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const question of filterByScope(bank.questions, {
      moduleId: moduleId || null,
      readingId: readingId || null,
    })) {
      if (question.los?.trim()) seen.set(normaliseLosKey(question.los), question.los.trim());
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [bank.questions, moduleId, readingId]);

  function start() {
    const questions = buildPracticeSet({
      questions: bank.questions,
      attempts: bank.attempts,
      syllabus,
      scope,
      weighted,
      count,
    });
    if (questions.length === 0) return;
    onStart({ setId: newCfaId('set'), mode, questions });
  }

  if (bank.questions.length === 0) {
    return <p className={cfaMutedClassName}>{copy.noQuestionsLabel}</p>;
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        start();
      }}
    >
      <fieldset className="space-y-2">
        <legend className="font-body text-sm font-medium">{copy.modeLegend}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['practice', copy.modePracticeLabel, copy.modePracticeHelp],
              ['timed', copy.modeTimedLabel, fill(copy.modeTimedHelp, { seconds: SECONDS_PER_QUESTION })],
            ] as const
          ).map(([value, label, help]) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3',
                mode === value ? 'border-[var(--primary)]' : 'border-[var(--border)]',
              )}
            >
              <input
                type="radio"
                name="cfa-mode"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
                className="mt-1 accent-[var(--primary)]"
              />
              <span>
                <span className="block font-body text-sm font-medium">{label}</span>
                <span className={cfaMutedClassName}>{help}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-body text-sm font-medium">{copy.scopeLegend}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              [true, copy.scopeMixedLabel],
              [false, copy.scopeChosenLabel],
            ] as const
          ).map(([value, label]) => (
            <label
              key={String(value)}
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2',
                weighted === value ? 'border-[var(--primary)]' : 'border-[var(--border)]',
              )}
            >
              <input
                type="radio"
                name="cfa-scope"
                checked={weighted === value}
                onChange={() => setWeighted(value)}
                className="accent-[var(--primary)]"
              />
              <span className="font-body text-sm">{label}</span>
            </label>
          ))}
        </div>
        {!weighted ? (
          <div className="grid gap-3 pt-1 sm:grid-cols-3">
            <label className={cfaLabelClassName}>
              {copy.moduleLabel}
              <select
                className={cfaFieldClassName}
                value={moduleId}
                onChange={(event) => {
                  setModuleId(event.target.value);
                  setReadingId('');
                  setLos('');
                }}
              >
                <option value="">{copy.anyModuleLabel}</option>
                {syllabus.modules.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={cfaLabelClassName}>
              {copy.readingLabel}
              <select
                className={cfaFieldClassName}
                value={readingId}
                disabled={!selectedModule}
                onChange={(event) => {
                  setReadingId(event.target.value);
                  setLos('');
                }}
              >
                <option value="">{copy.anyReadingLabel}</option>
                {(selectedModule?.readings ?? []).map((reading) => (
                  <option key={reading.id} value={reading.id}>
                    {reading.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={cfaLabelClassName}>
              {copy.losLabel}
              <select
                className={cfaFieldClassName}
                value={los}
                onChange={(event) => setLos(event.target.value)}
              >
                <option value="">{copy.anyLosLabel}</option>
                {los && !losOptions.includes(los) ? <option value={los}>{los}</option> : null}
                {losOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </fieldset>

      <div className="flex flex-wrap items-end gap-3">
        <label className={cfaLabelClassName}>
          {copy.countLabel}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(1, available)}
            value={count}
            onChange={(event) => setCount(Math.max(1, Number(event.target.value) || 1))}
            className={cn(cfaFieldClassName, 'w-28')}
          />
        </label>
        <p className={cn(cfaMutedClassName, 'pb-2')}>{fill(copy.availableLabel, { count: available })}</p>
      </div>

      {available === 0 ? <p className={cfaMutedClassName}>{copy.noQuestionsLabel}</p> : null}

      <button type="submit" className={cfaPrimaryButtonClassName} disabled={available === 0}>
        {copy.startLabel}
      </button>

      <PracticeShortcuts />
    </form>
  );
}

function PracticeShortcuts() {
  const copy = cfa.practice;
  return (
    <div className="grid gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
      <Link href="/labs/cfa/practice?deck=mistakes" className={cn(cfaCardClassName, 'block hover:border-[var(--primary)]')}>
        <Heading as="h2" size="sm">
          {copy.mistakesHeading}
        </Heading>
        <p className={cfaMutedClassName}>{copy.mistakesDescription}</p>
      </Link>
      <Link href="/labs/cfa/practice?deck=recent" className={cn(cfaCardClassName, 'block hover:border-[var(--primary)]')}>
        <Heading as="h2" size="sm">
          {copy.recentHeading}
        </Heading>
        <p className={cfaMutedClassName}>{copy.recentDescription}</p>
      </Link>
    </div>
  );
}
