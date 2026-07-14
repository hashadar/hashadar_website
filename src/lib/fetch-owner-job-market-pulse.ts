import type { JobMarketSnapshot } from './job-market-lab';
import type { JobMarketCorpusMeta, JobMarketPulseInput } from './job-market-pulse-filters';

export type OwnerJobMarketPulseSource = JobMarketPulseInput & {
  corpusMeta: JobMarketCorpusMeta;
};

export type OwnerSnapshotPayloadClient = {
  getPublication: () => Promise<{ currentSnapshotId: string | null }>;
  getSnapshotPayload: (id: string) => Promise<unknown>;
};

export type FetchOwnerJobMarketPulseSourceDeps = {
  fetchOwnerPayload?: () => Promise<OwnerJobMarketPulseSource | null>;
};

export type FetchOwnerJobMarketPulseSource = (
  deps?: FetchOwnerJobMarketPulseSourceDeps,
) => Promise<OwnerJobMarketPulseSource | null>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function parsePayload(raw: unknown): Record<string, unknown> | null {
  if (isRecord(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function toSnapshot(payload: Record<string, unknown>): JobMarketSnapshot {
  const technologies = Array.isArray(payload.technologies)
    ? (payload.technologies as JobMarketSnapshot['technologies'])
    : Array.isArray(payload.skills)
      ? (payload.skills as JobMarketSnapshot['skills'])
      : [];

  return {
    documentCount: typeof payload.documentCount === 'number' ? payload.documentCount : 0,
    publishedAt:
      typeof payload.publishedAt === 'string' ? payload.publishedAt : new Date(0).toISOString(),
    technologies,
    skills: technologies ?? [],
    seniority: Array.isArray(payload.seniority)
      ? (payload.seniority as JobMarketSnapshot['seniority'])
      : [],
    roleFamily: Array.isArray(payload.roleFamily)
      ? (payload.roleFamily as JobMarketSnapshot['roleFamily'])
      : [],
    clusters: Array.isArray(payload.clusters)
      ? (payload.clusters as JobMarketSnapshot['clusters'])
      : [],
    projection: Array.isArray(payload.projection)
      ? (payload.projection as JobMarketSnapshot['projection'])
      : [],
  };
}

function toCorpusMeta(payload: Record<string, unknown>): JobMarketCorpusMeta | null {
  const rawMeta = payload.corpusMeta;
  if (!isRecord(rawMeta) || !Array.isArray(rawMeta.documents)) {
    return null;
  }

  const documents = rawMeta.documents
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      if (typeof item.id !== 'string' || typeof item.collectedAt !== 'string') {
        return null;
      }
      if (typeof item.clusterId !== 'number' || !Array.isArray(item.technologies)) {
        return null;
      }

      return {
        id: item.id,
        collectedAt: item.collectedAt,
        seniority:
          typeof item.seniority === 'string'
            ? (item.seniority as JobMarketCorpusMeta['documents'][number]['seniority'])
            : undefined,
        roleFamily:
          typeof item.roleFamily === 'string'
            ? (item.roleFamily as JobMarketCorpusMeta['documents'][number]['roleFamily'])
            : undefined,
        employerSizeTier:
          typeof item.employerSizeTier === 'string'
            ? (item.employerSizeTier as JobMarketCorpusMeta['documents'][number]['employerSizeTier'])
            : undefined,
        employerPrestigeTier:
          typeof item.employerPrestigeTier === 'string'
            ? (item.employerPrestigeTier as JobMarketCorpusMeta['documents'][number]['employerPrestigeTier'])
            : undefined,
        technologies: item.technologies.filter((tech): tech is string => typeof tech === 'string'),
        clusterId: item.clusterId,
        projectionX: typeof item.projectionX === 'number' ? item.projectionX : undefined,
        projectionY: typeof item.projectionY === 'number' ? item.projectionY : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  return documents.length > 0 ? { documents } : null;
}

export function ownerPulseSourceFromPayload(
  raw: unknown,
): OwnerJobMarketPulseSource | null {
  const payload = parsePayload(raw);
  if (!payload) {
    return null;
  }

  const corpusMeta = toCorpusMeta(payload);
  if (!corpusMeta) {
    return null;
  }

  return {
    snapshot: toSnapshot(payload),
    corpusMeta,
  };
}

export function ownerSnapshotClientFromAmplify(client: {
  models: {
    LabPublication: {
      get: (input: { id: string }) => Promise<{
        data: { currentSnapshotId?: string | null } | null;
        errors?: Array<{ message: string }> | null;
      }>;
    };
    CorpusSnapshot: {
      get: (input: { id: string }) => Promise<{
        data: { payload?: unknown } | null;
        errors?: Array<{ message: string }> | null;
      }>;
    };
  };
}): OwnerSnapshotPayloadClient {
  return {
    async getPublication() {
      const { data, errors } = await client.models.LabPublication.get({ id: 'current' });
      if (errors?.length) {
        throw new Error(errors.map((error) => error.message).join('; '));
      }
      return { currentSnapshotId: data?.currentSnapshotId ?? null };
    },
    async getSnapshotPayload(id) {
      const { data, errors } = await client.models.CorpusSnapshot.get({ id });
      if (errors?.length) {
        throw new Error(errors.map((error) => error.message).join('; '));
      }
      return data?.payload ?? null;
    },
  };
}

export async function fetchOwnerJobMarketPulseSourceViaClient(
  client: OwnerSnapshotPayloadClient,
): Promise<OwnerJobMarketPulseSource | null> {
  const publication = await client.getPublication();
  if (!publication.currentSnapshotId) {
    return null;
  }

  const payload = await client.getSnapshotPayload(publication.currentSnapshotId);
  return ownerPulseSourceFromPayload(payload);
}

export async function fetchOwnerJobMarketPulseSource(
  deps: FetchOwnerJobMarketPulseSourceDeps = {},
): Promise<OwnerJobMarketPulseSource | null> {
  if (deps.fetchOwnerPayload) {
    return deps.fetchOwnerPayload();
  }

  return null;
}
