'use client';

import { useId, useState } from 'react';
import { Heading, Text } from '@/components/ui';
import { courtBoard } from '@/data';
import { setCommitteeAction } from '@/lib/court-board/organiser-actions';
import { useOrganiserAction } from '@/components/sections/labs/court-board/organiser-use-action';

const copy = courtBoard.organiser.committee;

/** The committee names shown on every Signup page, edited one per line. */
export function OrganiserCommitteeSection({ committee }: { committee: string[] }) {
  const id = useId();
  const { busy, error, run } = useOrganiserAction();
  const [text, setText] = useState(committee.join('\n'));
  const [saved, setSaved] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    const result = await run(() => setCommitteeAction({ names: text.split('\n') }));
    if (result) {
      setText(result.committee.join('\n'));
      setSaved(true);
    }
  };

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="mt-12 border-t border-[var(--border)] pt-6"
    >
      <Heading as="h2" size="sm" id={`${id}-heading`}>
        {copy.heading}
      </Heading>
      <Text variant="muted" size="sm" className="mt-2 max-w-[34rem]">
        {committee.length > 0 ? copy.body : copy.empty}
      </Text>
      <form onSubmit={save} className="mt-4 max-w-md space-y-2">
        <label htmlFor={`${id}-names`} className="block font-body text-sm font-medium">
          {copy.label}
        </label>
        <textarea
          id={`${id}-names`}
          rows={4}
          value={text}
          disabled={busy}
          aria-describedby={`${id}-help`}
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            setText(event.target.value);
            setSaved(false);
          }}
          className="block w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-body text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        />
        <p id={`${id}-help`} className="font-body text-xs text-[var(--mono-500)]">
          {copy.help}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 border border-[var(--border)] px-4 py-2 font-body text-sm hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-50"
          >
            {copy.save}
          </button>
          <span role="status" aria-live="polite" className="font-body text-sm">
            {saved ? copy.saved : null}
          </span>
        </div>
        {error ? (
          <p role="alert" className="font-body text-xs text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
