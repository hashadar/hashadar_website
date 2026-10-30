'use client';

import { useState } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import { courtBoard } from '@/data';
import { formatLocalDate, formatLocalTime } from '@/lib/court-board/format';
import { cancelSessionAction } from '@/lib/court-board/organiser-actions';
import type {
  NewSessionDefaults,
  OrganiserOverview,
} from '@/lib/court-board/views';
import { OrganiserCopyButton } from '@/components/sections/labs/court-board/organiser-copy-button';
import { OrganiserDialog } from '@/components/sections/labs/court-board/organiser-dialog';
import { OrganiserRegister } from '@/components/sections/labs/court-board/organiser-register';
import { fill } from '@/components/sections/labs/court-board/organiser-template';
import { useOrganiserAction } from '@/components/sections/labs/court-board/organiser-use-action';

const copy = courtBoard.organiser;

export interface OrganiserSessionPanelProps {
  overview: OrganiserOverview;
  /** Open the New session tab with these values filled in. */
  onCopyNext: (defaults: NewSessionDefaults) => void;
  onCreateFirst: () => void;
}

export function OrganiserSessionPanel({
  overview,
  onCopyNext,
  onCreateFirst,
}: OrganiserSessionPanelProps) {
  const detail = overview.selected;
  const { busy, error, run, reset } = useOrganiserAction();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (!detail) {
    return (
      <div className="py-6">
        <Text variant="muted" size="sm">
          {copy.current.empty}
        </Text>
        <Button variant="primary" size="md" className="mt-4 min-h-11" onClick={onCreateFirst}>
          {copy.current.createFirst}
        </Button>
      </div>
    );
  }

  const { session } = detail;
  const cancelled = session.status === 'cancelled';
  const canCancel = !cancelled && !session.registerClosed;

  const cancelSession = async () => {
    const done = await run(() => cancelSessionAction({ sessionId: session.id }));
    if (done) setConfirmingCancel(false);
  };

  return (
    <div className="py-6">
      <Heading as="h2" size="md" className="font-semibold tracking-[-0.03em]">
        {formatLocalDate(session.localDate)} · {formatLocalTime(session.startTime)}–
        {formatLocalTime(session.endTime)}
      </Heading>
      <Text variant="muted" size="sm" className="mt-1">
        {session.venue}
      </Text>
      <Text size="sm" className="mt-2 font-medium">
        {fill(copy.current.status, {
          taken: detail.taken,
          capacity: session.capacity,
          waiting: detail.waiting,
        })}
      </Text>
      {cancelled ? (
        <Text size="sm" className="mt-2 text-amber-700 dark:text-amber-400">
          {copy.current.cancelledNote}
        </Text>
      ) : null}

      <div className="mt-5 flex flex-wrap items-start gap-3">
        <OrganiserCopyButton
          label={copy.current.copyList}
          getText={() => detail.listText}
          className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
        />
        <OrganiserCopyButton
          label={copy.current.copySignup}
          getText={() => `${window.location.origin}${detail.signupPath}`}
        />
        <span className="inline-flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={() => onCopyNext(detail.nextDefaults)}
            className="min-h-11 border border-[var(--border)] px-4 py-2 font-body text-sm font-medium hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            {fill(copy.current.copyNext, {
              date: formatLocalDate(detail.nextDefaults.localDate),
            })}
          </button>
        </span>
        {canCancel ? (
          <button
            type="button"
            onClick={() => {
              reset();
              setConfirmingCancel(true);
            }}
            className="min-h-11 px-4 py-2 font-body text-sm text-red-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] dark:text-red-400"
          >
            {copy.current.cancelSession}
          </button>
        ) : null}
      </div>

      <OrganiserRegister detail={detail} now={overview.now} />

      {confirmingCancel ? (
        <OrganiserDialog
          title={copy.current.cancelSessionTitle}
          confirmLabel={copy.current.cancelSessionConfirm}
          tone="danger"
          busy={busy}
          error={error}
          onClose={() => setConfirmingCancel(false)}
          onConfirm={cancelSession}
        >
          <p>{copy.current.cancelSessionBody}</p>
        </OrganiserDialog>
      ) : null}
    </div>
  );
}
