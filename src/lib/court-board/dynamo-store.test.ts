import { describe, expect, it, vi } from 'vitest';
import {
  createDynamoCourtBoardStore,
  itemToPenalty,
  itemToSeat,
  keys,
  penaltyToItem,
  seatToItem,
  seatTtl,
} from './dynamo-store';
import {
  DuplicateHostSeatError,
  GuestLimitError,
  HostSeatNotActiveError,
  SeatNotFoundError,
  SessionExistsError,
  type Club,
  type ClubSession,
} from './store';
import { DEFAULT_CLUB_RULES } from './rules';
import { cancelled, guest, host, penalty } from './test-fixtures';

/**
 * These tests drive the store with a recording fake client: they pin down the
 * keys, conditional expressions and error mapping. They do not prove behaviour
 * against a real DynamoDB; see docs/court-board/infra.md.
 */

const TABLE = 'CourtBoardTable';

const session: ClubSession = {
  id: 'sess-1',
  clubId: 'club-1',
  venue: 'Sports hall',
  localDate: '2026-11-07',
  startTime: '09:00',
  endTime: '11:00',
  capacity: 25,
  status: 'open',
  registerClosedAt: null,
};

type Recorded = { name: string; input: Record<string, unknown> };
type Handler = (command: Recorded) => unknown;

function setup(handler: Handler = () => ({})) {
  const commands: Recorded[] = [];
  const send = vi.fn(async (command: { constructor: { name: string }; input: Record<string, unknown> }) => {
    const recorded = { name: command.constructor.name, input: command.input };
    commands.push(recorded);
    const result = handler(recorded);
    if (result instanceof Error) throw result;
    return result;
  });
  const store = createDynamoCourtBoardStore({
    tableName: TABLE,
    client: { send } as never,
  });
  return { store, commands, send };
}

function transactionCancelled(...codes: string[]) {
  return Object.assign(new Error('cancelled'), {
    name: 'TransactionCanceledException',
    CancellationReasons: codes.map((Code) => ({ Code })),
  });
}

const conditionFailed = () =>
  Object.assign(new Error('failed'), { name: 'ConditionalCheckFailedException' });

type TransactItem = Record<string, Record<string, unknown>>;
const transactItems = (c: Recorded) => c.input.TransactItems as TransactItem[];

describe('item mappers', () => {
  it('round-trips a Host seat and omits cancelledAt while active', () => {
    const seat = host('H1', '2026-11-01T10:00:00Z', { attended: true });
    const item = seatToItem(session, seat);
    expect(item).toMatchObject({
      pk: 'SESSION#sess-1',
      sk: 'SEAT#H1',
      kind: 'host',
      phoneKey: 'pk-H1',
      activeGuests: 0,
    });
    expect('cancelledAt' in item).toBe(false);
    expect('hostSeatId' in item).toBe(false);
    expect(itemToSeat(item)).toEqual(seat);
  });

  it('round-trips a cancelled Guest seat', () => {
    const seat = cancelled(
      guest('G1', 'H1', '2026-11-01T10:05:00Z'),
      '2026-11-03T09:00:00Z',
      'cascade',
    );
    const item = seatToItem(session, seat);
    expect(item).toMatchObject({ hostSeatId: 'H1', cancelledBy: 'cascade' });
    expect('activeGuests' in item).toBe(false);
    expect(itemToSeat(item)).toEqual(seat);
  });

  it('expires Seats eight weeks after the Session starts', () => {
    expect(seatTtl(session)).toBe(Date.UTC(2027, 0, 2, 9, 0, 0) / 1000);
  });

  it('keys Penalties by Player, Session and reason, and expires them at endsAt', () => {
    const p = penalty({ endsAt: new Date('2026-11-28T00:00:00Z') });
    const item = penaltyToItem('club-1', p);
    expect(item).toMatchObject({
      pk: 'CLUB#club-1',
      sk: 'PENALTY#pk-P#earlier#late-cancel',
      ttl: Date.UTC(2026, 10, 28) / 1000,
    });
    expect(itemToPenalty(item)).toEqual(p);
  });
});

