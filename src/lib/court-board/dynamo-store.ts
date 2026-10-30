/**
 * Single-table DynamoDB implementation of `CourtBoardStore`.
 *
 * Item layout (all on-demand, TTL attribute `ttl`, GSI `GSI1` on gsi1pk/gsi1sk):
 *
 * | Item          | pk                | sk                                 |
 * |---------------|-------------------|------------------------------------|
 * | Club          | CLUB#<clubId>     | META                               |
 * | Organiser tok | ORGTOKEN#<sha256> | META                               |
 * | Player        | CLUB#<clubId>     | PLAYER#<phoneKey>                  |
 * | Session       | SESSION#<id>      | META  (gsi1: CLUB#<clubId> / <localDate>#<id>) |
 * | Seat          | SESSION#<id>      | SEAT#<seatId>                      |
 * | Host lock     | SESSION#<id>      | HOST#<phoneKey>                    |
 * | Penalty       | CLUB#<clubId>     | PENALTY#<phoneKey>#<session>#<reason> |
 * | Throttle      | RL#<key>          | STATE                              |
 * | Counter       | RL#<key>          | <window>                           |
 *
 * The Host lock item is what makes "one active Host seat per Player per
 * Session" a conditional write: it is created in the same transaction as the
 * Seat and deleted in the same transaction as the cancellation. The guest cap
 * is an `activeGuests` counter on the Host seat, incremented under a condition.
 *
 * Unit-tested against a recording fake client only; exercise it with
 * `npx ampx sandbox` before relying on it (docs/court-board/infra.md).
 * Deliberately no `server-only`: scripts import this module.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
  type QueryCommandInput,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { sessionStartsAt } from './time';
import {
  DuplicateHostSeatError,
  GuestLimitError,
  HostSeatNotActiveError,
  penaltyKeyOf,
  SeatNotFoundError,
  SessionExistsError,
  type Club,
  type ClubSession,
  type CourtBoardStore,
  type PenaltyKey,
  type Player,
  type ThrottleRecord,
} from './store';
import type {
  CancelledBy,
  ClubRules,
  Penalty,
  PenaltyReason,
  Seat,
  SeatKind,
  SessionStatus,
  Tier,
} from './types';

export const GSI1 = 'GSI1';
/** Seats expire this long after their Session starts. */
export const SEAT_RETENTION_WEEKS = 8;

const MAX_TRANSACT_ITEMS = 100;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Item = Record<string, unknown>;
type TransactItem = NonNullable<TransactWriteCommandInput['TransactItems']>[number];

export interface DynamoCourtBoardStoreOptions {
  tableName: string;
  region?: string;
  /** Injected for tests. */
  client?: Pick<DynamoDBDocumentClient, 'send'>;
}

// --- keys -------------------------------------------------------------------

export const keys = {
  club: (clubId: string) => ({ pk: `CLUB#${clubId}`, sk: 'META' }),
  organiserToken: (hash: string) => ({ pk: `ORGTOKEN#${hash}`, sk: 'META' }),
  player: (clubId: string, phoneKey: string) => ({
    pk: `CLUB#${clubId}`,
    sk: `PLAYER#${phoneKey}`,
  }),
  session: (sessionId: string) => ({ pk: `SESSION#${sessionId}`, sk: 'META' }),
  seat: (sessionId: string, seatId: string) => ({
    pk: `SESSION#${sessionId}`,
    sk: `SEAT#${seatId}`,
  }),
  hostLock: (sessionId: string, phoneKey: string) => ({
    pk: `SESSION#${sessionId}`,
    sk: `HOST#${phoneKey}`,
  }),
  penalty: (clubId: string, key: PenaltyKey) => ({
    pk: `CLUB#${clubId}`,
    sk: `PENALTY#${penaltyKeyOf(key)}`,
  }),
  throttle: (key: string) => ({ pk: `RL#${key}`, sk: 'STATE' }),
  counter: (key: string, windowId: string) => ({
    pk: `RL#${key}`,
    sk: windowId,
  }),
};

