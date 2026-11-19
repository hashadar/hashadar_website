'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container, Section, Text } from '@/components/ui';
import {
  LabsSessionChecking,
  LabsSignInGate,
} from '@/components/sections/labs/labs-sign-in-gate';
import { CfaProvider } from '@/components/sections/labs/cfa/cfa-context';
import { cfa } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import type { CfaLab } from '@/lib/cfa-default';
import { cn } from '@/lib/utils';

export type CfaShellProps = {
  children: React.ReactNode;
  /** Injectable Lab for Vitest. */
  lab?: CfaLab | null;
};

function isActive(pathname: string, href: string): boolean {
  if (href === '/labs/cfa') return pathname === '/labs/cfa';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CfaNav() {
  const pathname = usePathname() || '/labs/cfa';
  const { nav } = cfa.shell;
  return (
    <nav aria-label={nav.ariaLabel}>
      <ul className="-mx-1 flex gap-1 overflow-x-auto pb-1 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:pb-0">
        {nav.items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.id} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block min-h-11 rounded-md px-3 py-2.5 font-body text-sm transition-colors motion-reduce:transition-none md:min-h-0 md:px-2.5 md:py-1.5',
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
  );
}

/** Sign-in gate + Lab chrome for `/labs/cfa` (same pattern as WmwShell). */
export function CfaShell({ children, lab }: CfaShellProps) {
  const { session, isLoading } = useSiteAuth();
  const pathname = usePathname() || '/labs/cfa';

  if (isLoading) {
    return <LabsSessionChecking label={cfa.checkingSessionLabel} />;
  }

  if (session === null || session.status !== 'authenticated') {
    return (
      <LabsSignInGate
        heading={cfa.unauthenticatedHeading}
        description={cfa.unauthenticatedDescription}
        signInLabel={cfa.signInLabel}
        nextPath={pathname}
      />
    );
  }

  return (
    <CfaProvider lab={lab}>
      <Section className="py-4 md:py-8">
        <Container size="full">
          <div className="grid gap-4 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-8">
            <aside className="md:sticky md:top-20 md:self-start md:border-r md:border-[color-mix(in_oklab,var(--primary)_22%,var(--border))] md:pr-4">
              <div className="mb-2 flex items-baseline gap-2 md:mb-3 md:block md:space-y-0.5">
                <p className="font-display text-lg tracking-tight text-[var(--foreground)]">
                  {cfa.shell.heading}
                </p>
                <Text variant="muted" className="text-xs">
                  {cfa.shell.description}
                </Text>
              </div>
              <CfaNav />
            </aside>
            <div className="min-w-0 space-y-5">{children}</div>
          </div>
        </Container>
      </Section>
    </CfaProvider>
  );
}
