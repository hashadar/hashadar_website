import { describe, expect, it, vi } from 'vitest';
import { createClubAsAdmin, type AdminServiceDeps } from './admin-service';
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
