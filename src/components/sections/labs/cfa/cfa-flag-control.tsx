'use client';

import { useId, useState } from 'react';
import { useCfa } from '@/components/sections/labs/cfa/cfa-context';
import {
  cfaErrorClassName,
  cfaFieldClassName,
  cfaLabelClassName,
  cfaPrimaryButtonClassName,
  cfaSecondaryButtonClassName,
} from '@/components/sections/labs/cfa/cfa-ui';
import { cfa } from '@/data';

/** Flag a Question whose Extraction or answer looks wrong. */
export function CfaFlagControl({ questionId }: { questionId: string }) {
  const copy = cfa.runner;
  const { lab, bank, updateBank } = useCfa();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const id = useId();
  const flagged = bank.flags.some((flag) => flag.questionId === questionId && !flag.resolvedAt);

  if (flagged && !open) {
    return <span className="font-body text-sm text-[var(--mono-500)]">{copy.flagSavedLabel}</span>;
  }

  if (!open) {
    return (
      <button type="button" className={cfaSecondaryButtonClassName} onClick={() => setOpen(true)}>
        {copy.flagLabel}
      </button>
    );
  }

  async function save() {
    if (!lab || !note.trim()) return;
    setSaving(true);
    setError(false);
    try {
      const flag = await lab.service.flagQuestion(questionId, note.trim());
      updateBank((current) => ({ ...current, flags: [...current.flags, flag] }));
      setOpen(false);
      setNote('');
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-2">
      <label htmlFor={id} className={cfaLabelClassName}>
        {copy.flagNoteLabel}
      </label>
      <textarea
        id={id}
        rows={2}
        className={cfaFieldClassName}
        value={note}
        placeholder={copy.flagNotePlaceholder}
        onChange={(event) => setNote(event.target.value)}
      />
      {error ? (
        <p className={cfaErrorClassName} role="alert">
          {cfa.form.saveErrorLabel}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          className={cfaPrimaryButtonClassName}
          disabled={saving || !note.trim()}
          onClick={() => void save()}
        >
          {copy.flagSaveLabel}
        </button>
        <button type="button" className={cfaSecondaryButtonClassName} onClick={() => setOpen(false)}>
          {cfa.common.cancelLabel}
        </button>
      </div>
    </div>
  );
}
