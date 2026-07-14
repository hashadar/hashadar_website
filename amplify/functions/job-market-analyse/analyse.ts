import {
  matchTechnologiesInDocuments,
  type TechnologyFrequency,
} from './technology-ontology';

export const MAX_SKILLS = 40;
export const MAX_PROJECTION_POINTS = 200;
export const MAX_CLUSTER_K = 12;

export type AnalyzableDocument = {
  id: string;
  contentHash: string;
  markdown: string;
  seniority?: string;
  roleFamily?: string;
  title?: string;
};

export type SkillFrequency = TechnologyFrequency;

export type TaxonomyBucket = {
  name: string;
  count: number;
};

export type ClusterSummary = {
  id: number;
  size: number;
  label: string;
};

export type ProjectionPoint = {
  x: number;
  y: number;
  clusterId: number;
};

export type CorpusSnapshotPayload = {
  documentCount: number;
  publishedAt: string;
  technologies: SkillFrequency[];
  skills: SkillFrequency[];
  seniority: TaxonomyBucket[];
  roleFamily: TaxonomyBucket[];
  clusters: ClusterSummary[];
  projection: ProjectionPoint[];
};

export type AnalysisMetrics = {
  docsConsidered: number;
  docsEmbedded: number;
  docsCacheHit: number;
  clusterCount: number;
  bedrockInputTokens: number;
  estimatedCostUsd: number;
};

export type EmbedResult = {
  vector: number[];
  inputTokens: number;
  estimatedCostUsd: number;
};

export type AnalyseCorpusDeps = {
  embed: (text: string) => Promise<EmbedResult>;
  getCachedEmbedding: (contentHash: string) => Promise<number[] | null>;
  putCachedEmbedding: (contentHash: string, vector: number[]) => Promise<void>;
  now?: Date;
  maxSkills?: number;
  maxProjectionPoints?: number;
  maxClusters?: number;
  themeLabelOverrides?: Record<string, string>;
  cluster?: (
    vectors: number[][],
    k: number,
  ) => { assignments: number[]; centroids: number[][] };
};

export type AnalyseCorpusResult = {
  snapshot: CorpusSnapshotPayload;
  metrics: AnalysisMetrics;
};

function taxonomyBreakdown(
  documents: AnalyzableDocument[],
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

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

/** Swap-ready default clusterer (k-means). */
export function kMeansCluster(
  vectors: number[][],
  k: number,
  maxIterations: number = 25,
): { assignments: number[]; centroids: number[][] } {
  if (vectors.length === 0) {
    return { assignments: [], centroids: [] };
  }

  const clusterCount = Math.max(1, Math.min(k, vectors.length, MAX_CLUSTER_K));
  const dimensions = vectors[0]?.length ?? 0;
  const centroids = vectors.slice(0, clusterCount).map((vector) => [...vector]);
  const assignments = new Array<number>(vectors.length).fill(0);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let moved = false;
    for (let index = 0; index < vectors.length; index += 1) {
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let centroidIndex = 0; centroidIndex < centroids.length; centroidIndex += 1) {
        const distance = euclidean(vectors[index]!, centroids[centroidIndex]!);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = centroidIndex;
        }
      }
      if (assignments[index] !== best) {
        assignments[index] = best;
        moved = true;
      }
    }

    const sums = centroids.map(() => new Array<number>(dimensions).fill(0));
    const counts = new Array<number>(centroids.length).fill(0);
    for (let index = 0; index < vectors.length; index += 1) {
      const clusterId = assignments[index]!;
      counts[clusterId] += 1;
      const vector = vectors[index]!;
      for (let dim = 0; dim < dimensions; dim += 1) {
        sums[clusterId]![dim] += vector[dim] ?? 0;
      }
    }
    for (let centroidIndex = 0; centroidIndex < centroids.length; centroidIndex += 1) {
      if (counts[centroidIndex] === 0) {
        continue;
      }
      centroids[centroidIndex] = sums[centroidIndex]!.map(
        (value) => value / counts[centroidIndex]!,
      );
    }

    if (!moved) {
      break;
    }
  }

  return { assignments, centroids };
}