describe('Clubs and Organiser links', () => {
  const club: Club = {
    id: 'club-1',
    name: 'Test club',
    venue: 'Sports hall',
    startTime: '09:00',
    endTime: '11:00',
    rules: DEFAULT_CLUB_RULES,
    createdAt: new Date('2026-10-30T10:00:00Z'),
  };

  it('creates a Club and its token hash in one transaction', async () => {
    const { store, commands } = setup();
    await store.createClub(club, 'hash-1');
    const items = transactItems(commands[0]);
    expect(items[0].Put.Item).toMatchObject({ pk: 'CLUB#club-1', sk: 'META' });
    expect(items[1].Put.Item).toEqual({
      pk: 'ORGTOKEN#hash-1',
      sk: 'META',
      clubId: 'club-1',
    });
    expect(items.every((i) => i.Put.ConditionExpression === 'attribute_not_exists(pk)')).toBe(true);
  });

  it('looks a Club up by token hash', async () => {
    const { store, commands } = setup(() => ({ Item: { clubId: 'club-1' } }));
    await expect(store.getClubIdByOrganiserTokenHash('hash-1')).resolves.toBe('club-1');
    expect(commands[0].input.Key).toEqual({ pk: 'ORGTOKEN#hash-1', sk: 'META' });
  });

  it('returns null for an unknown token hash', async () => {
    const { store } = setup(() => ({}));
    await expect(store.getClubIdByOrganiserTokenHash('nope')).resolves.toBeNull();
  });

  it('rotates by deleting the old hash (for this Club only) and adding the new one', async () => {
    const { store, commands } = setup();
    await store.rotateOrganiserToken('club-1', 'old', 'new');
    const [del, add] = transactItems(commands[0]);
    expect(del.Delete).toMatchObject({
      Key: { pk: 'ORGTOKEN#old', sk: 'META' },
      ConditionExpression: 'attribute_exists(pk) AND clubId = :clubId',
      ExpressionAttributeValues: { ':clubId': 'club-1' },
    });
    expect(add.Put).toMatchObject({
      Item: { pk: 'ORGTOKEN#new', sk: 'META', clubId: 'club-1' },
      ConditionExpression: 'attribute_not_exists(pk)',
    });
  });

  it('refuses to rotate an unknown link', async () => {
    const { store } = setup(() => transactionCancelled('ConditionalCheckFailed', 'None'));
    await expect(store.rotateOrganiserToken('club-1', 'old', 'new')).rejects.toThrow(
      /not found/,
    );
  });
});

describe('Sessions', () => {
  it('writes the GSI1 keys and creates conditionally', async () => {
    const { store, commands } = setup();
    await store.createSession(session);
    expect(commands[0].name).toBe('PutCommand');
    expect(commands[0].input.ConditionExpression).toBe('attribute_not_exists(pk)');
    expect(commands[0].input.Item).toMatchObject({
      pk: 'SESSION#sess-1',
      sk: 'META',
      gsi1pk: 'CLUB#club-1',
      gsi1sk: '2026-11-07#sess-1',
    });
  });

  it('maps a taken id to SessionExistsError', async () => {
    const { store } = setup(() => conditionFailed());
    await expect(store.createSession(session)).rejects.toBeInstanceOf(SessionExistsError);
  });

  it('lists a Club by GSI1 across pages', async () => {
    let page = 0;
    const { store, commands } = setup((c) => {
      if (c.name !== 'QueryCommand') return {};
      page += 1;
      const item = {
        ...session,
        id: `s${page}`,
        pk: `SESSION#s${page}`,
        sk: 'META',
      };
      return page === 1
        ? { Items: [item], LastEvaluatedKey: { pk: 'x', sk: 'y' } }
        : { Items: [item] };
    });
    const sessions = await store.listSessions('club-1');
    expect(sessions.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(commands[0].input).toMatchObject({
      IndexName: 'GSI1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': 'CLUB#club-1' },
    });
    expect(commands[1].input.ExclusiveStartKey).toEqual({ pk: 'x', sk: 'y' });
  });

  it('updates status and clears registerClosedAt with REMOVE', async () => {
    const { store, commands } = setup();
    await store.updateSession('sess-1', { status: 'cancelled' });
    await store.updateSession('sess-1', { registerClosedAt: null });
    expect(commands[0].input).toMatchObject({
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeValues: { ':status': 'cancelled' },
      ConditionExpression: 'attribute_exists(pk)',
    });
    expect(commands[1].input.UpdateExpression).toBe('REMOVE #closed');
  });
});

