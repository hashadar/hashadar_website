import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { WmwAccountDetail } from '@/components/sections/labs/wmw/wmw-account-detail';
import { wmw } from '@/data';
import { createWmw } from '@/lib/wmw/facade';
import { buildSampleSnapshot } from '@/lib/wmw/fixtures/sample-snapshot';
import { createSampleWorkbookRaw } from '@/lib/wmw/fixtures/sample-workbook';
import { createMemoryWmwSnapshotStore } from '@/lib/wmw/snapshot-store';
import { createFixtureWorkbookSource } from '@/lib/wmw/workbook-source';

afterEach(() => {
  cleanup();
});

function createClient(
  initialSnapshot: ReturnType<typeof buildSampleSnapshot> | null = buildSampleSnapshot(
    {
      cashflows: [
        {
          date: '2026-01-20',
          accountId: 'IBKR_ISA',
          amount: 20_000,
          transactionType: 'Contribution',
          description: 'Open',
        },
      ],
    },
  ),
) {
  return createWmw({
    workbookSource: createFixtureWorkbookSource(createSampleWorkbookRaw()),
    snapshotStore: createMemoryWmwSnapshotStore(initialSnapshot),
    now: () => new Date('2026-03-31T18:00:00.000Z'),
  });
}

describe('WmwAccountDetail', () => {
  it('shows not-found for an unknown Account ID', async () => {
    const client = createClient();
    render(
      <WmwAccountDetail accountId="DOES_NOT_EXIST" wmwClient={client} />,
    );

    expect(
      await screen.findByRole('heading', {
        name: wmw.accountDetail.notFoundHeading,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: wmw.accountDetail.backToOverviewLabel,
      }),
    ).toHaveAttribute('href', '/labs/wmw');
  });

  it('shows the car, the loan, and net equity on one page', async () => {
    const client = createClient(
      buildSampleSnapshot({
        cashflows: [
          {
            date: '2026-03-15',
            accountId: 'LOAN_MOTONOVO',
            amount: -350,
            transactionType: 'Loan Repayment',
            description: 'Monthly',
          },
        ],
      }),
    );
    render(
      <WmwAccountDetail accountId="CAR_PORSCHE" wmwClient={client} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Porsche Taycan' }),
    ).toBeInTheDocument();

    const net = screen.getByRole('region', {
      name: wmw.accountDetail.netEquityLabel,
    });
    expect(within(net).getAllByText('£30,000.00').length).toBeGreaterThan(0);
    expect(within(net).getByText('Porsche Taycan')).toBeInTheDocument();
    expect(within(net).getByText('Motonovo')).toBeInTheDocument();
    expect(within(net).getByText('-£47,000.00')).toBeInTheDocument();
    expect(
      within(net).getByRole('img', {
        name: wmw.accountDetail.netHistoryChartAriaLabel,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(wmw.accountDetail.negativeEquityLabel),
    ).not.toBeInTheDocument();

    const car = screen.getByRole('region', {
      name: `${wmw.accountDetail.roleAssetLabel}: Porsche Taycan`,
    });
    expect(within(car).getByText('Private')).toBeInTheDocument();
    expect(within(car).getByText('Cars')).toBeInTheDocument();
    expect(within(car).getByText('PAIR_TAYCAN')).toBeInTheDocument();
    expect(
      within(car).getByRole('img', {
        name: wmw.accountDetail.balanceChartAriaLabel,
      }),
    ).toBeInTheDocument();
    expect(
      within(car).getByRole('img', {
        name: wmw.accountDetail.mileageChartAriaLabel,
      }),
    ).toBeInTheDocument();
    expect(
      within(car).queryByRole('tab', {
        name: wmw.accountDetail.seriesViewPerformanceLabel,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(car).queryByText(wmw.accountDetail.mwrHeading),
    ).not.toBeInTheDocument();

    const loan = screen.getByRole('region', {
      name: `${wmw.accountDetail.roleLiabilityLabel}: Motonovo`,
    });
    expect(within(loan).getByText('Loans')).toBeInTheDocument();
    expect(within(loan).getByText('£47,000.00')).toBeInTheDocument();
    expect(
      within(loan).getByRole('img', {
        name: wmw.accountDetail.balanceChartAriaLabel,
      }),
    ).toBeInTheDocument();
    expect(
      within(loan).getByText(wmw.accountDetail.cashflowsLoanRepaymentsLabel),
    ).toBeInTheDocument();
    expect(within(loan).getByText('£350.00')).toBeInTheDocument();
  });

  it('opens the same combined page from the loan ID', async () => {
    const client = createClient();
    render(
      <WmwAccountDetail accountId="LOAN_MOTONOVO" wmwClient={client} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Porsche Taycan' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', {
        name: `${wmw.accountDetail.roleLiabilityLabel}: Motonovo`,
      }),
    ).toBeInTheDocument();
  });

  it('labels negative equity', async () => {
    const client = createClient(
      buildSampleSnapshot({
        balances: [
          { date: '2026-03-31', accountId: 'CAR_PORSCHE', balance: 40_000, units: null, mileage: null },
          { date: '2026-03-31', accountId: 'LOAN_MOTONOVO', balance: 47_000, units: null, mileage: null },
        ],
      }),
    );
    render(
      <WmwAccountDetail accountId="CAR_PORSCHE" wmwClient={client} />,
    );

    const net = await screen.findByRole('region', {
      name: wmw.accountDetail.netEquityLabel,
    });
    expect(
      within(net).getByText(wmw.accountDetail.negativeEquityLabel),
    ).toBeInTheDocument();
    expect(within(net).getAllByText('-£7,000.00').length).toBeGreaterThan(0);
  });

  it('renders an unpaired Account without a net section', async () => {
    const client = createClient();
    render(<WmwAccountDetail accountId="IBKR_ISA" wmwClient={client} />);

    expect(
      await screen.findByRole('heading', { name: 'IBKR ISA' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: wmw.accountDetail.netEquityLabel }),
    ).not.toBeInTheDocument();
  });

  it('shows Balance / Performance tabs and Units for investable crypto', async () => {
    const user = userEvent.setup();
    const client = createClient(
      buildSampleSnapshot({
        cashflows: [
          {
            date: '2026-01-05',
            accountId: 'CB_ETH',
            amount: 2_000,
            transactionType: 'Contribution',
            description: 'Buy ETH',
          },
        ],
      }),
    );
    render(<WmwAccountDetail accountId="CB_ETH" wmwClient={client} />);

    expect(
      await screen.findByRole('heading', { name: 'Coinbase ETH' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: wmw.accountDetail.unitsHeading }),
    ).toBeInTheDocument();
    expect(screen.getByText(wmw.accountDetail.mwrHeading)).toBeInTheDocument();
    expect(
      screen.getByRole('tab', {
        name: wmw.accountDetail.seriesViewBalanceLabel,
      }),
    ).toHaveAttribute('aria-selected', 'true');

    await user.click(
      screen.getByRole('tab', {
        name: wmw.accountDetail.seriesViewPerformanceLabel,
      }),
    );
    expect(
      screen.getByRole('img', {
        name: wmw.accountDetail.performanceChartAriaLabel,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(wmw.accountDetail.cashflowsCountLabel),
    ).toBeInTheDocument();
    expect(
      screen.getByText(wmw.accountDetail.cashflowsLastLabel),
    ).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('Buy ETH')).not.toBeInTheDocument();
    expect(screen.getByText(wmw.overview.periodYtd)).toBeInTheDocument();
    expect(screen.getByText(wmw.overview.period1y)).toBeInTheDocument();
    expect(screen.getByText(wmw.overview.periodMax)).toBeInTheDocument();
  });
});
