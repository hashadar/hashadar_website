'use server';

/**
 * Site Admin Server Actions for Court Board. Every action verifies the caller's
 * Cognito token on the server (see site-admin.ts). This file may only export
 * async Server Actions.
 */

import {
  createClubAsAdmin,
  type CreateClubResult,
} from '@/lib/court-board/admin-service';
import { isSiteAdmin } from '@/lib/court-board/site-admin';
import { getCourtBoardRuntime } from '@/lib/court-board/store-provider';

export async function createClubAction(
  idToken: unknown,
  input: unknown,
): Promise<CreateClubResult> {
  return createClubAsAdmin(
    {
      isSiteAdmin,
      getStore: async () => (await getCourtBoardRuntime()).store,
    },
    idToken,
    input,
  );
}
