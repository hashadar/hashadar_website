'use client';

import { useState } from 'react';
import { Heading, Text } from '@/components/ui';
import { courtBoard } from '@/data';
import { rotateLinkAction } from '@/lib/court-board/organiser-actions';
import { OrganiserCopyButton } from '@/components/sections/labs/court-board/organiser-copy-button';
import { OrganiserDialog } from '@/components/sections/labs/court-board/organiser-dialog';
import { useOrganiserAction } from '@/components/sections/labs/court-board/organiser-use-action';

const copy = courtBoard.organiser.link;

/**
 * Rotating the link replaces the token everywhere. The action moves this
 * browser's cookie to the new one, so the Organiser stays signed in; the new
 * link is shown once, in memory only, and never stored.
 */
export function OrganiserLinkSection() {
  const { busy, error, run, reset } = useOrganiserAction();
  const [confirming, setConfirming] = useState(false);
  const [newLink, setNewLink] = useState<string | null>(null);

  const rotate = async () => {
    const result = await run(() => rotateLinkAction());
    if (result) {
      setNewLink(`${window.location.origin}${result.link}`);
      setConfirming(false);
    }
  };

  return (
    <section aria-labelledby="organiser-link-heading" className="mt-12 border-t border-[var(--border)] pt-6">
      <Heading as="h2" size="sm" id="organiser-link-heading">
        {copy.heading}
      </Heading>
      <Text variant="muted" size="sm" className="mt-2 max-w-[34rem]">
        {copy.body}
      </Text>

      {newLink ? (
        <div role="alert" className="mt-4 max-w-xl border border-amber-600 p-4">
          <p className="font-body text-sm font-semibold text-[var(--foreground)]">{copy.newHeading}</p>
          <p className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">{newLink}</p>
          <p className="mt-2 font-body text-xs text-amber-800 dark:text-amber-300">{copy.newWarning}</p>
          <div className="mt-3 flex flex-wrap items-start gap-3">
            <OrganiserCopyButton label={copy.copyNew} getText={() => newLink} />
            <button
              type="button"
              onClick={() => setNewLink(null)}
              className="min-h-11 border border-[var(--border)] px-4 py-2 font-body text-sm hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {copy.dismiss}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            reset();
            setConfirming(true);
          }}
          className="mt-4 min-h-11 border border-[var(--border)] px-4 py-2 font-body text-sm hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {copy.rotate}
        </button>
      )}

      {confirming ? (
        <OrganiserDialog
          title={copy.rotateTitle}
          confirmLabel={copy.rotateConfirm}
          tone="danger"
          busy={busy}
          error={error}
          onClose={() => setConfirming(false)}
          onConfirm={rotate}
        >
          <p>{copy.rotateBody}</p>
        </OrganiserDialog>
      ) : null}
    </section>
  );
}
