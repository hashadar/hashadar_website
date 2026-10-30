'use client';

import { useId, useState } from 'react';
import { Heading, Text } from '@/components/ui';
import { courtBoard } from '@/data';
import { createSessionAction } from '@/lib/court-board/organiser-actions';
import {
  CAPACITY_MAX,
  isLocalDate,
  isLocalTime,
  parseCapacity,
} from '@/lib/court-board/validation';
import type { NewSessionDefaults } from '@/lib/court-board/views';
import { useOrganiserAction } from '@/components/sections/labs/court-board/organiser-use-action';

const copy = courtBoard.organiser.newSession;
const fieldErrors = courtBoard.errors.byField;

type FieldName = keyof typeof copy.fields;

interface FormValues {
  localDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  capacity: string;
}

/** The same checks the server makes, so mistakes are caught before the round trip. */
export function validateNewSession(values: FormValues): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  if (!isLocalDate(values.localDate)) errors.localDate = fieldErrors.localDate;
  if (!isLocalTime(values.startTime)) errors.startTime = fieldErrors.startTime;
  if (!isLocalTime(values.endTime) || values.endTime <= values.startTime) {
    errors.endTime = fieldErrors.endTime;
  }
  if (values.venue.trim() === '') errors.venue = fieldErrors.venue;
  if (parseCapacity(Number(values.capacity)) === null) errors.capacity = fieldErrors.capacity;
  return errors;
}

export interface OrganiserNewSessionFormProps {
  defaults: NewSessionDefaults;
  /** True when the values were copied from the current Session. */
  copied: boolean;
  /** Called with the new Session's id once it exists. */
  onCreated: (sessionId: string) => void;
}

const inputClass =
  'mt-1 block min-h-11 w-full border bg-[var(--background)] px-3 font-body text-base text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]';

export function OrganiserNewSessionForm({
  defaults,
  copied,
  onCreated,
}: OrganiserNewSessionFormProps) {
  const baseId = useId();
  const { busy, error, failure, run, reset } = useOrganiserAction();
  const [values, setValues] = useState<FormValues>({
    localDate: defaults.localDate,
    startTime: defaults.startTime,
    endTime: defaults.endTime,
    venue: defaults.venue,
    capacity: String(defaults.capacity),
  });
  const [clientErrors, setClientErrors] = useState<Partial<Record<FieldName, string>>>({});

  const serverField =
    failure?.error === 'invalid-input' && failure.field ? (failure.field as FieldName) : null;
  const errors: Partial<Record<FieldName, string>> = {
    ...clientErrors,
    ...(serverField && copy.fields[serverField] ? { [serverField]: error ?? '' } : {}),
  };
  const generalError = error && !serverField ? error : null;

  const set = (field: FieldName) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setClientErrors((current) => ({ ...current, [field]: undefined }));
    if (failure) reset();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateNewSession(values);
    setClientErrors(found);
    if (Object.values(found).some(Boolean)) return;
    const result = await run(
      () =>
        createSessionAction({
          localDate: values.localDate,
          startTime: values.startTime,
          endTime: values.endTime,
          venue: values.venue.trim(),
          capacity: Number(values.capacity),
        }),
      { refresh: false },
    );
    if (result) onCreated(result.sessionId);
  };

  const field = (
    name: FieldName,
    type: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => {
    const id = `${baseId}-${name}`;
    const message = errors[name];
    return (
      <div>
        <label htmlFor={id} className="block font-body text-sm font-medium text-[var(--foreground)]">
          {copy.fields[name]}
        </label>
        <input
          id={id}
          name={name}
          type={type}
          value={values[name]}
          onChange={set(name)}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-error` : undefined}
          className={`${inputClass} ${message ? 'border-red-600' : 'border-[var(--border)]'}`}
          {...extra}
        />
        {message ? (
          <p id={`${id}-error`} className="mt-1 font-body text-xs text-red-700 dark:text-red-400">
            {message}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="py-6">
      <Heading as="h2" size="md" className="font-semibold tracking-[-0.03em]">
        {copy.heading}
      </Heading>
      <Text variant="muted" size="sm" className="mt-2 max-w-[34rem]">
        {copied ? copy.copiedNote : copy.intro}
      </Text>

      <form onSubmit={submit} noValidate className="mt-5 grid max-w-md gap-4">
        {field('localDate', 'date')}
        <div className="grid grid-cols-2 gap-4">
          {field('startTime', 'time')}
          {field('endTime', 'time')}
        </div>
        {field('venue', 'text', { maxLength: 40, autoComplete: 'off' })}
        {field('capacity', 'number', { min: 1, max: CAPACITY_MAX, inputMode: 'numeric' })}

        {generalError ? (
          <p role="alert" className="font-body text-sm text-red-700 dark:text-red-400">
            {generalError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="min-h-11 bg-[var(--primary)] px-5 py-2 font-body text-sm font-medium text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {busy ? copy.submitting : copy.submit}
        </button>
      </form>
    </div>
  );
}
