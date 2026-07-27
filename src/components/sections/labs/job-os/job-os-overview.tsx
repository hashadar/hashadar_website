'use client';

import Link from 'next/link';
import { Button, Heading, Text } from '@/components/ui';
import { jobOs } from '@/data';

export function JobOsOverview() {
  const copy = jobOs.overview;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Heading size="md" as="h2">
          {copy.heading}
        </Heading>
        <Text variant="muted">{copy.description}</Text>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button href="/labs/job-os/employers" variant="primary" size="sm">
          {copy.employersCta}
        </Button>
        <Button href="/labs/job-os/opportunities" variant="outline" size="sm">
          {copy.opportunitiesCta}
        </Button>
        <Button href="/labs/job-os/applications" variant="outline" size="sm">
          {copy.applicationsCta}
        </Button>
      </div>
      <Text variant="muted">
        <Link
          href="/labs"
          className="underline underline-offset-4 text-[var(--foreground)]"
        >
          Labs
        </Link>
      </Text>
    </div>
  );
}
