import {
  DuplicateHostSeatError,
  GuestLimitError,
  HostSeatNotActiveError,
  SeatNotFoundError,
  SessionExistsError,
  penaltyKeyOf,
  type Club,
  type ClubSession,
  type CourtBoardStore,
  type Player,
  type ThrottleRecord,
} from './store';
import type { Penalty, Seat } from './types';

/**
 * In-memory `CourtBoardStore`: the test double, and what `next dev` uses when
 * no DynamoDB table is configured. It enforces the same invariants as the
 * DynamoDB implementation; Node is single-threaded, so each method is atomic.
 */
export function createMemoryCourtBoardStore(): CourtBoardStore {
  const clubs = new Map<string, Club>();
  const tokens = new Map<string, string>();
  const players = new Map<string, Player>();
  const sessions = new Map<string, ClubSession>();
  const seats = new Map<string, Map<string, Seat>>();
  const penalties = new Map<string, Penalty>();
  const throttles = new Map<string, { record: ThrottleRecord; expiresAt: Date }>();
  const counters = new Map<string, { count: number; expiresAt: Date }>();

  const playerKey = (clubId: string, phoneKey: string) => `${clubId}|${phoneKey}`;
  const penaltyId = (clubId: string, p: Penalty) =>
    `${clubId}|${penaltyKeyOf(p)}`;
  const seatsOf = (sessionId: string) => {
    let map = seats.get(sessionId);
    if (!map) {
      map = new Map();
      seats.set(sessionId, map);
    }
    return map;
  };
  const activeGuestsOf = (sessionId: string, hostSeatId: string) =>
    [...seatsOf(sessionId).values()].filter(
      (s) => s.kind === 'guest' && s.hostSeatId === hostSeatId && !s.cancelledAt,
    );

  return {
    async getClub(clubId) {
      const club = clubs.get(clubId);
      return club ? structuredClone(club) : null;
    },
    async createClub(club, organiserTokenHash) {
      if (clubs.has(club.id)) throw new Error('Club already exists');
      clubs.set(club.id, structuredClone(club));
      tokens.set(organiserTokenHash, club.id);
    },
    async getClubIdByOrganiserTokenHash(tokenHash) {
      return tokens.get(tokenHash) ?? null;
    },
    async rotateOrganiserToken(clubId, oldHash, newHash) {
      if (tokens.get(oldHash) !== clubId) throw new Error('Unknown token');
      tokens.delete(oldHash);
      tokens.set(newHash, clubId);
    },

    async getPlayer(clubId, phoneKey) {
      const player = players.get(playerKey(clubId, phoneKey));
      return player ? structuredClone(player) : null;
    },
    async putPlayer(player) {
      players.set(playerKey(player.clubId, player.phoneKey), structuredClone(player));
    },
    async deletePlayer(clubId, phoneKey) {
      players.delete(playerKey(clubId, phoneKey));
    },
    async listPlayers(clubId) {
      return [...players.values()]
        .filter((p) => p.clubId === clubId)
        .map((p) => structuredClone(p));
    },

    async getSession(sessionId) {
      const session = sessions.get(sessionId);
      return session ? structuredClone(session) : null;
    },
    async createSession(session) {
      if (sessions.has(session.id)) throw new SessionExistsError();
      sessions.set(session.id, structuredClone(session));
    },
    async updateSession(sessionId, patch) {
      const session = sessions.get(sessionId);
      if (!session) throw new Error('Session not found');
      sessions.set(sessionId, { ...session, ...structuredClone(patch) });
    },
    async listSessions(clubId) {
      return [...sessions.values()]
        .filter((s) => s.clubId === clubId)
        .sort((a, b) =>
          a.localDate === b.localDate
            ? a.startTime.localeCompare(b.startTime)
            : a.localDate.localeCompare(b.localDate),
        )
        .map((s) => structuredClone(s));
    },

    async listSeats(sessionId) {
      return [...seatsOf(sessionId).values()].map((s) => structuredClone(s));
    },
    async addHostSeat(session, seat) {
      const map = seatsOf(session.id);
      const duplicate = [...map.values()].some(
        (s) => s.kind === 'host' && s.phoneKey === seat.phoneKey && !s.cancelledAt,
      );
      if (duplicate) throw new DuplicateHostSeatError();
      map.set(seat.id, structuredClone(seat));
    },
    async addGuestSeat(session, seat, maxGuests) {
      const map = seatsOf(session.id);
      const host = seat.hostSeatId ? map.get(seat.hostSeatId) : undefined;
      if (!host || host.kind !== 'host' || host.cancelledAt) {
        throw new HostSeatNotActiveError();
      }
      if (activeGuestsOf(session.id, host.id).length >= maxGuests) {
        throw new GuestLimitError();
      }
      map.set(seat.id, structuredClone(seat));
    },
    async cancelSeat(session, seatId, at, by) {
      const map = seatsOf(session.id);
      const seat = map.get(seatId);
      if (!seat) throw new SeatNotFoundError();
      if (seat.cancelledAt) return [];
      const cancelled: Seat[] = [];
      const cancel = (target: Seat, cancelledBy: Seat['cancelledBy']) => {
        const updated = { ...target, cancelledAt: at, cancelledBy };
        map.set(target.id, updated);
        cancelled.push(structuredClone(updated));
      };
      cancel(seat, by);
      if (seat.kind === 'host') {
        for (const guest of activeGuestsOf(session.id, seat.id)) {
          cancel(guest, 'cascade');
        }
      }
      return cancelled;
    },
    async updateSeat(session, seatId, patch) {
      const map = seatsOf(session.id);
      const seat = map.get(seatId);
      if (!seat) throw new SeatNotFoundError();
      map.set(seatId, { ...seat, ...patch });
    },

    async listPenalties(clubId) {
      return [...penalties.entries()]
        .filter(([id]) => id.startsWith(`${clubId}|`))
        .map(([, p]) => structuredClone(p));
    },
    async putPenalty(clubId, penalty) {
      penalties.set(penaltyId(clubId, penalty), structuredClone(penalty));
    },
    async deletePenalty(clubId, key) {
      penalties.delete(`${clubId}|${penaltyKeyOf(key)}`);
    },
    async updatePenalty(clubId, key, patch) {
      const id = `${clubId}|${penaltyKeyOf(key)}`;
      const penalty = penalties.get(id);
      if (!penalty) throw new Error('Penalty not found');
      penalties.set(id, { ...penalty, ...structuredClone(patch) });
    },

    async getThrottle(key) {
      const entry = throttles.get(key);
      if (!entry || entry.expiresAt.getTime() <= Date.now()) return null;
      return { ...entry.record };
    },
    async putThrottle(key, record, expiresAt) {
      throttles.set(key, { record: { ...record }, expiresAt });
    },
    async incrementCounter(key, windowId, expiresAt) {
      const id = `${key}|${windowId}`;
      const entry = counters.get(id);
      const count = entry && entry.expiresAt.getTime() > Date.now() ? entry.count + 1 : 1;
      counters.set(id, { count, expiresAt });
      return count;
    },
  };
}