describe('addHostSeat', () => {
  it('writes the Host lock and the Seat in one transaction, both conditional', async () => {
    const { store, commands } = setup();
    await store.addHostSeat(session, host('H1', '2026-11-01T10:00:00Z'));
    const [lock, seat] = transactItems(commands[0]);
    expect(lock.Put.Item).toMatchObject({
      pk: 'SESSION#sess-1',
      sk: 'HOST#pk-H1',
      seatId: 'H1',
      ttl: seatTtl(session),
    });
    expect(lock.Put.ConditionExpression).toBe('attribute_not_exists(pk)');
    expect(seat.Put.Item).toMatchObject({ pk: 'SESSION#sess-1', sk: 'SEAT#H1' });
    expect(seat.Put.ConditionExpression).toBe('attribute_not_exists(pk)');
  });

  it('throws DuplicateHostSeatError when the Player already holds an active Host seat', async () => {
    const { store } = setup(() => transactionCancelled('ConditionalCheckFailed', 'None'));
    await expect(
      store.addHostSeat(session, host('H2', '2026-11-01T10:00:00Z', { phoneKey: 'pk-H1' })),
    ).rejects.toBeInstanceOf(DuplicateHostSeatError);
  });

  it('does not swallow other transaction failures', async () => {
    const { store } = setup(() => transactionCancelled('ThrottlingError', 'None'));
    await expect(
      store.addHostSeat(session, host('H1', '2026-11-01T10:00:00Z')),
    ).rejects.toThrow('cancelled');
  });

  it('rejects a Host seat without a phoneKey', async () => {
    const { store } = setup();
    await expect(
      store.addHostSeat(session, host('H1', '2026-11-01T10:00:00Z', { phoneKey: null })),
    ).rejects.toThrow(/phoneKey/);
  });
});

describe('addGuestSeat', () => {
  const g = guest('G1', 'H1', '2026-11-01T10:05:00Z');

  it('increments the Host counter under the cap and writes the Guest seat', async () => {
    const { store, commands } = setup();
    await store.addGuestSeat(session, g, 2);
    const [update, put] = transactItems(commands[0]);
    expect(update.Update).toMatchObject({
      Key: { pk: 'SESSION#sess-1', sk: 'SEAT#H1' },
      UpdateExpression: 'SET activeGuests = if_not_exists(activeGuests, :zero) + :one',
      ExpressionAttributeValues: { ':max': 2 },
    });
    const condition = update.Update.ConditionExpression as string;
    expect(condition).toContain('attribute_not_exists(cancelledAt)');
    expect(condition).toContain('(attribute_not_exists(activeGuests) OR activeGuests < :max)');
    expect(put.Put.Item).toMatchObject({ sk: 'SEAT#G1', hostSeatId: 'H1' });
  });

  it('drops the cap from Top-up (Infinity) but still requires an active Host seat', async () => {
    const { store, commands } = setup();
    await store.addGuestSeat(session, g, Number.POSITIVE_INFINITY);
    const update = transactItems(commands[0])[0].Update;
    expect(update.ConditionExpression).not.toContain(':max');
    expect(update.ExpressionAttributeValues).not.toHaveProperty(':max');
    expect(update.ConditionExpression).toContain('attribute_not_exists(cancelledAt)');
  });

  it('throws GuestLimitError when the Host seat is active but full', async () => {
    const { store } = setup((c) =>
      c.name === 'TransactWriteCommand'
        ? transactionCancelled('ConditionalCheckFailed', 'None')
        : { Item: { id: 'H1', kind: 'host' } },
    );
    await expect(store.addGuestSeat(session, g, 2)).rejects.toBeInstanceOf(GuestLimitError);
  });

  it('throws HostSeatNotActiveError when the Host seat is cancelled or missing', async () => {
    const cancelledHost = setup((c) =>
      c.name === 'TransactWriteCommand'
        ? transactionCancelled('ConditionalCheckFailed', 'None')
        : { Item: { id: 'H1', cancelledAt: '2026-11-02T00:00:00.000Z' } },
    );
    await expect(cancelledHost.store.addGuestSeat(session, g, 2)).rejects.toBeInstanceOf(
      HostSeatNotActiveError,
    );
    const missingHost = setup((c) =>
      c.name === 'TransactWriteCommand' ? transactionCancelled('ConditionalCheckFailed', 'None') : {},
    );
    await expect(missingHost.store.addGuestSeat(session, g, 2)).rejects.toBeInstanceOf(
      HostSeatNotActiveError,
    );
  });
});

