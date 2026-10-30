import { describe, expect, it } from 'vitest';
import { firstReachedMain, graceEndsAt } from './grace';
import {
  assessCancellation,
  penaltyForCancellation,
  registerClosePenalties,
} from './penalties';
import { holdEndsAt } from './penalty-window';
import { cancelled, guest, host, makeContext, penalty } from './test-fixtures';

// Default Session: Sat 7 Nov 2026 9:00. Release Thu 5 Nov 12:00Z, Cutoff Fri 6 Nov 09:00Z.
const FRI_8AM = '2026-11-06T08:00:00Z';
const FRI_10AM = '2026-11-06T10:00:00Z';
const CAP2 = { session: { capacity: 2 } };

const e1 = host('E1', '2026-11-01T08:00:00Z');
const e2 = host('E2', '2026-11-01T08:01:00Z');
const e3 = host('E3', '2026-11-01T08:02:00Z');

describe('late cancellation', () => {
  it('is free before the Cutoff', () => {
    const ctx = makeContext([e1, e2], CAP2);
    expect(assessCancellation(ctx, 'E1', new Date(FRI_8AM))).toEqual({
      kind: 'free-before-cutoff',
      cutoffAt: new Date('2026-11-06T09:00:00Z'),
    });
  });

  it('is free at exactly the Cutoff', () => {
    const ctx = makeContext([e1, e2], CAP2);
    expect(
      assessCancellation(ctx, 'E1', new Date('2026-11-06T09:00:00Z')).kind,
    ).toBe('free-before-cutoff');
  });

  it('costs 3 weeks for a Main-list Seat after the Cutoff', () => {
    const ctx = makeContext([e1, e2], CAP2);
    expect(assessCancellation(ctx, 'E1', new Date(FRI_10AM))).toEqual({
      kind: 'penalty',
      reason: 'late-cancel',
      weeks: 3,
      endsAt: new Date('2026-11-28T00:00:00Z'),
    });
  });

  it('is always free on a Waitlist, even after the Cutoff', () => {
    const ctx = makeContext([e1, e2, e3], CAP2);
    expect(assessCancellation(ctx, 'E3', new Date(FRI_10AM))).toEqual({
      kind: 'free-waitlist',
    });
    expect(penaltyForCancellation(ctx, 'E3', new Date(FRI_10AM), 'player')).toBeNull();
  });

  it('lands the Penalty on the Host Player', () => {
    const ctx = makeContext([e1, e2], CAP2);
    expect(penaltyForCancellation(ctx, 'E1', new Date(FRI_10AM), 'player')).toEqual({
      phoneKey: 'pk-E1',
      sessionId: 'sess-1',
      reason: 'late-cancel',
      weeks: 3,
      startsAt: new Date('2026-11-07T09:00:00Z'),
      endsAt: new Date('2026-11-28T00:00:00Z'),
      clearedAt: null,
    });
  });

  it('gives an Organiser removing a Seat, or a cascade, no Penalty', () => {
    const ctx = makeContext([e1, e2], CAP2);
    expect(penaltyForCancellation(ctx, 'E1', new Date(FRI_10AM), 'organiser')).toBeNull();
    expect(penaltyForCancellation(ctx, 'E1', new Date(FRI_10AM), 'cascade')).toBeNull();
  });

  it('gives the same answer for a Seat already cancelled at that instant', () => {
    const ctx = makeContext([cancelled(e1, FRI_10AM), e2], CAP2);
    expect(assessCancellation(ctx, 'E1', new Date(FRI_10AM)).kind).toBe('penalty');
  });

  it('throws for an unknown Seat', () => {
    expect(() => assessCancellation(makeContext([e1]), 'nope', new Date())).toThrow();
  });
});

