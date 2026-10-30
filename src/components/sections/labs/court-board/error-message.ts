import { courtBoard } from '@/data';
import type { Failure } from '@/lib/court-board/views';

/**
 * Plain-language text for a service failure. An `invalid-input` failure names
 * the field at fault when the copy has a message for it. `{minutes}` is filled
 * from `retryAfterSeconds`, rounded up so it never promises too soon.
 */
export function describeFailure(failure: Failure): string {
  const { byCode, byField, generic } = courtBoard.errors;
  if (failure.error === 'invalid-input' && failure.field) {
    const fieldMessage = byField[failure.field];
    if (fieldMessage) return fieldMessage;
  }
  const template = byCode[failure.error] ?? generic;
  const minutes = Math.max(1, Math.ceil((failure.retryAfterSeconds ?? 60) / 60));
  return template.replace('{minutes}', String(minutes));
}
