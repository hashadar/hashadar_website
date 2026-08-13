'use client';

import { usePathname } from 'next/navigation';
import { Container, Section, Text } from '@/components/ui';
import { WmwNav } from '@/components/sections/labs/wmw/wmw-nav';
import {
  LabsSessionChecking,
  LabsSignInGate,
} from '@/components/sections/labs/labs-sign-in-gate';
import { wmw } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';

export type WmwShellProps = {
  children: React.ReactNode;
};

export function WmwShell({ children }: WmwShellProps) {
  const { session, isLoading } = useSiteAuth();
  const pathname = usePathname() || '/labs/wmw';

  if (isLoading) {
    return <LabsSessionChecking label={wmw.checkingSessionLabel} />;
  }

  if (session === null || session.status !== 'authenticated') {
    return (
      <LabsSignInGate
        heading={wmw.unauthenticatedHeading}
        description={wmw.unauthenticatedDescription}
        signInLabel={wmw.signInLabel}
        nextPath={pathname}
      />
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
