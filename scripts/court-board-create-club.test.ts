import { describe, expect, it, vi } from 'vitest';
import { hashOrganiserToken } from '../src/lib/court-board/organiser-token';
import { DEFAULT_CLUB_RULES } from '../src/lib/court-board/rules';
import {
  buildClub,
  createClub,
  generateClubId,
  organiserLink,
  parseCreateClubArgs,
  resolveTableName,
} from './court-board-create-club';

describe('parseCreateClubArgs', () => {
  it('reads required flags and applies the defaults', () => {
    expect(
      parseCreateClubArgs(['--name', 'Lunchtime Badminton', '--venue', 'Sports hall']),
    ).toEqual({
      name: 'Lunchtime Badminton',
      venue: 'Sports hall',
      start: '09:00',
      end: '11:00',
      table: null,
      region: null,
      origin: null,
    });
  });

  it('reads every optional flag', () => {
    expect(
      parseCreateClubArgs([
        '--name', 'A', '--venue', 'B', '--start', '18:30', '--end', '20:00',
        '--table', 'T', '--region', 'eu-west-1', '--origin', 'http://localhost:3000',
      ]),
    ).toMatchObject({
      start: '18:30',
      end: '20:00',
      table: 'T',
      region: 'eu-west-1',
      origin: 'http://localhost:3000',
    });
  });

  it('rejects missing, unknown and malformed options', () => {
    expect(() => parseCreateClubArgs(['--venue', 'B'])).toThrow(/--name is required/);
    expect(() => parseCreateClubArgs(['--name', 'A'])).toThrow(/--venue is required/);
    expect(() => parseCreateClubArgs(['--name', 'A', '--venue', 'B', '--colour', 'x'])).toThrow(
      /Unknown option --colour/,
    );
    expect(() => parseCreateClubArgs(['--name', '--venue', 'B'])).toThrow(/Invalid arguments/);
    expect(() => parseCreateClubArgs(['--name', 'A', '--venue', 'B', '--start', '9am'])).toThrow(
      /HH:mm/,
    );
    expect(() => parseCreateClubArgs(['--name', 'x'.repeat(61), '--venue', 'B'])).toThrow(
      /60 characters/,
    );
  });
});

describe('helpers', () => {
  it('generates a 12-character URL-safe club id', () => {
    expect(generateClubId()).toMatch(/^[A-Za-z0-9_-]{12}$/);
  });

  it('builds a Club with the default rules', () => {
    const args = parseCreateClubArgs(['--name', 'A', '--venue', 'B']);
    const now = new Date('2026-10-30T10:00:00Z');
    expect(buildClub(args, 'club-1', now)).toEqual({
      id: 'club-1',
      name: 'A',
      venue: 'B',
      startTime: '09:00',
      endTime: '11:00',
      rules: DEFAULT_CLUB_RULES,
      createdAt: now,
    });
  });

  it('builds the Organiser link without a doubled slash', () => {
    expect(organiserLink('https://example.com/', 'tok')).toBe(
      'https://example.com/labs/court-board/o/tok',
    );
  });

  it('prefers --table, then COURT_BOARD_TABLE', () => {
    const base = parseCreateClubArgs(['--name', 'A', '--venue', 'B']);
    expect(resolveTableName({ ...base, table: 'Flag' }, { COURT_BOARD_TABLE: 'Env' })).toBe('Flag');
    expect(resolveTableName(base, { COURT_BOARD_TABLE: ' Env ' })).toBe('Env');
  });
});

describe('createClub', () => {
  it('stores only the token hash and returns the link containing the token', async () => {
    const createClubInStore = vi.fn().mockResolvedValue(undefined);
    const args = parseCreateClubArgs(['--name', 'A', '--venue', 'B']);

    const result = await createClub(args, {
      store: { createClub: createClubInStore },
      origin: 'https://example.com',
      now: () => new Date('2026-10-30T10:00:00Z'),
      newClubId: () => 'club-1',
      newToken: () => 'secret-token',
    });

    expect(result).toEqual({
      clubId: 'club-1',
      link: 'https://example.com/labs/court-board/o/secret-token',
    });
    expect(createClubInStore).toHaveBeenCalledTimes(1);
    const [club, storedHash] = createClubInStore.mock.calls[0];
    expect(club.id).toBe('club-1');
    expect(storedHash).toBe(hashOrganiserToken('secret-token'));
    expect(JSON.stringify(createClubInStore.mock.calls)).not.toContain('secret-token');
  });
});
