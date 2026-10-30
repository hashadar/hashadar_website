'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Heading, Text } from '@/components/ui';
import { courtBoard } from '@/data';
import { resetDemoAction, setDevClockAction } from '@/lib/court-board/dev-actions';
import { formatInstant, formatInstantDate } from '@/lib/court-board/format';
import type { DevInfo } from '@/lib/court-board/server-queries';

const buttonClass =
  'min-h-11 border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]';

/**
 * Local-only: jump the clock to the interesting moments of the demo Session so
 * Release, Cutoff and Grace period can be tried without waiting for Thursday.
 * Only rendered on the in-memory demo store during `next dev`.
 */
export function CourtBoardDevPanel({ info }: { info: DevInfo }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [custom, setCustom] = useState('');

  const run = (work: () => Promise<unknown>) =>
    startTransition(async () => {
      await work();
      router.refresh();
    });

  return (
    <aside
      aria-labelledby="court-board-demo"
      className="mt-12 border border-dashed border-[var(--primary)] p-5"
    >
      <Heading as="h2" size="sm" id="court-board-demo">
        {courtBoard.lab.demoHeading}
      </Heading>
      <Text variant="muted" size="xs" className="mt-2">
        {courtBoard.lab.demoNote}
      </Text>

      <ul className="mt-4 space-y-1 font-body text-sm">
        <li>
          <Link className="underline" href={info.sessionPath}>
            Open the demo Session
          </Link>
        </li>
        <li>
          <Link className="underline" href={info.organiserTokenPath}>
            Open as Organiser
          </Link>
        </li>
        <li>
          Demo Player: {info.player.name}, {info.player.phone}, PIN {info.player.pin}
        </li>
      </ul>

      <Text size="xs" className="mt-4">
        Pretend it is{' '}
        <strong>
          {formatInstantDate(info.nowIso)} {formatInstant(info.nowIso).split(' ')[1]}
        </strong>{' '}
        (London).
      </Text>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {info.presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            disabled={pending}
            className={buttonClass}
            onClick={() => run(() => setDevClockAction(preset.iso))}
          >
            {preset.label}
            <span className="block text-xs text-[var(--mono-500)]">
              {formatInstantDate(preset.iso)} {formatInstant(preset.iso).split(' ')[1]}
            </span>
          </button>
        ))}
        <button
          type="button"
          disabled={pending}
          className={buttonClass}
          onClick={() => run(() => setDevClockAction(null))}
        >
          Back to real time
        </button>
      </div>

      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const when = new Date(custom);
          if (!Number.isNaN(when.getTime())) run(() => setDevClockAction(when.toISOString()));
        }}
      >
        <label className="font-body text-xs">
          Or an exact time (in your browser&apos;s zone)
          <input
            type="datetime-local"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            className="mt-1 block min-h-11 border border-[var(--border)] bg-[var(--background)] px-2"
          />
        </label>
        <button type="submit" disabled={pending || !custom} className={buttonClass}>
          Set
        </button>
      </form>

      <button
        type="button"
        disabled={pending}
        className={`${buttonClass} mt-4`}
        onClick={() => run(() => resetDemoAction())}
      >
        Reset demo data
      </button>
    </aside>
  );
}
