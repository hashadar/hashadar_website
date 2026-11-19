import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CfaShell } from '@/components/sections/labs/cfa/cfa-shell';
import { createTestLab } from '@/components/sections/labs/cfa/cfa-test-utils';
import { cfa } from '@/data';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { createMemorySiteAuth } from '@/lib/site-auth';

vi.mock('next/navigation', () => ({
  usePathname: () => '/labs/cfa/practice',
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => cleanup());

describe('CfaShell', () => {
  it('blocks unauthenticated visitors and offers sign-in back to the page', async () => {
    const { lab } = createTestLab();
    render(
      <SiteAuthProvider auth={createMemorySiteAuth()}>
        <CfaShell lab={lab}>
          <p>Private CFA content</p>
        </CfaShell>
      </SiteAuthProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText(cfa.checkingSessionLabel)).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { level: 1, name: cfa.unauthenticatedHeading }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Private CFA content')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: cfa.signInLabel })).toHaveAttribute(
      'href',
      `/login?next=${encodeURIComponent('/labs/cfa/practice')}`,
    );
  });

  it('shows the Lab nav with the current page marked when signed in', async () => {
    const { lab } = createTestLab();
    render(
      <SiteAuthProvider
        auth={createMemorySiteAuth({ status: 'authenticated', email: 'owner@example.com' })}
      >
        <CfaShell lab={lab}>
          <p>Private CFA content</p>
        </CfaShell>
      </SiteAuthProvider>,
    );

    expect(await screen.findByText('Private CFA content')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: cfa.shell.nav.ariaLabel });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });
});
