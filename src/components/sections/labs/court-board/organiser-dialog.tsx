'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Heading } from '@/components/ui';
import { courtBoard } from '@/data';
import { cn } from '@/lib/utils';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface OrganiserDialogProps {
  title: string;
  onClose: () => void;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  /** Disables both buttons and shows the working label while an action runs. */
  busy?: boolean;
  /** `danger` styles the confirm button as a warning. */
  tone?: 'default' | 'danger';
  error?: string | null;
  /** Hide the confirm button, e.g. when the dialog only shows a result. */
  hideConfirm?: boolean;
}

/**
 * A small modal: focus moves in, Tab stays inside, Escape and the backdrop
 * close it, and focus returns to whatever opened it. Rendered only while open.
 */
export function OrganiserDialog({
  title,
  onClose,
  children,
  confirmLabel,
  onConfirm,
  busy = false,
  tone = 'default',
  error,
  hideConfirm = false,
}: OrganiserDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  const buttonBase =
    'min-h-11 px-4 py-2 font-body text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:opacity-60';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto border border-[var(--border)] bg-[var(--background)] p-5 shadow-xl"
      >
        <Heading as="h2" size="sm" id={titleId}>
          {title}
        </Heading>
        <div className="mt-3 space-y-3 font-body text-sm text-[var(--foreground)]">
          {children}
        </div>
        {error ? (
          <p role="alert" className="mt-3 font-body text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={cn(buttonBase, 'border border-[var(--border)] hover:bg-[var(--muted)]')}
          >
            {courtBoard.organiser.dialog.cancel}
          </button>
          {hideConfirm ? null : (
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={cn(
                buttonBase,
                tone === 'danger'
                  ? 'bg-red-700 text-white hover:bg-red-800'
                  : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]',
              )}
            >
              {busy ? courtBoard.organiser.dialog.working : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
