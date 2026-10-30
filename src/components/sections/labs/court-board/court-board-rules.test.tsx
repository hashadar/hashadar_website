import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CLUB_RULES } from '@/lib/court-board/rules';
import { buildRulesView } from '@/lib/court-board/rules-view';
import { CourtBoardRules } from './court-board-rules';

afterEach(cleanup);

const club = { name: 'Lunchtime Badminton', venue: 'Sports Hall', rules: DEFAULT_CLUB_RULES };
const SESSION = 'abcDEF123456';

function renderRules(rules = DEFAULT_CLUB_RULES) {
  return render(<CourtBoardRules view={buildRulesView({ ...club, rules })} sessionId={SESSION} />);
}

describe('CourtBoardRules with the default rules', () => {
  it('names the club and venue and has one top heading', () => {
    renderRules();
    expect(screen.getByRole('heading', { level: 1, name: 'Club rules' })).toBeInTheDocument();
    expect(screen.getByText(/Lunchtime Badminton runs its sessions at Sports Hall/)).toBeInTheDocument();
  });

  it('states Release, Top-up, guests, Cutoff and Grace period with the real numbers', () => {
    renderRules();
    expect(screen.getByText(/On Thursday at 12:00 \(Release\)/)).toBeInTheDocument();
    expect(screen.getByText(/From Friday at 12:00 \(Top-up\) you can add more than 2 guests/)).toBeInTheDocument();
    expect(screen.getByText(/bring up to 2 guests/)).toBeInTheDocument();
    expect(screen.getByText(/the same time of day as the session starts, the day before/)).toBeInTheDocument();
    expect(screen.getByText(/you get 2 hours to change your mind/)).toBeInTheDocument();
    expect(screen.getByText('Leaving a waitlist is always free, at any time.')).toBeInTheDocument();
  });

  it('lists each hold length and the rule that holds do not add up', () => {
    renderRules();
    const holds = screen.getByRole('heading', { name: 'Being on hold' }).closest('section')!;
    const items = within(holds).getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual([
      'Cancelling a place on the playing list after the cutoff: 3 weeks.',
      'Not turning up: 4 weeks.',
      'You and a guest of yours both not turning up: 6 weeks.',
      'You turn up but a guest of yours does not: 2 weeks.',
    ]);
    expect(within(holds).getByText(/Holds never add up/)).toBeInTheDocument();
    expect(within(holds).getByText(/External band/)).toBeInTheDocument();
    expect(within(holds).getByText(/clear or shorten a hold/)).toBeInTheDocument();
  });

  it('says holds are private and fees are outside the tool', () => {
    renderRules();
    const priv = screen.getByRole('heading', { name: 'Holds are private' }).closest('section')!;
    expect(priv).toHaveTextContent('Only you and the organisers can see who is on hold');
    expect(priv).toHaveTextContent('never shown on the session page');
    expect(screen.getByText(/does not handle fees or payments/)).toBeInTheDocument();
  });

  it('does not mention a guest-only hold when there is none', () => {
    renderRules();
    expect(screen.queryByText(/Cancelling only a guest's place/)).not.toBeInTheDocument();
  });

  it('links to the privacy notice and back to the session', () => {
    renderRules();
    expect(screen.getByRole('link', { name: 'privacy notice' })).toHaveAttribute(
      'href',
      '/labs/court-board/privacy',
    );
    expect(screen.getByRole('link', { name: 'Back to the session' })).toHaveAttribute(
      'href',
      `/labs/court-board/s/${SESSION}`,
    );
  });
});

describe('CourtBoardRules for a Club with different settings', () => {
  const rules = {
    ...DEFAULT_CLUB_RULES,
    release: { weekday: 3, time: '09:30' },
    topUp: { weekday: 0, time: '18:05' },
    cutoffDaysBefore: 2,
    graceMinutes: 45,
    guestLimitBeforeTopUp: 1,
    penaltyWeeks: { lateCancel: 1, noShowHost: 2, noShowHostAndGuest: 3, noShowGuest: 1 },
    guestLateCancelWeeks: 2,
  };

  it('interpolates the Club\'s own numbers, with correct singular and plural wording', () => {
    renderRules(rules);
    expect(screen.getByText(/On Wednesday at 9:30 \(Release\)/)).toBeInTheDocument();
    expect(screen.getByText(/From Sunday at 18:05 \(Top-up\) you can add more than 1 guest to fill/)).toBeInTheDocument();
    expect(screen.getByText(/2 days before \(the cutoff\)/)).toBeInTheDocument();
    expect(screen.getByText(/you get 45 minutes to change your mind/)).toBeInTheDocument();
    const holds = screen.getByRole('heading', { name: 'Being on hold' }).closest('section')!;
    expect(within(holds).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Cancelling a place on the playing list after the cutoff: 1 week.',
      'Not turning up: 2 weeks.',
      'You and a guest of yours both not turning up: 3 weeks.',
      'You turn up but a guest of yours does not: 1 week.',
      "Cancelling only a guest's place after the cutoff: 2 weeks.",
    ]);
  });
});
