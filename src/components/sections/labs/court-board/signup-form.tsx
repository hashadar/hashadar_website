'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { Heading, Text } from '@/components/ui';
import { courtBoard } from '@/data';
import { signUpAction } from '@/lib/court-board/player-actions';
import type { Tier } from '@/lib/court-board/types';
import type { Failure, SessionView, SignUpResult } from '@/lib/court-board/views';
import { PRIVACY_PATH, rulesPath } from './court-board-links';
import { describeFailure } from './error-message';
import { fillTemplate } from './fill-template';
import { GuestFields, toGuestPayload, type GuestDraft } from './guest-fields';
import { PhoneInput } from './phone-input';
import { TierField } from './tier-field';
import { formatInstant } from '@/lib/court-board/format';

export interface Credentials {
  phone: string;
  pin: string;
}

export interface SignupFormProps {
  view: SessionView;
  /** Called after a place is taken, with the credentials to open Manage my place. */
  onSignedUp: (credentials: Credentials) => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'error'; failure: Failure }
  | { kind: 'done'; result: SignUpResult };

const inputClass =
  'block min-h-11 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 py-2 font-body text-base text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2';

export function SignupForm({ view, onSignedUp }: SignupFormProps) {
  const copy = courtBoard.player.signup;
  const id = useId();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [tier, setTier] = useState<Tier | null>(null);
  const [guests, setGuests] = useState<GuestDraft[]>([]);
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  // A ref closes the gap between a tap and React disabling the button.
  const inFlight = useRef(false);

  const pending = status.kind === 'pending';
  const failure = status.kind === 'error' ? status.failure : null;
  const fieldIsInvalid = (field: string) =>
    failure?.error === 'invalid-input' && failure.field === field;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus({ kind: 'pending' });
    try {
      const result = await signUpAction({
        sessionId: view.session.id,
        name,
        phone,
        pin,
        tier,
        guests: toGuestPayload(guests),
        website: honeypot,
      });
      if (result.ok) {
        setStatus({ kind: 'done', result });
        onSignedUp({ phone, pin });
        setPin('');
      } else {
        setStatus({ kind: 'error', failure: result });
      }
    } catch {
      setStatus({ kind: 'error', failure: { ok: false, error: 'rejected' } });
    } finally {
      inFlight.current = false;
    }
  }

  function reset() {
    setName('');
    setPhone('');
    setPin('');
    setTier(null);
    setGuests([]);
    setStatus({ kind: 'idle' });
  }

  if (status.kind === 'done') {
    const { result } = status;
    return (
      <div role="status" className="space-y-2 border-2 border-[var(--primary)] p-5">
        <Heading as="h2" size="sm">
          {fillTemplate(
            result.state === 'main' ? copy.successMain : copy.successWaitlist,
            { position: result.position },
          )}
        </Heading>
        {result.pinWasSet ? <Text size="sm">{copy.pinSetNote}</Text> : null}
        <Text size="sm" variant="muted">
          {copy.manageHint}
        </Text>
        <button
          type="button"
          onClick={reset}
          className="mt-2 min-h-11 border-2 border-[var(--border)] px-4 font-body text-sm hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {copy.another}
        </button>
      </div>
    );
  }

  const guestsHelp =
    view.guestLimit === null
      ? copy.guestsHelpUnlimited
      : fillTemplate(copy.guestsHelpLimited, {
          limit: view.guestLimit,
          topUp: formatInstant(view.times.topUpAt),
        });

  return (
    <form onSubmit={submit} aria-labelledby={`${id}-heading`} className="space-y-5">
      <Heading as="h2" size="md" id={`${id}-heading`}>
        {copy.heading}
      </Heading>

      <div>
        <label htmlFor={`${id}-name`} className="mb-1 block font-body text-sm font-medium">
          {copy.nameLabel}
        </label>
        <input
          id={`${id}-name`}
          name="name"
          type="text"
          required
          maxLength={40}
          autoComplete="name"
          disabled={pending}
          value={name}
          aria-invalid={fieldIsInvalid('name') || undefined}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
      </div>

      <PhoneInput
        label={copy.phoneLabel}
        helpText={copy.phoneHelp}
        value={phone}
        onChange={setPhone}
        required
        disabled={pending}
        invalid={failure?.error === 'invalid-phone'}
      />

      <div>
        <label htmlFor={`${id}-pin`} className="mb-1 block font-body text-sm font-medium">
          {copy.pinLabel}
        </label>
        <input
          id={`${id}-pin`}
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoComplete="off"
          disabled={pending}
          value={pin}
          aria-describedby={`${id}-pin-help`}
          aria-invalid={fieldIsInvalid('pin') || failure?.error === 'trivial-pin' || undefined}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
          className={`${inputClass} max-w-[10rem] tracking-[0.3em]`}
        />
        <p id={`${id}-pin-help`} className="mt-1 font-body text-xs text-[var(--mono-500)]">
          {copy.pinHelp}
        </p>
      </div>

      <TierField
        legend={copy.tierLegend}
        help={copy.tierHelp}
        value={tier}
        onChange={setTier}
        required
        disabled={pending}
        invalid={fieldIsInvalid('tier')}
      />

      <fieldset className="space-y-2" disabled={pending}>
        <legend className="font-body text-sm font-medium">{copy.guestsHeading}</legend>
        <p className="font-body text-xs text-[var(--mono-500)]">{guestsHelp}</p>
        <GuestFields
          guests={guests}
          onChange={setGuests}
          max={view.guestLimit}
          disabled={pending}
        />
      </fieldset>

      {/* Honeypot: people never see or reach it; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </label>
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
        className="min-h-12 w-full bg-[var(--primary)] px-6 font-body text-base font-medium text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto"
      >
        {pending ? copy.submitting : copy.submit}
      </button>

      <p className="font-body text-xs text-[var(--mono-500)]">
        {copy.legalBefore}
        <Link href={rulesPath(view.session.id)} className="underline underline-offset-2">
          {copy.legalRules}
        </Link>
        {copy.legalMiddle}
        <Link href={PRIVACY_PATH} className="underline underline-offset-2">
          {copy.legalPrivacy}
        </Link>
        {copy.legalAfter}
      </p>
    </form>
  );
}