describe('cancelSeat', () => {
  const at = new Date('2026-11-06T10:00:00Z');
  const h = host('H1', '2026-11-01T10:00:00Z');
  const g1 = guest('G1', 'H1', '2026-11-01T10:05:00Z');
  const g2 = guest('G2', 'H1', '2026-11-01T10:06:00Z');
  const g3 = cancelled(guest('G3', 'H1', '2026-11-01T10:07:00Z'), '2026-11-02T00:00:00Z');

  const seatsHandler = (seats: ReturnType<typeof host>[]) => (c: Recorded) =>
    c.name === 'QueryCommand'
      ? { Items: seats.map((s) => seatToItem(session, s)) }
      : {};

  it('cancels a Host seat, cascades to active Guest seats and frees the Host lock atomically', async () => {
    const { store, commands } = setup(seatsHandler([h, g1, g2, g3]));
    const result = await store.cancelSeat(session, 'H1', at, 'player');

    const tx = commands.filter((c) => c.name === 'TransactWriteCommand');
    expect(tx).toHaveLength(1);
    const items = transactItems(tx[0]);
    expect(items).toHaveLength(4);

    const updates = items.filter((i) => i.Update).map((i) => i.Update);
    expect(updates.map((u) => (u.Key as { sk: string }).sk)).toEqual([
      'SEAT#G1',
      'SEAT#G2',
      'SEAT#H1',
    ]);
    for (const update of updates) {
      expect(update.ConditionExpression).toBe(
        'attribute_exists(pk) AND attribute_not_exists(cancelledAt)',
      );
      expect(update.ExpressionAttributeValues).toMatchObject({
        ':at': at.toISOString(),
      });
    }
    expect(updates[0].ExpressionAttributeValues).toMatchObject({ ':by': 'cascade' });
    expect(updates[2].ExpressionAttributeValues).toMatchObject({ ':by': 'player' });
    expect(items[3].Delete).toMatchObject({
      Key: { pk: 'SESSION#sess-1', sk: 'HOST#pk-H1' },
    });

    expect(result.map((s) => [s.id, s.cancelledBy])).toEqual([
      ['G1', 'cascade'],
      ['G2', 'cascade'],
      ['H1', 'player'],
    ]);
    expect(result.every((s) => s.cancelledAt?.getTime() === at.getTime())).toBe(true);
  });

  it('cancels a lone Guest seat and decrements the Host counter', async () => {
    const { store, commands } = setup(seatsHandler([h, g1]));
    const result = await store.cancelSeat(session, 'G1', at, 'player');
    const items = transactItems(commands.find((c) => c.name === 'TransactWriteCommand')!);
    expect(items).toHaveLength(2);
    expect(items[1].Update).toMatchObject({
      Key: { sk: 'SEAT#H1' },
      UpdateExpression: 'SET activeGuests = activeGuests - :one',
      ConditionExpression: 'activeGuests > :zero',
    });
    expect(result.map((s) => s.id)).toEqual(['G1']);
  });

  it('is idempotent: an already-cancelled Seat changes nothing', async () => {
    const { store, commands } = setup(seatsHandler([h, g3]));
    await expect(store.cancelSeat(session, 'G3', at, 'player')).resolves.toEqual([]);
    expect(commands.some((c) => c.name === 'TransactWriteCommand')).toBe(false);
  });

  it('lets the first cancel win when a concurrent cancel beats the transaction', async () => {
    let queries = 0;
    const { store } = setup((c) => {
      if (c.name === 'QueryCommand') {
        queries += 1;
        const seat = queries === 1 ? h : cancelled(h, '2026-11-06T09:59:59Z');
        return { Items: [seatToItem(session, seat)] };
      }
      return transactionCancelled('ConditionalCheckFailed', 'None');
    });
    await expect(store.cancelSeat(session, 'H1', at, 'player')).resolves.toEqual([]);
  });

  it('throws SeatNotFoundError for an unknown Seat', async () => {
    const { store } = setup(seatsHandler([h]));
    await expect(store.cancelSeat(session, 'nope', at, 'player')).rejects.toBeInstanceOf(
      SeatNotFoundError,
    );
  });

  it('splits a very large cascade, cancelling Guest seats before the Host seat', async () => {
    const guests = Array.from({ length: 120 }, (_, i) =>
      guest(`G${String(i).padStart(3, '0')}`, 'H1', `2026-11-01T11:${String(i % 60).padStart(2, '0')}:00Z`),
    );
    const { store, commands } = setup(seatsHandler([h, ...guests]));
    await store.cancelSeat(session, 'H1', at, 'organiser');
    const tx = commands.filter((c) => c.name === 'TransactWriteCommand');
    expect(tx.map((t) => transactItems(t).length)).toEqual([100, 20, 2]);
    expect(JSON.stringify(transactItems(tx[2]))).toContain('SEAT#H1');
  });
});

