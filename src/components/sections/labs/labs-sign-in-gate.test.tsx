import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  LabsSessionChecking,
  LabsSignInGate,
} from '@/components/sections/labs/labs-sign-in-gate';

afterEach(() => {
  cleanup();
});

describe('LabsSignInGate', () => {
  it('renders a quiet dense gate with login next path', () => {
    render(
      <LabsSignInGate
        heading="Sign in to open Job OS"
        description="Job OS is a private application tracker. Sign in with your invited account to continue."
        signInLabel="Owner sign in"
        nextPath="/labs/job-os"
      />,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Sign in to open Job OS',
      }),
    ).toHaveClass('text-2xl');
    expect(
      screen.getByRole('link', { name: 'Owner sign in' }),
    ).toHaveAttribute(
      'href',
      `/login?next=${encodeURIComponent('/labs/job-os')}`,
    );
    expect(screen.getByRole('link', { name: 'Owner sign in' })).toHaveClass(
      'text-sm',
    );
  });
});

describe('LabsSessionChecking', () => {
  it('shows the checking label', () => {
    render(<LabsSessionChecking label="Checking session…" />);
    expect(screen.getByText('Checking session…')).toBeInTheDocument();
  });
});
