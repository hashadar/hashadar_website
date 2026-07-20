'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { jobMarketLab } from '@/data';
import { cn } from '@/lib/utils';

function isActiveHref(pathname: string, href: string): boolean {
  if (href === '/labs/job-market/console') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function JobMarketConsoleNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { nav } = jobMarketLab.console;

  return (
    <>
      <label className="mb-3 block font-body text-sm text-[var(--muted-foreground)] md:hidden">
        {nav.mobileLabel}
        <select
          className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-body text-base text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]"
          aria-label={nav.mobileLabel}
          value={
            nav.items.find((item) => isActiveHref(pathname, item.href))?.href ??
            nav.items[0]?.href
          }
          onChange={(event) => {
            router.push(event.target.value);
          }}
        >
          {nav.items.map((item) => (
            <option key={item.id} value={item.href}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <nav aria-label={nav.ariaLabel} className="hidden md:block">
        <ul className="space-y-1">
          {nav.items.map((item) => {
            const active = isActiveHref(pathname, item.href);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'block rounded-md px-3 py-2 font-body text-sm transition-colors',
                    active
                      ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)] font-medium ring-1 ring-[color-mix(in_oklab,var(--primary)_25%,transparent)]'
                      : 'text-[var(--mono-500)] hover:bg-[color-mix(in_oklab,var(--primary)_6%,transparent)] hover:text-[var(--foreground)]',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
