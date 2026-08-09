'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { wmw } from '@/data';
import { partitionAccountsByActivity } from '@/lib/wmw/account-activity';
import { getDefaultWmw } from '@/lib/wmw-default';
import { cn } from '@/lib/utils';

export type WmwNavAccount = {
  accountId: string;
  accountName: string;
};

type WmwNavGroups = {
  active: WmwNavAccount[];
  inactive: WmwNavAccount[];
};

function accountHref(accountId: string): string {
  return `/labs/wmw/accounts/${encodeURIComponent(accountId)}`;
}

function isOverviewPath(pathname: string): boolean {
  return pathname === '/labs/wmw';
}

function isAccountPath(pathname: string, accountId: string): boolean {
  return pathname === accountHref(accountId);
}

function linkClass(active: boolean, compact = false): string {
  return cn(
    'block truncate rounded-md font-body transition-colors',
    compact ? 'px-2.5 py-1 text-xs' : 'px-2.5 py-1.5 text-sm',
    active
      ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] font-medium text-[var(--primary)] ring-1 ring-[color-mix(in_oklab,var(--primary)_25%,transparent)]'
      : 'text-[var(--mono-500)] hover:bg-[color-mix(in_oklab,var(--primary)_6%,transparent)] hover:text-[var(--foreground)]',
  );
}

export type WmwNavProps = {
  /** Injectable groups for Vitest; defaults to Snapshot partition. */
  accounts?: WmwNavGroups | null;
};

export function WmwNav({ accounts: accountsProp }: WmwNavProps = {}) {
  const pathname = usePathname() || '/labs/wmw';
  const router = useRouter();
  const { nav } = wmw.shell;
  const [fetched, setFetched] = useState<WmwNavGroups | null>(null);

  useEffect(() => {
    if (accountsProp !== undefined) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const client = await getDefaultWmw();
        const snapshot = await client.getSnapshot();
        if (cancelled) return;
        if (!snapshot) {
          setFetched({ active: [], inactive: [] });
          return;
        }
        const groups = partitionAccountsByActivity(snapshot);
        setFetched({
          active: groups.active.map((a) => ({
            accountId: a.accountId,
            accountName: a.accountName,
          })),
          inactive: groups.inactive.map((a) => ({
            accountId: a.accountId,
            accountName: a.accountName,
          })),
        });
      } catch {
        if (!cancelled) setFetched({ active: [], inactive: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountsProp, pathname]);

  const groups =
    accountsProp !== undefined
      ? (accountsProp ?? { active: [], inactive: [] })
      : fetched;

  const mobileOptions = useMemo(() => {
    const active = groups?.active ?? [];
    const inactive = groups?.inactive ?? [];
    const top = nav.items.map((item) => ({
      href: item.href,
      label: item.label,
    }));
    const activeOptions = active.map((account) => ({
      href: accountHref(account.accountId),
      label: `${nav.accountsGroupLabel}: ${account.accountName}`,
    }));
    const inactiveOptions = inactive.map((account) => ({
      href: accountHref(account.accountId),
      label: `${nav.inactiveAccountsGroupLabel}: ${account.accountName}`,
    }));
    return [...top, ...activeOptions, ...inactiveOptions];
  }, [
    groups,
    nav.accountsGroupLabel,
    nav.inactiveAccountsGroupLabel,
    nav.items,
  ]);

  const mobileValue =
    mobileOptions.find((item) => item.href === pathname)?.href ??
    nav.items[0]?.href ??
    '/labs/wmw';

  const active = groups?.active ?? [];
  const inactive = groups?.inactive ?? [];

  function renderAccountList(accounts: WmwNavAccount[]) {
    return (
      <ul className="max-h-[min(16rem,40vh)] space-y-0.5 overflow-y-auto">
        {accounts.map((account) => {
          const href = accountHref(account.accountId);
          const activeLink = isAccountPath(pathname, account.accountId);
          return (
            <li key={account.accountId}>
              <Link
                href={href}
                aria-current={activeLink ? 'page' : undefined}
                title={account.accountName}
                className={linkClass(activeLink, true)}
              >
                {account.accountName}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      <label className="mb-3 block font-body text-sm text-[var(--mono-500)] md:hidden">
        {nav.mobileLabel}
        <select
          className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 font-body text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]"
          aria-label={nav.mobileLabel}
          value={mobileValue}
          onChange={(event) => {
            router.push(event.target.value);
          }}
        >
          {mobileOptions.map((item) => (
            <option key={item.href} value={item.href}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <nav aria-label={nav.ariaLabel} className="hidden md:block">
        <ul className="space-y-0.5">
          {nav.items.map((item) => {
            const activeItem =
              item.href === '/labs/wmw'
                ? isOverviewPath(pathname)
                : pathname === item.href;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={activeItem ? 'page' : undefined}
                  className={linkClass(activeItem)}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-4">
          <p className="mb-1 px-2.5 font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[var(--mono-500)]">
            {nav.accountsGroupLabel}
          </p>
          {groups === null ? (
            <p className="px-2.5 font-body text-xs text-[var(--mono-500)]">
              {wmw.overview.loadingLabel}
            </p>
          ) : active.length === 0 ? (
            <p className="px-2.5 font-body text-xs text-[var(--mono-500)]">
              {nav.accountsEmptyLabel}
            </p>
          ) : (
            renderAccountList(active)
          )}
        </div>

        <div className="mt-4">
          <p className="mb-1 px-2.5 font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[var(--mono-500)]">
            {nav.inactiveAccountsGroupLabel}
          </p>
          {groups === null ? null : inactive.length === 0 ? (
            <p className="px-2.5 font-body text-xs text-[var(--mono-500)]">
              {nav.inactiveAccountsEmptyLabel}
            </p>
          ) : (
            renderAccountList(inactive)
          )}
        </div>
      </nav>
    </>
  );
}
