'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { wmw } from '@/data';
import { getDefaultWmw } from '@/lib/wmw-default';
import { cn } from '@/lib/utils';

export type WmwNavAccount = {
  accountId: string;
  accountName: string;
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

export type WmwNavProps = {
  /** Injectable Account list for Vitest; defaults to Snapshot Accounts. */
  accounts?: WmwNavAccount[] | null;
};

export function WmwNav({ accounts: accountsProp }: WmwNavProps = {}) {
  const pathname = usePathname() || '/labs/wmw';
  const router = useRouter();
  const { nav } = wmw.shell;
  const [loadedAccounts, setLoadedAccounts] = useState<WmwNavAccount[] | null>(
    accountsProp === undefined ? null : accountsProp,
  );

  useEffect(() => {
    if (accountsProp !== undefined) {
      setLoadedAccounts(accountsProp);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const client = await getDefaultWmw();
        const snapshot = await client.getSnapshot();
        if (cancelled) return;
        if (!snapshot) {
          setLoadedAccounts([]);
          return;
        }
        const next = [...snapshot.accounts]
          .map((account) => ({
            accountId: account.accountId,
            accountName: account.accountName,
          }))
          .sort((a, b) => a.accountName.localeCompare(b.accountName));
        setLoadedAccounts(next);
      } catch {
        if (!cancelled) setLoadedAccounts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountsProp]);

  const accounts = loadedAccounts ?? [];
  const mobileOptions = useMemo(() => {
    const top = nav.items.map((item) => ({
      href: item.href,
      label: item.label,
    }));
    const accountOptions = accounts.map((account) => ({
      href: accountHref(account.accountId),
      label: `${nav.accountsGroupLabel}: ${account.accountName}`,
    }));
    return [...top, ...accountOptions];
  }, [accounts, nav.accountsGroupLabel, nav.items]);

  const mobileValue =
    mobileOptions.find((item) => item.href === pathname)?.href ??
    nav.items[0]?.href ??
    '/labs/wmw';

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
            const active =
              item.href === '/labs/wmw'
                ? isOverviewPath(pathname)
                : pathname === item.href;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'block rounded-md px-2.5 py-1.5 font-body text-sm transition-colors',
                    active
                      ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] font-medium text-[var(--primary)] ring-1 ring-[color-mix(in_oklab,var(--primary)_25%,transparent)]'
                      : 'text-[var(--mono-500)] hover:bg-[color-mix(in_oklab,var(--primary)_6%,transparent)] hover:text-[var(--foreground)]',
                  )}
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
          {loadedAccounts === null ? (
            <p className="px-2.5 font-body text-xs text-[var(--mono-500)]">
              {wmw.overview.loadingLabel}
            </p>
          ) : accounts.length === 0 ? (
            <p className="px-2.5 font-body text-xs text-[var(--mono-500)]">
              {nav.accountsEmptyLabel}
            </p>
          ) : (
            <ul className="max-h-[min(24rem,50vh)] space-y-0.5 overflow-y-auto">
              {accounts.map((account) => {
                const href = accountHref(account.accountId);
                const active = isAccountPath(pathname, account.accountId);
                return (
                  <li key={account.accountId}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      title={account.accountName}
                      className={cn(
                        'block truncate rounded-md px-2.5 py-1 font-body text-xs transition-colors',
                        active
                          ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] font-medium text-[var(--primary)] ring-1 ring-[color-mix(in_oklab,var(--primary)_25%,transparent)]'
                          : 'text-[var(--mono-500)] hover:bg-[color-mix(in_oklab,var(--primary)_6%,transparent)] hover:text-[var(--foreground)]',
                      )}
                    >
                      {account.accountName}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>
    </>
  );
}
