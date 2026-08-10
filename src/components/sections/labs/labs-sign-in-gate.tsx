import Link from 'next/link';
import { Container, Section, Text } from '@/components/ui';

export type LabsSignInGateProps = {
  heading: string;
  description: string;
  signInLabel: string;
  nextPath: string;
};

/** Quiet unauthenticated gate for private Labs tools (not a marketing hero). */
export function LabsSignInGate({
  heading,
  description,
  signInLabel,
  nextPath,
}: LabsSignInGateProps) {
  return (
    <Section className="py-8 md:py-10">
      <Container>
        <div className="max-w-2xl space-y-3">
          <h1 className="font-display text-2xl tracking-tight text-[var(--foreground)]">
            {heading}
          </h1>
          <Text variant="muted">{description}</Text>
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="inline-flex font-body text-sm text-[var(--foreground)] underline underline-offset-4"
          >
            {signInLabel}
          </Link>
        </div>
      </Container>
    </Section>
  );
}

export type LabsSessionCheckingProps = {
  label: string;
};

/** Loading state with the same section density as LabsSignInGate. */
export function LabsSessionChecking({ label }: LabsSessionCheckingProps) {
  return (
    <Section className="py-8 md:py-10">
      <Container>
        <Text variant="muted">{label}</Text>
      </Container>
    </Section>
  );
}
