import { describe, expect, it } from 'vitest';
import { generateOrganiserToken, hashOrganiserToken } from './organiser-token';

describe('generateOrganiserToken', () => {
  it('is 32 random bytes as base64url (43 characters, no padding)', () => {
    const token = generateOrganiserToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
  });

  it('differs every time', () => {
    expect(generateOrganiserToken()).not.toBe(generateOrganiserToken());
  });
});

describe('hashOrganiserToken', () => {
  it('is a stable SHA-256 hex digest', () => {
    expect(hashOrganiserToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('does not contain the token', () => {
    const token = generateOrganiserToken();
    expect(hashOrganiserToken(token)).not.toContain(token);
  });
});
