import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionPage } from './session-page';
import { makeView, row } from './view-fixtures';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/court-board/player-actions', () => ({
  signUpAction: vi.fn(),
  getMyPlaceAction: vi.fn(),
  cancelSeatAction: vi.fn(),
  updateSeatAction: vi.fn(),
  addGuestsAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  refresh.mockReset();
});

describe('SessionPage header and status', () => {
  it('shows the club, date, time and venue', () => {
    render(<SessionPage view={makeView()} />);
    expect(screen.getByText('Test Badminton Club')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Sat 7 Nov' })).toBeInTheDocument();
    expect(screen.getByText(/9:00–11:00/)).toHaveTextContent('Sports Hall');
  });

  it('shows a real progress bar for places taken', () => {
    render(<SessionPage view={makeView({ taken: 22 })} />);
    expect(screen.getByText('22 of 25 places taken')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Places taken' });
    expect(bar).toHaveAttribute('aria-valuenow', '22');
    expect(bar).toHaveAttribute('aria-valuemax', '25');
    expect(bar.firstElementChild).toHaveStyle({ width: '88%' });
    expect(bar.firstElementChild?.className).toContain('motion-reduce:transition-none');
  });

  it('says what happens next before Release', () => {
    render(<SessionPage view={makeView()} />);
    expect(
      screen.getByText('Waitlists move up Thu 12:00. Free cancellation until Fri 9:00.'),
    ).toBeInTheDocument();
  });

  it('says what happens next after Release', () => {
    render(<SessionPage view={makeView({ released: true, now: '2026-11-05T13:00:00.000Z' })} />);
    expect(screen.getByText('Free cancellation until Fri 9:00.')).toBeInTheDocument();
    expect(screen.queryByText(/Waitlists move up/)).not.toBeInTheDocument();
  });
});

describe('SessionPage lists', () => {
  const view = makeView({
    taken: 3,
    playing: [
      row('a', 'Alex'),
      row('b', 'Bo'),
      row('g', 'Gina', { kind: 'guest', hostName: 'Alex' }),
    ],
    waitlists: [
      { band: 'employee', rows: [] },
      { band: 'alumni', rows: [row('c', 'Cy')] },
      { band: 'external', rows: [row('d', 'Di'), row('e', 'Ed')] },
    ],
  });

  it('numbers the players by name, labels guests, and never shows who is on hold', () => {
    render(<SessionPage view={view} />);
    const playing = screen.getByRole('region', { name: 'Playing · 3' });
    const items = within(playing).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('1.Alex');
    expect(items[1]).toHaveTextContent('2.Bo');
    expect(playing).not.toHaveTextContent(/on hold/i);
    expect(items[2]).toHaveTextContent("3.Alex's guest: Gina");
  });

  it('shows per-band Waitlists before Release and hides empty ones', () => {
    render(<SessionPage view={view} />);
    expect(screen.getByRole('heading', { name: 'Alumni waitlist · 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'External waitlist · 2' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Employee waitlist/ })).not.toBeInTheDocument();
  });

  it('shows one combined Waitlist after Release', () => {
    render(
      <SessionPage
        view={makeView({
          released: true,
          waitlists: [{ band: null, rows: [row('c', 'Cy'), row('d', 'Di')] }],
        })}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Waitlist · 2' })).toBeInTheDocument();
  });

  it('exposes names only: no phone numbers, tiers or ids in the text', () => {
    const { container } = render(<SessionPage view={view} />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\+?\d{7,}/);
    expect(text).not.toMatch(/phoneKey|pinHash/);
  });

  it('invites the first signup when nobody is playing', () => {
    render(<SessionPage view={makeView()} />);
    expect(screen.getByText('Nobody yet. Be the first to take a place.')).toBeInTheDocument();
  });
});

describe('SessionPage when not taking signups', () => {
  it('shows the cancelled notice and no signup form', () => {
    const base = makeView().session;
    render(
      <SessionPage
        view={makeView({ session: { ...base, status: 'cancelled' }, openForSignup: false })}
      />,
    );
    expect(screen.getByText('This session has been cancelled.')).toBeInTheDocument();
    expect(screen.getByText('Signups are closed for this session.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Take a place' })).not.toBeInTheDocument();
  });
});

describe('SessionPage Manage my place', () => {
  it('puts the signup form first and keeps Manage collapsed until asked', async () => {
    render(<SessionPage view={makeView()} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings[0]).toBe('Take a place');

    const toggle = screen.getByRole('button', { name: 'Manage my place' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText('Forgotten your PIN? Ask an organiser to reset it.'),
    ).toBeVisible();
  });
});