// --- mappers ----------------------------------------------------------------

const iso = (d: Date) => d.toISOString();
const date = (v: unknown) => new Date(String(v));
const epochSeconds = (d: Date) => Math.floor(d.getTime() / 1000);

export function seatTtl(session: ClubSession): number {
  return epochSeconds(
    new Date(sessionStartsAt(session).getTime() + SEAT_RETENTION_WEEKS * WEEK_MS),
  );
}

export function seatToItem(session: ClubSession, seat: Seat): Item {
  const item: Item = {
    ...keys.seat(session.id, seat.id),
    id: seat.id,
    kind: seat.kind,
    name: seat.name,
    tier: seat.tier,
    createdAt: iso(seat.createdAt),
    attended: seat.attended,
    ttl: seatTtl(session),
  };
  if (seat.hostSeatId) item.hostSeatId = seat.hostSeatId;
  if (seat.phoneKey) item.phoneKey = seat.phoneKey;
  if (seat.cancelledAt) item.cancelledAt = iso(seat.cancelledAt);
  if (seat.cancelledBy) item.cancelledBy = seat.cancelledBy;
  if (seat.kind === 'host') item.activeGuests = 0;
  return item;
}

export function itemToSeat(item: Item): Seat {
  return {
    id: String(item.id),
    kind: item.kind as SeatKind,
    hostSeatId: item.hostSeatId ? String(item.hostSeatId) : null,
    phoneKey: item.phoneKey ? String(item.phoneKey) : null,
    name: String(item.name),
    tier: item.tier as Tier,
    createdAt: date(item.createdAt),
    cancelledAt: item.cancelledAt ? date(item.cancelledAt) : null,
    cancelledBy: item.cancelledBy ? (item.cancelledBy as CancelledBy) : null,
    attended: item.attended === true,
  };
}

export function clubToItem(club: Club): Item {
  return {
    ...keys.club(club.id),
    id: club.id,
    name: club.name,
    venue: club.venue,
    startTime: club.startTime,
    endTime: club.endTime,
    rules: club.rules,
    createdAt: iso(club.createdAt),
  };
}

export function itemToClub(item: Item): Club {
  return {
    id: String(item.id),
    name: String(item.name),
    venue: String(item.venue),
    startTime: String(item.startTime),
    endTime: String(item.endTime),
    rules: item.rules as ClubRules,
    createdAt: date(item.createdAt),
  };
}

export function playerToItem(player: Player): Item {
  return {
    ...keys.player(player.clubId, player.phoneKey),
    clubId: player.clubId,
    phoneKey: player.phoneKey,
    displayName: player.displayName,
    tier: player.tier,
    phoneLast3: player.phoneLast3,
    pinHash: player.pinHash,
    pinSalt: player.pinSalt,
    updatedAt: iso(player.updatedAt),
  };
}

export function itemToPlayer(item: Item): Player {
  return {
    clubId: String(item.clubId),
    phoneKey: String(item.phoneKey),
    displayName: String(item.displayName),
    tier: item.tier as Tier,
    phoneLast3: String(item.phoneLast3),
    pinHash: item.pinHash ? String(item.pinHash) : null,
    pinSalt: item.pinSalt ? String(item.pinSalt) : null,
    updatedAt: date(item.updatedAt),
  };
}

export function sessionToItem(session: ClubSession): Item {
  const item: Item = {
    ...keys.session(session.id),
    gsi1pk: `CLUB#${session.clubId}`,
    gsi1sk: `${session.localDate}#${session.id}`,
    id: session.id,
    clubId: session.clubId,
    venue: session.venue,
    localDate: session.localDate,
    startTime: session.startTime,
    endTime: session.endTime,
    capacity: session.capacity,
    status: session.status,
  };
  if (session.registerClosedAt) {
    item.registerClosedAt = iso(session.registerClosedAt);
  }
  return item;
}

