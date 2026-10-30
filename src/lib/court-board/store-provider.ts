import 'server-only';
import { courtBoardSsrConfig } from '@/lib/court-board/court-board-ssr-config';
import { currentNow, isDevelopment } from './dev-clock';
import { seedDemoClub } from './dev-seed';
import { createDynamoCourtBoardStore } from './dynamo-store';
import { createMemoryCourtBoardStore } from './memory-store';
import { getCourtBoardPepper } from './pepper';
import type { CourtBoardStore } from './store';

export const DEV_PEPPER = 'dev-only-pepper-not-a-secret';

export type CourtBoardRuntime = {
  store: CourtBoardStore;
  pepper: string;
  /** `memory` is the seeded, throwaway store used by `next dev` with no AWS. */
  mode: 'dynamo' | 'memory';
};

type RuntimeGlobal = typeof globalThis & {
  __courtBoardRuntime?: Promise<CourtBoardRuntime>;
};

async function createRuntime(): Promise<CourtBoardRuntime> {
  const tableName =
    process.env.COURT_BOARD_TABLE?.trim() || courtBoardSsrConfig.tableName;

  if (tableName) {
    return {
      store: createDynamoCourtBoardStore({
        tableName,
        region: courtBoardSsrConfig.region,
      }),
      pepper: await getCourtBoardPepper(),
      mode: 'dynamo',
    };
  }

  if (!isDevelopment()) {
    throw new Error(
      'Court Board has no DynamoDB table configured (see docs/court-board/infra.md)',
    );
  }

  const pepper = process.env.COURT_BOARD_PEPPER?.trim() || DEV_PEPPER;
  const store = createMemoryCourtBoardStore();
  await seedDemoClub(store, pepper, currentNow());
  return { store, pepper, mode: 'memory' };
}

/**
 * One runtime per server process. In development the memory store (and the
 * seeded demo Club) lives on `globalThis` so hot reloads keep its state.
 */
export function getCourtBoardRuntime(): Promise<CourtBoardRuntime> {
  const g = globalThis as RuntimeGlobal;
  if (!g.__courtBoardRuntime) {
    g.__courtBoardRuntime = createRuntime().catch((error) => {
      g.__courtBoardRuntime = undefined; // retry on the next request
      throw error;
    });
  }
  return g.__courtBoardRuntime;
}
