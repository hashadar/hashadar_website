import { describe, expect, it } from 'vitest';
import { DEFAULT_CLUB_RULES } from './rules';
import {
  addLocalDays,
  cutoffAt,
  guestLimitAt,
  localToUtc,
  localWeekday,
  penaltyEndsAt,
  releaseAt,
  sessionStartsAt,
  topUpAt,
} from './time';

const rules = DEFAULT_CLUB_RULES;
const iso = (d: Date) => d.toISOString();

describe('local calendar helpers', () => {
  it('adds days across month and year ends', () => {
    expect(addLocalDays('2026-11-07', 21)).toBe('2026-11-28');
    expect(addLocalDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addLocalDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('finds the weekday of a date', () => {
    expect(localWeekday('2026-11-07')).toBe(6);
    expect(localWeekday('2026-10-25')).toBe(0);
  });

  it('rejects malformed dates and times', () => {
    expect(() => localToUtc('7 Nov', '09:00')).toThrow();
    expect(() => localToUtc('2026-11-07', '9am')).toThrow();
  });
});

describe('Session times in winter (GMT)', () => {
  const session = { localDate: '2026-11-07', startTime: '09:00' };

  it('starts at the London wall clock', () => {
    expect(iso(sessionStartsAt(session))).toBe('2026-11-07T09:00:00.000Z');
  });

  it('releases Thursday 12:00 and tops up Friday 12:00', () => {
    expect(iso(releaseAt(session, rules))).toBe('2026-11-05T12:00:00.000Z');
    expect(iso(topUpAt(session, rules))).toBe('2026-11-06T12:00:00.000Z');
  });

  it('cuts off Friday 9:00 for a Saturday 9:00 Session', () => {
    expect(iso(cutoffAt(session, rules))).toBe('2026-11-06T09:00:00.000Z');
  });
});

describe('Session times in summer (BST)', () => {
  const session = { localDate: '2026-06-20', startTime: '09:00' };

  it('keeps London wall-clock times, one hour ahead of UTC', () => {
    expect(iso(sessionStartsAt(session))).toBe('2026-06-20T08:00:00.000Z');
    expect(iso(releaseAt(session, rules))).toBe('2026-06-18T11:00:00.000Z');
    expect(iso(cutoffAt(session, rules))).toBe('2026-06-19T08:00:00.000Z');
  });
});

describe('Cutoff across clock changes', () => {
  it('is 25 real hours before the late-October change (BST to GMT)', () => {
    const session = { localDate: '2026-10-25', startTime: '09:00' };
    expect(iso(sessionStartsAt(session))).toBe('2026-10-25T09:00:00.000Z');
    expect(iso(cutoffAt(session, rules))).toBe('2026-10-24T08:00:00.000Z');
  });

  it('is 23 real hours before the late-March change (GMT to BST)', () => {
    const session = { localDate: '2026-03-29', startTime: '09:00' };
    expect(iso(sessionStartsAt(session))).toBe('2026-03-29T08:00:00.000Z');
    expect(iso(cutoffAt(session, rules))).toBe('2026-03-28T09:00:00.000Z');
  });

  it('moves Release with the wall clock too', () => {
    const session = { localDate: '2026-10-25', startTime: '09:00' };
    expect(iso(releaseAt(session, rules))).toBe('2026-10-22T11:00:00.000Z');
  });
});

describe('latest occurrence rule', () => {
  it('uses the same day when the weekday matches and the time has passed', () => {
    const session = { localDate: '2026-11-05', startTime: '18:00' };
    expect(iso(releaseAt(session, rules))).toBe('2026-11-05T12:00:00.000Z');
  });

  it('steps back a week when the time is still ahead of the start', () => {
    const session = { localDate: '2026-11-05', startTime: '09:00' };
    expect(iso(releaseAt(session, rules))).toBe('2026-10-29T12:00:00.000Z');
  });
});

describe('guestLimitAt', () => {
  const session = { localDate: '2026-11-07', startTime: '09:00' };

  it('caps guests before Top-up and lifts the cap from it', () => {
    expect(guestLimitAt(session, rules, new Date('2026-11-06T11:59:59Z'))).toBe(2);
    expect(guestLimitAt(session, rules, new Date('2026-11-06T12:00:00Z'))).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe('penaltyEndsAt', () => {
  it('is London midnight, whole calendar weeks after the Session date', () => {
    expect(iso(penaltyEndsAt('2026-11-07', 3))).toBe('2026-11-28T00:00:00.000Z');
  });

  it('is an hour earlier in UTC when the end date is in summer time', () => {
    expect(iso(penaltyEndsAt('2026-10-01', 3))).toBe('2026-10-21T23:00:00.000Z');
  });
});
