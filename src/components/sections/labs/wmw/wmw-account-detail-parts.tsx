import Link from 'next/link';
import { Heading, Text } from '@/components/ui';
import { wmw } from '@/data';
import type { WmwAccountCashflowSummary } from '@/lib/wmw/account-detail-view';
import {
  formatAnnualisedRate,
  formatAsOf,
  formatGbp,
  formatIsoDate,
} from '@/lib/wmw/format';
import type { WmwAccount, WmwCategory } from '@/lib/wmw/types';

const LABEL_CLASS =
  'font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]';
const VALUE_CLASS =
  'mt-0.5 font-mono text-sm tabular-nums text-[var(--foreground)]';

export function formatSignedGbp(amount: number): string {
  const formatted = formatGbp(Math.abs(amount), true);
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `−${formatted}`;
  return formatted;
}

export function formatSignedRate(rate: number): string {
  const formatted = formatAnnualisedRate(Math.abs(rate));
  if (rate > 0) return `+${formatted}`;
  if (rate < 0) return `−${formatted}`;
  return formatted;
}

export function WmwAccountDetailHeader({
  name,
  asOf,
}: {
  name: string;
  asOf: string;
}) {
  const copy = wmw.accountDetail;
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-0.5">
        <Heading size="sm" as="h2">
          {name}
        </Heading>
        <Text variant="muted" className="text-sm">
          {wmw.overview.asOfLabel}:{' '}
          <span className="tabular-nums">{formatAsOf(asOf)}</span>
        </Text>
      </div>
      <Link
        href="/labs/wmw"
        className="inline-flex font-body text-sm text-[var(--foreground)] underline underline-offset-4"
      >
        {copy.backToOverviewLabel}
      </Link>
    </div>
  );
}

export function WmwAccountMetadata({
  account,
  category,
}: {
  account: WmwAccount;
  category: WmwCategory | null;
}) {
  const copy = wmw.accountDetail;
  const meta = [
    { label: copy.fieldPlatform, value: account.platform, mono: false },
    {
      label: copy.fieldCategory,
      value: category?.categoryId ?? account.categoryId,
      mono: false,
    },
    {
      label: copy.fieldClass,
      value: category?.class ?? copy.classUnknownLabel,
      mono: false,
    },
    {
      label: copy.fieldType,
      value: category?.type ?? copy.typeUnknownLabel,
      mono: false,
    },
    {
      label: copy.fieldPair,
      value: account.pairId ?? copy.pairNoneLabel,
      mono: Boolean(account.pairId),
    },
  ];

  return (
    <dl className="space-y-2">
      {meta.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className={LABEL_CLASS}>{item.label}</dt>
          <dd
            className={
              item.mono
                ? 'mt-0.5 truncate font-mono text-sm tabular-nums text-[var(--foreground)]'
                : 'mt-0.5 truncate font-body text-sm text-[var(--foreground)]'
            }
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function WmwCashflowSummary({
  summary,
}: {
  summary: WmwAccountCashflowSummary;
}) {
  const copy = wmw.accountDetail;
  if (summary.count === 0) {
    return (
      <Text variant="muted" className="text-sm">
        {copy.cashflowsEmptyLabel}
      </Text>
    );
  }

  return (
    <dl className="space-y-2">
      <div>
        <dt className={LABEL_CLASS}>{copy.cashflowsCountLabel}</dt>
        <dd className={VALUE_CLASS}>{summary.count}</dd>
      </div>
      <div>
        <dt className={LABEL_CLASS}>{copy.cashflowsNetLabel}</dt>
        <dd className={VALUE_CLASS}>{formatGbp(summary.netAmount, true)}</dd>
      </div>
      <div>
        <dt className={LABEL_CLASS}>{copy.cashflowsContributionsLabel}</dt>
        <dd className={VALUE_CLASS}>
          {formatGbp(summary.contributionTotal, true)}
        </dd>
      </div>
      <div>
        <dt className={LABEL_CLASS}>{copy.cashflowsWithdrawalsLabel}</dt>
        <dd className={VALUE_CLASS}>
          {formatGbp(summary.withdrawalTotal, true)}
        </dd>
      </div>
      {summary.repaymentTotal > 0 ? (
        <div>
          <dt className={LABEL_CLASS}>{copy.cashflowsRepaymentsLabel}</dt>
          <dd className={VALUE_CLASS}>
            {formatGbp(summary.repaymentTotal, true)}
          </dd>
        </div>
      ) : null}
      <div>
        <dt className={LABEL_CLASS}>{copy.cashflowsLastLabel}</dt>
        <dd className={VALUE_CLASS}>
          {summary.lastDate ? formatIsoDate(summary.lastDate) : '—'}
        </dd>
      </div>
    </dl>
  );
}
