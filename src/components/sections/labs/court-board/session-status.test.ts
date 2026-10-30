import { describe, expect, it } from 'vitest';
import { consequenceText } from './consequence';
import { describeFailure } from './error-message';
import { fillTemplate } from './fill-template';
import { statusSentences } from './session-status';
import { makeView } from './view-fixtures';

describe('statusSentences', () => {
  it('before Release names Release and the Cutoff, and the guest cap lift', () => {
    expect(statusSentences(makeView())).toEqual([
      'Waitlists move up Thu 12:00. Free cancellation until Fri 9:00.',
      'From Fri 12:00 you can add more than 2 guests.',
    ]);
  });

  it('after Release drops the Release sentence', () => {
    const view = makeView({ released: true, now: '2026-11-05T13:00:00.000Z' });
    expect(statusSentences(view)[0]).toBe('Free cancellation until Fri 9:00.');
  });

  it('after the Cutoff says free cancellation has ended', () => {
    const view = makeView({ released: true, now: '2026-11-06T10:00:00.000Z' });
    expect(statusSentences(view)[0]).toMatch(/^Free cancellation has ended/);
  });

  it('after Top-up has no guest-cap sentence', () => {
    const view = makeView({
      released: true,
      guestLimit: null,
      now: '2026-11-06T13:00:00.000Z',
    });
    expect(statusSentences(view)).toHaveLength(1);
  });

  it('says so once the Session has started, and for cancelled or closed ones', () => {
    expect(
      statusSentences(makeView({ released: true, now: '2026-11-07T09:30:00.000Z' }))[0],
    ).toMatch(/has started/);
    const base = makeView().session;
    expect(
      statusSentences(makeView({ session: { ...base, status: 'cancelled' } })),
    ).toEqual(['This session has been cancelled.']);
    expect(
      statusSentences(makeView({ session: { ...base, registerClosed: true } })),
    ).toEqual(['The register for this session is closed.']);
  });
});

describe('consequenceText', () => {
  it('states each consequence before the Player confirms', () => {
    expect(
      consequenceText({ kind: 'free-before-cutoff', cutoffAt: '2026-11-06T09:00:00.000Z' }),
    ).toBe('Free to cancel until Fri 9:00.');
    expect(
      consequenceText({ kind: 'free-grace', graceEndsAt: '2026-11-06T12:00:00.000Z' }),
    ).toBe('Free to cancel until Fri 12:00. You moved up after the cutoff.');
    expect(consequenceText({ kind: 'free-waitlist' })).toBe(
      'Leaving the waitlist is always free.',
    );
    expect(consequenceText({ kind: 'free-guest-seat' })).toBe('Removing a guest is free.');
    expect(
      consequenceText({ kind: 'penalty', weeks: 3, endsAt: '2026-11-28T00:00:00.000Z' }),
    ).toBe('Cancelling now puts you on hold for 3 weeks (until Sat 28 Nov).');
  });

  it('uses the singular for one week', () => {
    expect(
      consequenceText({ kind: 'penalty', weeks: 1, endsAt: '2026-11-14T00:00:00.000Z' }),
    ).toContain('for 1 week (until');
  });
});

describe('describeFailure', () => {
  it('prefers the field message for invalid input', () => {
    expect(describeFailure({ ok: false, error: 'invalid-input', field: 'name' })).toBe(
      'Enter a name of up to 40 characters.',
    );
  });

  it('falls back to the code message, then the generic one', () => {
    expect(describeFailure({ ok: false, error: 'invalid-input' })).toBe(
      'Check the details and try again.',
    );
    expect(describeFailure({ ok: false, error: 'bad-credentials' })).toBe(
      "That number and PIN don't match.",
    );
  });

  it('fills the lockout minutes, rounding up', () => {
    expect(
      describeFailure({ ok: false, error: 'locked', retryAfterSeconds: 901 }),
    ).toBe('Too many wrong attempts. Try again in 16 min.');
  });
});

describe('fillTemplate', () => {
  it('leaves unknown placeholders as written', () => {
    expect(fillTemplate('{a} and {b}', { a: 1 })).toBe('1 and {b}');
  });
});
