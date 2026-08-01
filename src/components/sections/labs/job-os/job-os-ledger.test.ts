import { describe, expect, it } from 'vitest';
import {
  formatCompensation,
  formatNoticedAge,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@/components/sections/labs/job-os/job-os-ledger';

describe('Job OS ledger formatters', () => {
  it('formats noticed age as relative time', () => {
    const now = Date.parse('2026-07-27T12:00:00.000Z');
    expect(
      formatNoticedAge('2026-07-27T11:50:00.000Z', now),
    ).toBe('10m');
    expect(
      formatNoticedAge('2026-07-27T06:00:00.000Z', now),
    ).toBe('6h');
    expect(
      formatNoticedAge('2026-07-24T12:00:00.000Z', now),
    ).toBe('3d');
  });

  it('round-trips noticedAt through datetime-local without drifting on save', () => {
    const original = '2026-08-01T10:05:00.000Z';
    let iso = original;
    for (let i = 0; i < 3; i += 1) {
      iso = fromDatetimeLocalValue(toDatetimeLocalValue(new Date(iso)));
    }
    // datetime-local is minute precision; allow sub-minute truncation only
    expect(Math.abs(Date.parse(iso) - Date.parse(original))).toBeLessThan(
      60_000,
    );
  });

  it('does not treat UTC ISO wall-clock as datetime-local (regression)', () => {
    const original = '2026-08-01T10:05:00.000Z';
    const offsetMinutes = new Date(original).getTimezoneOffset();
    if (offsetMinutes === 0) {
      return; // UTC hosts cannot observe the slice bug
    }

    // Previous bug: feed ISO.slice(0, 16) into datetime-local, then Date(value).toISOString()
    let drifted = original;
    for (let i = 0; i < 3; i += 1) {
      drifted = new Date(drifted.slice(0, 16)).toISOString();
    }
    expect(Math.abs(Date.parse(drifted) - Date.parse(original))).toBeGreaterThanOrEqual(
      60_000,
    );

    const local = toDatetimeLocalValue(new Date(original));
    expect(local).not.toBe(original.slice(0, 16));
  });

  it('formats compensation ranges compactly', () => {
    expect(
      formatCompensation({
        disclosure: 'range',
        currency: '£',
        min: 90000,
        max: 110000,
        period: 'year',
      }),
    ).toBe('£90k–110k/year');
    expect(formatCompensation({ disclosure: 'competitive' })).toBe(
      'Competitive',
    );
    expect(formatCompensation({ disclosure: 'unknown' })).toBe('—');
  });
});