describe('Grace period', () => {
  // E1 cancels at Fri 10:00, promoting E3 off the Waitlist at that moment.
  const seats = [cancelled(e1, FRI_10AM), e2, e3];
  const ctx = makeContext(seats, CAP2);

  it('finds the instant a Seat first reached the Main list after the Cutoff', () => {
    const until = new Date('2026-11-06T11:00:00Z');
    expect(firstReachedMain(ctx, 'E3', until)).toEqual(new Date(FRI_10AM));
    expect(graceEndsAt(ctx, 'E3', until)).toEqual(new Date('2026-11-06T12:00:00Z'));
  });

  it('has no Grace period for a Seat already on the Main list at the Cutoff', () => {
    const until = new Date('2026-11-06T11:00:00Z');
    expect(firstReachedMain(ctx, 'E2', until)).toEqual(new Date('2026-11-06T09:00:00Z'));
    expect(graceEndsAt(ctx, 'E2', until)).toBeNull();
  });

  it('returns null when the Seat is never on the Main list', () => {
    expect(firstReachedMain(makeContext([e1, e2, e3], CAP2), 'E3', new Date(FRI_10AM))).toBeNull();
  });

  it('lets the promoted Seat cancel free within 2 h', () => {
    expect(assessCancellation(ctx, 'E3', new Date('2026-11-06T11:00:00Z'))).toEqual({
      kind: 'free-grace',
      graceEndsAt: new Date('2026-11-06T12:00:00Z'),
    });
  });

  it('treats exactly 2 h as still free', () => {
    expect(assessCancellation(ctx, 'E3', new Date('2026-11-06T12:00:00Z')).kind).toBe('free-grace');
  });

  it('charges the Penalty one millisecond after the Grace period', () => {
    expect(assessCancellation(ctx, 'E3', new Date('2026-11-06T12:00:00.001Z')).kind).toBe('penalty');
  });

  it('gives a brand-new Seat taken after the Cutoff its own Grace period', () => {
    const late = host('L', '2026-11-06T10:30:00Z');
    const lateCtx = makeContext([e1, late], CAP2);
    expect(assessCancellation(lateCtx, 'L', new Date('2026-11-06T12:30:00Z')).kind).toBe('free-grace');
    expect(assessCancellation(lateCtx, 'L', new Date('2026-11-06T12:30:01Z')).kind).toBe('penalty');
  });

  it('counts the Release instant as an event when Release falls after the Cutoff', () => {
    const rules = { release: { weekday: 5, time: '10:00' } };
    const alumnus = host('A', '2026-11-01T09:00:00Z', { tier: 'alumni' });
    const lateRelease = makeContext([e1, alumnus], { session: { capacity: 2 }, rules });
    // Before Release only Employees play; at Fri 10:00 the Alumnus arrives.
    expect(graceEndsAt(lateRelease, 'A', new Date('2026-11-06T10:30:00Z'))).toEqual(
      new Date('2026-11-06T12:00:00Z'),
    );
  });
});

describe('Guest seat cancellations', () => {
  const h = host('H', '2026-11-01T08:00:00Z');
  const g = guest('G', 'H', '2026-11-01T08:05:00Z');

  it('carry no Penalty by default (open question in #293)', () => {
    const ctx = makeContext([h, g]);
    expect(assessCancellation(ctx, 'G', new Date(FRI_10AM))).toEqual({
      kind: 'free-guest-seat',
    });
    expect(penaltyForCancellation(ctx, 'G', new Date(FRI_10AM), 'player')).toBeNull();
  });

  it('can cost the Host when the Club sets a rule for it', () => {
    const ctx = makeContext([h, g], { rules: { guestLateCancelWeeks: 2 } });
    expect(penaltyForCancellation(ctx, 'G', new Date(FRI_10AM), 'player')).toEqual({
      phoneKey: 'pk-H',
      sessionId: 'sess-1',
      reason: 'late-cancel-guest',
      weeks: 2,
      startsAt: new Date('2026-11-07T09:00:00Z'),
      endsAt: new Date('2026-11-21T00:00:00Z'),
      clearedAt: null,
    });
  });
});

describe('register closed', () => {
  const attended = { attended: true };

  it('gives a Host who did not attend 4 weeks', () => {
    const ctx = makeContext([host('H', '2026-11-01T08:00:00Z')]);
    expect(registerClosePenalties(ctx)).toEqual([
      {
        phoneKey: 'pk-H',
        sessionId: 'sess-1',
        reason: 'no-show-host',
        weeks: 4,
        startsAt: new Date('2026-11-07T09:00:00Z'),
        endsAt: new Date('2026-12-05T00:00:00Z'),
        clearedAt: null,
      },
    ]);
  });

  it('gives a Host and a Guest who both did not attend 6 weeks, not 4 plus 2', () => {
    const ctx = makeContext([
      host('H', '2026-11-01T08:00:00Z'),
      guest('G', 'H', '2026-11-01T08:05:00Z'),
    ]);
    const result = registerClosePenalties(ctx);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ reason: 'no-show-host-and-guest', weeks: 6 });
  });

  it('gives a Host who attended but whose Guest did not 2 weeks', () => {
    const ctx = makeContext([
      host('H', '2026-11-01T08:00:00Z', attended),
      guest('G1', 'H', '2026-11-01T08:05:00Z', attended),
      guest('G2', 'H', '2026-11-01T08:06:00Z'),
    ]);
    const result = registerClosePenalties(ctx);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ reason: 'no-show-guest', weeks: 2 });
  });

  it('gives nothing when everyone on the Main list attended', () => {
    const ctx = makeContext([
      host('H', '2026-11-01T08:00:00Z', attended),
      guest('G', 'H', '2026-11-01T08:05:00Z', attended),
    ]);
    expect(registerClosePenalties(ctx)).toEqual([]);
  });

  it('ignores Waitlisted and cancelled Seats', () => {
    const ctx = makeContext(
      [
        host('P1', '2026-11-01T08:00:00Z', attended),
        host('Waiting', '2026-11-01T08:01:00Z'),
        cancelled(host('Gone', '2026-11-01T08:02:00Z'), '2026-11-03T09:00:00Z'),
      ],
      { session: { capacity: 1 } },
    );
    expect(registerClosePenalties(ctx)).toEqual([]);
  });

  it('reads the Main list as at session start, not later', () => {
    const ctx = makeContext([
      cancelled(host('H', '2026-11-01T08:00:00Z'), '2026-11-07T09:30:00Z'),
    ]);
    expect(registerClosePenalties(ctx)).toHaveLength(1);
  });

  it('uses the Club penalty lengths', () => {
    const ctx = makeContext([host('H', '2026-11-01T08:00:00Z')], {
      rules: { penaltyWeeks: { lateCancel: 3, noShowHost: 1, noShowHostAndGuest: 6, noShowGuest: 2 } },
    });
    expect(registerClosePenalties(ctx)[0]).toMatchObject({ weeks: 1 });
  });
});

