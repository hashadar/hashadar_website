import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: Buffer,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const PIN_FORMAT = /^\d{6}$/;
const TRIVIAL_PINS = new Set(['123456', '654321']);

export interface PinHash {
  pinHash: string;
  pinSalt: string;
}

export type PinCheck = { ok: true } | { ok: false; reason: 'format' | 'trivial' };

/** A PIN is exactly six digits and not an obvious one. */
export function checkPin(pin: string): PinCheck {
  if (!PIN_FORMAT.test(pin)) return { ok: false, reason: 'format' };
  if (TRIVIAL_PINS.has(pin) || /^(\d)\1{5}$/.test(pin)) {
    return { ok: false, reason: 'trivial' };
  }
  return { ok: true };
}

/** `scrypt(HMAC(pepper, pin), salt)`: a leaked table alone cannot be brute-forced offline. */
async function derive(pepper: string, pin: string, salt: Buffer): Promise<Buffer> {
  const peppered = createHmac('sha256', pepper).update(pin).digest();
  return scryptAsync(peppered, salt, KEY_LENGTH);
}

export async function hashPin(pepper: string, pin: string): Promise<PinHash> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(pepper, pin, salt);
  return { pinHash: key.toString('base64'), pinSalt: salt.toString('base64') };
}

const DUMMY_SALT = Buffer.alloc(SALT_LENGTH);

/**
 * Constant-time check. A Player with no PIN set (new, or reset) still costs a
 * full derivation, so timing does not reveal whether a number is registered.
 */
export async function verifyPin(
  pepper: string,
  pin: string,
  stored: { pinHash: string | null; pinSalt: string | null },
): Promise<boolean> {
  if (!stored.pinHash || !stored.pinSalt) {
    await derive(pepper, pin, DUMMY_SALT);
    return false;
  }
  const expected = Buffer.from(stored.pinHash, 'base64');
  const actual = await derive(pepper, pin, Buffer.from(stored.pinSalt, 'base64'));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
