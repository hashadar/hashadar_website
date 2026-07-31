'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container, Section, SectionHeader, Text, Button } from '@/components/ui';
import { useSiteAuth } from '@/hooks/use-site-auth';

export type RequireSiteAuthProps = {
  children: React.ReactNode;
  /** Shown while session is loading */
  checkingLabel?: string;
  unauthenticatedHeading?: string;
  unauthenticatedDescription?: string;
  signInLabel?: string;
};

export function RequireSiteAuth({
  children,
  checkingLabel = 'Checking session…',
  unauthenticatedHeading = 'Sign in required',
  unauthenticatedDescription = 'Sign in as the Site Admin to continue.',
  signInLabel = 'Sign in',
}: RequireSiteAuthProps) {
  const { session, isLoading } = useSiteAuth();
  const pathname = usePathname();

  if (isLoading || session === null) {
    return (
      <Section className="py-12 md:py-16">
        <Container>
          <Text variant="muted">{checkingLabel}</Text>
        </Container>
      </Section>
    );
  }

  if (session.status !== 'authenticated') {
    const href = `/login?next=${encodeURIComponent(pathname || '/admin')}`;
    return (
      <Section className="py-12 md:py-16">
        <Container>
          <div className="max-w-2xl space-y-4">
            <SectionHeader animated={false}>{unauthenticatedHeading}</SectionHeader>
            <Text variant="muted">{unauthenticatedDescription}</Text>
            <Link
              href={href}
              className="inline-flex font-body text-base text-[var(--foreground)] underline underline-offset-4"
            >
              {signInLabel}
            </Link>
          </div>
        </Container>
      </Section>
    );
  }

  return children;
}

export type AdminSignOutButtonProps = {
  label?: string;
};

export function AdminSignOutButton({ label = 'Sign out' }: AdminSignOutButtonProps) {
  const { signOut } = useSiteAuth();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        void (async () => {
          await signOut();
          window.location.assign('/');
        })();
      }}
    >
      {label}
    </Button>
  );
}
