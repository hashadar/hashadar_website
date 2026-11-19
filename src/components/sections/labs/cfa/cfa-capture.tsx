'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCfa } from '@/components/sections/labs/cfa/cfa-context';
import { CfaPageHeader, CfaReady } from '@/components/sections/labs/cfa/cfa-page-state';
import { CfaQuestionForm } from '@/components/sections/labs/cfa/cfa-question-form';
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
} from '@/components/sections/labs/cfa/cfa-ui';
import { cfa } from '@/data';
import { fill } from '@/lib/cfa/format';
import { imageFilesFrom, MAX_SCREENSHOTS_PER_CAPTURE } from '@/lib/cfa/images';
import { newCfaId, screenshotKey } from '@/lib/cfa/paths';
import { prepareScreenshot } from '@/lib/cfa/prepare-screenshot';
import { emptyDraft, type QuestionDraft } from '@/lib/cfa/question';
import { findModule, moduleName, readingName } from '@/lib/cfa/syllabus';
import type { CfaQuestionInput } from '@/lib/cfa/types';
import { cn } from '@/lib/utils';

type PendingImage = { id: string; file: File; previewUrl: string };

type ReviewItem = {
  draft: QuestionDraft;
  answerOrigin: 'extracted' | 'missing';
};

type Phase =
  | { kind: 'collect' }
  | { kind: 'working'; label: string }
  | { kind: 'error'; message: string }
  | { kind: 'review'; items: ReviewItem[]; index: number; warnings: string[]; savedCount: number };

export function CfaCapture() {
  const copy = cfa.capture;
  return (
    <div className="space-y-5">
      <CfaPageHeader
        heading={copy.heading}
        description={copy.description}
        actions={
          <Link href="/labs/cfa/import" className={cfaLinkClassName}>
            {copy.importLinkLabel}
          </Link>
        }
      />
      <CfaReady>
        <CaptureFlow />
      </CfaReady>
    </div>
  );
}

