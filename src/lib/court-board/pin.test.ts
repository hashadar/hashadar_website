import { describe, expect, it } from 'vitest';
import { phoneKey } from './phone-key';
import { checkPin, hashPin, verifyPin } from './pin';

const PEPPER = 'test-pepper-not-a-secret';

describe('checkPin', () => {
  it('accepts an ordinary six-digit PIN', () => {
    expect(checkPin('482916')).toEqual({ ok: true });
    expect(checkPin('000001')).toEqual({ ok: true });
  });

  it('rejects trivial PINs', () => {
    for (const pin of ['111111', '000000', '999999', '123456', '654321']) {
      expect(checkPin(pin)).toEqual({ ok: false, reason: 'trivial' });
    }
  });

  it('rejects anything that is not exactly six digits', () => {
    for (const pin of ['', '12345', '1234567', 'abcdef', '12 456', '１２３４５６']) {
      expect(checkPin(pin)).toEqual({ ok: false, reason: 'format' });
    }
  });
});

describe('hashPin and verifyPin', () => {
  it('verifies the right PIN and rejects a wrong one', async () => {
    const stored = await hashPin(PEPPER, '482916');
    await expect(verifyPin(PEPPER, '482916', stored)).resolves.toBe(true);
    await expect(verifyPin(PEPPER, '482917', stored)).resolves.toBe(false);
  });

  it('salts each hash', async () => {
    const a = await hashPin(PEPPER, '482916');
    const b = await hashPin(PEPPER, '482916');
    expect(a.pinSalt).not.toBe(b.pinSalt);
    expect(a.pinHash).not.toBe(b.pinHash);
  });

  it('needs the pepper, so a leaked table alone is not enough', async () => {
    const stored = await hashPin(PEPPER, '482916');
    await expect(verifyPin('another-pepper', '482916', stored)).resolves.toBe(false);
  });

  it('never matches a Player with no PIN set', async () => {
    await expect(
      verifyPin(PEPPER, '482916', { pinHash: null, pinSalt: null }),
    ).resolves.toBe(false);
  });

  it('rejects a corrupted stored hash instead of throwing', async () => {
    const stored = await hashPin(PEPPER, '482916');
    await expect(
      verifyPin(PEPPER, '482916', { ...stored, pinHash: 'AAAA' }),
    ).resolves.toBe(false);
  });
});

describe('phoneKey', () => {
  it('is stable for a number and pepper', () => {
    expect(phoneKey(PEPPER, '+447400123456')).toBe(phoneKey(PEPPER, '+447400123456'));
    expect(phoneKey(PEPPER, '+447400123456')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('differs by number and by pepper', () => {
    expect(phoneKey(PEPPER, '+447400123456')).not.toBe(phoneKey(PEPPER, '+447400123457'));
    expect(phoneKey(PEPPER, '+447400123456')).not.toBe(phoneKey('other', '+447400123456'));
  });
});
