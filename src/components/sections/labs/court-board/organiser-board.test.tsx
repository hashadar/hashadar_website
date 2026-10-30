import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
const actions = vi.hoisted(() => ({
  cancelSessionAction: vi.fn(),
  createSessionAction: vi.fn(),
  rotateLinkAction: vi.fn(),
  removeSeatAction: vi.fn(),
  setSeatTierAction: vi.fn(),
  setAttendedAction: vi.fn(),
  previewCloseRegisterAction: vi.fn(),
  closeRegisterAction: vi.fn(),
  clearPenaltyAction: vi.fn(),
  shortenPenaltyAction: vi.fn(),
  resetPinAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/court-board/organiser-actions', () => actions);

import { OrganiserBoard } from '@/components/sections/labs/court-board/organiser-board';
import {
  SESSION_ID,
  hold,
  overview,
  sessionSummary,
} from '@/components/sections/labs/court-board/organiser-test-data';

beforeEach(() => {
  Object.values(actions).forEach((fn) => fn.mockReset().mockResolvedValue({ ok: true }));
  router.refresh.mockReset();
  router.push.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** user-event installs its own clipboard on setup(), so spy on that one. */
function setupUser() {
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  return { user, writeText };
}

describe('header, picker and tabs', () => {
  it('says the link is private and names the club', () => {
    render(<OrganiserBoard overview={overview()} />);
    expect(screen.getByText('Organiser · keep this link private')).toBeInTheDocument();
    expect(screen.getByText('Test Badminton Club')).toBeInTheDocument();
  });

  it('lists Sessions as links that reload the page for that Session', () => {
    render(
      <OrganiserBoard
        overview={overview({
          sessions: [
            sessionSummary(),
            sessionSummary({ id: 'otherSess123', localDate: '2026-11-14', status: 'cancelled' }),
          ],
        })}
      />,
    );
    const picker = screen.getByRole('navigation', { name: 'Sessions' });
    const links = within(picker).getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', `/labs/court-board/o?session=${SESSION_ID}`);
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(links[1]).toHaveAttribute('href', '/labs/court-board/o?session=otherSess123');
    expect(links[1]).toHaveTextContent('cancelled');
  });

  it('shows one tab panel at a time with proper tab semantics', async () => {
    const user = userEvent.setup();
    render(<OrganiserBoard overview={overview({ holds: [hold] })} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Current session', 'On hold (1)', 'New session']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Current session' })).toBeVisible();
    expect(screen.queryByRole('tabpanel', { name: /On hold/ })).not.toBeInTheDocument();

    await user.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel', { name: /On hold/ })).toBeVisible();
    expect(screen.queryByRole('tabpanel', { name: 'Current session' })).not.toBeInTheDocument();
  });

  it('moves between tabs with the arrow keys, Home and End', async () => {
    const user = userEvent.setup();
    render(<OrganiserBoard overview={overview()} />);
    const [current, holds, newSession] = screen.getAllByRole('tab');

    current.focus();
    await user.keyboard('{ArrowRight}');
    expect(holds).toHaveFocus();
    expect(holds).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(newSession).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(current).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(newSession).toHaveFocus();
    await user.keyboard('{Home}');
    expect(current).toHaveFocus();
    expect(current).toHaveAttribute('tabindex', '0');
    expect(holds).toHaveAttribute('tabindex', '-1');
  });
});

describe('copying for WhatsApp', () => {
  it('copies the list text and confirms it', async () => {
    const { user, writeText } = setupUser();
    render(<OrganiserBoard overview={overview()} />);

    await user.click(screen.getByRole('button', { name: 'Copy list for WhatsApp' }));

    expect(writeText).toHaveBeenCalledWith('*Sat 7 Nov · 9:00–11:00 · Sports Hall*\nPlaying (2/25)');
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('copies the signup link for this site', async () => {
    const { user, writeText } = setupUser();
    render(<OrganiserBoard overview={overview()} />);

    await user.click(screen.getByRole('button', { name: 'Copy signup link' }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/labs/court-board/s/${SESSION_ID}`);
  });

  it('falls back to the old copy command, and says so if that fails too', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    document.execCommand = vi.fn().mockReturnValue(false);
    render(<OrganiserBoard overview={overview()} />);

    await user.click(screen.getByRole('button', { name: 'Copy list for WhatsApp' }));

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(await screen.findByText(/Couldn't copy/)).toBeInTheDocument();
  });
});

describe('new session by copying', () => {
  it('moves to the New session tab with date, time, venue and places prefilled a week on', async () => {
    const user = userEvent.setup();
    render(<OrganiserBoard overview={overview()} />);

    await user.click(screen.getByRole('button', { name: 'New session: copy this one to Sat 14 Nov' }));

    expect(screen.getByRole('tab', { name: 'New session' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-14');
    expect(screen.getByLabelText('Start')).toHaveValue('09:00');
    expect(screen.getByLabelText('End')).toHaveValue('11:00');
    expect(screen.getByLabelText('Venue')).toHaveValue('Sports Hall');
    expect(screen.getByLabelText('Places')).toHaveValue(25);
    expect(screen.getByText(/Copied from the current session/)).toBeInTheDocument();
  });

  it('creates the Session and opens it', async () => {
    actions.createSessionAction.mockResolvedValue({ ok: true, sessionId: 'newSession123' });
    const user = userEvent.setup();
    render(<OrganiserBoard overview={overview()} />);
    await user.click(screen.getByRole('button', { name: /copy this one to/ }));

    fireEvent.change(screen.getByLabelText('Venue'), { target: { value: 'Main Hall' } });
    fireEvent.change(screen.getByLabelText('Places'), { target: { value: '20' } });
    await user.click(screen.getByRole('button', { name: 'Create session' }));

    expect(actions.createSessionAction).toHaveBeenCalledWith({
      localDate: '2026-11-14',
      startTime: '09:00',
      endTime: '11:00',
      venue: 'Main Hall',
      capacity: 20,
    });
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/labs/court-board/o?session=newSession123'),
    );
    expect(screen.getByRole('tab', { name: 'Current session' })).toHaveAttribute('aria-selected', 'true');
  });

  it('catches mistakes before asking the server', async () => {
    const user = userEvent.setup();
    render(<OrganiserBoard overview={overview()} />);
    await user.click(screen.getByRole('tab', { name: 'New session' }));

    fireEvent.change(screen.getByLabelText('Venue'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Places'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '08:00' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Create session' }));

    expect(actions.createSessionAction).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a valid date.')).toBeInTheDocument();
    expect(screen.getByText('The end time must be after the start.')).toBeInTheDocument();
    expect(screen.getByText('Enter a venue.')).toBeInTheDocument();
    expect(screen.getByText('Capacity must be a whole number from 1 to 200.')).toBeInTheDocument();
    expect(screen.getByLabelText('Venue')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the server\'s complaint against the field it names', async () => {
    actions.createSessionAction.mockResolvedValue({ ok: false, error: 'invalid-input', field: 'venue' });
    const user = userEvent.setup();
    render(<OrganiserBoard overview={overview()} />);
    await user.click(screen.getByRole('tab', { name: 'New session' }));

    await user.click(screen.getByRole('button', { name: 'Create session' }));

    expect(await screen.findByText('Enter a venue.')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('tells an Organiser whose link was rotated away that it is no longer valid', async () => {
    actions.createSessionAction.mockResolvedValue({ ok: false, error: 'unauthorised' });
    const user = userEvent.setup();
    render(<OrganiserBoard overview={overview()} />);
    await user.click(screen.getByRole('tab', { name: 'New session' }));

    await user.click(screen.getByRole('button', { name: 'Create session' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Your organiser link is no longer valid.');
  });
});

describe('a Club with no Sessions yet', () => {
  it('invites the first one, prefilled with the Club\'s defaults', async () => {
    const user = userEvent.setup();
    render(<OrganiserBoard overview={overview({ sessions: [], selected: null })} />);

    expect(screen.getByText('There are no sessions yet. Create the first one.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New session' }));

    expect(screen.getByRole('tab', { name: 'New session' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-14');
    expect(screen.getByText(/Sessions open for signups straight away/)).toBeInTheDocument();
  });
});

describe('cancelling a Session', () => {
  it('asks first, then cancels', async () => {
    const user = userEvent.setup();
    render(<OrganiserBoard overview={overview()} />);

    await user.click(screen.getByRole('button', { name: 'Cancel session' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel this session?' });
    expect(actions.cancelSessionAction).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/Nobody will be put on hold/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel session' }));

    expect(actions.cancelSessionAction).toHaveBeenCalledWith({ sessionId: SESSION_ID });
    expect(router.refresh).toHaveBeenCalled();
  });

  it('is not offered for a Session that is already cancelled', () => {
    const base = overview();
    render(
      <OrganiserBoard
        overview={{
          ...base,
          selected: { ...base.selected!, session: sessionSummary({ status: 'cancelled' }) },
        }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Cancel session' })).not.toBeInTheDocument();
    expect(screen.getByText(/This session has been cancelled/)).toBeInTheDocument();
  });
});

describe('rotating the Organiser link', () => {
  it('shows the new link once, with a warning, and not again', async () => {
    actions.rotateLinkAction.mockResolvedValue({ ok: true, link: '/labs/court-board/o/brand-new-token' });
    const { user, writeText } = setupUser();
    render(<OrganiserBoard overview={overview()} />);

    await user.click(screen.getByRole('button', { name: 'Rotate organiser link' }));
    const dialog = screen.getByRole('dialog', { name: 'Replace the organiser link?' });
    expect(actions.rotateLinkAction).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Rotate link' }));

    const link = `${window.location.origin}/labs/court-board/o/brand-new-token`;
    expect(await screen.findByText(link)).toBeInTheDocument();
    expect(screen.getByText(/old link has stopped working/)).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Copy new link' }));
    expect(writeText).toHaveBeenCalledWith(link);

    await user.click(screen.getByRole('button', { name: "I've saved it" }));
    expect(screen.queryByText(link)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rotate organiser link' })).toBeInTheDocument();
  });

  it('keeps the old link on screen as the only link when rotation fails', async () => {
    actions.rotateLinkAction.mockResolvedValue({ ok: false, error: 'unauthorised' });
    const user = userEvent.setup();
    render(<OrganiserBoard overview={overview()} />);

    await user.click(screen.getByRole('button', { name: 'Rotate organiser link' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Rotate link' }),
    );

    expect(await screen.findByText('Your organiser link is no longer valid.')).toBeInTheDocument();
    expect(screen.queryByText(/brand-new-token/)).not.toBeInTheDocument();
  });
});
