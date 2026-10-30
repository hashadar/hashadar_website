import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsequenceView, MyPlaceView, Outcome } from '@/lib/court-board/views';
import { ManagePlace } from './manage-place';
import { makePlace, makeView, mySeat } from './view-fixtures';

type PlaceOutcome = Outcome<{ place: MyPlaceView }>;
const getMyPlaceAction = vi.fn<(input: unknown) => Promise<PlaceOutcome>>();
const cancelSeatAction = vi.fn<(input: unknown) => Promise<Outcome<{ penalty: { weeks: number; endsAt: string } | null }>>>();
const updateSeatAction = vi.fn<(input: unknown) => Promise<Outcome>>();
const addGuestsAction = vi.fn<(input: unknown) => Promise<Outcome>>();
vi.mock('@/lib/court-board/player-actions', () => ({
  getMyPlaceAction: (input: unknown) => getMyPlaceAction(input),
  cancelSeatAction: (input: unknown) => cancelSeatAction(input),
  updateSeatAction: (input: unknown) => updateSeatAction(input),
  addGuestsAction: (input: unknown) => addGuestsAction(input),
}));

const CREDENTIALS = { phone: '07400 123456', pin: '482916' };
const base = { sessionId: 'abcDEF123456', ...CREDENTIALS };

beforeEach(() => {
  for (const action of [getMyPlaceAction, cancelSeatAction, updateSeatAction, addGuestsAction]) {
    action.mockReset();
  }
});
afterEach(cleanup);

function renderOpen(place: MyPlaceView, onChanged = vi.fn(), view = makeView()) {
  getMyPlaceAction.mockResolvedValue({ ok: true, place });
  render(<ManagePlace view={view} initialCredentials={CREDENTIALS} onChanged={onChanged} />);
  return onChanged;
}

