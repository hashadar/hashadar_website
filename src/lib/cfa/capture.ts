import { findModule, findReading } from '@/lib/cfa/syllabus';
import type { CfaQuestion, CfaSyllabus } from '@/lib/cfa/types';

/** What the Capture page pre-fills: the last Module, Reading and source used. */
export type CaptureDefaults = {
  moduleId: string;
  readingId: string;
  source: string;
};

export const CAPTURE_DEFAULTS_STORAGE_KEY = 'cfa.capture.defaults';

/**
 * Pick Capture defaults. Prefers this device's last choice; falls back to the
 * newest Question (so a second device starts where the first left off), then
 * to the first Module and Reading. The source has no default in code.
 */
export function resolveCaptureDefaults(
  syllabus: CfaSyllabus,
  stored: Partial<CaptureDefaults> | null,
  latestQuestion: Pick<CfaQuestion, 'module' | 'reading' | 'source'> | null,
): CaptureDefaults {
  const candidates = [
    stored
      ? {
          moduleId: stored.moduleId ?? '',
          readingId: stored.readingId ?? '',
          source: stored.source,
        }
      : null,
    latestQuestion
      ? {
          moduleId: latestQuestion.module,
          readingId: latestQuestion.reading,
          source: latestQuestion.source ?? undefined,
        }
      : null,
  ].filter((value): value is NonNullable<typeof value> => value !== null);

  const source =
    candidates.find((candidate) => typeof candidate.source === 'string')?.source ??
    '';

  for (const candidate of candidates) {
    const match = findModule(syllabus, candidate.moduleId);
    if (!match) continue;
    const reading = findReading(syllabus, match.id, candidate.readingId);
    return {
      moduleId: match.id,
      readingId: reading?.id ?? match.readings[0]?.id ?? '',
      source,
    };
  }

  const first = syllabus.modules[0];
  return {
    moduleId: first?.id ?? '',
    readingId: first?.readings[0]?.id ?? '',
    source,
  };
}

export function parseStoredDefaults(raw: string | null): Partial<CaptureDefaults> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    return {
      moduleId: typeof record.moduleId === 'string' ? record.moduleId : undefined,
      readingId: typeof record.readingId === 'string' ? record.readingId : undefined,
      source: typeof record.source === 'string' ? record.source : undefined,
    };
  } catch {
    return null;
  }
}
