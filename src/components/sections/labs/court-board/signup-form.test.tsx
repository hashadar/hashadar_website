import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Outcome, SignUpResult } from '@/lib/court-board/views';
import { SignupForm } from './signup-form';
import { makeView } from './view-fixtures';

const signUpAction = vi.fn<(input: unknown) => Promise<Outcome<SignUpResult>>>();
vi.mock('@/lib/court-board/player-actions', () => ({
  signUpAction: (input: unknown) => signUpAction(input),
}));

beforeEach(() => {
  signUpAction.mockReset();
});
afterEach(cleanup);

async function fillIn({ guests = 0 }: { guests?: number } = {}) {
  await userEvent.type(screen.getByLabelText('Name'), 'Alex');
  await userEvent.type(screen.getByLabelText('Mobile number'), '07400123456');
  await userEvent.type(screen.getByLabelText('PIN'), '482916');
  await userEvent.click(screen.getByLabelText('Employee'));
  for (let i = 1; i <= guests; i++) {
    await userEvent.click(screen.getByRole('button', { name: '+ Add another guest' }));
    await userEvent.type(screen.getByLabelText(`Guest ${i} name`), `Gina ${i}`);
    await userEvent.selectOptions(screen.getByLabelText(`Guest ${i} is`), 'alumni');
  }
}

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Take a place' }));

describe('SignupForm', () => {
  it('shows the helper copy from the brief', () => {
    render(<SignupForm view={makeView()} onSignedUp={vi.fn()} />);
    expect(
      screen.getByText("First time? Choose one. You'll use it to cancel from any device."),
    ).toBeInTheDocument();
    expect(screen.getByText('On trust. Remembered next time.')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'I am' })).toBeInTheDocument();
  });

  it('submits exactly the payload the server expects, honeypot included', async () => {
    signUpAction.mockResolvedValue({ ok: true, seatId: 's1', state: 'main', position: 3, pinWasSet: true });
    const onSignedUp = vi.fn();
    render(<SignupForm view={makeView()} onSignedUp={onSignedUp} />);
    await fillIn({ guests: 1 });
    await submit();

    await waitFor(() => expect(signUpAction).toHaveBeenCalledTimes(1));
    expect(signUpAction).toHaveBeenCalledWith({
      sessionId: 'abcDEF123456',
      name: 'Alex',
      phone: expect.stringMatching(/^07400 ?123 ?456$/),
      pin: '482916',
      tier: 'employee',
      guests: [{ name: 'Gina 1', tier: 'alumni' }],
      website: '',
    });
    expect(onSignedUp).toHaveBeenCalledWith({
      phone: expect.stringMatching(/^07400/),
      pin: '482916',
    });
  });

  it('keeps the honeypot out of reach and sends whatever fills it', async () => {
    signUpAction.mockResolvedValue({ ok: false, error: 'rejected' });
    const { container } = render(<SignupForm view={makeView()} onSignedUp={vi.fn()} />);
    const trap = container.querySelector('input[name="website"]') as HTMLInputElement;
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(trap).toHaveAttribute('tabindex', '-1');
    expect(trap).toHaveAttribute('autocomplete', 'off');

    await fillIn();
    fireEvent.change(trap, { target: { value: 'spam' } });
    await submit();
    await waitFor(() => expect(signUpAction).toHaveBeenCalled());
    expect(signUpAction.mock.calls[0][0]).toMatchObject({ website: 'spam' });
  });

  it('disables the button while pending and ignores a double tap', async () => {
    let finish!: (value: Outcome<SignUpResult>) => void;
    signUpAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<SignupForm view={makeView()} onSignedUp={vi.fn()} />);
    await fillIn();
    const button = screen.getByRole('button', { name: 'Take a place' });
    fireEvent.submit(button.closest('form')!);
    fireEvent.submit(button.closest('form')!);

    const pending = await screen.findByRole('button', { name: 'Taking your place…' });
    expect(pending).toBeDisabled();
    expect(signUpAction).toHaveBeenCalledTimes(1);

    finish({ ok: true, seatId: 's', state: 'waitlist', position: 2, pinWasSet: false });
    expect(await screen.findByText("You're on the waitlist, number 2.")).toBeInTheDocument();
  });

  it('says where the Player landed and whether the PIN was set', async () => {
    signUpAction.mockResolvedValue({ ok: true, seatId: 's', state: 'main', position: 16, pinWasSet: true });
    render(<SignupForm view={makeView()} onSignedUp={vi.fn()} />);
    await fillIn();
    await submit();
    expect(await screen.findByText("You're playing, number 16.")).toBeInTheDocument();
    expect(screen.getByText(/Your PIN is set/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign up someone else' })).toBeInTheDocument();
  });

  it('maps failures to plain messages and keeps what was typed', async () => {
    signUpAction.mockResolvedValue({ ok: false, error: 'bad-credentials' });
    render(<SignupForm view={makeView()} onSignedUp={vi.fn()} />);
    await fillIn();
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent("That number and PIN don't match.");
    expect(screen.getByLabelText('Name')).toHaveValue('Alex');
    expect(screen.getByRole('button', { name: 'Take a place' })).toBeEnabled();
  });

  it('names the field at fault', async () => {
    signUpAction.mockResolvedValue({ ok: false, error: 'invalid-input', field: 'guests' });
    render(<SignupForm view={makeView()} onSignedUp={vi.fn()} />);
    await fillIn();
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent("Check your guests' names and tiers.");
  });

  it('survives the action throwing', async () => {
    signUpAction.mockRejectedValue(new Error('network'));
    render(<SignupForm view={makeView()} onSignedUp={vi.fn()} />);
    await fillIn();
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('stops offering guests at the limit before Top-up', async () => {
    render(<SignupForm view={makeView({ guestLimit: 2 })} onSignedUp={vi.fn()} />);
    expect(screen.getByText(/Up to 2 guests until Fri 12:00/)).toBeInTheDocument();
    const add = () => screen.queryByRole('button', { name: '+ Add another guest' });
    await userEvent.click(add()!);
    await userEvent.click(add()!);
    expect(screen.getAllByLabelText(/Guest \d name/)).toHaveLength(2);
    expect(add()).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove guest 2' }));
    expect(add()).toBeInTheDocument();
  });

  it('has no guest limit from Top-up', async () => {
    render(<SignupForm view={makeView({ guestLimit: null })} onSignedUp={vi.fn()} />);
    expect(screen.getByText('Bring as many guests as you like.')).toBeInTheDocument();
    for (let i = 0; i < 5; i++) {
      await userEvent.click(screen.getByRole('button', { name: '+ Add another guest' }));
    }
    expect(screen.getAllByLabelText(/Guest \d name/)).toHaveLength(5);
  });
});