describe('opening the view', () => {
  it('asks for number and PIN, then shows the Seats with their status', async () => {
    getMyPlaceAction.mockResolvedValue({
      ok: true,
      place: makePlace({
        seats: [
          mySeat('h', { position: 16 }),
          mySeat('g', { kind: 'guest', name: 'Gina', tier: 'alumni', state: 'waitlist', position: 3 }),
        ],
      }),
    });
    render(<ManagePlace view={makeView()} initialCredentials={null} onChanged={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Mobile number'), '07400123456');
    await userEvent.type(screen.getByLabelText('PIN'), '482916');
    await userEvent.click(screen.getByRole('button', { name: 'Show my place' }));

    await waitFor(() =>
      expect(getMyPlaceAction).toHaveBeenCalledWith({
        sessionId: 'abcDEF123456',
        phone: expect.stringMatching(/^07400/),
        pin: '482916',
      }),
    );
    expect(await screen.findByText('Playing · #16')).toBeInTheDocument();
    expect(screen.getByText('Waitlist · #3')).toBeInTheDocument();
    expect(screen.getByText('Forgotten your PIN? Ask an organiser to reset it.')).toBeInTheDocument();
  });

  it('opens straight away with the credentials just used to take a place', async () => {
    renderOpen(makePlace());
    expect(await screen.findByText('Playing · #16')).toBeInTheDocument();
    expect(getMyPlaceAction).toHaveBeenCalledTimes(1);
    expect(getMyPlaceAction).toHaveBeenCalledWith(base);
  });

  it('shows a generic failure and stays on the form', async () => {
    getMyPlaceAction.mockResolvedValue({ ok: false, error: 'bad-credentials' });
    render(<ManagePlace view={makeView()} initialCredentials={CREDENTIALS} onChanged={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent("That number and PIN don't match.");
    expect(screen.getByRole('button', { name: 'Show my place' })).toBeInTheDocument();
  });

  it('tells a Player their new PIN is set and shows a hold', async () => {
    renderOpen(makePlace({ pinWasSet: true, holdUntil: '2026-11-28T00:00:00.000Z' }));
    expect(await screen.findByText('Your new PIN is set.')).toBeInTheDocument();
    expect(screen.getByText(/on hold until Sat 28 Nov/)).toBeInTheDocument();
  });

  it('says so when the number has no place in this session', async () => {
    renderOpen(makePlace({ seats: [] }));
    expect(await screen.findByText("You don't have a place in this session.")).toBeInTheDocument();
  });
});

describe('cancelling states the consequence first', () => {
  const kinds: Array<[ConsequenceView, string]> = [
    [{ kind: 'free-before-cutoff', cutoffAt: '2026-11-06T09:00:00.000Z' }, 'Free to cancel until Fri 9:00.'],
    [{ kind: 'free-grace', graceEndsAt: '2026-11-06T12:00:00.000Z' }, 'Free to cancel until Fri 12:00.'],
    [{ kind: 'free-waitlist' }, 'Leaving the waitlist is always free.'],
    [{ kind: 'free-guest-seat' }, 'Removing a guest is free.'],
  ];

  it.each(kinds)('%j is free and uses the ordinary confirm button', async (consequence, text) => {
    renderOpen(makePlace({ seats: [mySeat('h', { consequence })] }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel my place' }));
    const panel = screen.getByRole('group', { name: 'Cancel my place' });
    expect(within(panel).getByText(new RegExp(text.replace(/[.()]/g, '\\$&')))).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Confirm cancellation' })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Cancel anyway' })).not.toBeInTheDocument();
  });

  it('warns about the hold and turns the button to "Cancel anyway"', async () => {
    renderOpen(
      makePlace({
        seats: [
          mySeat('h', {
            consequence: { kind: 'penalty', weeks: 3, endsAt: '2026-11-28T00:00:00.000Z' },
          }),
        ],
      }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel my place' }));
    const panel = screen.getByRole('group', { name: 'Cancel my place' });
    expect(
      within(panel).getByText('Cancelling now puts you on hold for 3 weeks (until Sat 28 Nov).'),
    ).toBeInTheDocument();
    const confirm = within(panel).getByRole('button', { name: 'Cancel anyway' });
    expect(confirm.className).toContain('bg-red-700');
    expect(cancelSeatAction).not.toHaveBeenCalled();
  });

  it('cancels with the exact payload and reports the hold', async () => {
    const onChanged = renderOpen(
      makePlace({
        seats: [
          mySeat('h', {
            consequence: { kind: 'penalty', weeks: 3, endsAt: '2026-11-28T00:00:00.000Z' },
          }),
        ],
      }),
    );
    cancelSeatAction.mockResolvedValue({
      ok: true,
      penalty: { weeks: 3, endsAt: '2026-11-28T00:00:00.000Z' },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel my place' }));
    getMyPlaceAction.mockResolvedValue({ ok: true, place: makePlace({ seats: [] }) });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel anyway' }));

    await waitFor(() => expect(cancelSeatAction).toHaveBeenCalledWith({ ...base, seatId: 'h' }));
    expect(await screen.findByText("Cancelled. You're on hold for 3 weeks (until Sat 28 Nov).")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
    expect(screen.getByText("You don't have a place in this session.")).toBeInTheDocument();
  });

  it('mentions that guests go with a Host seat, and lets the Player keep the place', async () => {
    renderOpen(
      makePlace({
        seats: [mySeat('h'), mySeat('g', { kind: 'guest', name: 'Gina', tier: 'alumni' })],
      }),
    );
    const [cancelHost] = await screen.findAllByRole('button', { name: 'Cancel my place' });
    await userEvent.click(cancelHost);
    expect(screen.getByText('Cancelling your place also cancels your guests.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep my place' }));
    expect(screen.queryByRole('group', { name: 'Cancel my place' })).not.toBeInTheDocument();
    expect(cancelSeatAction).not.toHaveBeenCalled();
  });

  it('removes a guest with its own label', async () => {
    renderOpen(
      makePlace({
        seats: [mySeat('h'), mySeat('g', { kind: 'guest', name: 'Gina', tier: 'alumni' })],
      }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Remove guest' }));
    expect(screen.getByRole('group', { name: 'Remove guest' })).toBeInTheDocument();
  });

  it('shows a failure from the server inside the panel', async () => {
    renderOpen(makePlace());
    cancelSeatAction.mockResolvedValue({ ok: false, error: 'session-closed' });
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel my place' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer taking changes');
  });
});

describe('editing and guests', () => {
  it('saves a new name and Tier', async () => {
    renderOpen(makePlace());
    updateSeatAction.mockResolvedValue({ ok: true });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Alexa');
    await userEvent.click(screen.getByLabelText('Alumni'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateSeatAction).toHaveBeenCalledWith({
        ...base,
        seatId: 'host-1',
        name: 'Alexa',
        tier: 'alumni',
      }),
    );
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
  });

  it('limits a guest to Alumni or External when editing', async () => {
    renderOpen(makePlace({ seats: [mySeat('g', { kind: 'guest', name: 'Gina', tier: 'alumni' })] }));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(screen.queryByLabelText('Employee')).not.toBeInTheDocument();
    expect(screen.getByLabelText('External')).toBeInTheDocument();
  });

  it('adds guests up to what is left', async () => {
    renderOpen(makePlace({ guestsRemaining: 1 }));
    addGuestsAction.mockResolvedValue({ ok: true });
    expect(await screen.findByText('You can add 1 more.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+ Add another guest' }));
    expect(screen.queryByRole('button', { name: '+ Add another guest' })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Guest 1 name'), 'Gina');
    await userEvent.click(screen.getByRole('button', { name: 'Add guests' }));

    await waitFor(() =>
      expect(addGuestsAction).toHaveBeenCalledWith({
        ...base,
        guests: [{ name: 'Gina', tier: 'external' }],
      }),
    );
    expect(await screen.findByText('Guests added.')).toBeInTheDocument();
  });

  it('offers no guest form once the limit is reached', async () => {
    renderOpen(makePlace({ guestsRemaining: 0 }));
    expect(await screen.findByText('You have reached the guest limit for now.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Add another guest' })).not.toBeInTheDocument();
  });
});

describe('a closed Session', () => {
  it('shows the places but offers no changes', async () => {
    const closed = makeView({
      session: { ...makeView().session, registerClosed: true },
    });
    renderOpen(makePlace(), vi.fn(), closed);
    expect(await screen.findByText('Playing · #16')).toBeInTheDocument();
    expect(screen.getByText(/places can't be changed/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel my place' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});

describe('credentials stay in memory', () => {
  it('never touches cookies or web storage, and forgets them when hidden', async () => {
    const cookieSet = vi.spyOn(document, 'cookie', 'set');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    renderOpen(makePlace());
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hide my place' }));

    expect(cookieSet).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(screen.getByLabelText('PIN')).toHaveValue('');
    expect(window.location.href).not.toContain('482916');
    cookieSet.mockRestore();
    setItem.mockRestore();
  });
});
