import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

/** A number typed without a country prefix is read as UK, the Club's default. */
export const DEFAULT_PHONE_REGION = 'GB';

export type PhoneParseResult =
  | { ok: true; e164: string; country: string | undefined }
  | { ok: false };

/**
 * Normalise a typed number to E.164, so `07…`, `+44 …` and `0044…` are one
 * Player. The browser uses the same library for feedback only; the server
 * always parses again with this function.
 */
export function normalisePhone(input: string): PhoneParseResult {
  const parsed = parsePhoneNumberFromString(
    input.trim(),
    DEFAULT_PHONE_REGION,
  );
  if (!parsed || !parsed.isValid()) return { ok: false };
  return { ok: true, e164: parsed.number, country: parsed.country };
}

/** Last three digits, kept in clear so Organisers can tell two Players apart. */
export function phoneLast3(e164: string): string {
  return e164.slice(-3);
}