export function deriveClusterKey(
  documents: Array<{ markdown: string }>,
): string {
  const technologies = matchTechnologiesInDocuments(documents, { maxTechnologies: 2 });
  if (technologies.length === 0) {
    return '';
  }

  return technologies
    .map((technology) => technology.name)
    .sort((a, b) => a.localeCompare(b))
    .join('|');
}

export function buildClusterLabel(
  clusterId: number,
  documents: Array<{ markdown: string }>,
): string {
  const technologies = matchTechnologiesInDocuments(documents, { maxTechnologies: 2 });
  if (technologies.length === 0) {
    return `Requirement theme ${clusterId + 1}`;
  }

  return technologies.map((technology) => technology.name).join(', ');
}

export function resolveClusterLabel(
  clusterId: number,
  documents: Array<{ markdown: string }>,
  overrides: Record<string, string> | undefined,
): string {
  const keys = [String(clusterId), deriveClusterKey(documents)].filter(Boolean);
  for (const key of keys) {
    const override = overrides?.[key]?.trim();
    if (override) {
      return override;
    }
  }

  return buildClusterLabel(clusterId, documents);
}

export async function analyseCorpus(
  documents: AnalyzableDocument[],
  deps: AnalyseCorpusDeps,
): Promise<AnalyseCorpusResult> {
  const maxSkills = deps.maxSkills ?? MAX_SKILLS;
  const maxProjectionPoints = deps.maxProjectionPoints ?? MAX_PROJECTION_POINTS;
  const maxClusters = deps.maxClusters ?? MAX_CLUSTER_K;
  const cluster = deps.cluster ?? kMeansCluster;
  const now = deps.now ?? new Date();

  const vectors: number[][] = [];
  let docsCacheHit = 0;
  let docsEmbedded = 0;
  let bedrockInputTokens = 0;
  let estimatedCostUsd = 0;

  for (const document of documents) {
    const cached = await deps.getCachedEmbedding(document.contentHash);
    if (cached) {
      docsCacheHit += 1;
      vectors.push(cached);
      continue;
    }

    const embedded = await deps.embed(document.markdown);
    docsEmbedded += 1;
    bedrockInputTokens += embedded.inputTokens;
    estimatedCostUsd += embedded.estimatedCostUsd;
    await deps.putCachedEmbedding(document.contentHash, embedded.vector);
    vectors.push(embedded.vector);
  }

  const k = Math.min(
    maxClusters,
    Math.max(1, Math.round(Math.sqrt(documents.length || 1))),
  );
  const { assignments } = cluster(vectors, k);

  const clusterSizes = new Map<number, number>();
  const clusterDocuments = new Map<number, AnalyzableDocument[]>();
  for (let index = 0; index < assignments.length; index += 1) {
    const clusterId = assignments[index] ?? 0;
    clusterSizes.set(clusterId, (clusterSizes.get(clusterId) ?? 0) + 1);
    const documentsInCluster = clusterDocuments.get(clusterId) ?? [];
    const document = documents[index];
    if (document) {
      documentsInCluster.push(document);
      clusterDocuments.set(clusterId, documentsInCluster);
    }
  }

  const clusters = [...clusterSizes.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, size]) => ({
      id,
      size,
      label: resolveClusterLabel(
        id,
        clusterDocuments.get(id) ?? [],
        deps.themeLabelOverrides,
      ),
    }));

  const projection = documents.slice(0, maxProjectionPoints).map((document, index) => ({
    x: vectors[index]?.[0] ?? 0,
    y: vectors[index]?.[1] ?? 0,
    clusterId: assignments[index] ?? 0,
  }));

  const technologies = matchTechnologiesInDocuments(documents, {
    maxTechnologies: maxSkills,
  });

  return {
    snapshot: {
      documentCount: documents.length,
      publishedAt: now.toISOString(),
      technologies,
      skills: technologies,
      seniority: taxonomyBreakdown(documents, 'seniority'),
      roleFamily: taxonomyBreakdown(documents, 'roleFamily'),
      clusters,
      projection,
    },
    metrics: {
      docsConsidered: documents.length,
      docsEmbedded,
      docsCacheHit,
      clusterCount: clusters.length,
      bedrockInputTokens,
      estimatedCostUsd,
    },
  };
}
