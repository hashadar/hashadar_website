import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WmwShell } from '@/components/sections/labs/wmw/wmw-shell';
import { WmwNav } from '@/components/sections/labs/wmw/wmw-nav';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { wmw } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';

vi.mock('next/navigation', () => ({
  usePathname: () => '/labs/wmw',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/wmw-default', () => ({
  getDefaultWmw: vi.fn(async () => ({
    getSnapshot: async () => null,
    refresh: async () => {
      throw new Error('unused');
    },
  })),
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

    expect(await screen.findByText(wmw.shell.heading)).toBeInTheDocument();
    expect(
      screen.getByLabelText(wmw.shell.nav.mobileLabel),
    ).toBeInTheDocument();
    expect(screen.getByText('Secret WMW content')).toBeInTheDocument();
  });
});

describe('WmwNav', () => {
  it('splits Accounts into active and inactive groups', () => {
    render(
      <WmwNav
        accounts={{
          active: [
            { accountId: 'IBKR_ISA', accountName: 'IBKR ISA' },
            { accountId: 'CAR_PORSCHE', accountName: 'Porsche Taycan' },
          ],
          inactive: [{ accountId: 'CB_ETH', accountName: 'Coinbase ETH' }],
        }}
      />,
    );

    expect(screen.getByText(wmw.shell.nav.accountsGroupLabel)).toBeInTheDocument();
    expect(
      screen.getByText(wmw.shell.nav.inactiveAccountsGroupLabel),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Porsche Taycan' }),
    ).toHaveAttribute('href', '/labs/wmw/accounts/CAR_PORSCHE');
    expect(
      screen.getByRole('link', { name: 'Coinbase ETH' }),
    ).toHaveAttribute('href', '/labs/wmw/accounts/CB_ETH');
  });
});
