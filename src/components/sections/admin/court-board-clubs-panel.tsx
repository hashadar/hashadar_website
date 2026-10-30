'use client';

import { FormEvent, useId, useState } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import { copyText } from '@/components/sections/labs/court-board/organiser-copy-button';
import { admin } from '@/data';
import { createClubAction } from '@/lib/court-board/admin-actions';
import type { CreateClubResult } from '@/lib/court-board/admin-service';

const fieldClassName =
  'mt-2 w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';

/** The signed-in Site Admin's Cognito ID token, which the server verifies. */
async function getIdToken(): Promise<string | null> {
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

export interface CourtBoardClubsPanelProps {
  /** Injectable for tests. */
  createClub?: (idToken: unknown, input: unknown) => Promise<CreateClubResult>;
  getToken?: () => Promise<string | null>;
}

export function CourtBoardClubsPanel({
  createClub = createClubAction,
  getToken = getIdToken,
}: CourtBoardClubsPanelProps) {
  const copy = admin.courtBoard;
  const id = useId();
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('11:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setCopied('idle');
    try {
      const token = await getToken();
      if (!token) {
        setError(copy.errors.unauthorised);
        return;
      }
      const result = await createClub(token, { name, venue, start, end });
      if (result.ok) {
        setLink(`${window.location.origin}${result.organiserPath}`);
        setName('');
        setVenue('');
      } else {
        setError(copy.errors[result.error]);
      }
    } catch {
      setError(copy.errors.unavailable);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (link) setCopied((await copyText(link)) ? 'copied' : 'failed');
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-6 lg:col-span-2">
      <Heading size="sm" as="h2" id={`${id}-heading`}>
        {copy.heading}
      </Heading>
      <Text variant="muted" size="sm">
        {copy.description}
      </Text>

      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block font-body text-sm">
            {copy.nameLabel}
            <input
              className={fieldClassName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              required
            />
          </label>
          <label className="block font-body text-sm">
            {copy.venueLabel}
            <input
              className={fieldClassName}
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              maxLength={80}
              required
            />
          </label>
          <label className="block font-body text-sm">
            {copy.startLabel}
            <input
              type="time"
              className={fieldClassName}
              value={start}
              onChange={(event) => setStart(event.target.value)}
              required
            />
          </label>
          <label className="block font-body text-sm">
            {copy.endLabel}
            <input
              type="time"
              className={fieldClassName}
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              required
            />
          </label>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? copy.creatingLabel : copy.createLabel}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="font-body text-sm text-[var(--destructive,var(--primary))]">
          {error}
        </p>
      ) : null}

      {link ? (
        <div className="space-y-3 border-2 border-[var(--border)] p-4">
          <Heading size="sm" as="h3">
            {copy.linkHeading}
          </Heading>
          <Text size="sm">{copy.linkWarning}</Text>
          <input
            readOnly
            aria-label={copy.linkHeading}
            value={link}
            onFocus={(event) => event.currentTarget.select()}
            className={`${fieldClassName} font-mono text-sm`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => void handleCopy()}>
              {copy.copyLabel}
            </Button>
            <Button type="button" variant="outline" onClick={() => setLink(null)}>
              {copy.dismissLabel}
            </Button>
            <span role="status" aria-live="polite" className="font-body text-sm">
              {copied === 'copied' ? copy.copiedLabel : null}
              {copied === 'failed' ? copy.copyFailedLabel : null}
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
