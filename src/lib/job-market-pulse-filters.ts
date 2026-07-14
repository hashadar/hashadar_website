import type {
  ClusterSummary,
  JobMarketSnapshot,
  ProjectionPoint,
  SkillFrequency,
  TaxonomyBucket,
} from './job-market-lab';
import type {
  EmployerPrestigeTier,
  EmployerSizeTier,
  JobDescriptionRoleFamily,
  JobDescriptionSeniority,
} from './job-market-employers';

export const OWNER_PULSE_FILTER_DIMENSIONS = [
  'timeWindow',
  'seniority',
  'roleFamily',
  'employerSizeTier',
  'employerPrestigeTier',
] as const;

export const PUBLIC_PULSE_FILTER_DIMENSIONS = ['timeWindow'] as const;

export type JobMarketPulseTimeWindow = 'all' | '3m' | '6m' | '12m' | '18m';

export type JobMarketPulseFilterSelection = {
  timeWindow?: JobMarketPulseTimeWindow;
  seniority?: JobDescriptionSeniority | 'all';
  roleFamily?: JobDescriptionRoleFamily | 'all';
  employerSizeTier?: EmployerSizeTier | 'all';
  employerPrestigeTier?: EmployerPrestigeTier | 'all';
};

export type JobMarketDocumentPulseMeta = {
  id: string;
  collectedAt: string;
  seniority?: JobDescriptionSeniority;
  roleFamily?: JobDescriptionRoleFamily;
  employerSizeTier?: EmployerSizeTier;
  employerPrestigeTier?: EmployerPrestigeTier;
  technologies: string[];
  clusterId: number;
  projectionX?: number;
  projectionY?: number;
};

export type JobMarketPublicDocumentPulseMeta = Pick<
  JobMarketDocumentPulseMeta,
  'id' | 'collectedAt' | 'technologies' | 'clusterId' | 'projectionX' | 'projectionY'
>;

export type JobMarketCorpusMeta = {
  documents: JobMarketDocumentPulseMeta[];
};

export type JobMarketPublicCorpusMeta = {
  documents: JobMarketPublicDocumentPulseMeta[];
};

export type JobMarketPulseInput = {
  snapshot: JobMarketSnapshot;
  corpusMeta?: JobMarketCorpusMeta | JobMarketPublicCorpusMeta;
};

export type FilteredJobMarketPulse = {
  documentCount: number;
  technologies: SkillFrequency[];
  skills: SkillFrequency[];
  seniority: TaxonomyBucket[];
  roleFamily: TaxonomyBucket[];
  clusters: ClusterSummary[];
  projection: ProjectionPoint[];
};

export type FilterJobMarketPulseOptions = {
  audience: 'owner' | 'public';
  now?: Date;
};

const TIME_WINDOW_MONTHS: Record<Exclude<JobMarketPulseTimeWindow, 'all'>, number> = {
  '3m': 3,
  '6m': 6,
  '12m': 12,
  '18m': 18,
};

function isWithinTimeWindow(
  collectedAt: string,
  timeWindow: JobMarketPulseTimeWindow,
  now: Date,
): boolean {
  if (timeWindow === 'all') {
    return true;
  }

  const collected = new Date(collectedAt);
  if (Number.isNaN(collected.getTime())) {
    return false;
  }

  const months = TIME_WINDOW_MONTHS[timeWindow];
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return collected.getTime() >= cutoff.getTime();
}

function matchesSelection(
  document: JobMarketDocumentPulseMeta,
  selection: JobMarketPulseFilterSelection,
  now: Date,
): boolean {
  const timeWindow = selection.timeWindow ?? 'all';
  if (!isWithinTimeWindow(document.collectedAt, timeWindow, now)) {
    return false;
  }

  if (selection.seniority && selection.seniority !== 'all') {
    if (document.seniority !== selection.seniority) {
      return false;
    }
  }

  if (selection.roleFamily && selection.roleFamily !== 'all') {
    if (document.roleFamily !== selection.roleFamily) {
      return false;
    }
  }

  if (selection.employerSizeTier && selection.employerSizeTier !== 'all') {
    if (document.employerSizeTier !== selection.employerSizeTier) {
      return false;
    }
  }

  if (selection.employerPrestigeTier && selection.employerPrestigeTier !== 'all') {
    if (document.employerPrestigeTier !== selection.employerPrestigeTier) {
      return false;
    }
  }

  return true;
}

