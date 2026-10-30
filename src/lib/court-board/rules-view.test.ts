import { describe, expect, it } from 'vitest';
import { DEFAULT_CLUB_RULES } from './rules';
import { buildRulesView } from './rules-view';

const club = { name: 'Lunchtime Badminton', venue: 'Sports Hall', rules: DEFAULT_CLUB_RULES };

describe('buildRulesView', () => {
  it('describes the default rules in words and numbers', () => {
    expect(buildRulesView(club)).toEqual({
      clubName: 'Lunchtime Badminton',
      venue: 'Sports Hall',
      release: { weekday: 'Thursday', time: '12:00' },
      topUp: { weekday: 'Friday', time: '12:00' },
      cutoffDaysBefore: 1,
      grace: { amount: 2, unit: 'hour' },
      guestLimitBeforeTopUp: 2,
      penaltyWeeks: { lateCancel: 3, noShowHost: 4, noShowHostAndGuest: 6, noShowGuest: 2 },
      guestLateCancelWeeks: 0,
    });
  });

  it('follows a Club with different settings', () => {
    const view = buildRulesView({
      ...club,
      rules: {
        ...DEFAULT_CLUB_RULES,
        release: { weekday: 3, time: '09:30' },
        topUp: { weekday: 0, time: '18:05' },
        cutoffDaysBefore: 2,
        graceMinutes: 45,
        guestLimitBeforeTopUp: 1,
        penaltyWeeks: { lateCancel: 1, noShowHost: 2, noShowHostAndGuest: 3, noShowGuest: 1 },
        guestLateCancelWeeks: 2,
      },
    });
    expect(view.release).toEqual({ weekday: 'Wednesday', time: '9:30' });
    expect(view.topUp).toEqual({ weekday: 'Sunday', time: '18:05' });
    expect(view.cutoffDaysBefore).toBe(2);
    expect(view.grace).toEqual({ amount: 45, unit: 'minute' });
    expect(view.guestLimitBeforeTopUp).toBe(1);
    expect(view.penaltyWeeks).toEqual({ lateCancel: 1, noShowHost: 2, noShowHostAndGuest: 3, noShowGuest: 1 });
    expect(view.guestLateCancelWeeks).toBe(2);
  });

  it('reports a one hour Grace period in hours', () => {
    const view = buildRulesView({
      ...club,
      rules: { ...DEFAULT_CLUB_RULES, graceMinutes: 60 },
    });
    expect(view.grace).toEqual({ amount: 1, unit: 'hour' });
  });

  it('is serialisable and carries no personal data', () => {
    const json = JSON.stringify(buildRulesView(club));
    expect(JSON.parse(json)).toEqual(buildRulesView(club));
  });
});
