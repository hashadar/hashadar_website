'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export interface AutoRefreshProps {
  intervalMs?: number;
}

/**
 * Keeps the live list live: re-renders the server component every 30 s while
 * the tab is visible, and when the Player comes back to it. A refresh swaps the
 * server data in place, so form state in sibling client components survives.
 */
export function AutoRefresh({ intervalMs = 30_000 }: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      // Focus and visibility changes often arrive together; refresh once.
      if (Date.now() - last < 2_000) return;
      last = Date.now();
      router.refresh();
    };
    const timer = window.setInterval(refresh, intervalMs);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [router, intervalMs]);

  return null;
}
