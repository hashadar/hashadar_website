import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WmwOverview } from '@/components/sections/labs/wmw/wmw-overview';
import { wmw } from '@/data';
import { createWmw } from '@/lib/wmw/facade';
import { buildSampleSnapshot } from '@/lib/wmw/fixtures/sample-snapshot';
import { createSampleWorkbookRaw } from '@/lib/wmw/fixtures/sample-workbook';
import { createMemoryWmwSnapshotStore } from '@/lib/wmw/snapshot-store';
import {
  createFixtureWorkbookSource,
  type WmwWorkbookSource,
} from '@/lib/wmw/workbook-source';

afterEach(() => {
  cleanup();
});

function createClient(options?: {
  initialSnapshot?: ReturnType<typeof buildSampleSnapshot> | null;
  workbookSource?: WmwWorkbookSource;
}) {
  return createWmw({
    workbookSource:
      options?.workbookSource ??
      createFixtureWorkbookSource(createSampleWorkbookRaw()),
    snapshotStore: createMemoryWmwSnapshotStore(
      options?.initialSnapshot === undefined
        ? buildSampleSnapshot({
            cashflows: [
              {
                date: '2026-01-20',
                accountId: 'IBKR_ISA',
                amount: 20_000,
                transactionType: 'Contribution',
                description: 'Open',
              },
            ],
          })
        : options.initialSnapshot,
    ),
    now: () => new Date('2026-03-31T18:00:00.000Z'),
  });
}

describe('WmwOverview', () => {
  it('shows empty Snapshot state when never refreshed', async () => {
    const client = createClient({ initialSnapshot: null });
    render(<WmwOverview wmwClient={client} />);

    expect(
      await screen.findByRole('heading', { name: wmw.overview.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: wmw.overview.emptyHeading }),
    ).toBeInTheDocument();
    expect(screen.getByText(wmw.overview.emptyDescription)).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(`${wmw.overview.asOfLabel}:\\s*${wmw.overview.asOfUnknownLabel}`),
      ),
    ).toBeInTheDocument();
  });

  it('renders Net Worth, Taycan pair, and MWR period control from Snapshot', async () => {
    const client = createClient();
    render(<WmwOverview wmwClient={client} />);

    expect(
      await screen.findByRole('heading', { name: wmw.overview.netWorthHeading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '£53,000' }),
    ).toBeInTheDocument();
    expect(screen.getByText('PAIR_TAYCAN')).toBeInTheDocument();
    expect(screen.getAllByText('Porsche Taycan').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: 'Porsche Taycan' }),
    ).toHaveAttribute('href', '/labs/wmw/accounts/CAR_PORSCHE');
    expect(
      screen.getByRole('group', { name: wmw.overview.periodControlAriaLabel }),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: wmw.overview.periodMax }));
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: wmw.overview.periodMax }),
      ).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('keeps last-good Snapshot and shows error when Refresh cannot reach Sheets', async () => {
    const failingSource: WmwWorkbookSource = {
      pullTabs: vi.fn(async () => {
        throw new Error('Sheets unreachable');
      }),
    };
    const client = createClient({ workbookSource: failingSource });
    render(<WmwOverview wmwClient={client} />);

    expect(await screen.findByText('PAIR_TAYCAN')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: wmw.overview.refreshLabel }),
    );

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(wmw.overview.refreshErrorLabel);
    expect(screen.getByText('PAIR_TAYCAN')).toBeInTheDocument();
    expect(within(screen.getByRole('alert')).getByText(wmw.overview.refreshErrorLabel)).toBeInTheDocument();
  });

  it('surfaces Refresh warnings for unknown Transaction_Type to the Site Admin', async () => {
    const warningMessage =
      'Excluded Cashflow with unknown Transaction_Type "Dividend" from MWR inputs.';
    const client = createClient({
      initialSnapshot: buildSampleSnapshot({
        warnings: [
          {
            code: 'unknown_transaction_type',
            message: warningMessage,
            tab: 'fact_Cashflows',
            row: 2,
            details: {
              accountId: 'IBKR_ISA',
              date: '2026-02-01',
              transactionType: 'Dividend',
              amount: 100,
            },
          },
        ],
      }),
    });
    render(<WmwOverview wmwClient={client} />);

    expect(
      await screen.findByRole('heading', { name: wmw.overview.warningsLabel }),
    ).toBeInTheDocument();
    expect(screen.getByText(warningMessage)).toBeInTheDocument();
  });
});
