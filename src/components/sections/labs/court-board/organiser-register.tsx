'use client';

import { useState } from 'react';
import { Heading, Text } from '@/components/ui';
import { courtBoard } from '@/data';
import { formatInstantDate } from '@/lib/court-board/format';
import {
  closeRegisterAction,
  previewCloseRegisterAction,
} from '@/lib/court-board/organiser-actions';
import type {
  OrganiserSessionDetail,
  RegisterPreview,
} from '@/lib/court-board/views';
import { OrganiserDialog } from '@/components/sections/labs/court-board/organiser-dialog';
import { OrganiserRegisterRow } from '@/components/sections/labs/court-board/organiser-register-row';
import { fill } from '@/components/sections/labs/court-board/organiser-template';
import { useOrganiserAction } from '@/components/sections/labs/court-board/organiser-use-action';

const copy = courtBoard.organiser;

export interface OrganiserRegisterProps {
  detail: OrganiserSessionDetail;
  /** ISO instant the server rendered the page at. */
  now: string;
}

export function OrganiserRegister({ detail, now }: OrganiserRegisterProps) {
  const { session } = detail;
  const { busy, error, run, reset } = useOrganiserAction();
  const [preview, setPreview] = useState<RegisterPreview | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const cancelled = session.status === 'cancelled';
  const closed = session.registerClosed;
  const started = new Date(now).getTime() >= new Date(detail.times.startsAt).getTime();
  const locked = cancelled || closed;
  const canClose = !locked && started;

  const playing = detail.rows.filter((row) => row.state === 'main');
  const waiting = detail.rows.filter((row) => row.state === 'waitlist');

  const openPreview = async () => {
    setDoneMessage(null);
    const result = await run(() => previewCloseRegisterAction({ sessionId: session.id }), {
      refresh: false,
    });
    if (result) setPreview(result.preview);
  };

  const confirmClose = async () => {
    const result = await run(() => closeRegisterAction({ sessionId: session.id }));
    if (result) {
      setPreview(null);
      setDoneMessage(fill(copy.register.closeDone, { count: result.penalties }));
    }
  };

  const dismiss = () => {
    setPreview(null);
    reset();
  };

  const note = cancelled
    ? copy.register.cancelledNote
    : closed
      ? copy.register.closedNote
      : !started
        ? copy.register.closeNotStarted
        : null;

  return (
    <section aria-labelledby="register-heading" className="mt-8">
      <Heading as="h3" size="sm" id="register-heading">
        {copy.register.heading}
      </Heading>

      {detail.rows.length === 0 ? (
        <Text variant="muted" size="sm" className="mt-3">
          {copy.register.empty}
        </Text>
      ) : null}

      {playing.length > 0 ? (
        <>
          <h4 className="mt-4 font-body text-sm font-semibold text-[var(--foreground)]">
            {copy.register.playingHeading} · {playing.length}/{session.capacity}
          </h4>
          <ul className="border-t border-[var(--border)]">
            {playing.map((row) => (
              <OrganiserRegisterRow key={row.id} row={row} sessionId={session.id} locked={locked} />
            ))}
          </ul>
        </>
      ) : null}

      {waiting.length > 0 ? (
        <>
          <h4 className="mt-6 font-body text-sm font-semibold text-[var(--foreground)]">
            {copy.register.waitlistHeading} · {waiting.length}
          </h4>
          <ul className="border-t border-[var(--border)]">
            {waiting.map((row) => (
              <OrganiserRegisterRow key={row.id} row={row} sessionId={session.id} locked={locked} />
            ))}
          </ul>
        </>
      ) : null}

      <div className="mt-6">
        <button
          type="button"
          disabled={!canClose || busy}
          onClick={openPreview}
          className="min-h-11 bg-[var(--primary)] px-5 py-2 font-body text-sm font-medium text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {copy.register.closeRegister}
        </button>
        {note ? (
          <Text variant="muted" size="xs" className="mt-2">
            {note}
          </Text>
        ) : null}
        {doneMessage ? (
          <p role="status" className="mt-2 font-body text-sm text-[var(--primary)]">
            {doneMessage}
          </p>
        ) : null}
        {error && !preview ? (
          <p role="alert" className="mt-2 font-body text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>

      {preview ? (
        <OrganiserDialog
          title={copy.register.closeTitle}
          confirmLabel={copy.register.closeConfirm}
          busy={busy}
          error={error}
          onClose={dismiss}
          onConfirm={confirmClose}
        >
          <p>
            {fill(copy.register.closeSummary, {
              attended: preview.attended,
              noShows: preview.noShows,
            })}
          </p>
          {preview.penalties.length === 0 ? (
            <p>{copy.register.closeNoHolds}</p>
          ) : (
            <>
              <p className="font-medium">{copy.register.closeHoldsHeading}</p>
              <ul className="list-disc space-y-1 pl-5">
                {preview.penalties.map((p) => (
                  <li key={`${p.displayName}-${p.reason}`}>
                    {fill(copy.register.closeHoldLine, {
                      name: p.displayName,
                      reason: copy.reasons[p.reason] ?? p.reason,
                      weeks: p.weeks,
                      date: formatInstantDate(p.endsAt),
                    })}
                  </li>
                ))}
              </ul>
            </>
          )}
        </OrganiserDialog>
      ) : null}
    </section>
  );
}
