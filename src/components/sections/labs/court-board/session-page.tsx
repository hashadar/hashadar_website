'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Container, Heading, Section, Text } from '@/components/ui';
import { courtBoard } from '@/data';
import { formatLocalDate, formatLocalTime } from '@/lib/court-board/format';
import type { SeatRow, SessionView } from '@/lib/court-board/views';
import { cn } from '@/lib/utils';
import { AutoRefresh } from './auto-refresh';
import { PRIVACY_PATH, rulesPath } from './court-board-links';
import { fillTemplate } from './fill-template';
import { ManagePlace } from './manage-place';
import { statusSentences } from './session-status';
import { SignupForm, type Credentials } from './signup-form';

function SeatList({ rows }: { rows: SeatRow[] }) {
  const copy = courtBoard.player.session;
  return (
    <ol className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
      {rows.map((row, index) => (
        <li key={row.id} className="flex items-baseline gap-3 py-2 font-body text-base">
          <span className="w-7 shrink-0 text-right text-sm tabular-nums text-[var(--mono-500)]">
            {index + 1}.
          </span>
          <span className="min-w-0 break-words">
            {row.kind === 'guest' && row.hostName
              ? fillTemplate(copy.guestLabel, { host: row.hostName, name: row.name })
              : row.name}
          </span>
        </li>
      ))}
    </ol>
  );
}

export interface SessionPageProps {
  view: SessionView;
}

export function SessionPage({ view }: SessionPageProps) {
  const copy = courtBoard.player.session;
  const router = useRouter();
  const manageId = useId();
  const [manageOpen, setManageOpen] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const { session } = view;
  const percent =
    session.capacity > 0 ? Math.min(100, (view.taken / session.capacity) * 100) : 0;
  const waitlists = view.waitlists.filter((w) => w.rows.length > 0);

  return (
    <Section spacing="sm" className="bg-[var(--cream)]">
      <Container size="sm" className="space-y-10">
        <AutoRefresh />

        <header className="space-y-1">
          <Text variant="accent" size="xs" className="uppercase tracking-[0.2em]">
            {view.clubName}
          </Text>
          <Heading
            as="h1"
            size="lg"
            className="font-semibold tracking-[-0.04em]"
            style={{ lineHeight: 1 }}
          >
            {formatLocalDate(session.localDate)}
          </Heading>
          <Text variant="muted" size="sm">
            {formatLocalTime(session.startTime)}–{formatLocalTime(session.endTime)} ·{' '}
            {session.venue}
          </Text>
        </header>

        <section
          aria-label={copy.progressLabel}
          className="space-y-3 border-2 border-[var(--border)] bg-[var(--background)] p-5"
        >
          <p className="font-body text-lg font-medium">
            {fillTemplate(copy.placesTaken, {
              taken: view.taken,
              capacity: session.capacity,
            })}
          </p>
          <div
            role="progressbar"
            aria-label={copy.progressLabel}
            aria-valuemin={0}
            aria-valuemax={session.capacity}
            aria-valuenow={view.taken}
            className="h-2 w-full bg-[var(--muted)]"
          >
            <div
              className="h-full bg-[var(--primary)] transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
          {statusSentences(view).map((sentence) => (
            <p key={sentence} className="font-body text-sm text-[var(--mono-500)]">
              {sentence}
            </p>
          ))}
        </section>

        {view.openForSignup ? (
          <SignupForm
            view={view}
            onSignedUp={(creds) => {
              setCredentials(creds);
              setManageOpen(true);
              router.refresh();
            }}
          />
        ) : (
          <p className="font-body text-sm text-[var(--mono-500)]">
            {copy.signupClosedNote}
          </p>
        )}

        <section aria-labelledby={`${manageId}-playing`} className="space-y-3">
          <Heading as="h2" size="md" id={`${manageId}-playing`}>
            {fillTemplate(copy.playingHeading, { count: view.playing.length })}
          </Heading>
          {view.playing.length > 0 ? (
            <SeatList rows={view.playing} />
          ) : (
            <Text size="sm" variant="muted">
              {copy.playingEmpty}
            </Text>
          )}
        </section>

        {waitlists.map((waitlist) => (
          <section key={waitlist.band ?? 'combined'} className="space-y-3">
            <Heading as="h2" size="sm">
              {waitlist.band
                ? fillTemplate(copy.waitlistBandHeading, {
                    band: courtBoard.tiers[waitlist.band],
                    count: waitlist.rows.length,
                  })
                : fillTemplate(copy.waitlistHeading, { count: waitlist.rows.length })}
            </Heading>
            <SeatList rows={waitlist.rows} />
          </section>
        ))}

        <section className="space-y-4 border-t border-[var(--border)] pt-6">
          <button
            type="button"
            aria-expanded={manageOpen}
            aria-controls={manageId}
            onClick={() => setManageOpen((open) => !open)}
            className={cn(
              'min-h-11 border-2 border-[var(--border)] px-4 font-body text-sm font-medium hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]',
              manageOpen && 'bg-[var(--muted)]',
            )}
          >
            {copy.manageToggle}
          </button>
          {/* Kept mounted while closed so a half-finished form is not lost. */}
          <div id={manageId} hidden={!manageOpen}>
            <ManagePlace
              view={view}
              initialCredentials={credentials}
              onChanged={() => router.refresh()}
            />
          </div>
        </section>

        <nav
          aria-label={courtBoard.rules.linkLabel}
          className="flex flex-wrap gap-x-6 gap-y-1 border-t border-[var(--border)] pt-4 font-body text-sm"
        >
          <Link
            href={rulesPath(session.id)}
            className="inline-flex min-h-11 items-center underline underline-offset-2"
          >
            {courtBoard.rules.linkLabel}
          </Link>
          <Link
            href={PRIVACY_PATH}
            className="inline-flex min-h-11 items-center underline underline-offset-2"
          >
            {courtBoard.privacy.linkLabel}
          </Link>
        </nav>
      </Container>
    </Section>
  );
}
