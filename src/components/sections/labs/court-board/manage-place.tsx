'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Heading, Text } from '@/components/ui';
import { courtBoard } from '@/data';
import { formatInstantDate } from '@/lib/court-board/format';
import {
  addGuestsAction,
  cancelSeatAction,
  getMyPlaceAction,
  updateSeatAction,
} from '@/lib/court-board/player-actions';
import type { Tier } from '@/lib/court-board/types';
import type { Failure, MyPlaceView, SessionView } from '@/lib/court-board/views';
import { weeksPhrase } from './consequence';
import { rulesPath } from './court-board-links';
import { describeFailure } from './error-message';
import { fillTemplate } from './fill-template';
import { GuestFields, toGuestPayload, type GuestDraft } from './guest-fields';
import { PhoneInput } from './phone-input';
import { SeatCard } from './seat-card';
import type { Credentials } from './signup-form';

export interface ManagePlaceProps {
  view: SessionView;
  /**
   * Credentials just used to take a place. They open the view straight away, so
   * the Player does not retype them. They stay in memory for this view only.
   */
  initialCredentials: Credentials | null;
  /** Something changed on the server; refresh the public list. */
  onChanged: () => void;
}

const inputClass =
  'block min-h-11 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 py-2 font-body text-base text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2';

export function ManagePlace({ view, initialCredentials, onChanged }: ManagePlaceProps) {
  const copy = courtBoard.player.manage;
  const id = useId();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [place, setPlace] = useState<MyPlaceView | null>(null);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newGuests, setNewGuests] = useState<GuestDraft[]>([]);

  // Phone and PIN are held in memory only, for the open view. Never stored.
  const credentials = useRef<Credentials | null>(null);
  const inFlight = useRef(false);
  const seeded = useRef<Credentials | null>(null);

  const changesAllowed =
    view.session.status === 'open' && !view.session.registerClosed;

  const fetchPlace = useCallback(
    async (creds: Credentials): Promise<boolean> => {
      const result = await getMyPlaceAction({
        sessionId: view.session.id,
        phone: creds.phone,
        pin: creds.pin,
      });
      if (result.ok) {
        credentials.current = creds;
        setPlace(result.place);
        setFailure(null);
        return true;
      }
      setFailure(result);
      return false;
    },
    [view.session.id],
  );

  /** Run one request at a time; the second tap of a double tap is ignored. */
  const guarded = useCallback(async <T,>(work: () => Promise<T>): Promise<T | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setPending(true);
    try {
      return await work();
    } catch {
      setFailure({ ok: false, error: 'rejected' });
      return null;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);

  useEffect(() => {
    if (!initialCredentials || seeded.current === initialCredentials) return;
    seeded.current = initialCredentials;
    setPhone(initialCredentials.phone);
    setPin(initialCredentials.pin);
    void guarded(() => fetchPlace(initialCredentials));
  }, [initialCredentials, fetchPlace, guarded]);

  // Forget the credentials when this view goes away.
  useEffect(
    () => () => {
      credentials.current = null;
      seeded.current = null;
    },
    [],
  );

  async function open(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    await guarded(() => fetchPlace({ phone, pin }));
  }

  function hide() {
    credentials.current = null;
    setPlace(null);
    setPin('');
    setNotice(null);
    setFailure(null);
    setNewGuests([]);
  }

  /** Reload the Player's view and the public list after a change. */
  async function afterChange() {
    if (credentials.current) await fetchPlace(credentials.current);
    onChanged();
  }

  async function save(seatId: string, patch: { name: string; tier: Tier }) {
    const creds = credentials.current;
    if (!creds) return null;
    const result = await guarded(async () => {
      const response = await updateSeatAction({
        sessionId: view.session.id,
        ...creds,
        seatId,
        ...patch,
      });
      if (!response.ok) return response;
      setNotice(copy.saved);
      await afterChange();
      return null;
    });
    return result;
  }

  async function cancel(seatId: string) {
    const creds = credentials.current;
    if (!creds) return null;
    return guarded(async () => {
      const response = await cancelSeatAction({
        sessionId: view.session.id,
        ...creds,
        seatId,
      });
      if (!response.ok) return response;
      setNotice(
        response.penalty
          ? fillTemplate(copy.cancelledPenalty, {
              ...weeksPhrase(response.penalty.weeks),
              date: formatInstantDate(response.penalty.endsAt),
            })
          : copy.cancelled,
      );
      await afterChange();
      return null;
    });
  }

  async function addGuests(event: React.FormEvent) {
    event.preventDefault();
    const creds = credentials.current;
    if (!creds || newGuests.length === 0) return;
    await guarded(async () => {
      const response = await addGuestsAction({
        sessionId: view.session.id,
        ...creds,
        guests: toGuestPayload(newGuests),
      });
      if (!response.ok) {
        setFailure(response);
        return;
      }
      setFailure(null);
      setNewGuests([]);
      setNotice(copy.guestsAdded);
      await afterChange();
    });
  }

  const hostSeat = place?.seats.find((s) => s.kind === 'host');
  const guestCount = place?.seats.filter((s) => s.kind === 'guest').length ?? 0;

  return (
    <div className="space-y-5">
      <Heading as="h2" size="md">
        {copy.heading}
      </Heading>

      {place === null ? (
        <form onSubmit={open} className="space-y-4">
          <Text size="sm" variant="muted">
            {copy.intro}
          </Text>
          <PhoneInput
            label={copy.phoneLabel}
            value={phone}
            onChange={setPhone}
            required
            disabled={pending}
            invalid={failure?.error === 'invalid-phone'}
            name="manage-phone"
          />
          <div>
            <label htmlFor={`${id}-pin`} className="mb-1 block font-body text-sm font-medium">
              {copy.pinLabel}
            </label>
            <input
              id={`${id}-pin`}
              name="manage-pin"
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              autoComplete="off"
              disabled={pending}
              value={pin}
              aria-describedby={`${id}-pin-help`}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`${inputClass} max-w-[10rem] tracking-[0.3em]`}
            />
            <p id={`${id}-pin-help`} className="mt-1 font-body text-xs text-[var(--mono-500)]">
              {copy.pinHelp}
            </p>
          </div>
          {failure ? (
            <p role="alert" className="font-body text-sm font-medium text-red-700">
              {describeFailure(failure)}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="min-h-12 bg-[var(--primary)] px-6 font-body text-base font-medium text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {pending ? copy.opening : copy.open}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          {place.pinWasSet ? (
            <p role="status" className="font-body text-sm font-medium text-[var(--primary)]">
              {copy.newPinSet}
            </p>
          ) : null}
          {place.holdUntil ? (
            <p className="border-2 border-red-600 p-3 font-body text-sm text-red-700">
              {fillTemplate(copy.holdNotice, { date: formatInstantDate(place.holdUntil) })}
            </p>
          ) : null}
          {!changesAllowed ? (
            <p className="font-body text-sm text-[var(--mono-500)]">{copy.closedNote}</p>
          ) : null}
          {notice ? (
            <p role="status" className="font-body text-sm font-medium text-[var(--primary)]">
              {notice}
            </p>
          ) : null}
          {failure ? (
            <p role="alert" className="font-body text-sm font-medium text-red-700">
              {describeFailure(failure)}
            </p>
          ) : null}

          {place.seats.length === 0 ? (
            <Text size="sm">{copy.noPlace}</Text>
          ) : (
            <ul className="space-y-3">
              {place.seats.map((seat) => (
                <SeatCard
                  key={seat.id}
                  seat={seat}
                  hasGuests={guestCount > 0}
                  changesAllowed={changesAllowed}
                  busy={pending}
                  onSave={save}
                  onCancel={cancel}
                  rulesHref={rulesPath(view.session.id)}
                />
              ))}
            </ul>
          )}

          {hostSeat && changesAllowed ? (
            <form onSubmit={addGuests} className="space-y-3">
              <Heading as="h3" size="sm">
                {copy.addGuestsHeading}
              </Heading>
              <p className="font-body text-xs text-[var(--mono-500)]">
                {place.guestsRemaining === null
                  ? copy.guestsUnlimited
                  : place.guestsRemaining === 0
                    ? copy.guestsFull
                    : fillTemplate(copy.guestsRemaining, { count: place.guestsRemaining })}
              </p>
              {place.guestsRemaining !== 0 ? (
                <GuestFields
                  guests={newGuests}
                  onChange={setNewGuests}
                  max={place.guestsRemaining}
                  disabled={pending}
                />
              ) : null}
              {newGuests.length > 0 ? (
                <button
                  type="submit"
                  disabled={pending}
                  className="min-h-11 bg-[var(--primary)] px-4 font-body text-sm font-medium text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {copy.addGuests}
                </button>
              ) : null}
            </form>
          ) : null}

          <button
            type="button"
            onClick={hide}
            className="min-h-11 px-1 font-body text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {copy.hide}
          </button>
        </div>
      )}

      <p className="font-body text-xs text-[var(--mono-500)]">{copy.forgotten}</p>
    </div>
  );
}
