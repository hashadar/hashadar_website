import type { CfaModule, CfaReading, CfaSyllabus } from '@/lib/cfa/types';

function normaliseLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function findModule(
  syllabus: CfaSyllabus,
  moduleId: string,
): CfaModule | null {
  return syllabus.modules.find((module) => module.id === moduleId) ?? null;
}

export function findReading(
  syllabus: CfaSyllabus,
  moduleId: string,
  readingId: string,
): CfaReading | null {
  return (
    findModule(syllabus, moduleId)?.readings.find(
      (reading) => reading.id === readingId,
    ) ?? null
  );
}

/** Resolve a Module by id or (case-insensitive) name, e.g. from pasted JSON. */
export function resolveModuleRef(
  syllabus: CfaSyllabus,
  ref: string | null | undefined,
): CfaModule | null {
  if (!ref?.trim()) return null;
  const wanted = normaliseLabel(ref);
  return (
    syllabus.modules.find(
      (module) =>
        module.id === ref.trim() || normaliseLabel(module.name) === wanted,
    ) ?? null
  );
}

/** Resolve a Reading within a Module by id or (case-insensitive) name. */
export function resolveReadingRef(
  module: CfaModule,
  ref: string | null | undefined,
): CfaReading | null {
  if (!ref?.trim()) return null;
  const wanted = normaliseLabel(ref);
  return (
    module.readings.find(
      (reading) =>
        reading.id === ref.trim() || normaliseLabel(reading.name) === wanted,
    ) ?? null
  );
}

/** Midpoint of the published weight range, used for weighted Sets. */
export function weightMidpoint(module: CfaModule): number {
  return (module.weight.min + module.weight.max) / 2;
}

export function moduleName(syllabus: CfaSyllabus, moduleId: string): string {
  return findModule(syllabus, moduleId)?.name ?? moduleId;
}

export function readingName(
  syllabus: CfaSyllabus,
  moduleId: string,
  readingId: string,
): string {
  return findReading(syllabus, moduleId, readingId)?.name ?? readingId;
}

export function formatWeightRange(module: CfaModule): string {
  return `${module.weight.min}–${module.weight.max}%`;
}