function CaptureFlow() {
  const copy = cfa.capture;
  const { lab, syllabus, updateBank } = useCfa();
  const [defaults, setDefaults] = useCaptureDefaults();
  const [images, setImages] = useState<PendingImage[]>([]);
  const [uploadedKeys, setUploadedKeys] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: 'collect' });
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const selectedModule = findModule(syllabus, defaults.moduleId);

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setNotice(null);
    setUploadedKeys([]);
    setImages((current) => {
      const room = MAX_SCREENSHOTS_PER_CAPTURE - current.length;
      const added = files.slice(0, Math.max(0, room)).map((file) => ({
        id: newCfaId('img'),
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...current, ...added];
    });
  }, []);

  // Paste a screenshot from the clipboard anywhere on the page (desktop).
  useEffect(() => {
    if (phase.kind !== 'collect') return;
    function onPaste(event: ClipboardEvent) {
      const files = event.clipboardData ? imageFilesFrom(event.clipboardData.items) : [];
      if (files.length > 0) {
        event.preventDefault();
        addFiles(files);
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles, phase.kind]);

  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(
    () => () => {
      for (const image of imagesRef.current) URL.revokeObjectURL(image.previewUrl);
    },
    [],
  );

  function removeImage(id: string) {
    setUploadedKeys([]);
    setImages((current) => {
      const image = current.find((item) => item.id === id);
      if (image) URL.revokeObjectURL(image.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  async function uploadAll(): Promise<string[]> {
    if (!lab) throw new Error(cfa.common.notConfiguredLabel);
    if (uploadedKeys.length === images.length && uploadedKeys.length > 0) return uploadedKeys;
    const captureId = newCfaId('capture');
    const keys: string[] = [];
    for (const [index, image] of images.entries()) {
      const prepared = await prepareScreenshot(image.file);
      const key = screenshotKey(captureId, index, prepared.extension);
      await lab.screenshots.upload(key, prepared.blob, prepared.contentType);
      keys.push(key);
    }
    setUploadedKeys(keys);
    return keys;
  }

  function baseDraft(keys: string[]): QuestionDraft {
    return emptyDraft({
      module: defaults.moduleId,
      reading: defaults.readingId,
      source: defaults.source,
      screenshotKeys: keys,
    });
  }

  async function extract() {
    if (!lab || images.length === 0) return;
    try {
      setPhase({ kind: 'working', label: copy.uploadingLabel });
      const keys = await uploadAll();
      setPhase({ kind: 'working', label: copy.extractingLabel });
      const result = await lab.assist.extract({
        screenshotKeys: keys,
        moduleName: moduleName(syllabus, defaults.moduleId),
        readingName: readingName(syllabus, defaults.moduleId, defaults.readingId),
      });
      if (!result.ok) {
        setPhase({ kind: 'error', message: result.error });
        return;
      }
      setPhase({
        kind: 'review',
        index: 0,
        savedCount: 0,
        warnings: result.warnings,
        items: result.questions.map((question) => ({
          answerOrigin: question.answer ? 'extracted' : 'missing',
          draft: {
            ...baseDraft(keys),
            stem: question.stem,
            options: question.options,
            answer: question.answer,
            explanation: question.explanation ?? '',
            calculator: question.calculator ?? '',
          },
        })),
      });
    } catch (error) {
      setPhase({
        kind: 'error',
        message: error instanceof Error && error.message ? error.message : copy.extractErrorLabel,
      });
    }
  }

  async function enterManually() {
    try {
      const keys = images.length > 0 ? await uploadAll() : [];
      setPhase({
        kind: 'review',
        index: 0,
        savedCount: 0,
        warnings: [],
        items: [{ draft: baseDraft(keys), answerOrigin: 'missing' }],
      });
    } catch (error) {
      setPhase({
        kind: 'error',
        message: error instanceof Error && error.message ? error.message : copy.extractErrorLabel,
      });
    }
  }

  function resetCapture(message: string | null) {
    for (const image of images) URL.revokeObjectURL(image.previewUrl);
    setImages([]);
    setUploadedKeys([]);
    setNotice(message);
    setPhase({ kind: 'collect' });
  }

  async function discard() {
    if (lab) {
      await Promise.allSettled(uploadedKeys.map((key) => lab.screenshots.remove(key)));
    }
    resetCapture(null);
  }

  function advance(saved: boolean) {
    if (phase.kind !== 'review') return;
    const savedCount = phase.savedCount + (saved ? 1 : 0);
    if (phase.index + 1 < phase.items.length) {
      setPhase({ ...phase, index: phase.index + 1, savedCount });
      return;
    }
    if (savedCount === 0) {
      void discard();
      return;
    }
    resetCapture(copy.savedLabel);
  }

  async function save(input: CfaQuestionInput) {
    if (!lab) throw new Error(cfa.common.notConfiguredLabel);
    const question = await lab.service.createQuestion(input);
    updateBank((bank) => ({ ...bank, questions: [...bank.questions, question] }));
    setDefaults({ moduleId: input.module, readingId: input.reading, source: input.source ?? '' });
    advance(true);
  }

  const localUrls = useMemo(() => images.map((image) => image.previewUrl), [images]);

  if (phase.kind === 'review') {
    const item = phase.items[phase.index];
    return (
      <div className="space-y-4">
        {phase.items.length > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={cfaMutedClassName}>
              {fill(copy.multipleFoundLabel, { count: phase.items.length })}{' '}
              {fill(copy.questionOfLabel, { index: phase.index + 1, count: phase.items.length })}
            </p>
            <button type="button" className={cfaSecondaryButtonClassName} onClick={() => advance(false)}>
              {copy.skipLabel}
            </button>
          </div>
        ) : null}
        <CfaQuestionForm
          key={`${phase.index}-${item.draft.screenshotKeys.join(',')}`}
          initial={item.draft}
          answerOrigin={item.answerOrigin}
          warnings={phase.warnings}
          localScreenshotUrls={localUrls}
          onSave={save}
          onCancel={() => void discard()}
          onContextChange={(draft) =>
            setDefaults({ moduleId: draft.module, readingId: draft.reading, source: draft.source })
          }
        />
      </div>
    );
  }

  const working = phase.kind === 'working';

  return (
    <div className="space-y-5">
      {notice ? (
        <p className={cn(cfaCardClassName, 'p-3 font-body text-sm')} role="status">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={cfaLabelClassName}>
          {copy.moduleLabel}
          <select
            className={cfaFieldClassName}
            value={defaults.moduleId}
            disabled={working}
            onChange={(event) => {
              const next = findModule(syllabus, event.target.value);
              setDefaults({
                ...defaults,
                moduleId: event.target.value,
                readingId: next?.readings[0]?.id ?? '',
              });
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
          {copy.readingLabel}
          <select
            className={cfaFieldClassName}
            value={defaults.readingId}
            disabled={working}
            onChange={(event) => setDefaults({ ...defaults, readingId: event.target.value })}
          >
            {(selectedModule?.readings ?? []).map((reading) => (
              <option key={reading.id} value={reading.id}>
                {reading.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label className={cfaLabelClassName}>
          {copy.sourceLabel}
          <input
            className={cfaFieldClassName}
            value={defaults.source}
            placeholder={copy.sourcePlaceholder}
            disabled={working}
            aria-describedby="cfa-capture-source-help"
            onChange={(event) => setDefaults({ ...defaults, source: event.target.value })}
          />
        </label>
        <p id="cfa-capture-source-help" className="mt-1 font-body text-xs text-[var(--mono-500)]">
          {copy.sourceHelp}
        </p>
      </div>

      <div
        className="space-y-3 rounded-lg border-2 border-dashed border-[var(--border)] p-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(
            Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/')),
          );
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={cfaPrimaryButtonClassName}
            disabled={working || images.length >= MAX_SCREENSHOTS_PER_CAPTURE}
            onClick={() => fileInput.current?.click()}
          >
            {copy.addScreenshotsLabel}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            aria-label={copy.addScreenshotsLabel}
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = '';
            }}
          />
          <p className={cfaMutedClassName}>{fill(copy.maxScreenshotsLabel, { max: MAX_SCREENSHOTS_PER_CAPTURE })}</p>
        </div>
        <p className={cfaMutedClassName}>{copy.pasteHint}</p>

        {images.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image, index) => (
              <li key={image.id} className="relative">
                {/* Local object URL preview; never leaves the device until upload. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.previewUrl}
                  alt={fill(copy.screenshotAlt, { index: index + 1 })}
                  className="h-40 w-full rounded-md border border-[var(--border)] bg-white object-contain"
                />
                <button
                  type="button"
                  disabled={working}
                  onClick={() => removeImage(image.id)}
                  aria-label={fill(copy.removeScreenshotLabel, { index: index + 1 })}
                  className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--background)] font-body text-lg leading-none text-[var(--foreground)] shadow ring-1 ring-[var(--border)]"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {phase.kind === 'working' ? (
        <p className={cfaMutedClassName} role="status" aria-live="polite">
          {phase.label}
        </p>
      ) : null}

      {phase.kind === 'error' ? (
        <div className="space-y-1" role="alert">
          <p className={cfaErrorClassName}>{copy.extractErrorLabel}</p>
          <p className={cfaMutedClassName}>{phase.message}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cfaPrimaryButtonClassName}
          disabled={working || images.length === 0}
          onClick={() => void extract()}
        >
          {phase.kind === 'error' ? copy.retryExtractLabel : copy.extractLabel}
        </button>
        <button
          type="button"
          className={cfaSecondaryButtonClassName}
          disabled={working}
          onClick={() => void enterManually()}
        >
          {copy.manualEntryLabel}
        </button>
        {images.length > 0 ? (
          <button
            type="button"
            className={cfaSecondaryButtonClassName}
            disabled={working}
            onClick={() => void discard()}
          >
            {copy.discardLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
