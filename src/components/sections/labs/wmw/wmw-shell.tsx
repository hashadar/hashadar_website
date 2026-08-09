'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container, Section, Text } from '@/components/ui';
import { WmwNav } from '@/components/sections/labs/wmw/wmw-nav';
import { wmw } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';

export type WmwShellProps = {
  children: React.ReactNode;
};

export function WmwShell({ children }: WmwShellProps) {
  const { session, isLoading } = useSiteAuth();
  const pathname = usePathname() || '/labs/wmw';

  if (isLoading) {
    return (
      <Section className="py-8 md:py-10">
        <Container>
          <Text variant="muted">{wmw.checkingSessionLabel}</Text>
        </Container>
      </Section>
    );
  }

  if (session === null || session.status !== 'authenticated') {
    return (
      <Section className="py-8 md:py-10">
        <Container>
          <div className="max-w-2xl space-y-3">
            <h1 className="font-display text-2xl tracking-tight text-[var(--foreground)]">
              {wmw.unauthenticatedHeading}
            </h1>
            <Text variant="muted">{wmw.unauthenticatedDescription}</Text>
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="inline-flex font-body text-sm text-[var(--foreground)] underline underline-offset-4"
            >
              {wmw.signInLabel}
            </Link>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="py-6 md:py-8">
      <Container size="full">
        <div className="grid gap-6 md:grid-cols-[13.5rem_minmax(0,1fr)] md:gap-8">
          <aside className="md:sticky md:top-20 md:self-start md:border-r md:border-[color-mix(in_oklab,var(--primary)_22%,var(--border))] md:pr-4">
            <div className="mb-3 space-y-0.5">
              <p className="font-display text-lg tracking-tight text-[var(--foreground)]">
                {wmw.shell.heading}
              </p>
              <Text variant="muted" className="text-xs">
                {wmw.shell.description}
              </Text>
            </div>
            <WmwNav />
          </aside>
          <div className="min-w-0 space-y-5">{children}</div>
        </div>
      </Container>
    </Section>
  );
}
