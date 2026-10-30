import { describe, expect, it } from 'vitest';
import { computeOrder, locateSeat } from './order';
import {
  cancelled,
  guest,
  host,
  ids,
  makeContext,
  penalty,
} from './test-fixtures';
import type { Seat } from './types';

const BEFORE_RELEASE = new Date('2026-11-04T18:00:00Z');
const RELEASE = new Date('2026-11-05T12:00:00Z');
const AFTER_RELEASE = new Date('2026-11-05T12:00:01Z');

function employees(count: number): Seat[] {
  return Array.from({ length: count }, (_, i) =>
    host(`E${i + 1}`, `2026-11-01T10:${String(i).padStart(2, '0')}:00Z`),
  );
}

describe('worked example (CONTEXT.md)', () => {
  // Capacity 25; 22 Employee Seats; Alumni A1, A2; External G1 (guest of a
  // Main-list Player), G2 (Alumni-Tier guest of a Penalised Player), G3, G4.
  const seats: Seat[] = [
    ...employees(22),
    host('A1', '2026-11-02T09:00:00Z', { tier: 'alumni' }),
    host('A2', '2026-11-02T09:01:00Z', { tier: 'alumni' }),
    guest('G1', 'E1', '2026-11-02T10:00:00Z', { tier: 'external' }),
    host('PH', '2026-11-02T10:05:00Z', { tier: 'employee', phoneKey: 'pk-P' }),
    guest('G2', 'PH', '2026-11-02T10:06:00Z', { tier: 'alumni' }),
    host('G3', '2026-11-02T10:10:00Z', { tier: 'external' }),
    host('G4', '2026-11-02T10:11:00Z', { tier: 'external' }),
  ];
  const ctx = makeContext(seats, { penalties: [penalty({ phoneKey: 'pk-P' })] });

  it('before Release the Main list is just the 22 Employee Seats', () => {
    const order = computeOrder(ctx, BEFORE_RELEASE);
    expect(order.released).toBe(false);
    expect(ids(order.main)).toEqual(ids(employees(22)));
    expect(order.waitlists.map((w) => [w.band, ids(w.seats)])).toEqual([
      ['employee', []],
      ['alumni', ['A1', 'A2', 'G2']],
      ['external', ['G1', 'PH', 'G3', 'G4']],
    ]);
  });

  it('at Release it gains A1, A2 and G1; G2 waits behind its Host', () => {
    const order = computeOrder(ctx, RELEASE);
    expect(order.released).toBe(true);
    expect(order.main).toHaveLength(25);
    expect(ids(order.main).slice(22)).toEqual(['A1', 'A2', 'G1']);
    expect(ids(order.waitlists[0].seats)).toEqual(['G2', 'PH', 'G3', 'G4']);
  });

  it('puts the Penalised Host in the External band but leaves the guest its own', () => {
    const order = computeOrder(ctx, BEFORE_RELEASE);
    expect(order.bands.get('PH')).toBe('external');
    expect(order.bands.get('G2')).toBe('alumni');
  });
});

describe('before Release', () => {
  it('fills only from the Employee band, by signup time', () => {
    const ctx = makeContext(
      [
        host('X', '2026-11-01T09:00:00Z', { tier: 'external' }),
        host('E2', '2026-11-01T11:00:00Z'),
        host('E1', '2026-11-01T10:00:00Z'),
      ],
      { session: { capacity: 2 } },
    );
    const order = computeOrder(ctx, BEFORE_RELEASE);
    expect(ids(order.main)).toEqual(['E1', 'E2']);
  });

  it('sends Employee overflow to its own Waitlist', () => {
    const ctx = makeContext(employees(3), { session: { capacity: 2 } });
    const order = computeOrder(ctx, BEFORE_RELEASE);
    expect(ids(order.main)).toEqual(['E1', 'E2']);
    expect(order.waitlists[0].band).toBe('employee');
    expect(ids(order.waitlists[0].seats)).toEqual(['E3']);
  });

  it('breaks signup-time ties by seat id', () => {
    const ctx = makeContext(
      [host('b', '2026-11-01T10:00:00Z'), host('a', '2026-11-01T10:00:00Z')],
      { session: { capacity: 1 } },
    );
    expect(ids(computeOrder(ctx, BEFORE_RELEASE).main)).toEqual(['a']);
  });
});

