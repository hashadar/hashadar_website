import { TIER_ORDER, type Tier } from './types';

export const NAME_MAX_LENGTH = 40;
export const CAPACITY_MAX = 200;

export type GuestTier = Exclude<Tier, 'employee'>;

// Control characters, and the bidirectional overrides that can reorder text.
const UNSAFE_CHARS = /[\p{Cc}\p{Cf}‪-‮⁦-⁩]/gu;

/**
 * A display name: trimmed, whitespace collapsed, control characters removed,
 * 1 to 40 characters. Names are only ever rendered as text, never as HTML.
 */
export function cleanName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const name = input.replace(UNSAFE_CHARS, ' ').replace(/\s+/g, ' ').trim();
  if (name.length === 0 || [...name].length > NAME_MAX_LENGTH) return null;
  return name;
}

export function parseTier(input: unknown): Tier | null {
  return TIER_ORDER.find((tier) => tier === input) ?? null;
}

export function parseGuestTier(input: unknown): GuestTier | null {
  return input === 'alumni' || input === 'external' ? input : null;
}

export function isSessionId(input: unknown): input is string {
  return typeof input === 'string' && /^[A-Za-z0-9_-]{12}$/.test(input);
}

export function isLocalDate(input: unknown): input is string {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return false;
  }
  const [year, month, day] = input.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isLocalTime(input: unknown): input is string {
  return typeof input === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(input);
}

export function parseCapacity(input: unknown): number | null {
  const n = typeof input === 'string' ? Number(input) : input;
  if (typeof n !== 'number' || !Number.isInteger(n)) return null;
  return n >= 1 && n <= CAPACITY_MAX ? n : null;
}

export interface GuestInput {
  name: string;
  tier: GuestTier;
}

/** Null when any guest is malformed, so a typo is never silently dropped. */
export function parseGuests(input: unknown): GuestInput[] | null {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) return null;
  const guests: GuestInput[] = [];
  for (const raw of input) {
    if (typeof raw !== 'object' || raw === null) return null;
    const name = cleanName((raw as Record<string, unknown>).name);
    const tier = parseGuestTier((raw as Record<string, unknown>).tier);
    if (!name || !tier) return null;
    guests.push({ name, tier });
  }
  return guests;
}