export function itemToSession(item: Item): ClubSession {
  return {
    id: String(item.id),
    clubId: String(item.clubId),
    venue: String(item.venue),
    localDate: String(item.localDate),
    startTime: String(item.startTime),
    endTime: String(item.endTime),
    capacity: Number(item.capacity),
    status: item.status as SessionStatus,
    registerClosedAt: item.registerClosedAt ? date(item.registerClosedAt) : null,
  };
}

export function penaltyToItem(clubId: string, penalty: Penalty): Item {
  const item: Item = {
    ...keys.penalty(clubId, penalty),
    phoneKey: penalty.phoneKey,
    sessionId: penalty.sessionId,
    reason: penalty.reason,
    weeks: penalty.weeks,
    startsAt: iso(penalty.startsAt),
    endsAt: iso(penalty.endsAt),
    ttl: epochSeconds(penalty.endsAt),
  };
  if (penalty.clearedAt) item.clearedAt = iso(penalty.clearedAt);
  return item;
}

export function itemToPenalty(item: Item): Penalty {
  return {
    phoneKey: String(item.phoneKey),
    sessionId: String(item.sessionId),
    reason: item.reason as PenaltyReason,
    weeks: Number(item.weeks),
    startsAt: date(item.startsAt),
    endsAt: date(item.endsAt),
    clearedAt: item.clearedAt ? date(item.clearedAt) : null,
  };
}

// --- error helpers ----------------------------------------------------------

function errorName(err: unknown): string {
  return err instanceof Error ? err.name : '';
}

const isConditionFailed = (err: unknown) =>
  errorName(err) === 'ConditionalCheckFailedException';

/** True when a transaction was cancelled by a failed condition (not throttling etc.). */
function isTransactionConditionFailure(err: unknown): boolean {
  if (errorName(err) !== 'TransactionCanceledException') return false;
  const reasons = (err as { CancellationReasons?: Array<{ Code?: string }> })
    .CancellationReasons;
  return (
    !reasons || reasons.some((reason) => reason?.Code === 'ConditionalCheckFailed')
  );
}

// --- store ------------------------------------------------------------------

