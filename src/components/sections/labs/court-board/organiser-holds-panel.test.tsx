import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
const actions = vi.hoisted(() => ({
  clearPenaltyAction: vi.fn(),
  shortenPenaltyAction: vi.fn(),
  resetPinAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/court-board/organiser-actions', () => actions);

import { OrganiserHoldsPanel } from '@/components/sections/labs/court-board/organiser-holds-panel';
import { hold, overview } from '@/components/sections/labs/court-board/organiser-test-data';

const identity = { phoneKey: 'pk-alex', sessionId: 'earlierSess1', reason: 'late-cancel' };

beforeEach(() => {
  Object.values(actions).forEach((fn) => fn.mockReset().mockResolvedValue({ ok: true }));
  router.refresh.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('holds', () => {
  it('lists who is on hold, why, and until when', () => {
    render(<OrganiserHoldsPanel overview={overview({ holds: [hold] })} />);
    expect(screen.getByText('Alex · …456', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(/cancelled late · 3 weeks · until Sat 28 Nov/)).toBeInTheDocument();
  });

  it('says so when nobody is on hold', () => {
    render(<OrganiserHoldsPanel overview={overview()} />);
    expect(screen.getByText('Nobody is on hold.')).toBeInTheDocument();
  });

  it('clears a hold', async () => {
    const user = userEvent.setup();
    render(<OrganiserHoldsPanel overview={overview({ holds: [hold] })} />);

    await user.click(screen.getByRole('button', { name: 'Clear hold for Alex' }));

    expect(actions.clearPenaltyAction).toHaveBeenCalledWith(identity);
    expect(router.refresh).toHaveBeenCalled();
  });

  it('shortens a hold to an earlier date, and only offers dates before it ends', async () => {
    const user = userEvent.setup();
    render(<OrganiserHoldsPanel overview={overview({ holds: [hold] })} />);

    await user.click(screen.getByRole('button', { name: 'Shorten hold for Alex' }));
    const date = screen.getByLabelText('New end date');
    expect(date).toHaveAttribute('max', '2026-11-27');
    expect(date).toHaveAttribute('min', '2026-11-07');

    fireEvent.change(date, { target: { value: '2026-11-14' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(actions.shortenPenaltyAction).toHaveBeenCalledWith({ ...identity, endsOn: '2026-11-14' });
    expect(router.refresh).toHaveBeenCalled();
    expect(screen.queryByLabelText('New end date')).not.toBeInTheDocument();
  });

  it('keeps the form open and explains when the server refuses the date', async () => {
    actions.shortenPenaltyAction.mockResolvedValue({
      ok: false,
      error: 'invalid-input',
      field: 'endsOn',
    });
    const user = userEvent.setup();
    render(<OrganiserHoldsPanel overview={overview({ holds: [hold] })} />);
    await user.click(screen.getByRole('button', { name: 'Shorten hold for Alex' }));
    fireEvent.change(screen.getByLabelText('New end date'), { target: { value: '2026-11-14' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pick a date before the hold currently ends.',
    );
    expect(screen.getByLabelText('New end date')).toBeInTheDocument();
  });

  it('cannot save a shortened hold without a date', async () => {
    const user = userEvent.setup();
    render(<OrganiserHoldsPanel overview={overview({ holds: [hold] })} />);
    await user.click(screen.getByRole('button', { name: 'Shorten hold for Alex' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});

describe('Reset a PIN', () => {
  it('picks a Player by name and last three digits, confirms, then resets', async () => {
    const user = userEvent.setup();
    render(<OrganiserHoldsPanel overview={overview()} />);

    const picker = screen.getByRole('combobox', { name: 'Player' });
    expect(within(picker).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Choose a Player',
      'Alex · …456',
      'Bo · …457 (no PIN set)',
    ]);
    expect(screen.getByRole('button', { name: 'Reset PIN' })).toBeDisabled();

    await user.selectOptions(picker, 'pk-alex');
    await user.click(screen.getByRole('button', { name: 'Reset PIN' }));

    const dialog = screen.getByRole('dialog', { name: 'Reset PIN for Alex?' });
    expect(actions.resetPinAction).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Reset PIN' }));

    expect(actions.resetPinAction).toHaveBeenCalledWith({ phoneKey: 'pk-alex' });
    expect(await screen.findByText('PIN reset for Alex.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(picker).toHaveValue('');
  });

  it('does nothing if the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    render(<OrganiserHoldsPanel overview={overview()} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Player' }), 'pk-bo');
    await user.click(screen.getByRole('button', { name: 'Reset PIN' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(actions.resetPinAction).not.toHaveBeenCalled();
  });

  it('reports a failure inside the dialog', async () => {
    actions.resetPinAction.mockResolvedValue({ ok: false, error: 'not-found' });
    const user = userEvent.setup();
    render(<OrganiserHoldsPanel overview={overview()} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Player' }), 'pk-alex');
    await user.click(screen.getByRole('button', { name: 'Reset PIN' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset PIN' }));

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
      "We couldn't find that.",
    );
  });

  it('says so when there are no Players', () => {
    render(<OrganiserHoldsPanel overview={overview({ players: [] })} />);
    expect(screen.getByText('No Players yet.')).toBeInTheDocument();
  });
});
