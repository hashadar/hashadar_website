'use client';

import { AsYouType } from 'libphonenumber-js/min';
import { useId } from 'react';
import { courtBoard } from '@/data';
import { DEFAULT_PHONE_REGION, normalisePhone } from '@/lib/court-board/phone';
import { cn } from '@/lib/utils';

// +44 is shared with the Crown Dependencies; a UK club's players are far more
// likely to be in the UK than in Guernsey, Jersey or the Isle of Man.
const SHARES_UK_PREFIX = new Set(['GG', 'JE', 'IM']);

/** `🇬🇧` from `GB`. On platforms without flag glyphs this shows the letters. */
export function flagEmoji(countryCode: string): string {
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/** The country to show a flag for, from what has been typed so far. */
export function detectCountry(typed: string): string | null {
  if (!/\d/.test(typed)) return null;
  const explicit = /^\s*(\+|00)/.test(typed);
  if (!explicit) return DEFAULT_PHONE_REGION;
  const formatter = new AsYouType(DEFAULT_PHONE_REGION);
  formatter.input(typed);
  const country = formatter.getCountry();
  if (!country) return null;
  return SHARES_UK_PREFIX.has(country) ? 'GB' : country;
}

export interface PhoneInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  /** Stable name for form posts and tests. */
  name?: string;
}

/**
 * One box for a mobile number in any country. It formats as the Player types
 * (UK by default), shows the detected country's flag, and turns green with a
 * tick when the number is valid. That check is feedback only; the server
 * parses and validates again.
 */
export function PhoneInput({
  label,
  value,
  onChange,
  helpText,
  required,
  disabled,
  invalid,
  name = 'phone',
}: PhoneInputProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const statusId = `${id}-status`;
  const valid = normalisePhone(value).ok;
  const country = detectCountry(value);

  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-body text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          data-testid="phone-flag"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl leading-none"
        >
          {country ? flagEmoji(country) : '🌐'}
        </span>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required={required}
          disabled={disabled}
          maxLength={24}
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={cn(helpText && helpId, statusId) || undefined}
          onChange={(event) => {
            const raw = event.target.value;
            // Reformat while typing forwards; leave deletions alone so a
            // backspace over a space is not undone by the formatter.
            onChange(
              raw.length < value.length
                ? raw
                : new AsYouType(DEFAULT_PHONE_REGION).input(raw),
            );
          }}
          className={cn(
            'block min-h-11 w-full border-2 bg-[var(--background)] py-2 pl-12 pr-11 font-body text-base text-[var(--foreground)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2',
            valid
              ? 'border-[var(--primary)]'
              : invalid
                ? 'border-red-600'
                : 'border-[var(--border)]',
          )}
        />
        {valid ? (
          <svg
            aria-hidden="true"
            data-testid="phone-valid-tick"
            viewBox="0 0 20 20"
            className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-[var(--primary)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 10.5l4 4 8-9" />
          </svg>
        ) : null}
      </div>
      <p
        id={statusId}
        role="status"
        className={cn('min-h-5 pt-1 font-body text-xs', valid && 'text-[var(--primary)]')}
      >
        {valid ? courtBoard.player.signup.phoneValid : ''}
      </p>
      {helpText ? (
        <p id={helpId} className="font-body text-xs text-[var(--mono-500)]">
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
