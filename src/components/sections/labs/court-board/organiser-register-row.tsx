'use client';

import { useId, useState } from 'react';
import { courtBoard } from '@/data';
import { formatInstantDate } from '@/lib/court-board/format';
import {
  removeSeatAction,
  setAttendedAction,
  setSeatTierAction,
} from '@/lib/court-board/organiser-actions';
import type { Tier } from '@/lib/court-board/types';
import type { OrganiserSeatRow } from '@/lib/court-board/views';
import { OrganiserDialog } from '@/components/sections/labs/court-board/organiser-dialog';
import { fill } from '@/components/sections/labs/court-board/organiser-template';
import { useOrganiserAction } from '@/components/sections/labs/court-board/organiser-use-action';
import { cn } from '@/lib/utils';

const copy = courtBoard.organiser;

const HOST_TIERS: Tier[] = ['employee', 'alumni', 'external'];
const GUEST_TIERS: Tier[] = ['alumni', 'external'];

export interface OrganiserRegisterRowProps {
  row: OrganiserSeatRow;
  sessionId: string;
  /** The Session is cancelled or its register is closed: nothing can change. */
  locked: boolean;
}

/**
 * One Seat in the register. Tier and "here" update straight away and roll back
 * if the server refuses; the override is tied to the value it replaced, so it
 * falls away on its own once fresh data arrives.
 */
export function OrganiserRegisterRow({
  row,
  sessionId,
  locked,
}: OrganiserRegisterRowProps) {
  const selectId = useId();
  const { error, run, busy } = useOrganiserAction();
  const [tierOverride, setTierOverride] = useState<{ from: Tier; to: Tier } | null>(null);
  const [hereOverride, setHereOverride] = useState<{ from: boolean; to: boolean } | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const tier = tierOverride?.from === row.tier ? tierOverride.to : row.tier;
  const here = hereOverride?.from === row.attended ? hereOverride.to : row.attended;
  const tiers = row.kind === 'guest' ? GUEST_TIERS : HOST_TIERS;

  const changeTier = async (next: Tier) => {
    setTierOverride({ from: row.tier, to: next });
    const done = await run(() => setSeatTierAction({ sessionId, seatId: row.id, tier: next }));
    if (!done) setTierOverride(null);
  };

  const changeHere = async (next: boolean) => {
    setHereOverride({ from: row.attended, to: next });
    const done = await run(() =>
      setAttendedAction({ sessionId, seatId: row.id, attended: next }),
    );
    if (!done) setHereOverride(null);
  };

  const remove = async () => {
    const done = await run(() => removeSeatAction({ sessionId, seatId: row.id }));
    if (done) setConfirmingRemove(false);
  };

  return (
    <li className="border-b border-[var(--border)] py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-48">
          <p className="break-words font-body text-base font-medium text-[var(--foreground)]">
            <span className="mr-2 tabular-nums text-[var(--mono-500)]">{row.position}.</span>
            {row.name}
          </p>
          <p className="font-body text-xs text-[var(--mono-500)]">
            {row.kind === 'guest' && row.hostName
              ? fill(copy.register.guestOf, { host: row.hostName })
              : null}
            {row.phoneLast3 ? (
              <span className="ml-2">
                {fill(copy.register.phoneEnding, { digits: row.phoneLast3 })}
              </span>
            ) : null}
            {row.holdUntil ? (
              <span className="ml-2 font-medium text-amber-700 dark:text-amber-400">
                {fill(copy.register.holdUntil, { date: formatInstantDate(row.holdUntil) })}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={selectId} className="sr-only">
            {fill(copy.register.tierLabel, { name: row.name })}
          </label>
          <select
            id={selectId}
            value={tier}
            disabled={locked}
            onChange={(event) => changeTier(event.target.value as Tier)}
            className="min-h-11 border border-[var(--border)] bg-[var(--background)] px-2 font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-60"
          >
            {tiers.map((value) => (
              <option key={value} value={value}>
                {courtBoard.tiers[value]}
              </option>
            ))}
          </select>

          {row.state === 'main' ? (
            <label className="flex min-h-11 items-center gap-2 font-body text-sm">
              <input
                type="checkbox"
                checked={here}
                disabled={locked}
                onChange={(event) => changeHere(event.target.checked)}
                aria-label={fill(copy.register.hereLabel, { name: row.name })}
                className="size-5 accent-[var(--primary)]"
              />
              <span aria-hidden="true">{copy.register.hereShort}</span>
            </label>
          ) : null}

          <button
            type="button"
            disabled={locked}
            onClick={() => setConfirmingRemove(true)}
            aria-label={fill(copy.register.removeLabel, { name: row.name })}
            className={cn(
              'min-h-11 px-3 font-body text-sm text-red-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-50 dark:text-red-400',
            )}
          >
            {copy.register.remove}
          </button>
        </div>
      </div>

      {error && !confirmingRemove ? (
        <p role="alert" className="mt-1 font-body text-xs text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {confirmingRemove ? (
        <OrganiserDialog
          title={fill(copy.register.removeTitle, { name: row.name })}
          confirmLabel={copy.register.removeConfirm}
          tone="danger"
          busy={busy}
          error={error}
          onClose={() => setConfirmingRemove(false)}
          onConfirm={remove}
        >
          <p>{copy.register.removeBody}</p>
        </OrganiserDialog>
      ) : null}
    </li>
  );
}
