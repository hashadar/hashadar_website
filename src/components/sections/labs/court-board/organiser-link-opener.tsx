'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Container, Section, Text } from '@/components/ui';
import { courtBoard } from '@/data';
import { openOrganiserLinkAction } from '@/lib/court-board/organiser-actions';

/**
 * Opens an Organiser link of the form `/labs/court-board/o#<token>`. The part
 * after `#` never reaches the server or its access logs, so the token is read
 * here and posted to the server, which sets the Organiser cookie. Then the
 * address bar is replaced without the token and the page reloads its data.
 *
 * `fallback` is what to show when there is nothing to open (the "not valid"
 * page); while checking or opening, a short holding message shows instead.
 */
export function OrganiserLinkOpener({ fallback }: { fallback?: ReactNode }) {
  const router = useRouter();
  // Refs survive React's development double-run, so each token is sent once.
  const sent = useRef(new Set<string>());
  const [state, setState] = useState<'checking' | 'opening' | 'done'>('checking');

  useEffect(() => {
    function open() {
      const token = window.location.hash.slice(1);
      if (!token || sent.current.has(token)) {
        setState((current) => (current === 'checking' ? 'done' : current));
        return;
      }
      sent.current.add(token);
      setState('opening');
      openOrganiserLinkAction(token)
        .catch(() => null)
        .finally(() => {
          setState('done');
          // Through the router, not history.replaceState: the App Router would
          // otherwise put its own copy of the URL, token included, back.
          router.replace(window.location.pathname + window.location.search, { scroll: false });
          router.refresh();
        });
    }
    open();
    // Pasting a new link while already on this page changes only the `#` part,
    // which does not reload the page.
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, [router]);

  if (state === 'done') return fallback ?? null;
  if (fallback === undefined) return null;
  return (
    <Section spacing="md" className="bg-[var(--cream)]">
      <Container size="sm">
        <Text role="status" variant="muted" size="sm">
          {courtBoard.organiser.opening}
        </Text>
      </Container>
    </Section>
  );
}
