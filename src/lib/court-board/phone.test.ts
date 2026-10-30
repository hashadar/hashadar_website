import { describe, expect, it } from 'vitest';
import { normalisePhone, phoneLast3 } from './phone';

describe('normalisePhone', () => {
  it('reads 07…, +44… and 0044… as one E.164 number', () => {
    const forms = [
      '07400 123456',
      '07400123456',
      '+44 7400 123456',
      '+44 (0)7400 123456',
      '0044 7400123456',
      '(0)7400-123-456',
    ];
    for (const form of forms) {
      expect(normalisePhone(form)).toMatchObject({ ok: true, e164: '+447400123456' });
    }
  });

  it('accepts an Indian number with its country prefix', () => {
    expect(normalisePhone('+91 98765 43210')).toEqual({
      ok: true,
      e164: '+919876543210',
      country: 'IN',
    });
  });

  it('accepts an Irish number written locally with a prefix', () => {
    expect(normalisePhone('+353 85 123 4567')).toEqual({
      ok: true,
      e164: '+353851234567',
      country: 'IE',
    });
  });

  it('rejects numbers that are too short or not numbers', () => {
    for (const bad of ['', '   ', 'abc', '12345', '+44 12', '07400 12']) {
      expect(normalisePhone(bad)).toEqual({ ok: false });
    }
  });

  it('rejects an Irish local number read as UK', () => {
    expect(normalisePhone('085 123 4567')).toEqual({ ok: false });
  });
});

describe('phoneLast3', () => {
  it('keeps the last three digits', () => {
    expect(phoneLast3('+447400123456')).toBe('456');
  });
});
