import {
  Button,
  Container,
  MotionReveal,
  Section,
  SectionHeader,
  Text,
} from '@/components/ui';
import { labs } from '@/data';

export function LabsIndexSection() {
  return (
    <Section className="py-20">
      <Container>
        <div className="mb-16 max-w-2xl space-y-4">
          <SectionHeader animated={false}>{labs.heading}</SectionHeader>
          <Text variant="muted">{labs.description}</Text>
        </div>

        <ul className="space-y-10">
          {labs.labs.map((lab, index) => (
            <MotionReveal key={lab.href} variant="fade-up" distance="sm" delay={index * 0.05}>
              <li className="max-w-2xl space-y-4">
                <SectionHeader size="md" animated={false} showLeftAccent={false}>
                  {lab.title}
                </SectionHeader>
                <Text size="sm" variant="muted">
                  {lab.description}
                </Text>
                <Button href={lab.href} variant="outline" size="sm">
                  Open lab
                </Button>
              </li>
            </MotionReveal>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
