'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { wmw } from '@/data';
import { cn } from '@/lib/utils';

function navPath(href: string): string {
  return href.split('#')[0] || href;
}

function isActiveHref(pathname: string, href: string): boolean {
  const path = navPath(href);
  if (path === '/labs/wmw') {
    return pathname === '/labs/wmw' || pathname.startsWith('/labs/wmw/');
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function WmwNav() {
  const pathname = usePathname() || '/labs/wmw';
  const router = useRouter();
  const { nav } = wmw.shell;

  return (
    <>
      <label className="mb-3 block font-body text-sm text-[var(--mono-500)] md:hidden">
        {nav.mobileLabel}
        <select
          className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 font-body text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]"
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
        <ul className="space-y-0.5">
          {nav.items.map((item) => {
            const active = isActiveHref(pathname, item.href);
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
      </nav>
    </>
  );
}
