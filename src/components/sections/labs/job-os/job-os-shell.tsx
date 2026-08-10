'use client';

import { Container, Section, SectionHeader, Text } from '@/components/ui';
import { JobOsNav } from '@/components/sections/labs/job-os/job-os-nav';
import {
  LabsSessionChecking,
  LabsSignInGate,
} from '@/components/sections/labs/labs-sign-in-gate';
import { jobOs } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';

export type JobOsShellProps = {
  children: React.ReactNode;
};

export function JobOsShell({ children }: JobOsShellProps) {
  const { session, isLoading } = useSiteAuth();

  if (isLoading) {
    return <LabsSessionChecking label={jobOs.checkingSessionLabel} />;
  }

  if (session === null || session.status !== 'authenticated') {
    return (
      <LabsSignInGate
        heading={jobOs.unauthenticatedHeading}
        description={jobOs.unauthenticatedDescription}
        signInLabel={jobOs.signInLabel}
        nextPath="/labs/job-os"
      />
    );
  }

  return (
    <Section className="py-10 md:py-12">
      <Container size="full">
        <div className="mb-8 max-w-3xl space-y-3">
          <SectionHeader animated={false} showLeftAccent>
            {jobOs.shell.heading}
          </SectionHeader>
          <Text variant="muted">{jobOs.shell.description}</Text>
        </div>

        <div className="grid gap-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
          <aside className="md:sticky md:top-24 md:self-start md:border-r md:border-[color-mix(in_oklab,var(--primary)_22%,var(--border))] md:pr-6">
            <JobOsNav />
          </aside>
          <div className="min-w-0 space-y-10">{children}</div>
        </div>
      </Container>
    </Section>
  );
}
