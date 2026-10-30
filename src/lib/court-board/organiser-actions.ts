'use server';

/**
 * Organiser Server Actions. Authorised by the HttpOnly Organiser cookie (the
 * link's token, exchanged once at `/labs/court-board/o/[token]`), checked
 * against its stored SHA-256 on every call. This file may only export async
 * Server Actions.
 */
import { cookies } from 'next/headers';
import {
  authenticateOrganiser,
  cancelSession,
  clearPenalty,
  closeRegister,
  createSession,
  previewCloseRegister,
  removeSeat,
  resetPin,
  rotateOrganiserLink,
  setAttended,
  setSeatTier,
  shortenPenalty,
} from './organiser-service';
import {
  ORGANISER_COOKIE,
  ORGANISER_COOKIE_PATH,
  getOrganiserToken,
  getServiceDeps,
} from './request-context';
import { fail, type ServiceDeps } from './service-core';
import type { Club } from './store';
import type { Outcome, RegisterPreview } from './views';

async function asOrganiser<T>(
  work: (deps: ServiceDeps, club: Club, token: string) => Promise<Outcome<T>>,
): Promise<Outcome<T>> {
  try {
    const deps = await getServiceDeps();
    const token = await getOrganiserToken();
    const club = await authenticateOrganiser(deps, token);
    if (!club || !token) return fail('unauthorised');
    return await work(deps, club, token);
  } catch (error) {
    console.error('court-board organiser action failed', error);
    return fail('rejected');
  }
}

export async function createSessionAction(
  input: unknown,
): Promise<Outcome<{ sessionId: string }>> {
  return asOrganiser((deps, club) => createSession(deps, club, input));
}

export async function cancelSessionAction(input: unknown): Promise<Outcome> {
  return asOrganiser((deps, club) => cancelSession(deps, club, input));
}

export async function removeSeatAction(input: unknown): Promise<Outcome> {
  return asOrganiser((deps, club) => removeSeat(deps, club, input));
}

export async function setSeatTierAction(input: unknown): Promise<Outcome> {
  return asOrganiser((deps, club) => setSeatTier(deps, club, input));
}

export async function setAttendedAction(input: unknown): Promise<Outcome> {
  return asOrganiser((deps, club) => setAttended(deps, club, input));
}

export async function previewCloseRegisterAction(
  input: unknown,
): Promise<Outcome<{ preview: RegisterPreview }>> {
  return asOrganiser((deps, club) => previewCloseRegister(deps, club, input));
}

export async function closeRegisterAction(
  input: unknown,
): Promise<Outcome<{ penalties: number }>> {
  return asOrganiser((deps, club) => closeRegister(deps, club, input));
}

export async function resetPinAction(input: unknown): Promise<Outcome> {
  return asOrganiser((deps, club) => resetPin(deps, club, input));
}

export async function clearPenaltyAction(input: unknown): Promise<Outcome> {
  return asOrganiser((deps, club) => clearPenalty(deps, club, input));
}

export async function shortenPenaltyAction(input: unknown): Promise<Outcome> {
  return asOrganiser((deps, club) => shortenPenalty(deps, club, input));
}

/**
 * Replace the Organiser link. The browser's cookie moves to the new token so
 * this Organiser stays signed in; the new link is returned once to be shared.
 */
export async function rotateLinkAction(): Promise<Outcome<{ link: string }>> {
  return asOrganiser(async (deps, club, token) => {
    const result = await rotateOrganiserLink(deps, club, token);
    if (!result.ok) return result;
    (await cookies()).set(ORGANISER_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: ORGANISER_COOKIE_PATH,
      maxAge: 60 * 60 * 24 * 365,
    });
    return { ok: true, link: `/labs/court-board/o/${result.token}` };
  });
}
