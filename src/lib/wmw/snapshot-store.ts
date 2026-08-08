/**
 * Typed Snapshot persistence seam for ingest/Refresh.
 *
 * Amplify private bucket + JSON keys land in #182 (`WmwSnapshotStorage` with
 * `snapshotJson` + as-of meta). This module owns the typed Snapshot interface
 * ingest needs, plus a memory adapter and a thin adapter over the #182 JSON API
 * so Refresh can ship without waiting for that PR to merge.
 */

import type { WmwSnapshot } from '@/lib/wmw/types';

export type WmwSnapshotStore = {
  loadLatest(): Promise<WmwSnapshot | null>;
  save(snapshot: WmwSnapshot): Promise<void>;
};

/** #182-shaped JSON storage (duck-typed so this PR does not own Amplify). */
export type WmwJsonSnapshotStorage = {
  putLastGoodSnapshot(input: {
    snapshotJson: string;
    asOf: string;
  }): Promise<void>;
  getLastGoodSnapshot(): Promise<{
    snapshotJson: string;
    meta: { asOf: string };
  } | null>;
};

/** In-memory last-good Snapshot for Vitest and offline Refresh wiring. */
export function createMemoryWmwSnapshotStore(
  initial?: WmwSnapshot | null,
): WmwSnapshotStore {
  let latest: WmwSnapshot | null = initial ?? null;
  return {
    async loadLatest() {
      return latest ? structuredClone(latest) : null;
    },
    async save(snapshot) {
      latest = structuredClone(snapshot);
    },
  };
}

/**
 * Adapt #182 `WmwSnapshotStorage` (JSON blob + meta) into the typed store.
 * TODO(#182): prefer `createDefaultWmwSnapshotStorage()` once that PR lands.
 */
export function createSnapshotStoreFromJsonStorage(
  storage: WmwJsonSnapshotStorage,
): WmwSnapshotStore {
  return {
    async loadLatest() {
      const lastGood = await storage.getLastGoodSnapshot();
      if (!lastGood) return null;
      try {
        const parsed: unknown = JSON.parse(lastGood.snapshotJson);
        if (!isWmwSnapshot(parsed)) {
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    },
    async save(snapshot) {
      await storage.putLastGoodSnapshot({
        snapshotJson: JSON.stringify(snapshot),
        asOf: snapshot.asOf,
      });
    },
  };
}

function isWmwSnapshot(value: unknown): value is WmwSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<WmwSnapshot>;
  return (
    typeof candidate.asOf === 'string' &&
    Array.isArray(candidate.accounts) &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.balances) &&
    Array.isArray(candidate.cashflows) &&
    Array.isArray(candidate.warnings)
  );
}
