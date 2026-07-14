'use client';

import { FormEvent, useState } from 'react';
import {
  Button,
  Container,
  Heading,
  Section,
  Text,
} from '@/components/ui';
import { login } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';

const fieldClassName =
  'mt-2 w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';

export function LoginSection() {
  const { session, isLoading, signIn, signOut } = useSiteAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError(login.errors.required);
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (result.status === 'failed') {
      setError(result.reason);
      return;
    }

    setPassword('');
  }

  async function handleSignOut() {
    setError(null);
    await signOut();
  }

  if (isLoading || session === null) {
    return (
      <Section className="py-20">
        <Container>
          <Text variant="muted">Checking session…</Text>
        </Container>
      </Section>
    );
  }

  if (session.status === 'authenticated') {
    return (
      <Section className="py-20">
        <Container>
          <div className="mx-auto max-w-md space-y-6">
            <Heading size="md" as="h1">
              {login.signedInHeading}
            </Heading>
            <Text>
              {login.signedInDescription.replace('{email}', session.email)}
            </Text>
            <Button type="button" variant="outline" onClick={() => void handleSignOut()}>
              {login.signOutLabel}
            </Button>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="py-20">
      <Container>
        <div className="mx-auto max-w-md space-y-8">
          <div className="space-y-4">
            <Heading size="md" as="h1">
              {login.heading}
            </Heading>
            <Text variant="muted">{login.description}</Text>
          </div>

          <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)} noValidate>
            <div>
              <label htmlFor="login-email" className="font-body text-sm text-[var(--foreground)]">
                {login.emailLabel}
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClassName}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="font-body text-sm text-[var(--foreground)]">
                {login.passwordLabel}
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClassName}
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="font-body text-base leading-relaxed text-[var(--destructive,var(--primary))]"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={isSubmitting}>
              {login.submitLabel}
            </Button>
          </form>
        </div>
      </Container>
    </Section>
  );
}
