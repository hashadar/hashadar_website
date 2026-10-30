import { createHash, randomBytes } from 'node:crypto';

/** 32 random bytes (256 bits) as base64url: the secret in an Organiser link. */
export function generateOrganiserToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 hex of a token. Only this hash is ever stored. */
export function hashOrganiserToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
