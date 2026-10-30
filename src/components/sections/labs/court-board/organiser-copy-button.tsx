'use client';

import { useEffect, useRef, useState } from 'react';
import { courtBoard } from '@/data';
import { cn } from '@/lib/utils';

/** Clipboard write with an old-browser fallback; true when the text was copied. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea fallback */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export interface OrganiserCopyButtonProps {
  label: string;
  /** Called on click so the text (or `window.location`) is read fresh. */
  getText: () => string;
  className?: string;
}

/** A button that copies text and says so, politely, for screen readers too. */
export function OrganiserCopyButton({
  label,
  getText,
  className,
}: OrganiserCopyButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onClick = async () => {
    const ok = await copyText(getText());
    setStatus(ok ? 'copied' : 'failed');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'min-h-11 border border-[var(--border)] px-4 py-2 font-body text-sm font-medium hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2',
          className,
        )}
      >
        {label}
      </button>
      <span role="status" aria-live="polite" className="min-h-4 font-body text-xs text-[var(--primary)]">
        {status === 'copied' ? courtBoard.organiser.current.copied : null}
        {status === 'failed' ? (
          <span className="text-red-700 dark:text-red-400">
            {courtBoard.organiser.current.copyFailed}
          </span>
        ) : null}
      </span>
    </span>
  );
}
