import type { ClubRules } from './types';

const THURSDAY = 4;
const FRIDAY = 5;

export const DEFAULT_CLUB_RULES: ClubRules = {
  capacity: 25,
  release: { weekday: THURSDAY, time: '12:00' },
  topUp: { weekday: FRIDAY, time: '12:00' },
  cutoffDaysBefore: 1,
  graceMinutes: 120,
  guestLimitBeforeTopUp: 2,
  penaltyWeeks: {
    lateCancel: 3,
    noShowHost: 4,
    noShowHostAndGuest: 6,
    noShowGuest: 2,
  },
  guestLateCancelWeeks: 0,
};
