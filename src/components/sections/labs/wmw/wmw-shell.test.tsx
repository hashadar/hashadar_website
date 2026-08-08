import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WmwShell } from '@/components/sections/labs/wmw/wmw-shell';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { wmw } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';

vi.mock('next/navigation', () => ({
  usePathname: () => '/labs/wmw',
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

describe('WmwShell', () => {
  it('blocks unauthenticated visitors from Overview content', async () => {
    render(
      <SiteAuthProvider auth={createMemorySiteAuth()}>
        <WmwShell>
          <p>Secret WMW content</p>
        </WmwShell>
      </SiteAuthProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/Checking session/i)).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', {
        name: wmw.unauthenticatedHeading,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Secret WMW content')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: wmw.signInLabel }),
    ).toHaveAttribute(
      'href',
      `/login?next=${encodeURIComponent('/labs/wmw')}`,
    );
  });

  it('shows shell chrome when authenticated', async () => {
    render(
      <SiteAuthProvider
        auth={createMemorySiteAuth({
          status: 'authenticated',
          email: 'owner@example.com',
        })}
      >
        <WmwShell>
          <p>Secret WMW content</p>
        </WmwShell>
      </SiteAuthProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: wmw.shell.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText('Secret WMW content')).toBeInTheDocument();
  });
});
