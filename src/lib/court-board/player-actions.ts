'use server';

/**
 * Public Server Actions for Players. Every one validates its input again on the
 * server and authorises with phone + PIN; the browser never holds credentials
 * beyond the open view. This file may only export async Server Actions.
 */
import {
  addMyGuests,
  cancelMySeat,
  getMyPlace,
  signUp,
  updateMySeat,
} from './player-service';
import { getServiceDeps } from './request-context';
import { fail } from './service-core';
import type {
  CancelResult,
  MyPlaceView,
  Outcome,
  SignUpResult,
} from './views';

async function run<T>(work: () => Promise<Outcome<T>>): Promise<Outcome<T>> {
  try {
    return await work();
  } catch (error) {
    console.error('court-board player action failed', error);
    return fail('rejected');
  }
}

export async function signUpAction(input: unknown): Promise<Outcome<SignUpResult>> {
  return run(async () => signUp(await getServiceDeps(), input));
}

export async function getMyPlaceAction(
  input: unknown,
): Promise<Outcome<{ place: MyPlaceView }>> {
  return run(async () => getMyPlace(await getServiceDeps(), input));
}

export async function cancelSeatAction(input: unknown): Promise<Outcome<CancelResult>> {
  return run(async () => cancelMySeat(await getServiceDeps(), input));
}

export async function updateSeatAction(input: unknown): Promise<Outcome> {
  return run(async () => updateMySeat(await getServiceDeps(), input));
}

export async function addGuestsAction(input: unknown): Promise<Outcome> {
  return run(async () => addMyGuests(await getServiceDeps(), input));
}
