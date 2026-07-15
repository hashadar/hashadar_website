'use client';

import Link from 'next/link';
import { Container, Section, SectionHeader, Text } from '@/components/ui';
import { JobMarketConsoleNav } from '@/components/sections/labs/console/job-market-console-nav';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';

export type JobMarketConsoleShellProps = {
  children: React.ReactNode;
};

export function JobMarketConsoleShell({ children }: JobMarketConsoleShellProps) {
  const { session, isLoading } = useSiteAuth();

  if (isLoading) {
    return (
      <Section className="py-12 md:py-16">
        <Container>
          <Text variant="muted">Checking session…</Text>
        </Container>
      </Section>
    );
  }

  if (session === null || session.status !== 'authenticated') {
    return (
      <Section className="py-12 md:py-16">
        <Container>
          <div className="max-w-2xl space-y-4">
            <SectionHeader animated={false}>
              {jobMarketLab.console.unauthenticatedHeading}
            </SectionHeader>
            <Text variant="muted">
              {jobMarketLab.console.unauthenticatedDescription}
            </Text>
            <Link
              href="/login"
              className="inline-flex font-body text-base text-[var(--foreground)] underline underline-offset-4"
            >
              {jobMarketLab.console.signInLabel}
            </Link>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="py-10 md:py-12">
      <Container size="full">
        <div className="mb-8 max-w-3xl space-y-3">
          <SectionHeader animated={false} showLeftAccent>
            {jobMarketLab.console.heading}
          </SectionHeader>
          <Text variant="muted">{jobMarketLab.console.description}</Text>
        </div>

        <div className="grid gap-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
          <aside className="md:sticky md:top-24 md:self-start md:border-r md:border-[color-mix(in_oklab,var(--primary)_22%,var(--border))] md:pr-6">
            <JobMarketConsoleNav />
          </aside>
          <div className="min-w-0 space-y-10">{children}</div>
        </div>
      </Container>
    </Section>
  );
}
