import 'server-only';
import { createHmac } from 'node:crypto';

/**
 * `phoneKey`: HMAC-SHA256 of the E.164 number under the server pepper. A plain
 * hash is not enough: a country's mobile number space is small enough to
 * reverse in minutes.
 */
export function phoneKey(pepper: string, e164: string): string {
  return createHmac('sha256', pepper).update(e164).digest('hex');
}
