/**
 * Typed Snapshot persistence seam for ingest/Refresh.
 *
 * #182 owns JSON blob + as-of meta (`WmwSnapshotStorage` / Amplify `wmwSnapshots`).
 * This module adapts that into a typed `WmwSnapshot` store for the facade.
 */

import type { WmwSnapshot } from '@/lib/wmw/types';
import type { WmwSnapshotStorage } from '@/lib/wmw/snapshot-storage';
import { createDefaultWmwSnapshotStorage } from '@/lib/wmw/snapshot-storage';

export type WmwSnapshotStore = {
  loadLatest(): Promise<WmwSnapshot | null>;
  save(snapshot: WmwSnapshot): Promise<void>;
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

/** Adapt #182 `WmwSnapshotStorage` (JSON blob + meta) into the typed store. */
export function createSnapshotStoreFromJsonStorage(
  storage: WmwSnapshotStorage,
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

/**
 * Production path: Amplify private `wmwSnapshots` when the client is configured.
 * Returns null in CI / marketing builds — inject `createMemoryWmwSnapshotStore` for tests.
 */
export async function createDefaultWmwSnapshotStore(): Promise<WmwSnapshotStore | null> {
  const storage = await createDefaultWmwSnapshotStorage();
  if (!storage) return null;
  return createSnapshotStoreFromJsonStorage(storage);
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
