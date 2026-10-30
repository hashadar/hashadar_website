'use client';

import { useId, useState } from 'react';
import { Heading, Text } from '@/components/ui';
import { courtBoard } from '@/data';
import {
  addLocalDays,
} from '@/lib/court-board/time';
import { formatInstantDate, londonDateOf } from '@/lib/court-board/format';
import {
  clearPenaltyAction,
  resetPinAction,
  shortenPenaltyAction,
} from '@/lib/court-board/organiser-actions';
import type { HoldRow, OrganiserOverview, PlayerRow } from '@/lib/court-board/views';
import { OrganiserDialog } from '@/components/sections/labs/court-board/organiser-dialog';
import { fill } from '@/components/sections/labs/court-board/organiser-template';
import { useOrganiserAction } from '@/components/sections/labs/court-board/organiser-use-action';

const copy = courtBoard.organiser;

const smallButton =
  'min-h-11 border border-[var(--border)] px-3 font-body text-sm hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-50';

function HoldItem({ hold, today }: { hold: HoldRow; today: string }) {
  const dateId = useId();
  const { busy, error, run } = useOrganiserAction();
  const [shortening, setShortening] = useState(false);
  const [endsOn, setEndsOn] = useState('');
  const identity = {
    phoneKey: hold.phoneKey,
    sessionId: hold.sessionId,
    reason: hold.reason,
  };
  const name = hold.displayName;
  // The new end must come before the current one (which is a London midnight).
  const latest = addLocalDays(londonDateOf(hold.endsAt), -1);

  const clear = () => run(() => clearPenaltyAction(identity));
  const shorten = async (event: React.FormEvent) => {
    event.preventDefault();
    const done = await run(() => shortenPenaltyAction({ ...identity, endsOn }));
    if (done) {
      setShortening(false);
      setEndsOn('');
    }
  };

  return (
    <li className="border-b border-[var(--border)] py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-48">
          <p className="font-body text-base font-medium text-[var(--foreground)]">
            {fill(copy.holds.player, { name, digits: hold.phoneLast3 })}
          </p>
          <p className="font-body text-xs text-[var(--mono-500)]">
            {copy.reasons[hold.reason] ?? hold.reason} ·{' '}
            {hold.weeks === 1
              ? copy.holds.weeksOne
              : fill(copy.holds.weeksMany, { count: hold.weeks })}{' '}
            · {fill(copy.holds.until, { date: formatInstantDate(hold.endsAt) })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={smallButton}
            disabled={busy}
            aria-label={fill(copy.holds.clearLabel, { name })}
            onClick={clear}
          >
            {copy.holds.clear}
          </button>
          <button
            type="button"
            className={smallButton}
            disabled={busy}
            aria-expanded={shortening}
            aria-label={fill(copy.holds.shortenLabel, { name })}
            onClick={() => setShortening((open) => !open)}
          >
            {copy.holds.shorten}
          </button>
        </div>
      </div>

      {shortening ? (
        <form onSubmit={shorten} className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor={dateId} className="block font-body text-xs text-[var(--mono-500)]">
              {copy.holds.shortenDate}
            </label>
            <input
              id={dateId}
              type="date"
              required
              value={endsOn}
              min={today}
              max={latest}
              onChange={(event) => setEndsOn(event.target.value)}
              className="mt-1 min-h-11 border border-[var(--border)] bg-[var(--background)] px-2 font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            />
          </div>
          <button type="submit" disabled={busy || !endsOn} className={smallButton}>
            {copy.holds.shortenSave}
          </button>
          <button
            type="button"
            className={smallButton}
            onClick={() => setShortening(false)}
          >
            {copy.holds.shortenCancel}
          </button>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 font-body text-xs text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function ResetPin({ players }: { players: PlayerRow[] }) {
  const selectId = useId();
  const { busy, error, run, reset } = useOrganiserAction();
  const [chosen, setChosen] = useState('');
  const [confirming, setConfirming] = useState<PlayerRow | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const player = players.find((p) => p.phoneKey === chosen) ?? null;

  const confirm = async () => {
    if (!confirming) return;
    const result = await run(() => resetPinAction({ phoneKey: confirming.phoneKey }));
    if (result) {
      setDone(fill(copy.holds.resetDone, { name: confirming.displayName }));
      setConfirming(null);
      setChosen('');
    }
  };

  return (
    <section aria-labelledby="reset-pin-heading" className="mt-10">
      <Heading as="h3" size="sm" id="reset-pin-heading">
        {copy.holds.resetHeading}
      </Heading>
      <Text variant="muted" size="sm" className="mt-2 max-w-[34rem]">
        {copy.holds.resetBody}
      </Text>

      {players.length === 0 ? (
        <Text variant="muted" size="sm" className="mt-3">
          {copy.holds.resetNoPlayers}
        </Text>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor={selectId} className="block font-body text-xs text-[var(--mono-500)]">
              {copy.holds.resetPlayerLabel}
            </label>
            <select
              id={selectId}
              value={chosen}
              onChange={(event) => {
                setChosen(event.target.value);
                setDone(null);
              }}
              className="mt-1 min-h-11 min-w-56 border border-[var(--border)] bg-[var(--background)] px-2 font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <option value="">{copy.holds.resetPlaceholder}</option>
              {players.map((p) => (
                <option key={p.phoneKey} value={p.phoneKey}>
                  {fill(copy.holds.player, { name: p.displayName, digits: p.phoneLast3 })}
                  {p.hasPin ? '' : ` (${copy.holds.resetNoPin})`}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!player || busy}
            className={smallButton}
            onClick={() => {
              reset();
              setConfirming(player);
            }}
          >
            {copy.holds.resetButton}
          </button>
        </div>
      )}

      {done ? (
        <p role="status" className="mt-2 font-body text-sm text-[var(--primary)]">
          {done}
        </p>
      ) : null}

      {confirming ? (
        <OrganiserDialog
          title={fill(copy.holds.resetTitle, { name: confirming.displayName })}
          confirmLabel={copy.holds.resetConfirm}
          busy={busy}
          error={error}
          onClose={() => setConfirming(null)}
          onConfirm={confirm}
        >
          <p>{copy.holds.resetBody}</p>
        </OrganiserDialog>
      ) : null}
    </section>
  );
}

export function OrganiserHoldsPanel({ overview }: { overview: OrganiserOverview }) {
  const today = londonDateOf(overview.now);
  return (
    <div className="py-6">
      <Heading as="h2" size="md" className="font-semibold tracking-[-0.03em]">
        {copy.holds.heading}
      </Heading>
      {overview.holds.length === 0 ? (
        <Text variant="muted" size="sm" className="mt-3">
          {copy.holds.empty}
        </Text>
      ) : (
        <ul className="mt-4 border-t border-[var(--border)]">
          {overview.holds.map((hold) => (
            <HoldItem
              key={`${hold.phoneKey}-${hold.sessionId}-${hold.reason}`}
              hold={hold}
              today={today}
            />
          ))}
        </ul>
      )}
      <ResetPin players={overview.players} />
    </div>
  );
}