describe('after Release', () => {
  it('ranks Seats from before Release by band, then signup time', () => {
    const ctx = makeContext(
      [
        host('X', '2026-11-01T09:00:00Z', { tier: 'external' }),
        host('A', '2026-11-01T10:00:00Z', { tier: 'alumni' }),
        host('E', '2026-11-01T11:00:00Z'),
      ],
      { session: { capacity: 2 } },
    );
    const order = computeOrder(ctx, AFTER_RELEASE);
    expect(ids(order.main)).toEqual(['E', 'A']);
    expect(order.waitlists).toEqual([{ band: null, seats: [ctx.seats[0]] }]);
  });

  it('puts Seats taken after Release at the end, whatever their band', () => {
    const ctx = makeContext(
      [
        host('X', '2026-11-05T11:00:00Z', { tier: 'external' }),
        host('E', '2026-11-05T13:00:00Z'),
      ],
      { session: { capacity: 1 } },
    );
    const order = computeOrder(ctx, new Date('2026-11-05T14:00:00Z'));
    expect(ids(order.main)).toEqual(['X']);
    expect(ids(order.waitlists[0].seats)).toEqual(['E']);
  });

  it('counts a Seat created exactly at Release as taken after it', () => {
    const ctx = makeContext(
      [
        host('X', '2026-11-05T11:00:00Z', { tier: 'external' }),
        host('E', '2026-11-05T12:00:00Z'),
      ],
      { session: { capacity: 1 } },
    );
    expect(ids(computeOrder(ctx, RELEASE).main)).toEqual(['X']);
  });
});

describe('Guest seats', () => {
  it('never rank ahead of their Host: an Alumni guest waits for an External host', () => {
    const ctx = makeContext(
      [
        host('H', '2026-11-01T09:00:00Z', { tier: 'external' }),
        guest('G', 'H', '2026-11-01T09:01:00Z', { tier: 'alumni' }),
        host('E', '2026-11-01T10:00:00Z'),
      ],
      { session: { capacity: 2 } },
    );
    const order = computeOrder(ctx, AFTER_RELEASE);
    // Sequence is E, G, H. G is skipped on the first pass; H takes the last place.
    expect(ids(order.main)).toEqual(['E', 'H']);
    expect(ids(order.waitlists[0].seats)).toEqual(['G']);
  });

  it('is pulled up on a later pass once its Host reaches the Main list', () => {
    const ctx = makeContext(
      [
        host('H', '2026-11-01T09:00:00Z', { tier: 'external' }),
        guest('G', 'H', '2026-11-01T09:01:00Z', { tier: 'alumni' }),
        host('E', '2026-11-01T10:00:00Z'),
      ],
      { session: { capacity: 3 } },
    );
    expect(ids(computeOrder(ctx, AFTER_RELEASE).main)).toEqual(['E', 'H', 'G']);
  });

  it('follows a Host promoted later when someone ahead cancels', () => {
    const seats = [
      host('E1', '2026-11-01T08:00:00Z'),
      host('E2', '2026-11-01T08:01:00Z'),
      host('H', '2026-11-01T09:00:00Z', { tier: 'external' }),
      guest('G', 'H', '2026-11-01T09:01:00Z', { tier: 'alumni' }),
    ];
    const e1Cancelled = [cancelled(seats[0], '2026-11-06T08:00:00Z'), ...seats.slice(1)];
    const bothCancelled = [
      e1Cancelled[0],
      cancelled(seats[1], '2026-11-06T09:00:00Z'),
      ...seats.slice(2),
    ];
    const options = { session: { capacity: 2 } };

    const t1 = new Date('2026-11-06T08:30:00Z');
    expect(ids(computeOrder(makeContext(seats, options), t1).main)).toEqual(['E1', 'E2']);
    expect(ids(computeOrder(makeContext(e1Cancelled, options), t1).main)).toEqual(['E2', 'H']);

    const t2 = new Date('2026-11-06T09:30:00Z');
    expect(ids(computeOrder(makeContext(bothCancelled, options), t2).main)).toEqual(['H', 'G']);
  });

  it('is dropped when its Host seat is cancelled', () => {
    const h = host('H', '2026-11-01T09:00:00Z');
    const g = guest('G', 'H', '2026-11-01T09:01:00Z');
    const ctx = makeContext([cancelled(h, '2026-11-03T09:00:00Z'), g]);
    const order = computeOrder(ctx, AFTER_RELEASE);
    expect(order.main).toEqual([]);
    expect(order.waitlists[0].seats).toEqual([]);
  });
});