function countByField<T extends string>(
  documents: JobMarketDocumentPulseMeta[],
  field: 'seniority' | 'roleFamily',
): TaxonomyBucket[] {
  const counts = new Map<string, number>();
  for (const document of documents) {
    const value = document[field];
    if (!value) {
      continue;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function aggregateTechnologies(documents: JobMarketDocumentPulseMeta[]): SkillFrequency[] {
  const counts = new Map<string, number>();
  for (const document of documents) {
    for (const technology of document.technologies) {
      counts.set(technology, (counts.get(technology) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function aggregateClusters(
  documents: JobMarketDocumentPulseMeta[],
  clusterLabels: Map<number, string>,
): ClusterSummary[] {
  const sizes = new Map<number, number>();
  for (const document of documents) {
    sizes.set(document.clusterId, (sizes.get(document.clusterId) ?? 0) + 1);
  }

  const clusterIds = [...new Set([...clusterLabels.keys(), ...sizes.keys()])].sort(
    (a, b) => a - b,
  );

  return clusterIds.map((id) => ({
    id,
    size: sizes.get(id) ?? 0,
    label: clusterLabels.get(id) ?? `Requirement theme ${id + 1}`,
  }));
}

function buildProjection(documents: JobMarketDocumentPulseMeta[]): ProjectionPoint[] {
  return documents
    .filter(
      (document) =>
        document.projectionX != null &&
        document.projectionY != null &&
        Number.isFinite(document.projectionX) &&
        Number.isFinite(document.projectionY),
    )
    .map((document) => ({
      x: document.projectionX!,
      y: document.projectionY!,
      clusterId: document.clusterId,
    }));
}

function snapshotToPulse(snapshot: JobMarketSnapshot): FilteredJobMarketPulse {
  const technologies = snapshot.technologies ?? snapshot.skills ?? [];
  return {
    documentCount: snapshot.documentCount,
    technologies,
    skills: technologies,
    seniority: snapshot.seniority ?? [],
    roleFamily: snapshot.roleFamily ?? [],
    clusters: snapshot.clusters ?? [],
    projection: snapshot.projection ?? [],
  };
}

export function sanitiseFilterSelection(
  selection: JobMarketPulseFilterSelection,
  audience: 'owner' | 'public',
): JobMarketPulseFilterSelection {
  if (audience === 'owner') {
    return selection;
  }

  const timeWindow = selection.timeWindow;
  return timeWindow && timeWindow !== 'all' ? { timeWindow } : {};
}

export function toPublicCorpusMeta(
  corpusMeta: JobMarketCorpusMeta,
): JobMarketPublicCorpusMeta {
  return {
    documents: corpusMeta.documents.map(
      ({ id, collectedAt, technologies, clusterId, projectionX, projectionY }) => ({
        id,
        collectedAt,
        technologies,
        clusterId,
        projectionX,
        projectionY,
      }),
    ),
  };
}

export function filterJobMarketPulse(
  input: JobMarketPulseInput,
  selection: JobMarketPulseFilterSelection,
  options: FilterJobMarketPulseOptions,
): FilteredJobMarketPulse {
  const effectiveSelection = sanitiseFilterSelection(selection, options.audience);
  const now = options.now ?? new Date();
  const { snapshot, corpusMeta } = input;

  if (!corpusMeta || corpusMeta.documents.length === 0) {
    return snapshotToPulse(snapshot);
  }

  const filtered = corpusMeta.documents.filter((document) =>
    matchesSelection(document, effectiveSelection, now),
  );

  if (filtered.length === corpusMeta.documents.length && Object.keys(effectiveSelection).length === 0) {
    return snapshotToPulse(snapshot);
  }

  const clusterLabels = new Map(
    (snapshot.clusters ?? []).map((cluster) => [cluster.id, cluster.label]),
  );
  const technologies = aggregateTechnologies(filtered);

  return {
    documentCount: filtered.length,
    technologies,
    skills: technologies,
    seniority: countByField(filtered, 'seniority'),
    roleFamily: countByField(filtered, 'roleFamily'),
    clusters: aggregateClusters(filtered, clusterLabels),
    projection: buildProjection(filtered),
  };
}
