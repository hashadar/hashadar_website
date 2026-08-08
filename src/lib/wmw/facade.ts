/**
 * Deep WMW facade — sole seam for Snapshot read and Workbook Refresh.
 * Parse, cache, and storage adapters are injected; Sheets is read-only.
 */

import { parseWorkbook } from '@/lib/wmw/parse-workbook';
import type { WmwSnapshotCache } from '@/lib/wmw/cache';
import { createMemoryWmwSnapshotCache } from '@/lib/wmw/cache';
import type { WmwSnapshotStore } from '@/lib/wmw/snapshot-store';
import { createMemoryWmwSnapshotStore } from '@/lib/wmw/snapshot-store';
import type { WmwWorkbookSource } from '@/lib/wmw/workbook-source';
import type { WmwRefreshWarning, WmwSnapshot } from '@/lib/wmw/types';

export type WmwRefreshResult = {
  snapshot: WmwSnapshot;
  warnings: WmwRefreshWarning[];
};

export type WmwFacade = {
  /** Serve cached Snapshot, else last-good from private store. */
  getSnapshot(): Promise<WmwSnapshot | null>;
  /**
   * Pull Workbook (unformatted), normalise, persist last-good, bust cache.
   * Never writes to Sheets.
   */
  refresh(): Promise<WmwRefreshResult>;
};

export type CreateWmwOptions = {
  workbookSource: WmwWorkbookSource;
  /**
   * Typed Snapshot store. Wire #182 Amplify storage via
   * `createSnapshotStoreFromJsonStorage(...)` when that PR is available.
   */
  snapshotStore?: WmwSnapshotStore;
  cache?: WmwSnapshotCache;
  /** Clock for asOf + cache TTL; defaults to Date.now / toISOString. */
  now?: () => Date;
};

export function createWmw(options: CreateWmwOptions): WmwFacade {
  const store = options.snapshotStore ?? createMemoryWmwSnapshotStore();
  const cache = options.cache ?? createMemoryWmwSnapshotCache();
  const now = options.now ?? (() => new Date());

  return {
    async getSnapshot() {
      const cached = await cache.get();
      if (cached) return cached;

      const latest = await store.loadLatest();
      if (latest) {
        await cache.set(latest);
      }
      return latest;
    },

    async refresh() {
      const raw = await options.workbookSource.pullTabs();
      const snapshot = parseWorkbook({
        raw,
        asOf: now().toISOString(),
      });

      await store.save(snapshot);
      await cache.clear();
      await cache.set(snapshot);

      return { snapshot, warnings: snapshot.warnings };
    },
  };
}
