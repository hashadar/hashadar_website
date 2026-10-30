'use client';

import { useId, useState } from 'react';
import { courtBoard } from '@/data';
import type { Tier } from '@/lib/court-board/types';
import type { Failure, MySeatView } from '@/lib/court-board/views';
import { cn } from '@/lib/utils';
import { consequenceText } from './consequence';
import { describeFailure } from './error-message';
import { fillTemplate } from './fill-template';
import { TierField } from './tier-field';

export interface SeatCardProps {
  seat: MySeatView;
  /** The Host seat has Guest seats that a cancellation would take with it. */
  hasGuests: boolean;
  changesAllowed: boolean;
  /** Another request is running; hold further taps. */
  busy: boolean;
  onSave: (
    seatId: string,
    patch: { name: string; tier: Tier },
  ) => Promise<Failure | null>;
  onCancel: (seatId: string) => Promise<Failure | null>;
}

type Mode = 'view' | 'edit' | 'confirm-cancel';

const secondaryButton =
  'min-h-11 border-2 border-[var(--border)] px-4 font-body text-sm hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-60';

export function SeatCard({
  seat,
  hasGuests,
  changesAllowed,
  busy,
  onSave,
  onCancel,
}: SeatCardProps) {
  const copy = courtBoard.player.manage;
  const id = useId();
  const [mode, setMode] = useState<Mode>('view');
  const [name, setName] = useState(seat.name);
  const [tier, setTier] = useState<Tier>(seat.tier);
  const [error, setError] = useState<string | null>(null);

  const isHost = seat.kind === 'host';
  const penalty = seat.consequence.kind === 'penalty';
  const status = fillTemplate(
    seat.state === 'main' ? copy.statusPlaying : copy.statusWaitlist,
    { position: seat.position },
  );

  async function save() {
    setError(null);
    const failure = await onSave(seat.id, { name, tier });
    if (failure) setError(describeFailure(failure));
    else setMode('view');
  }

  async function confirmCancel() {
    setError(null);
    const failure = await onCancel(seat.id);
    if (failure) setError(describeFailure(failure));
  }

  return (
    <li className="space-y-3 border-2 border-[var(--border)] bg-[var(--background)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-body text-base font-medium">{seat.name}</p>
          <p className="font-body text-xs text-[var(--mono-500)]">
            {isHost ? copy.youLabel : copy.guestLabel} · {courtBoard.tiers[seat.tier]}
          </p>
        </div>
        <p className="font-body text-sm font-medium text-[var(--primary)]">{status}</p>
      </div>

      {mode === 'view' && changesAllowed ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className={secondaryButton}
            onClick={() => {
              setName(seat.name);
              setTier(seat.tier);
              setError(null);
              setMode('edit');
            }}
          >
            {copy.edit}
          </button>
          <button
            type="button"
            disabled={busy}
            className={secondaryButton}
            onClick={() => {
              setError(null);
              setMode('confirm-cancel');
            }}
          >
            {isHost ? copy.cancelPlace : copy.cancelGuest}
          </button>
        </div>
      ) : null}

      {mode === 'edit' ? (
        <div className="space-y-3">
          <div>
            <label htmlFor={`${id}-name`} className="mb-1 block font-body text-xs">
              {copy.nameLabel}
            </label>
            <input
              id={`${id}-name`}
              type="text"
              maxLength={40}
              required
              autoComplete="off"
              disabled={busy}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="block min-h-11 w-full max-w-sm border-2 border-[var(--border)] bg-[var(--background)] px-3 py-2 font-body text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            />
          </div>
          <TierField
            legend={courtBoard.player.signup.tierLegend}
            value={tier}
            onChange={setTier}
            tiers={isHost ? ['employee', 'alumni', 'external'] : ['alumni', 'external']}
            disabled={busy}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || name.trim() === ''}
              onClick={save}
              className="min-h-11 bg-[var(--primary)] px-4 font-body text-sm font-medium text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {copy.save}
            </button>
            <button
              type="button"
              disabled={busy}
              className={secondaryButton}
              onClick={() => setMode('view')}
            >
              {copy.discard}
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'confirm-cancel' ? (
        <div
          role="group"
          aria-label={isHost ? copy.cancelPlace : copy.cancelGuest}
          className={cn(
            'space-y-3 border-2 p-4',
            penalty ? 'border-red-600' : 'border-[var(--border)]',
          )}
        >
          <p
            className={cn(
              'font-body text-sm',
              penalty && 'font-medium text-red-700',
            )}
          >
            {consequenceText(seat.consequence)}
          </p>
          {isHost && hasGuests ? (
            <p className="font-body text-xs text-[var(--mono-500)]">
              {copy.cancelHostNote}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={confirmCancel}
              className={cn(
                'min-h-11 px-4 font-body text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60',
                penalty
                  ? 'bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700'
                  : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] focus-visible:ring-[var(--primary)]',
              )}
            >
              {penalty ? copy.confirmCancelPenalty : copy.confirmCancel}
            </button>
            <button
              type="button"
              disabled={busy}
              className={secondaryButton}
              onClick={() => setMode('view')}
            >
              {copy.keepPlace}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="font-body text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </li>
  );
}
