import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginSection } from '@/components/sections/login/login-section';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { login } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';

const replace = vi.fn();
const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
  replace.mockClear();
  push.mockClear();
});

function renderLogin(auth = createMemorySiteAuth()) {
  return render(
    <SiteAuthProvider auth={auth}>
      <LoginSection />
    </SiteAuthProvider>,
  );
}

describe('LoginSection', () => {
  it('shows the sign-in form without registration copy when unauthenticated', async () => {
    renderLogin();

    expect(await screen.findByRole('heading', { name: login.heading })).toBeInTheDocument();
    expect(screen.getByLabelText(login.emailLabel)).toBeInTheDocument();
    expect(screen.getByLabelText(login.passwordLabel)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: login.submitLabel })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: login.signOutLabel })).not.toBeInTheDocument();
    expect(screen.queryByText(/create account|register|sign up/i)).not.toBeInTheDocument();
  });

  it('shows signed-in state and sign-out after a successful sign-in', async () => {
    const user = userEvent.setup();
    const auth = createMemorySiteAuth();
    renderLogin(auth);

    await user.type(await screen.findByLabelText(login.emailLabel), 'owner@example.com');
    await user.type(screen.getByLabelText(login.passwordLabel), 'secret');
    await user.click(screen.getByRole('button', { name: login.submitLabel }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/admin');
    });
  });

  it('returns to the sign-in form after sign-out', async () => {
    const user = userEvent.setup();
    const auth = createMemorySiteAuth({
      status: 'authenticated',
      email: 'owner@example.com',
    });
    renderLogin(auth);

    await user.click(await screen.findByRole('button', { name: login.signOutLabel }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/');
    });
  });
});