describe('overlapping Penalties', () => {
  const start = new Date('2026-11-21T09:00:00Z');
  const t = new Date('2026-11-20T00:00:00Z');
  const threeWeeks = penalty({ endsAt: new Date('2026-11-28T00:00:00Z') });
  const fourWeeks = penalty({
    sessionId: 'later',
    weeks: 4,
    endsAt: new Date('2026-12-12T00:00:00Z'),
  });

  it('take the latest end date and never add up', () => {
    expect(holdEndsAt([threeWeeks, fourWeeks], 'pk-P', start, t)).toEqual(fourWeeks.endsAt);
    expect(holdEndsAt([fourWeeks, threeWeeks], 'pk-P', start, t)).toEqual(fourWeeks.endsAt);
  });

  it('ignore cleared and expired Penalties', () => {
    const cleared = { ...fourWeeks, clearedAt: new Date('2026-11-10T00:00:00Z') };
    expect(holdEndsAt([threeWeeks, cleared], 'pk-P', start, t)).toEqual(threeWeeks.endsAt);
    expect(holdEndsAt([threeWeeks], 'pk-P', new Date('2026-11-28T09:00:00Z'), t)).toBeNull();
  });

  it('never apply to the Session they arose from, or any before it', () => {
    const fromSaturday = penalty({ startsAt: new Date('2026-11-07T09:00:00Z') });
    const t2 = new Date('2026-11-08T00:00:00Z');
    expect(holdEndsAt([fromSaturday], 'pk-P', new Date('2026-11-07T09:00:00Z'), t2)).toBeNull();
    expect(holdEndsAt([fromSaturday], 'pk-P', new Date('2026-10-31T09:00:00Z'), t2)).toBeNull();
    expect(holdEndsAt([fromSaturday], 'pk-P', new Date('2026-11-14T09:00:00Z'), t2)).toEqual(
      fromSaturday.endsAt,
    );
  });

  it('do not mix up Players', () => {
    expect(holdEndsAt([threeWeeks], 'pk-other', start, t)).toBeNull();
  });
});

describe('clock changes', () => {
  // Sun 25 Oct 2026 9:00 GMT; Cutoff Sat 24 Oct 9:00 BST = 08:00Z (25 real hours before).
  const sunday = { session: { localDate: '2026-10-25', capacity: 2 } };
  const ctx = makeContext(
    [host('E1', '2026-10-15T08:00:00Z'), host('E2', '2026-10-15T08:01:00Z')],
    sunday,
  );

  it('keeps the Cutoff on the wall clock across the late-October change', () => {
    expect(assessCancellation(ctx, 'E1', new Date('2026-10-24T08:00:00Z')).kind).toBe('free-before-cutoff');
    expect(assessCancellation(ctx, 'E1', new Date('2026-10-24T08:01:00Z')).kind).toBe('penalty');
  });

  it('keeps the Cutoff on the wall clock across the late-March change', () => {
    // Sun 29 Mar 2026 9:00 BST; Cutoff Sat 28 Mar 9:00 GMT = 09:00Z (23 real hours before).
    const spring = makeContext(
      [host('E1', '2026-03-20T08:00:00Z'), host('E2', '2026-03-20T08:01:00Z')],
      { session: { localDate: '2026-03-29', capacity: 2 } },
    );
    expect(assessCancellation(spring, 'E1', new Date('2026-03-28T09:00:00Z')).kind).toBe('free-before-cutoff');
    expect(assessCancellation(spring, 'E1', new Date('2026-03-28T09:01:00Z')).kind).toBe('penalty');
  });
});
