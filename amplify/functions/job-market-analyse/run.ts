import {
  prepareActiveCorpusForAnalysis,
  type JobDescriptionCorpusRecord,
} from './corpus';
import {
  analyseCorpus,
  type AnalyseCorpusDeps,
  type CorpusSnapshotPayload,
} from './analyse';
import type { AnalysisRunRecord } from '../job-market-recompute/orchestrator';

export type StoredCorpusSnapshot = {
  id: string;
  runId: string;
  payload: CorpusSnapshotPayload;
  createdAt: string;
};

export type LabPublicationPointer = {
  currentSnapshotId: string;
};

export type ExecuteAnalysisRunDeps = {
  runId: string;
  listJobDescriptions: () => Promise<JobDescriptionCorpusRecord[]>;
  saveJobDescription: (record: JobDescriptionCorpusRecord) => Promise<void>;
  loadMarkdown: (s3Key: string) => Promise<string>;
  embed: AnalyseCorpusDeps['embed'];
  getCachedEmbedding: AnalyseCorpusDeps['getCachedEmbedding'];
  putCachedEmbedding: AnalyseCorpusDeps['putCachedEmbedding'];
  listThemeLabelOverrides?: () => Promise<Record<string, string>>;
  saveSnapshot: (snapshot: StoredCorpusSnapshot) => Promise<StoredCorpusSnapshot>;
  updateRun: (run: AnalysisRunRecord) => Promise<AnalysisRunRecord>;
  updatePublication: (publication: LabPublicationPointer) => Promise<void>;
  getPublication: () => Promise<LabPublicationPointer | null>;
  createSnapshotId?: () => string;
  now?: Date;
  maxAgeMonths?: number;
};

export type ExecuteAnalysisRunResult =
  | { status: 'succeeded'; snapshot: StoredCorpusSnapshot; run: AnalysisRunRecord }
  | { status: 'failed'; reason: string };

export async function executeAnalysisRun(
  deps: ExecuteAnalysisRunDeps,
): Promise<ExecuteAnalysisRunResult> {
  const now = deps.now ?? new Date();

  try {
    await deps.updateRun({
      id: deps.runId,
      status: 'running',
      createdAt: now.toISOString(),
    });

    const active = await prepareActiveCorpusForAnalysis({
      listJobDescriptions: deps.listJobDescriptions,
      saveJobDescription: deps.saveJobDescription,
      now,
      maxAgeMonths: deps.maxAgeMonths,
    });

    const analyzable: Array<{
      id: string;
      contentHash: string;
      markdown: string;
      seniority?: string;
      roleFamily?: string;
      title?: string;
    }> = [];
    for (const record of active) {
      const s3Key = record.s3Key ?? record.id;
      const markdown = await deps.loadMarkdown(s3Key);
      analyzable.push({
        id: record.id,
        contentHash: record.contentHash ?? record.id,
        markdown,
        seniority: record.seniority,
        roleFamily: record.roleFamily,
        title: record.title,
      });
    }

    const analysis = await analyseCorpus(analyzable, {
      embed: deps.embed,
      getCachedEmbedding: deps.getCachedEmbedding,
      putCachedEmbedding: deps.putCachedEmbedding,
      themeLabelOverrides: deps.listThemeLabelOverrides
        ? await deps.listThemeLabelOverrides()
        : undefined,
      now,
    });

    const snapshot: StoredCorpusSnapshot = {
      id: deps.createSnapshotId?.() ?? `snap-${now.toISOString()}`,
      runId: deps.runId,
      payload: analysis.snapshot,
      createdAt: now.toISOString(),
    };

    await deps.saveSnapshot(snapshot);
    await deps.updatePublication({ currentSnapshotId: snapshot.id });

    const run: AnalysisRunRecord = {
      id: deps.runId,
      status: 'succeeded',
      createdAt: now.toISOString(),
      ...analysis.metrics,
    };
    await deps.updateRun(run);

    return { status: 'succeeded', snapshot, run };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Analysis failed';
    await deps.updateRun({
      id: deps.runId,
      status: 'failed',
      createdAt: now.toISOString(),
      errorMessage: reason,
    });
    return { status: 'failed', reason };
  }
}