describe('updateSeat', () => {
  it('sets only the patched fields, aliasing reserved words', async () => {
    const { store, commands } = setup();
    await store.updateSeat(session, 'H1', { name: 'New', attended: true });
    expect(commands[0].input).toMatchObject({
      Key: { pk: 'SESSION#sess-1', sk: 'SEAT#H1' },
      UpdateExpression: 'SET #name = :name, #attended = :attended',
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeNames: { '#name': 'name', '#attended': 'attended' },
      ExpressionAttributeValues: { ':name': 'New', ':attended': true },
    });
  });

  it('maps a missing Seat to SeatNotFoundError', async () => {
    const { store } = setup(() => conditionFailed());
    await expect(store.updateSeat(session, 'nope', { tier: 'alumni' })).rejects.toBeInstanceOf(
      SeatNotFoundError,
    );
  });
});

describe('Penalties', () => {
  it('moves the TTL with endsAt when shortened', async () => {
    const { store, commands } = setup();
    const endsAt = new Date('2026-11-14T00:00:00Z');
    await store.updatePenalty(
      'club-1',
      { phoneKey: 'pk-P', sessionId: 'earlier', reason: 'late-cancel' },
      { endsAt },
    );
    expect(commands[0].input).toMatchObject({
      Key: { pk: 'CLUB#club-1', sk: 'PENALTY#pk-P#earlier#late-cancel' },
      UpdateExpression: 'SET endsAt = :endsAt, #ttl = :ttl',
      ExpressionAttributeValues: { ':ttl': endsAt.getTime() / 1000 },
    });
  });

  it('clears by setting clearedAt and un-clears with REMOVE', async () => {
    const { store, commands } = setup();
    const key = { phoneKey: 'pk-P', sessionId: 'earlier', reason: 'late-cancel' as const };
    await store.updatePenalty('club-1', key, { clearedAt: new Date('2026-11-10T00:00:00Z') });
    await store.updatePenalty('club-1', key, { clearedAt: null });
    expect(commands[0].input.UpdateExpression).toBe('SET clearedAt = :clearedAt');
    expect(commands[1].input.UpdateExpression).toBe('REMOVE clearedAt');
  });

  it('lists a Club\'s Penalties by sort-key prefix', async () => {
    const p = penalty();
    const { store, commands } = setup(() => ({ Items: [penaltyToItem('club-1', p)] }));
    await expect(store.listPenalties('club-1')).resolves.toEqual([p]);
    expect(commands[0].input).toMatchObject({
      ExpressionAttributeValues: { ':pk': 'CLUB#club-1', ':prefix': 'PENALTY#' },
    });
  });
});

describe('abuse limits', () => {
  it('adds one to a fixed-window counter, sets its TTL and returns the new count', async () => {
    const { store, commands } = setup(() => ({ Attributes: { count: 4 } }));
    const expiresAt = new Date('2026-11-06T10:10:00Z');
    await expect(store.incrementCounter('ip:abc', '2026-11-06T10:00', expiresAt)).resolves.toBe(4);
    expect(commands[0].input).toMatchObject({
      Key: { pk: 'RL#ip:abc', sk: '2026-11-06T10:00' },
      UpdateExpression: 'ADD #count :one SET #ttl = :ttl',
      ExpressionAttributeValues: { ':one': 1, ':ttl': expiresAt.getTime() / 1000 },
      ReturnValues: 'UPDATED_NEW',
    });
  });

  it('stores throttle state with a TTL and reads it back', async () => {
    const record = {
      count: 2,
      windowStartMs: 1,
      lockedUntilMs: 0,
      lockLevel: 0,
      lastAttemptMs: 5,
    };
    const expiresAt = new Date('2026-11-07T00:00:00Z');
    const { store, commands } = setup(() => ({
      Item: { pk: 'RL#k', sk: 'STATE', ...record, ttl: 1 },
    }));
    await store.putThrottle('k', record, expiresAt);
    expect(commands[0].input.Item).toMatchObject({
      pk: 'RL#k',
      sk: 'STATE',
      ...record,
      ttl: expiresAt.getTime() / 1000,
    });
    await expect(store.getThrottle('k')).resolves.toEqual(record);
  });

  it('returns null for unknown throttle state', async () => {
    const { store } = setup(() => ({}));
    await expect(store.getThrottle('k')).resolves.toBeNull();
  });
});

describe('keys', () => {
  it('uses the documented partition and sort keys', () => {
    expect(keys.club('c')).toEqual({ pk: 'CLUB#c', sk: 'META' });
    expect(keys.player('c', 'p')).toEqual({ pk: 'CLUB#c', sk: 'PLAYER#p' });
    expect(keys.seat('s', 'x')).toEqual({ pk: 'SESSION#s', sk: 'SEAT#x' });
    expect(keys.hostLock('s', 'p')).toEqual({ pk: 'SESSION#s', sk: 'HOST#p' });
  });
});
