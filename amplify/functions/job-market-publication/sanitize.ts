import type { CorpusSnapshotPayload } from '../job-market-analyse/analyse';

type OwnerDocumentPulseMeta = {
  id: string;
  collectedAt: string;
  seniority?: string;
  roleFamily?: string;
  employerSizeTier?: string;
  employerPrestigeTier?: string;
  technologies: string[];
  clusterId: number;
  projectionX?: number;
  projectionY?: number;
};

/** Strips owner-only corpusMeta fields before guest publication. */
export function sanitiseSnapshotPayloadForGuests(
  payload: CorpusSnapshotPayload,
): CorpusSnapshotPayload {
  const { corpusMeta, ...rest } = payload;
  if (!corpusMeta) {
    return rest;
  }

  return {
    ...rest,
    corpusMeta: {
      documents: (corpusMeta.documents as OwnerDocumentPulseMeta[]).map(
        ({ id, collectedAt, technologies, clusterId, projectionX, projectionY }) => ({
          id,
          collectedAt,
          technologies,
          clusterId,
          projectionX,
          projectionY,
        }),
      ),
    },
  };
}