export function createDynamoCourtBoardStore(
  options: DynamoCourtBoardStoreOptions,
): CourtBoardStore {
  const { tableName } = options;
  const client: Pick<DynamoDBDocumentClient, 'send'> =
    options.client ??
    DynamoDBDocumentClient.from(
      new DynamoDBClient({ region: options.region ?? 'eu-west-2' }),
      { marshallOptions: { removeUndefinedValues: true } },
    );

  async function get(key: { pk: string; sk: string }): Promise<Item | null> {
    const out = await client.send(
      new GetCommand({ TableName: tableName, Key: key }),
    );
    return (out.Item as Item | undefined) ?? null;
  }

  async function put(item: Item, condition?: string): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
        ...(condition ? { ConditionExpression: condition } : {}),
      }),
    );
  }

  async function queryAll(input: Omit<QueryCommandInput, 'TableName'>): Promise<Item[]> {
    const items: Item[] = [];
    let startKey: Record<string, unknown> | undefined;
    do {
      const out = await client.send(
        new QueryCommand({
          ...input,
          TableName: tableName,
          ExclusiveStartKey: startKey,
        }),
      );
      items.push(...((out.Items as Item[] | undefined) ?? []));
      startKey = out.LastEvaluatedKey;
    } while (startKey);
    return items;
  }

  async function transact(items: TransactItem[]): Promise<void> {
    await client.send(new TransactWriteCommand({ TransactItems: items }));
  }

  async function querySeatItems(sessionId: string): Promise<Item[]> {
    return queryAll({
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': `SESSION#${sessionId}`, ':prefix': 'SEAT#' },
    });
  }

  function compareSeats(a: Seat, b: Seat): number {
    return (
      a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
    );
  }

  async function listSeats(sessionId: string): Promise<Seat[]> {
    const items = await querySeatItems(sessionId);
    return items.map(itemToSeat).sort(compareSeats);
  }

  return {
    // Clubs and Organiser links
    async getClub(clubId) {
      const item = await get(keys.club(clubId));
      return item ? itemToClub(item) : null;
    },

    async createClub(club, organiserTokenHash) {
      await transact([
        {
          Put: {
            TableName: tableName,
            Item: clubToItem(club),
            ConditionExpression: 'attribute_not_exists(pk)',
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: { ...keys.organiserToken(organiserTokenHash), clubId: club.id },
            ConditionExpression: 'attribute_not_exists(pk)',
          },
        },
      ]);
    },

    async getClubIdByOrganiserTokenHash(tokenHash) {
      const item = await get(keys.organiserToken(tokenHash));
      return item?.clubId ? String(item.clubId) : null;
    },

    async rotateOrganiserToken(clubId, oldHash, newHash) {
      try {
        await transact([
          {
            Delete: {
              TableName: tableName,
              Key: keys.organiserToken(oldHash),
              ConditionExpression: 'attribute_exists(pk) AND clubId = :clubId',
              ExpressionAttributeValues: { ':clubId': clubId },
            },
          },
          {
            Put: {
              TableName: tableName,
              Item: { ...keys.organiserToken(newHash), clubId },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
        ]);
      } catch (err) {
        if (isTransactionConditionFailure(err)) {
          throw new Error('Organiser link not found');
        }
        throw err;
      }
    },

    // Players
    async getPlayer(clubId, phoneKey) {
      const item = await get(keys.player(clubId, phoneKey));
      return item ? itemToPlayer(item) : null;
    },

    async putPlayer(player) {
      await put(playerToItem(player));
    },

    async listPlayers(clubId) {
      const items = await queryAll({
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': `CLUB#${clubId}`, ':prefix': 'PLAYER#' },
      });
      return items.map(itemToPlayer);
    },

    // Sessions
    async getSession(sessionId) {
      const item = await get(keys.session(sessionId));
      return item ? itemToSession(item) : null;
    },

    async createSession(session) {
      try {
        await put(sessionToItem(session), 'attribute_not_exists(pk)');
      } catch (err) {
        if (isConditionFailed(err)) throw new SessionExistsError();
        throw err;
      }
    },

    async updateSession(sessionId, patch) {
      const sets: string[] = [];
      const removes: string[] = [];
      const names: Record<string, string> = {};
      const values: Record<string, unknown> = {};
      if (patch.status !== undefined) {
        sets.push('#status = :status');
        names['#status'] = 'status';
        values[':status'] = patch.status;
      }
      if (patch.registerClosedAt !== undefined) {
        names['#closed'] = 'registerClosedAt';
        if (patch.registerClosedAt) {
          sets.push('#closed = :closed');
          values[':closed'] = iso(patch.registerClosedAt);
        } else {
          removes.push('#closed');
        }
      }
      if (sets.length === 0 && removes.length === 0) return;
      const expression = [
        sets.length ? `SET ${sets.join(', ')}` : '',
        removes.length ? `REMOVE ${removes.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: keys.session(sessionId),
          UpdateExpression: expression,
          ConditionExpression: 'attribute_exists(pk)',
          ExpressionAttributeNames: names,
          ...(Object.keys(values).length
            ? { ExpressionAttributeValues: values }
            : {}),
        }),
      );
    },

    async listSessions(clubId) {
      const items = await queryAll({
        IndexName: GSI1,
        KeyConditionExpression: 'gsi1pk = :pk',
        ExpressionAttributeValues: { ':pk': `CLUB#${clubId}` },
        ScanIndexForward: true,
      });
      return items.map(itemToSession);
    },

    // Seats
    listSeats,

    async addHostSeat(session, seat) {
      if (seat.kind !== 'host' || !seat.phoneKey) {
        throw new Error('A Host seat needs a phoneKey');
      }
      try {
        await transact([
          {
            Put: {
              TableName: tableName,
              Item: {
                ...keys.hostLock(session.id, seat.phoneKey),
                seatId: seat.id,
                ttl: seatTtl(session),
              },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
          {
            Put: {
              TableName: tableName,
              Item: seatToItem(session, seat),
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
        ]);
      } catch (err) {
        if (isTransactionConditionFailure(err)) throw new DuplicateHostSeatError();
        throw err;
      }
    },

    async addGuestSeat(session, seat, maxGuests) {
      if (seat.kind !== 'guest' || !seat.hostSeatId) {
        throw new Error('A Guest seat needs a hostSeatId');
      }
      const limited = Number.isFinite(maxGuests);
      try {
        await transact([
          {
            Update: {
              TableName: tableName,
              Key: keys.seat(session.id, seat.hostSeatId),
              UpdateExpression:
                'SET activeGuests = if_not_exists(activeGuests, :zero) + :one',
              ConditionExpression: [
                'attribute_exists(pk)',
                '#kind = :host',
                'attribute_not_exists(cancelledAt)',
                ...(limited
                  ? ['(attribute_not_exists(activeGuests) OR activeGuests < :max)']
                  : []),
              ].join(' AND '),
              ExpressionAttributeNames: { '#kind': 'kind' },
              ExpressionAttributeValues: {
                ':zero': 0,
                ':one': 1,
                ':host': 'host',
                ...(limited ? { ':max': maxGuests } : {}),
              },
            },
          },
          {
            Put: {
              TableName: tableName,
              Item: seatToItem(session, seat),
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
        ]);
      } catch (err) {
        if (!isTransactionConditionFailure(err)) throw err;
        const host = await get(keys.seat(session.id, seat.hostSeatId));
        if (!host || host.cancelledAt) throw new HostSeatNotActiveError();
        throw new GuestLimitError();
      }
    },

    async cancelSeat(session, seatId, at, by) {
      const all = await listSeats(session.id);
      const seat = all.find((s) => s.id === seatId);
      if (!seat) throw new SeatNotFoundError();
      if (seat.cancelledAt) return [];

      const guests =
        seat.kind === 'host'
          ? all.filter(
              (s) => s.kind === 'guest' && s.hostSeatId === seat.id && !s.cancelledAt,
            )
          : [];

      const cancelItem = (target: Seat, cancelledBy: CancelledBy): TransactItem => ({
        Update: {
          TableName: tableName,
          Key: keys.seat(session.id, target.id),
          UpdateExpression: 'SET cancelledAt = :at, cancelledBy = :by',
          ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(cancelledAt)',
          ExpressionAttributeValues: { ':at': iso(at), ':by': cancelledBy },
        },
      });

      const guestItems = guests.map((g) => cancelItem(g, 'cascade'));
      const mainItems: TransactItem[] = [cancelItem(seat, by)];
      if (seat.kind === 'host' && seat.phoneKey) {
        mainItems.push({
          Delete: {
            TableName: tableName,
            Key: keys.hostLock(session.id, seat.phoneKey),
          },
        });
      }
      if (seat.kind === 'guest' && seat.hostSeatId) {
        mainItems.push({
          Update: {
            TableName: tableName,
            Key: keys.seat(session.id, seat.hostSeatId),
            UpdateExpression: 'SET activeGuests = activeGuests - :one',
            ConditionExpression: 'activeGuests > :zero',
            ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
          },
        });
      }

      try {
        // A normal Session fits one transaction. A larger cascade cancels the
        // guests first and the Host seat last, so a failed retry stays correct.
        if (guestItems.length + mainItems.length <= MAX_TRANSACT_ITEMS) {
          await transact([...guestItems, ...mainItems]);
        } else {
          for (let i = 0; i < guestItems.length; i += MAX_TRANSACT_ITEMS) {
            await transact(guestItems.slice(i, i + MAX_TRANSACT_ITEMS));
          }
          await transact(mainItems);
        }
      } catch (err) {
        if (isTransactionConditionFailure(err)) {
          // Someone else cancelled first: the first cancel wins.
          const now = (await listSeats(session.id)).find((s) => s.id === seatId);
          if (!now) throw new SeatNotFoundError();
          if (now.cancelledAt) return [];
        }
        throw err;
      }

      return [
        ...guests.map((g) => ({
          ...g,
          cancelledAt: at,
          cancelledBy: 'cascade' as const,
        })),
        { ...seat, cancelledAt: at, cancelledBy: by },
      ];
    },

    async updateSeat(session, seatId, patch) {
      const sets: string[] = [];
      const names: Record<string, string> = {};
      const values: Record<string, unknown> = {};
      for (const field of ['name', 'tier', 'attended'] as const) {
        if (patch[field] === undefined) continue;
        sets.push(`#${field} = :${field}`);
        names[`#${field}`] = field;
        values[`:${field}`] = patch[field];
      }
      if (sets.length === 0) return;
      try {
        await client.send(
          new UpdateCommand({
            TableName: tableName,
            Key: keys.seat(session.id, seatId),
            UpdateExpression: `SET ${sets.join(', ')}`,
            ConditionExpression: 'attribute_exists(pk)',
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
          }),
        );
      } catch (err) {
        if (isConditionFailed(err)) throw new SeatNotFoundError();
        throw err;
      }
    },

    // Penalties
    async listPenalties(clubId) {
      const items = await queryAll({
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': `CLUB#${clubId}`, ':prefix': 'PENALTY#' },
      });
      return items.map(itemToPenalty);
    },

    async putPenalty(clubId, penalty) {
      await put(penaltyToItem(clubId, penalty));
    },

    async updatePenalty(clubId, key, patch) {
      const sets: string[] = [];
      const removes: string[] = [];
      const names: Record<string, string> = {};
      const values: Record<string, unknown> = {};
      if (patch.endsAt !== undefined) {
        sets.push('endsAt = :endsAt', '#ttl = :ttl');
        names['#ttl'] = 'ttl';
        values[':endsAt'] = iso(patch.endsAt);
        values[':ttl'] = epochSeconds(patch.endsAt);
      }
      if (patch.clearedAt !== undefined) {
        if (patch.clearedAt) {
          sets.push('clearedAt = :clearedAt');
          values[':clearedAt'] = iso(patch.clearedAt);
        } else {
          removes.push('clearedAt');
        }
      }
      if (sets.length === 0 && removes.length === 0) return;
      const expression = [
        sets.length ? `SET ${sets.join(', ')}` : '',
        removes.length ? `REMOVE ${removes.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      try {
        await client.send(
          new UpdateCommand({
            TableName: tableName,
            Key: keys.penalty(clubId, key),
            UpdateExpression: expression,
            ConditionExpression: 'attribute_exists(pk)',
            ...(Object.keys(names).length
              ? { ExpressionAttributeNames: names }
              : {}),
            ...(Object.keys(values).length
              ? { ExpressionAttributeValues: values }
              : {}),
          }),
        );
      } catch (err) {
        if (isConditionFailed(err)) throw new Error('Penalty not found');
        throw err;
      }
    },

    // Abuse limits
    async getThrottle(key) {
      const item = await get(keys.throttle(key));
      if (!item) return null;
      return {
        count: Number(item.count),
        windowStartMs: Number(item.windowStartMs),
        lockedUntilMs: Number(item.lockedUntilMs),
        lockLevel: Number(item.lockLevel),
        lastAttemptMs: Number(item.lastAttemptMs),
      } satisfies ThrottleRecord;
    },

    async putThrottle(key, record, expiresAt) {
      await put({
        ...keys.throttle(key),
        ...record,
        ttl: epochSeconds(expiresAt),
      });
    },

    async incrementCounter(key, windowId, expiresAt) {
      const out = await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: keys.counter(key, windowId),
          UpdateExpression: 'ADD #count :one SET #ttl = :ttl',
          ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
          ExpressionAttributeValues: { ':one': 1, ':ttl': epochSeconds(expiresAt) },
          ReturnValues: 'UPDATED_NEW',
        }),
      );
      return Number(out.Attributes?.count ?? 1);
    },
  };
}
