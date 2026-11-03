import { describe, expect, it, vi } from 'vitest';
import {
  createClubAsAdmin,
  replaceOrganiserLinkAsAdmin,
  sessionIdFromSignupLink,
  type AdminServiceDeps,
} from './admin-service';
import { createMemoryCourtBoardStore } from './memory-store';
import { hashOrganiserToken } from './organiser-token';

const input = {
  name: 'Lunchtime Badminton',
  venue: 'Sports hall',
  start: '09:00',
  end: '11:00',
};

function setup(admin: boolean) {
  const store = createMemoryCourtBoardStore();
  const deps: AdminServiceDeps = {
    isSiteAdmin: vi.fn().mockResolvedValue(admin),
    getStore: vi.fn().mockResolvedValue(store),
    now: () => new Date('2026-11-01T10:00:00Z'),
  };
  return { store, deps };
}

describe('createClubAsAdmin', () => {
  it('creates the Club and returns an Organiser path that authenticates it', async () => {
    const { store, deps } = setup(true);
    const result = await createClubAsAdmin(deps, 'id.token', input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const token = result.organiserPath.replace('/labs/court-board/o/', '');
    expect(result.organiserPath).toBe(`/labs/court-board/o/${token}`);
    expect(await store.getClubIdByOrganiserTokenHash(hashOrganiserToken(token))).toBe(
      result.clubId,
    );
    const club = await store.getClub(result.clubId);
    expect(club).toMatchObject({
      name: 'Lunchtime Badminton',
      venue: 'Sports hall',
      startTime: '09:00',
      endTime: '11:00',
    });
  });

  it('does nothing for anyone but the Site Admin', async () => {
    const { deps } = setup(false);
    await expect(createClubAsAdmin(deps, 'forged', input)).resolves.toEqual({
      ok: false,
      error: 'unauthorised',
    });
    expect(deps.getStore).not.toHaveBeenCalled();
  });

  it('checks the caller before looking at the input', async () => {
    const { deps } = setup(false);
    await expect(createClubAsAdmin(deps, 'forged', null)).resolves.toEqual({
      ok: false,
      error: 'unauthorised',
    });
  });

  it('rejects invalid input without touching the store', async () => {
    const { deps } = setup(true);
    await expect(
      createClubAsAdmin(deps, 'id.token', { ...input, name: '' }),
    ).resolves.toEqual({ ok: false, error: 'invalid' });
    expect(deps.getStore).not.toHaveBeenCalled();
  });

  it('reports unavailable, without leaking details, when the store fails', async () => {
    const { deps } = setup(true);
    deps.getStore = vi.fn().mockRejectedValue(new Error('AccessDenied: secret detail'));
    await expect(createClubAsAdmin(deps, 'id.token', input)).resolves.toEqual({
      ok: false,
      error: 'unavailable',
    });
  });
});

describe('sessionIdFromSignupLink', () => {
  it('reads a full Signup link, a path, or a bare id', () => {
    expect(
      sessionIdFromSignupLink('https://www.hashadar.com/labs/court-board/s/abcdefghijkl'),
    ).toBe('abcdefghijkl');
    expect(sessionIdFromSignupLink(' /labs/court-board/s/abc-ef_hijkl/rules ')).toBe(
      'abc-ef_hijkl',
    );
    expect(sessionIdFromSignupLink('abcdefghijkl')).toBe('abcdefghijkl');
  });

  it('rejects anything else', () => {
    expect(sessionIdFromSignupLink('https://www.hashadar.com/labs/court-board/o')).toBeNull();
    expect(sessionIdFromSignupLink('/labs/court-board/s/short')).toBeNull();
    expect(sessionIdFromSignupLink(42)).toBeNull();
  });
});

describe('replaceOrganiserLinkAsAdmin', () => {
  async function withSession(admin: boolean) {
    const { store, deps } = setup(admin);
    const created = await createClubAsAdmin({ ...deps, isSiteAdmin: async () => true }, 'id', input);
    if (!created.ok) throw new Error('setup failed');
    const oldToken = created.organiserPath.replace('/labs/court-board/o/', '');
    await store.createSession({
      id: 'abcdefghijkl',
      clubId: created.clubId,
      localDate: '2026-11-07',
      startTime: '09:00',
      endTime: '11:00',
      venue: 'Sports hall',
      capacity: 25,
      status: 'open',
      registerClosedAt: null,
    });
    return { store, deps, clubId: created.clubId, oldToken };
  }

  it('issues a new link for the Club behind a Signup link and kills the old one', async () => {
    const { store, deps, clubId, oldToken } = await withSession(true);
    const result = await replaceOrganiserLinkAsAdmin(deps, 'id.token', {
      signupLink: 'https://www.hashadar.com/labs/court-board/s/abcdefghijkl',
    });

    expect(result).toMatchObject({ ok: true, clubName: 'Lunchtime Badminton' });
    if (!result.ok) return;
    const newToken = result.organiserPath.replace('/labs/court-board/o/', '');
    expect(newToken).not.toBe(oldToken);
    expect(await store.getClubIdByOrganiserTokenHash(hashOrganiserToken(newToken))).toBe(clubId);
    expect(await store.getClubIdByOrganiserTokenHash(hashOrganiserToken(oldToken))).toBeNull();
  });

  it('does nothing for anyone but the Site Admin', async () => {
    const { deps } = await withSession(false);
    await expect(
      replaceOrganiserLinkAsAdmin(deps, 'forged', { signupLink: 'abcdefghijkl' }),
    ).resolves.toEqual({ ok: false, error: 'unauthorised' });
  });

  it('rejects input that is not a Signup link', async () => {
    const { deps } = await withSession(true);
    await expect(
      replaceOrganiserLinkAsAdmin(deps, 'id', { signupLink: 'not a link' }),
    ).resolves.toEqual({ ok: false, error: 'invalid' });
  });

  it('reports an unknown Session', async () => {
    const { deps } = await withSession(true);
    await expect(
      replaceOrganiserLinkAsAdmin(deps, 'id', { signupLink: 'zzzzzzzzzzzz' }),
    ).resolves.toEqual({ ok: false, error: 'not-found' });
  });
});
