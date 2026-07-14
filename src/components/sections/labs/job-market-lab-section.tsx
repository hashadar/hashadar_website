import { Container, Section, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import type { PublishedJobMarketResult } from '@/lib/job-market-lab';

interface JobMarketLabSectionProps {
  publication: PublishedJobMarketResult;
}

export function JobMarketLabSection({ publication }: JobMarketLabSectionProps) {
  return (
    <Section className="py-20">
      <Container>
        <div className="mb-12 max-w-2xl space-y-4">
          <SectionHeader animated={false}>{jobMarketLab.heading}</SectionHeader>
          <Text variant="muted">{jobMarketLab.description}</Text>
          <Text size="sm" variant="muted">
            {jobMarketLab.corpusNote}
          </Text>
        </div>

        {publication.status === 'empty' ? (
          <div className="max-w-2xl space-y-2" role="status">
            <Text>{jobMarketLab.emptyState}</Text>
          </div>
        ) : null}
      </Container>
    </Section>
  );
}
