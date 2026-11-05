'use server';

/**
 * Organiser Server Actions. Authorised by the HttpOnly Organiser cookie (the
 * link's token, exchanged once by `openOrganiserLinkAction`), checked
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
  forgetPlayer,
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
  getOrganiserToken,
  getServiceDeps,
  organiserCookieOptions,
} from './request-context';
import { organiserTokenPath } from './club-admin';
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

export async function forgetPlayerAction(
  input: unknown,
): Promise<Outcome<{ seatsAnonymised: number }>> {
  return asOrganiser((deps, club) => forgetPlayer(deps, club, input));
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
    (await cookies()).set(ORGANISER_COOKIE, result.token, organiserCookieOptions());
    return { ok: true, link: organiserTokenPath(result.token) };
  });
}

/**
 * Open an Organiser link: the page reads the token from the URL fragment and
 * posts it here, so it never appears in a URL the server (or its access logs)
 * sees. A valid token becomes this browser's Organiser cookie.
 */
export async function openOrganiserLinkAction(token: unknown): Promise<Outcome> {
  try {
    const club = await authenticateOrganiser(await getServiceDeps(), token);
    if (!club || typeof token !== 'string') return fail('unauthorised');
    (await cookies()).set(ORGANISER_COOKIE, token, organiserCookieOptions());
    return { ok: true };
  } catch (error) {
    console.error('court-board organiser action failed', error);
    return fail('rejected');
  }
}
