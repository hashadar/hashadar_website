import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { admin } from '@/data';
import type { CreateClubResult } from '@/lib/court-board/admin-service';
import { CourtBoardClubsPanel } from './court-board-clubs-panel';

vi.mock('@/lib/court-board/admin-actions', () => ({ createClubAction: vi.fn() }));

const copy = admin.courtBoard;

afterEach(() => {
  cleanup();
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(copy.nameLabel), 'Lunchtime Badminton');
  await user.type(screen.getByLabelText(copy.venueLabel), 'Sports hall');
  await user.click(screen.getByRole('button', { name: copy.createLabel }));
}

describe('CourtBoardClubsPanel', () => {
  it('sends the Admin token with the details and shows the link once', async () => {
    const user = userEvent.setup();
    const createClub = vi.fn<
      (token: unknown, input: unknown) => Promise<CreateClubResult>
    >(async () => ({
      ok: true,
      clubId: 'club1',
      organiserPath: '/labs/court-board/o/secret-token',
    }));
    render(<CourtBoardClubsPanel createClub={createClub} getToken={async () => 'id.jwt'} />);

    await fillAndSubmit(user);

    expect(createClub).toHaveBeenCalledWith('id.jwt', {
      name: 'Lunchtime Badminton',
      venue: 'Sports hall',
      start: '09:00',
      end: '11:00',
    });
    const link = await screen.findByRole('textbox', { name: copy.linkHeading });
    expect((link as HTMLInputElement).value).toBe(
      `${window.location.origin}/labs/court-board/o/secret-token`,
    );
    expect(screen.getByText(copy.linkWarning)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: copy.dismissLabel }));
    expect(screen.queryByRole('textbox', { name: copy.linkHeading })).toBeNull();
  });

  it('says so when the Admin is not signed in, without calling the server', async () => {
    const user = userEvent.setup();
    const createClub = vi.fn();
    render(<CourtBoardClubsPanel createClub={createClub} getToken={async () => null} />);

    await fillAndSubmit(user);

    expect((await screen.findByRole('alert')).textContent).toBe(copy.errors.unauthorised);
    expect(createClub).not.toHaveBeenCalled();
  });

  it.each(['invalid', 'unauthorised', 'unavailable'] as const)(
    'shows the %s failure and no link',
    async (error) => {
      const user = userEvent.setup();
      render(
        <CourtBoardClubsPanel
          createClub={async () => ({ ok: false, error })}
          getToken={async () => 'id.jwt'}
        />,
      );

      await fillAndSubmit(user);

      expect((await screen.findByRole('alert')).textContent).toBe(copy.errors[error]);
      expect(screen.queryByRole('textbox', { name: copy.linkHeading })).toBeNull();
    },
  );

  it('treats a thrown request as unavailable', async () => {
    const user = userEvent.setup();
    render(
      <CourtBoardClubsPanel
        createClub={async () => {
          throw new Error('network');
        }}
        getToken={async () => 'id.jwt'}
      />,
    );

    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(copy.errors.unavailable),
    );
  });
});
