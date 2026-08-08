/**
 * Server data cache for WMW Snapshots (ADR 0009: 24-hour TTL).
 * Manual Refresh busts the cache. Memory adapter is enough for Vitest;
 * production may wrap Next.js `unstable_cache` later without changing callers.
 */

import type { WmwSnapshot } from '@/lib/wmw/types';

export const WMW_SNAPSHOT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type WmwSnapshotCache = {
  get(): Promise<WmwSnapshot | null>;
  set(snapshot: WmwSnapshot): Promise<void>;
  clear(): Promise<void>;
};

export type CreateMemoryWmwSnapshotCacheOptions = {
  ttlMs?: number;
  now?: () => number;
};

export function createMemoryWmwSnapshotCache(
  options: CreateMemoryWmwSnapshotCacheOptions = {},
): WmwSnapshotCache {
  const ttlMs = options.ttlMs ?? WMW_SNAPSHOT_CACHE_TTL_MS;
  const now = options.now ?? Date.now;
  let entry: { snapshot: WmwSnapshot; expiresAt: number } | null = null;

  return {
    async get() {
      if (!entry) return null;
      if (now() >= entry.expiresAt) {
        entry = null;
        return null;
      }
      return structuredClone(entry.snapshot);
    },
    async set(snapshot) {
      entry = {
        snapshot: structuredClone(snapshot),
        expiresAt: now() + ttlMs,
      };
    },
    async clear() {
      entry = null;
    },
  };
}
