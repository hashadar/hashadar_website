import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { footer } from '@/data';
import { CourtBoardPrivacy } from './court-board-privacy';

afterEach(cleanup);

describe('CourtBoardPrivacy', () => {
  it('has one top heading, a last-updated date and short section headings', () => {
    const { container } = render(<CourtBoardPrivacy />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy notice' })).toBeInTheDocument();
    expect(screen.getByText('Last updated: 30 October 2026')).toBeInTheDocument();
    for (const heading of [
      'Who is responsible',
      'What is collected',
      'Why it is used',
      'Who sees what',
      'Who handles the data',
      'Cookies',
      'How long it is kept',
      'Your rights',
      'Automatic decisions',
      'Children',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
    }
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it('gives LinkedIn as the contact and publishes no email address', () => {
    const { container } = render(<CourtBoardPrivacy />);
    const link = screen.getByRole('link', { name: 'message Hasha Dar on LinkedIn' });
    expect(link).toHaveAttribute('href', footer.contact.social.linkedin);
    expect(container.textContent).not.toMatch(/@/);
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('states the retention periods', () => {
    render(<CourtBoardPrivacy />);
    const kept = screen.getByRole('heading', { name: 'How long it is kept' }).closest('section')!;
    const items = within(kept).getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual([
      'Places you took: deleted 8 weeks after the session.',
      'Your remembered name, Tier and PIN: deleted 12 months after you last took a place.',
      'Holds: deleted when they end.',
      'Wrong-PIN and spam-limit records: within a couple of days.',
    ]);
  });

  it('says holds are never public and nobody can read the number or PIN', () => {
    render(<CourtBoardPrivacy />);
    const who = screen.getByRole('heading', { name: 'Who sees what' }).closest('section')!;
    expect(who).toHaveTextContent('Holds are never shown publicly: only you and the organisers can see them.');
    expect(who).toHaveTextContent('Your full number and your PIN are never stored in readable form, so nobody can look them up, including the person who runs the site.');
    expect(who).toHaveTextContent('Your name is visible to anyone with the session link.');
  });

  it('explains the basis, processors, cookies, rights and the ICO', () => {
    const { container } = render(<CourtBoardPrivacy />);
    const text = container.textContent ?? '';
    expect(text).toContain('legitimate interests');
    expect(text).toContain('not consent');
    expect(text).toContain('Amazon Web Services in the London region');
    expect(text).toContain('Players do not get any cookies');
    expect(text).toContain('strictly necessary');
    expect(text).toContain('deleted, or object');
    expect(text).toContain("Information Commissioner's Office at ico.org.uk");
    expect(text).toContain('not designed for children');
  });
});
