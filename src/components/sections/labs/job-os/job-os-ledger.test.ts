import { describe, expect, it } from 'vitest';
import {
  formatCompensation,
  formatNoticedAge,
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