describe('Penalties', () => {
  it('drop a Penalised Employee Host behind everyone else after Release', () => {
    const ctx = makeContext(
      [
        host('P', '2026-11-01T08:00:00Z', { phoneKey: 'pk-P' }),
        host('A', '2026-11-01T09:00:00Z', { tier: 'alumni' }),
      ],
      { session: { capacity: 1 }, penalties: [penalty()] },
    );
    expect(ids(computeOrder(ctx, AFTER_RELEASE).main)).toEqual(['A']);
  });

  it('stop applying once the Session starts on or after their end', () => {
    const ctx = makeContext(
      [host('P', '2026-11-01T08:00:00Z', { phoneKey: 'pk-P' })],
      { penalties: [penalty({ endsAt: new Date('2026-11-07T09:00:00Z') })] },
    );
    expect(computeOrder(ctx, BEFORE_RELEASE).bands.get('P')).toBe('employee');
  });

  it('stop applying once an Organiser clears them', () => {
    const ctx = makeContext(
      [host('P', '2026-11-01T08:00:00Z', { phoneKey: 'pk-P' })],
      { penalties: [penalty({ clearedAt: new Date('2026-11-02T00:00:00Z') })] },
    );
    expect(computeOrder(ctx, new Date('2026-11-01T12:00:00Z')).bands.get('P')).toBe('external');
    expect(computeOrder(ctx, BEFORE_RELEASE).bands.get('P')).toBe('employee');
  });

  it('do not touch other Players', () => {
    const ctx = makeContext([host('E', '2026-11-01T08:00:00Z')], {
      penalties: [penalty({ phoneKey: 'someone-else' })],
    });
    expect(computeOrder(ctx, BEFORE_RELEASE).bands.get('E')).toBe('employee');
  });
});

describe('replaying the past', () => {
  it('ignores Seats created later and counts cancelled Seats until their cancellation', () => {
    const seats = [
      host('E1', '2026-11-01T08:00:00Z'),
      cancelled(host('E2', '2026-11-01T09:00:00Z'), '2026-11-03T09:00:00Z'),
      host('E3', '2026-11-04T09:00:00Z'),
    ];
    const ctx = makeContext(seats);
    expect(ids(computeOrder(ctx, new Date('2026-11-02T00:00:00Z')).main)).toEqual(['E1', 'E2']);
    expect(ids(computeOrder(ctx, new Date('2026-11-03T09:00:00Z')).main)).toEqual(['E1']);
    expect(ids(computeOrder(ctx, new Date('2026-11-04T09:00:00Z')).main)).toEqual(['E1', 'E3']);
  });
});

describe('locateSeat', () => {
  const ctx = makeContext(employees(3), { session: { capacity: 2 } });
  const order = computeOrder(ctx, BEFORE_RELEASE);

  it('reports 1-based positions on the Main list and Waitlists', () => {
    expect(locateSeat(order, 'E2')).toEqual({ state: 'main', position: 2 });
    expect(locateSeat(order, 'E3')).toEqual({ state: 'waitlist', band: 'employee', position: 1 });
  });

  it('returns null for a Seat that is not active', () => {
    expect(locateSeat(order, 'nobody')).toBeNull();
  });
});
