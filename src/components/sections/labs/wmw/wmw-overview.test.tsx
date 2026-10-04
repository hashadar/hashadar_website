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
    expect(screen.getByText(wmw.overview.asOfUnknownLabel)).toBeInTheDocument();
  });

  it('renders KPIs and Account links from Snapshot', async () => {
    const client = createClient();
    render(<WmwOverview wmwClient={client} />);

    expect(
      await screen.findByRole('heading', { name: wmw.overview.historyHeading }),
    ).toBeInTheDocument();
    expect(screen.getByText('£53,000')).toBeInTheDocument();
    expect(screen.getAllByText('Porsche Taycan').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: 'Porsche Taycan' }),
    ).toHaveAttribute('href', '/labs/wmw/accounts/CAR_PORSCHE');
    expect(
      screen.queryByRole('link', { name: 'Motonovo' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(wmw.overview.periodYtd)).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(wmw.overview.monthSlicerLabel),
    ).toBeInTheDocument();
  });

  it('shows the paired car and loan as one net row by default', async () => {
    const client = createClient();
    render(<WmwOverview wmwClient={client} />);

    const accountTable = await screen.findByRole('table', {
      name: wmw.overview.accountHeading,
    });
    const taycanRow = within(accountTable)
      .getByRole('link', { name: 'Porsche Taycan' })
      .closest('tr')!;
    expect(within(taycanRow).getByText('£30,000')).toBeInTheDocument();
    expect(within(taycanRow).getByText('Cars')).toBeInTheDocument();
    expect(
      within(taycanRow).getByText(wmw.overview.netPositionLabel),
    ).toBeInTheDocument();
    expect(within(accountTable).queryByText('Motonovo')).not.toBeInTheDocument();
    expect(within(accountTable).queryByText('Loans')).not.toBeInTheDocument();

    const classTable = screen.getByRole('table', {
      name: wmw.overview.classHeading,
    });
    expect(within(classTable).getByText('Cars')).toBeInTheDocument();
    expect(within(classTable).queryByText('Loans')).not.toBeInTheDocument();
    expect(screen.getByText('£53,000')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: wmw.overview.basisNetLabel }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('restores the two-row view on Gross and returns on Net', async () => {
    const user = userEvent.setup();
    const client = createClient();
    render(<WmwOverview wmwClient={client} />);

    await screen.findByRole('link', { name: 'Porsche Taycan' });
    await user.click(
      screen.getByRole('button', { name: wmw.overview.basisGrossLabel }),
    );

    const accountTable = await screen.findByRole('table', {
      name: wmw.overview.accountHeading,
    });
    await within(accountTable).findByRole('link', { name: 'Motonovo' });
    expect(within(accountTable).getByText('£77,000')).toBeInTheDocument();
    expect(within(accountTable).getByText('-£47,000')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: wmw.overview.basisGrossLabel }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(
        screen.getByRole('table', { name: wmw.overview.classHeading }),
      ).getByText('Loans'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: wmw.overview.basisNetLabel }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'Motonovo' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText('£53,000')).toBeInTheDocument();
  });

  it('finds the net position when searching by the loan name', async () => {
    const user = userEvent.setup();
    const client = createClient();
    render(<WmwOverview wmwClient={client} />);

    await screen.findByRole('link', { name: 'Porsche Taycan' });
    await user.type(
      screen.getByLabelText(wmw.overview.accountSearchLabel),
      'motonovo',
    );

    const accountTable = screen.getByRole('table', {
      name: wmw.overview.accountHeading,
    });
    await waitFor(() =>
      expect(
        within(accountTable).queryByRole('link', { name: 'IBKR ISA' }),
      ).not.toBeInTheDocument(),
    );
    expect(
      within(accountTable).getByRole('link', { name: 'Porsche Taycan' }),
    ).toHaveAttribute('href', '/labs/wmw/accounts/CAR_PORSCHE');
  });

  it('labels negative equity on the net row', async () => {
    const client = createClient({
      initialSnapshot: buildSampleSnapshot({
        balances: [
          { date: '2026-03-31', accountId: 'CAR_PORSCHE', balance: 40_000, units: null, mileage: null },
          { date: '2026-03-31', accountId: 'LOAN_MOTONOVO', balance: 47_000, units: null, mileage: null },
        ],
      }),
    });
    render(<WmwOverview wmwClient={client} />);

    const accountTable = await screen.findByRole('table', {
      name: wmw.overview.accountHeading,
    });
    const row = within(accountTable)
      .getByRole('link', { name: 'Porsche Taycan' })
      .closest('tr')!;
    expect(within(row).getByText('-£7,000')).toBeInTheDocument();
    expect(
      within(row).getByText(
        new RegExp(wmw.overview.negativeEquityLabel),
      ),
    ).toBeInTheDocument();
  });

  it('keeps last-good Snapshot and shows error when Refresh cannot reach Sheets', async () => {
    const failingSource: WmwWorkbookSource = {
      pullTabs: vi.fn(async () => {
        throw new Error('Sheets unreachable');
      }),
    };
    const client = createClient({ workbookSource: failingSource });
    render(<WmwOverview wmwClient={client} />);

    expect(
      await screen.findByRole('link', { name: 'Porsche Taycan' }),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: wmw.overview.refreshLabel }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      wmw.overview.refreshErrorLastGoodLabel,
    );
    expect(
      screen.getByRole('link', { name: 'Porsche Taycan' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('alert')).getByText(
        wmw.overview.refreshErrorLastGoodLabel,
      ),
    ).toBeInTheDocument();
  });

  it('shows empty-lab Refresh failure when no last-good Snapshot exists', async () => {
    const failingSource: WmwWorkbookSource = {
      pullTabs: vi.fn(async () => {
        throw new Error('WMW Workbook source is not configured');
      }),
    };
    const client = createClient({
      initialSnapshot: null,
      workbookSource: failingSource,
    });
    render(<WmwOverview wmwClient={client} />);

    expect(
      await screen.findByRole('heading', { name: wmw.overview.emptyHeading }),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: wmw.overview.refreshLabel }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      wmw.overview.refreshErrorEmptyLabel,
    );
    expect(
      screen.getByRole('heading', { name: wmw.overview.emptyHeading }),
    ).toBeInTheDocument();
  });

  it('surfaces empty-tab Refresh failures distinctly from generic Sheets errors', async () => {
    const failingSource: WmwWorkbookSource = {
      pullTabs: vi.fn(async () => {
        throw new Error('Sheets pull missing values for tab dim_Accounts');
      }),
    };
    const client = createClient({ workbookSource: failingSource });
    render(<WmwOverview wmwClient={client} />);

    expect(
      await screen.findByRole('link', { name: 'Porsche Taycan' }),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: wmw.overview.refreshLabel }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      wmw.overview.refreshErrorMissingTabLabel,
    );
    expect(
      screen.getByRole('link', { name: 'Porsche Taycan' }),
    ).toBeInTheDocument();
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

    const warningsRegion = await screen.findByRole('status');
    expect(
      within(warningsRegion).getByRole('heading', {
        name: `${wmw.overview.warningsLabel} (1)`,
      }),
    ).toBeInTheDocument();
    expect(
      within(warningsRegion).getByText(wmw.overview.warningsDescription),
    ).toBeInTheDocument();
    expect(within(warningsRegion).getByText(warningMessage)).toBeInTheDocument();
  });

  it('updates Refresh warnings after a successful Refresh from the Workbook', async () => {
    const raw = createSampleWorkbookRaw();
    raw.fact_Cashflows.push([
      46054,
      'IBKR_ISA',
      25,
      'Dividend',
      'Unknown type for warning surface',
    ]);
    const client = createClient({
      initialSnapshot: buildSampleSnapshot({ warnings: [] }),
      workbookSource: createFixtureWorkbookSource(raw),
    });
    render(<WmwOverview wmwClient={client} />);

    expect(
      await screen.findByRole('link', { name: 'Porsche Taycan' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: wmw.overview.refreshLabel }),
    );

    const warningsRegion = await screen.findByRole('status');
    expect(
      within(warningsRegion).getByRole('heading', {
        name: /Refresh warnings \(\d+\)/,
      }),
    ).toBeInTheDocument();
    expect(
      within(warningsRegion).getByText(/unknown Transaction_Type "Dividend"/i),
    ).toBeInTheDocument();
  });
});
