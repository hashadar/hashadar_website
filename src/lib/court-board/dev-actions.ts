'use server';

/**
 * Local-demo controls for the Court Board landing page. Refused in production
 * and when a real DynamoDB table is configured. This file may only export async
 * Server Actions.
 */
import { setDevClock } from './dev-clock';
import { seedDemoClub } from './dev-seed';
import { createMemoryCourtBoardStore } from './memory-store';
import { currentNow, isDevelopment } from './dev-clock';
import { getCourtBoardRuntime } from './store-provider';

type RuntimeGlobal = typeof globalThis & { __courtBoardRuntime?: Promise<unknown> };

async function assertDemo(): Promise<void> {
  if (!isDevelopment()) throw new Error('Not available in production');
  const { mode } = await getCourtBoardRuntime();
  if (mode !== 'memory') throw new Error('Only available on the in-memory demo store');
}

/** Pretend it is `iso` (London instants are UTC ISO strings); null returns to real time. */
export async function setDevClockAction(iso: string | null): Promise<{ ok: boolean }> {
  await assertDemo();
  const target = iso ? new Date(iso) : null;
  if (target && Number.isNaN(target.getTime())) return { ok: false };
  setDevClock(target);
  return { ok: true };
}

/** Throw the demo data away and seed it afresh. */
export async function resetDemoAction(): Promise<{ ok: boolean }> {
  await assertDemo();
  const { pepper } = await getCourtBoardRuntime();
  const store = createMemoryCourtBoardStore();
  await seedDemoClub(store, pepper, currentNow());
  (globalThis as RuntimeGlobal).__courtBoardRuntime = Promise.resolve({
    store,
    pepper,
    mode: 'memory',
  });
  return { ok: true };
}
