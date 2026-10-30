import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MyPlaceView, Outcome } from '@/lib/court-board/views';
import { CourtBoardLanding } from './court-board-landing';
import { ManagePlace } from './manage-place';
import { SessionPage } from './session-page';
import { SignupForm } from './signup-form';
import { makePlace, makeView, mySeat } from './view-fixtures';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const getMyPlaceAction = vi.fn<(input: unknown) => Promise<Outcome<{ place: MyPlaceView }>>>();
vi.mock('@/lib/court-board/player-actions', () => ({
  signUpAction: vi.fn(),
  getMyPlaceAction: (input: unknown) => getMyPlaceAction(input),
  cancelSeatAction: vi.fn(),
  updateSeatAction: vi.fn(),
  addGuestsAction: vi.fn(),
}));

afterEach(cleanup);

const RULES = '/labs/court-board/s/abcDEF123456/rules';
const PRIVACY = '/labs/court-board/privacy';

describe('the implied agreement under the signup button', () => {
  it('says what taking a place means and links to the rules and the privacy notice', () => {
    render(<SignupForm view={makeView()} onSignedUp={vi.fn()} />);
    const sentence = screen.getByText(/By taking a place you agree to the/);
    expect(sentence).toHaveTextContent(
      'By taking a place you agree to the club rules and confirm you have read the privacy notice.',
    );
    expect(within(sentence).getByRole('link', { name: 'club rules' })).toHaveAttribute('href', RULES);
    expect(within(sentence).getByRole('link', { name: 'privacy notice' })).toHaveAttribute(
      'href',
      PRIVACY,
    );
  });

  it('comes after the submit button, and is not a tick box', () => {
    render(<SignupForm view={makeView()} onSignedUp={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Take a place' });
    const sentence = screen.getByText(/By taking a place you agree to the/);
    expect(button.compareDocumentPosition(sentence) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

describe('footer links on the Session page', () => {
  it('links to the Club rules and the privacy notice', () => {
    render(<SessionPage view={makeView()} />);
    const nav = screen.getByRole('navigation', { name: 'Club rules' });
    expect(within(nav).getByRole('link', { name: 'Club rules' })).toHaveAttribute('href', RULES);
    expect(within(nav).getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', PRIVACY);
  });
});

describe('the rules link beside what cancelling costs', () => {
  it('appears in the cancel panel next to the consequence', async () => {
    getMyPlaceAction.mockResolvedValue({
      ok: true,
      place: makePlace({
        seats: [
          mySeat('h', {
            consequence: { kind: 'penalty', weeks: 3, endsAt: '2026-11-28T00:00:00.000Z' },
          }),
        ],
      }),
    });
    render(
      <ManagePlace
        view={makeView()}
        initialCredentials={{ phone: '07400 123456', pin: '482916' }}
        onChanged={vi.fn()}
      />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel my place' }));
    const panel = screen.getByRole('group', { name: 'Cancel my place' });
    expect(within(panel).getByText(/puts you on hold for 3 weeks/)).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'See the club rules' })).toHaveAttribute(
      'href',
      RULES,
    );
  });
});

describe('the landing page', () => {
  it('links to the privacy notice', () => {
    render(<CourtBoardLanding devInfo={null} />);
    expect(screen.getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', PRIVACY);
  });
});
