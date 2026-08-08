import { cleanup, render, screen } from '@testing-library/react';
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

  it('renders metadata, Balance history, Mileage, and empty Cashflows for vehicle', async () => {
    const client = createClient();
    render(
      <WmwAccountDetail accountId="CAR_PORSCHE" wmwClient={client} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Porsche Taycan' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.getByText('Cars')).toBeInTheDocument();
    expect(screen.getByText('PAIR_TAYCAN')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: wmw.accountDetail.balanceHeading,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: wmw.accountDetail.mileageHeading,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(wmw.accountDetail.cashflowsEmptyLabel),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: wmw.accountDetail.mwrHeading }),
    ).not.toBeInTheDocument();
  });

  it('shows Units history and MWR summary for investable crypto', async () => {
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
    expect(
      screen.getByRole('heading', { name: wmw.accountDetail.mwrHeading }),
    ).toBeInTheDocument();
    expect(screen.getByText('Buy ETH')).toBeInTheDocument();
    expect(screen.getByText(wmw.overview.periodYtd)).toBeInTheDocument();
    expect(screen.getByText(wmw.overview.period1y)).toBeInTheDocument();
    expect(screen.getByText(wmw.overview.periodMax)).toBeInTheDocument();
  });
});
