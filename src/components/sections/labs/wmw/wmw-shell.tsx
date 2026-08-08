'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container, Section, SectionHeader, Text } from '@/components/ui';
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
      <Section className="py-12 md:py-16">
        <Container>
          <Text variant="muted">{wmw.checkingSessionLabel}</Text>
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
              {wmw.unauthenticatedHeading}
            </SectionHeader>
            <Text variant="muted">{wmw.unauthenticatedDescription}</Text>
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="inline-flex font-body text-base text-[var(--foreground)] underline underline-offset-4"
            >
              {wmw.signInLabel}
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
            {wmw.shell.heading}
          </SectionHeader>
          <Text variant="muted">{wmw.shell.description}</Text>
        </div>
        <div className="min-w-0 space-y-10">{children}</div>
      </Container>
    </Section>
  );
}
