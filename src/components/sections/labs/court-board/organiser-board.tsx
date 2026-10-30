'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { Container, Section, Text } from '@/components/ui';
import { courtBoard } from '@/data';
import { formatLocalDate, formatLocalTime } from '@/lib/court-board/format';
import type { NewSessionDefaults, OrganiserOverview } from '@/lib/court-board/views';
import { OrganiserHoldsPanel } from '@/components/sections/labs/court-board/organiser-holds-panel';
import { OrganiserLinkSection } from '@/components/sections/labs/court-board/organiser-link-section';
import { OrganiserNewSessionForm } from '@/components/sections/labs/court-board/organiser-new-session-form';
import { OrganiserSessionPanel } from '@/components/sections/labs/court-board/organiser-session-panel';
import { cn } from '@/lib/utils';

const copy = courtBoard.organiser;

type TabId = 'current' | 'holds' | 'newSession';
const TABS: TabId[] = ['current', 'holds', 'newSession'];

const organiserPath = (sessionId: string) => `/labs/court-board/o?session=${sessionId}`;

export interface OrganiserBoardProps {
  overview: OrganiserOverview;
}

export function OrganiserBoard({ overview }: OrganiserBoardProps) {
  const router = useRouter();
  const baseId = useId();
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    current: null,
    holds: null,
    newSession: null,
  });
  const [tab, setTab] = useState<TabId>('current');
  const [prefill, setPrefill] = useState<NewSessionDefaults | null>(null);

  const selectedId = overview.selected?.session.id ?? null;
  const formDefaults =
    prefill ?? overview.selected?.nextDefaults ?? overview.firstSessionDefaults;

  const tabLabel = (id: TabId) =>
    id === 'holds' && overview.holds.length > 0
      ? `${copy.tabs.holds} (${overview.holds.length})`
      : copy.tabs[id];

  const focusTab = (id: TabId) => {
    setTab(id);
    tabRefs.current[id]?.focus();
  };

  const onTabKeyDown = (event: React.KeyboardEvent, id: TabId) => {
    const index = TABS.indexOf(id);
    if (event.key === 'ArrowRight') focusTab(TABS[(index + 1) % TABS.length]);
    else if (event.key === 'ArrowLeft') focusTab(TABS[(index - 1 + TABS.length) % TABS.length]);
    else if (event.key === 'Home') focusTab(TABS[0]);
    else if (event.key === 'End') focusTab(TABS[TABS.length - 1]);
    else return;
    event.preventDefault();
  };

  const startNewSession = (defaults: NewSessionDefaults | null) => {
    setPrefill(defaults);
    setTab('newSession');
  };

  const onCreated = (sessionId: string) => {
    setPrefill(null);
    setTab('current');
    router.push(organiserPath(sessionId));
  };

  const tabId = (id: TabId) => `${baseId}-tab-${id}`;
  const panelId = (id: TabId) => `${baseId}-panel-${id}`;

  return (
    <Section spacing="sm" className="bg-[var(--cream)]">
      <Container size="md">
        <Text variant="accent" size="xs" className="uppercase tracking-[0.2em]">
          {copy.eyebrow}
        </Text>
        <Text size="lg" className="mt-1 font-semibold">
          {overview.club.name}
        </Text>

        <nav aria-label={copy.sessionPicker.label} className="mt-5">
          <p className="font-body text-xs uppercase tracking-wide text-[var(--mono-500)]">
            {copy.sessionPicker.label}
          </p>
          {overview.sessions.length === 0 ? (
            <Text variant="muted" size="sm" className="mt-1">
              {copy.sessionPicker.empty}
            </Text>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {overview.sessions.map((s) => {
                const status = s.status === 'cancelled'
                  ? copy.sessionPicker.cancelled
                  : s.registerClosed
                    ? copy.sessionPicker.registerClosed
                    : copy.sessionPicker.open;
                return (
                  <li key={s.id}>
                    <Link
                      href={organiserPath(s.id)}
                      aria-current={s.id === selectedId ? 'page' : undefined}
                      className={cn(
                        'inline-flex min-h-11 flex-col justify-center border px-3 py-1 font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]',
                        s.id === selectedId
                          ? 'border-[var(--primary)] bg-[var(--background)] font-medium'
                          : 'border-[var(--border)] hover:bg-[var(--muted)]',
                      )}
                    >
                      <span>
                        {formatLocalDate(s.localDate)} · {formatLocalTime(s.startTime)}
                      </span>
                      <span className="text-xs text-[var(--mono-500)]">{status}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <div
          role="tablist"
          aria-label={copy.tabsAriaLabel}
          className="mt-6 flex flex-wrap gap-1 border-b border-[var(--border)]"
        >
          {TABS.map((id) => (
            <button
              key={id}
              ref={(node) => {
                tabRefs.current[id] = node;
              }}
              type="button"
              role="tab"
              id={tabId(id)}
              aria-selected={tab === id}
              aria-controls={panelId(id)}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(event) => onTabKeyDown(event, id)}
              className={cn(
                '-mb-px min-h-11 border-b-2 px-4 py-2 font-body text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]',
                tab === id
                  ? 'border-[var(--primary)] text-[var(--foreground)]'
                  : 'border-transparent text-[var(--mono-500)] hover:text-[var(--foreground)]',
              )}
            >
              {tabLabel(id)}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={panelId('current')} aria-labelledby={tabId('current')} hidden={tab !== 'current'}>
          <OrganiserSessionPanel
            key={selectedId ?? 'none'}
            overview={overview}
            onCopyNext={startNewSession}
            onCreateFirst={() => startNewSession(null)}
          />
        </div>
        <div role="tabpanel" id={panelId('holds')} aria-labelledby={tabId('holds')} hidden={tab !== 'holds'}>
          <OrganiserHoldsPanel overview={overview} />
        </div>
        <div role="tabpanel" id={panelId('newSession')} aria-labelledby={tabId('newSession')} hidden={tab !== 'newSession'}>
          <OrganiserNewSessionForm
            key={JSON.stringify(formDefaults)}
            defaults={formDefaults}
            copied={prefill !== null}
            onCreated={onCreated}
          />
        </div>

        <OrganiserLinkSection />
      </Container>
    </Section>
  );
}
