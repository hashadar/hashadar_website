import 'server-only';
import { createHmac } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { currentNow } from './dev-clock';
import type { ServiceDeps } from './service-core';
import { getCourtBoardRuntime } from './store-provider';

/** Path-scoped so the cookie only travels with Organiser pages and their actions. */
export const ORGANISER_COOKIE = 'cb_org';
export const ORGANISER_COOKIE_PATH = '/labs/court-board/o';

/**
 * The caller's address, for per-device lockouts and rate limits. The first
 * `X-Forwarded-For` entry can be spoofed, which only lets an attacker dodge the
 * per-device lock; the per-phone limit still caps them. Taking the last entry
 * instead would put everyone behind one proxy in one bucket and let a stranger
 * lock a Player out, which is worse.
 */
function callerAddress(h: Headers): string {
  const viewer = h.get('cloudfront-viewer-address');
  if (viewer) return viewer.replace(/:\d+$/, '');
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || h.get('x-real-ip') || 'local';
}

export async function getServiceDeps(): Promise<ServiceDeps> {
  const { store, pepper } = await getCourtBoardRuntime();
  const address = callerAddress(await headers());
  return {
    store,
    pepper,
    now: currentNow,
    clientKey: createHmac('sha256', pepper).update(address).digest('hex').slice(0, 24),
  };
}

/** `https://host` for building the Signup link in the WhatsApp list. */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto =
    h.get('x-forwarded-proto')?.split(',')[0]?.trim() ??
    (/^(localhost|127\.|\[::1\])/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function getOrganiserToken(): Promise<string | null> {
  return (await cookies()).get(ORGANISER_COOKIE)?.value ?? null;
}
