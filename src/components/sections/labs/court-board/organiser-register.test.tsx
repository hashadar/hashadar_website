import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
const actions = vi.hoisted(() => ({
  setSeatTierAction: vi.fn(),
  setAttendedAction: vi.fn(),
  removeSeatAction: vi.fn(),
  previewCloseRegisterAction: vi.fn(),
  closeRegisterAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/court-board/organiser-actions', () => actions);

import { OrganiserRegister } from '@/components/sections/labs/court-board/organiser-register';
import {
  SESSION_ID,
  seatRow,
  sessionDetail,
  sessionSummary,
} from '@/components/sections/labs/court-board/organiser-test-data';

const STARTED = '2026-11-07T09:30:00.000Z';
const NOT_STARTED = '2026-11-06T18:00:00.000Z';

beforeEach(() => {
  Object.values(actions).forEach((fn) => fn.mockReset().mockResolvedValue({ ok: true }));
  router.refresh.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('register rows', () => {
  it('lists Main-list Seats before the Waitlist, with guests under their Host and the last three digits', () => {
    render(<OrganiserRegister detail={sessionDetail()} now={STARTED} />);

    const playing = screen.getByRole('heading', { name: /Playing/ });
    const waitlist = screen.getByRole('heading', { name: /Waitlist/ });
    expect(playing.compareDocumentPosition(waitlist) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Guest of Alex')).toBeInTheDocument();
    expect(screen.getByText('ends 456')).toBeInTheDocument();
  });

  it('shows an On hold marker for a Penalised Host', () => {
    const detail = sessionDetail({
      rows: [seatRow({ id: 's', name: 'Held', holdUntil: '2026-11-28T00:00:00.000Z' })],
    });
    render(<OrganiserRegister detail={detail} now={STARTED} />);
    expect(screen.getByText('On hold until Sat 28 Nov')).toBeInTheDocument();
  });

  it('gives only Main-list Seats a Here checkbox', () => {
    render(<OrganiserRegister detail={sessionDetail()} now={STARTED} />);
    expect(screen.getByRole('checkbox', { name: 'Here: Alex' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Here: Guy' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Here: Bo' })).not.toBeInTheDocument();
  });
});

describe('Tier and Here', () => {
  it('corrects a Tier through the server action', async () => {
    const user = userEvent.setup();
    render(<OrganiserRegister detail={sessionDetail()} now={STARTED} />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Tier for Alex' }), 'external');

    expect(actions.setSeatTierAction).toHaveBeenCalledWith({
      sessionId: SESSION_ID,
      seatId: 'seat-alex',
      tier: 'external',
    });
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(screen.getByRole('combobox', { name: 'Tier for Alex' })).toHaveValue('external');
  });

  it('offers a guest only Alumni and External', () => {
    render(<OrganiserRegister detail={sessionDetail()} now={STARTED} />);
    const guest = screen.getByRole('combobox', { name: 'Tier for Guy' });
    expect(within(guest).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Alumni',
      'External',
    ]);
    const host = screen.getByRole('combobox', { name: 'Tier for Alex' });
    expect(within(host).getAllByRole('option')).toHaveLength(3);
  });

  it('puts the Tier back and says why when the server refuses', async () => {
    actions.setSeatTierAction.mockResolvedValue({ ok: false, error: 'unauthorised' });
    const user = userEvent.setup();
    render(<OrganiserRegister detail={sessionDetail()} now={STARTED} />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Tier for Alex' }), 'external');

    expect(await screen.findByRole('alert')).toHaveTextContent('Your organiser link is no longer valid.');
    expect(screen.getByRole('combobox', { name: 'Tier for Alex' })).toHaveValue('employee');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('marks a Seat as here, ticking at once', async () => {
    const user = userEvent.setup();
    render(<OrganiserRegister detail={sessionDetail()} now={STARTED} />);
    const box = screen.getByRole('checkbox', { name: 'Here: Alex' });

    await user.click(box);

    expect(box).toBeChecked();
    expect(actions.setAttendedAction).toHaveBeenCalledWith({
      sessionId: SESSION_ID,
      seatId: 'seat-alex',
      attended: true,
    });
  });

  it('unticks again if the server refuses', async () => {
    actions.setAttendedAction.mockResolvedValue({ ok: false, error: 'session-closed' });
    const user = userEvent.setup();
    render(<OrganiserRegister detail={sessionDetail()} now={STARTED} />);
    const box = screen.getByRole('checkbox', { name: 'Here: Alex' });

    await user.click(box);

    await waitFor(() => expect(box).not.toBeChecked());
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer taking changes');
  });
});

describe('removing a Seat', () => {
  it('asks first, then removes it with no hold', async () => {
    const user = userEvent.setup();
    render(<OrganiserRegister detail={sessionDetail()} now={STARTED} />);

    await user.click(screen.getByRole('button', { name: 'Remove Bo' }));
    const dialog = screen.getByRole('dialog', { name: 'Remove Bo?' });
    expect(actions.removeSeatAction).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Remove seat' }));

    expect(actions.removeSeatAction).toHaveBeenCalledWith({ sessionId: SESSION_ID, seatId: 'seat-bo' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the dialog on Escape without removing anything', async () => {
    const user = userEvent.setup();
    render(<OrganiserRegister detail={sessionDetail()} now={STARTED} />);
    await user.click(screen.getByRole('button', { name: 'Remove Bo' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(actions.removeSeatAction).not.toHaveBeenCalled();
  });
});

describe('closing the register', () => {
  it('waits until the Session has started', () => {
    render(<OrganiserRegister detail={sessionDetail()} now={NOT_STARTED} />);
    expect(screen.getByRole('button', { name: 'Close register' })).toBeDisabled();
    expect(screen.getByText(/once the session has started/)).toBeInTheDocument();
  });

  it('previews the counts and who is put on hold before it closes anything', async () => {
    actions.previewCloseRegisterAction.mockResolvedValue({
      ok: true,
      preview: {
        attended: 1,
        noShows: 2,
        penalties: [
          { displayName: 'Alex', reason: 'no-show-host', weeks: 4, endsAt: '2026-12-05T00:00:00.000Z' },
          { displayName: 'Bo', reason: 'no-show-guest', weeks: 2, endsAt: '2026-11-21T00:00:00.000Z' },
        ],
      },
    });
    actions.closeRegisterAction.mockResolvedValue({ ok: true, penalties: 2 });
    const user = userEvent.setup();
    render(<OrganiserRegister detail={sessionDetail()} now={STARTED} />);

    await user.click(screen.getByRole('button', { name: 'Close register' }));

    const dialog = await screen.findByRole('dialog', { name: 'Close the register?' });
    expect(actions.previewCloseRegisterAction).toHaveBeenCalledWith({ sessionId: SESSION_ID });
    expect(actions.closeRegisterAction).not.toHaveBeenCalled();
    expect(within(dialog).getByText('1 here, 2 not here.')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Alex: no-show, on hold for 4 weeks until Sat 5 Dec'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Bo: guest no-show, on hold for 2 weeks until Sat 21 Nov'),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Close register' }));

    expect(actions.closeRegisterAction).toHaveBeenCalledWith({ sessionId: SESSION_ID });
    expect(await screen.findByText('Register closed. 2 put on hold.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
  });

  it('says so when nobody will be put on hold, and can be cancelled', async () => {
    actions.previewCloseRegisterAction.mockResolvedValue({
      ok: true,
      preview: { attended: 3, noShows: 0, penalties: [] },
    });
    const user = userEvent.setup();
    render(<OrganiserRegister detail={sessionDetail()} now={STARTED} />);

    await user.click(screen.getByRole('button', { name: 'Close register' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Nobody will be put on hold.')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(actions.closeRegisterAction).not.toHaveBeenCalled();
  });

  it('shows a refusal instead of a dialog', async () => {
    actions.previewCloseRegisterAction.mockResolvedValue({ ok: false, error: 'session-closed' });
    const user = userEvent.setup();
    render(<OrganiserRegister detail={sessionDetail()} now={STARTED} />);
    await user.click(screen.getByRole('button', { name: 'Close register' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer taking changes');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('a finished Session', () => {
  it('freezes every control once the register is closed', () => {
    const detail = sessionDetail({ session: sessionSummary({ registerClosed: true }) });
    render(<OrganiserRegister detail={detail} now={STARTED} />);

    expect(screen.getByText('The register is closed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close register' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Tier for Alex' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Here: Alex' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Alex' })).toBeDisabled();
  });

  it('has no register for a cancelled Session', () => {
    const detail = sessionDetail({ session: sessionSummary({ status: 'cancelled' }) });
    render(<OrganiserRegister detail={detail} now={STARTED} />);
    expect(screen.getByText('A cancelled session has no register.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close register' })).toBeDisabled();
  });
});
