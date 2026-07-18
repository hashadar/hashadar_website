import type {
  ArchiveJobDescriptionDeps,
  JobDescriptionCorpusRecord,
  JobDescriptionStatus,
  PrepareActiveCorpusDeps,
} from './job-market-corpus';

import type {
  CompensationPeriod,
  JobDescriptionRoleFamily,
  JobDescriptionSeniority,
} from './job-market-employers';

export type AmplifyJobDescriptionRow = {
  id: string;
  s3Key: string;
  contentHash: string;
  collectedAt: string;
  status: JobDescriptionStatus;
  title?: string | null;
  seniority?: JobDescriptionSeniority | null;
  roleFamily?: JobDescriptionRoleFamily | null;
  source?: string | null;
  employerId?: string | null;
  compensationCurrency?: string | null;
  compensationMin?: number | null;
  compensationMax?: number | null;
  compensationPeriod?: CompensationPeriod | null;
};

type AmplifyDataResult<T> = {
  data: T;
  errors?: Array<{ message: string }> | null;
};

export type AmplifyJobDescriptionModelClient = {
  get: (input: { id: string }) => Promise<AmplifyDataResult<AmplifyJobDescriptionRow | null>>;
  list: () => Promise<AmplifyDataResult<AmplifyJobDescriptionRow[] | null>>;
  update: (
    input: Pick<AmplifyJobDescriptionRow, 'id' | 'status'> &
      Partial<Omit<AmplifyJobDescriptionRow, 'id' | 'status'>>,
  ) => Promise<AmplifyDataResult<AmplifyJobDescriptionRow | null>>;
};

export type AmplifyCorpusDeps = ArchiveJobDescriptionDeps &
  Pick<PrepareActiveCorpusDeps, 'listJobDescriptions'>;

function throwIfErrors(errors: Array<{ message: string }> | null | undefined): void {
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
}

function toCorpusRecord(row: AmplifyJobDescriptionRow): JobDescriptionCorpusRecord {
  return {
    id: row.id,
    collectedAt: row.collectedAt,
    status: row.status,
    s3Key: row.s3Key,
    contentHash: row.contentHash,
    title: row.title ?? undefined,
    seniority: row.seniority ?? undefined,
    roleFamily: row.roleFamily ?? undefined,
    source: row.source ?? undefined,
    employerId: row.employerId ?? undefined,
    compensationCurrency: row.compensationCurrency ?? undefined,
    compensationMin: row.compensationMin ?? undefined,
    compensationMax: row.compensationMax ?? undefined,
    compensationPeriod: row.compensationPeriod ?? undefined,
  };
}

export function createAmplifyCorpusDeps(
  client: AmplifyJobDescriptionModelClient,
): AmplifyCorpusDeps {
  return {
    async getJobDescription(id) {
      const { data, errors } = await client.get({ id });
      throwIfErrors(errors);
      return data ? toCorpusRecord(data) : null;
    },
    async listJobDescriptions() {
      const { data, errors } = await client.list();
      throwIfErrors(errors);
      return (data ?? []).map(toCorpusRecord);
    },
    async saveJobDescription(record) {
      // Model update only — never remove the S3 object for soft-archive/restore.
      // Optional fields use null so clears persist (frontmatter SSOT projection).
      const { errors } = await client.update({
        id: record.id,
        status: record.status,
        ...(record.s3Key !== undefined ? { s3Key: record.s3Key } : {}),
        ...(record.contentHash !== undefined ? { contentHash: record.contentHash } : {}),
        ...(record.collectedAt !== undefined ? { collectedAt: record.collectedAt } : {}),
        title: record.title ?? null,
        seniority: record.seniority ?? null,
        roleFamily: record.roleFamily ?? null,
        source: record.source ?? null,
        employerId: record.employerId ?? null,
        compensationCurrency: record.compensationCurrency ?? null,
        compensationMin: record.compensationMin ?? null,
        compensationMax: record.compensationMax ?? null,
        compensationPeriod: record.compensationPeriod ?? null,
      });
      throwIfErrors(errors);
    },
  };
}

type AmplifyDataModelsClient = {
  models: {
    JobDescription: {
      get: AmplifyJobDescriptionModelClient['get'];
      list: AmplifyJobDescriptionModelClient['list'];
      update: AmplifyJobDescriptionModelClient['update'];
    };
  };
};

export function createAmplifyJobDescriptionModelClient(
  getClient: () => Promise<AmplifyDataModelsClient> = defaultGetAmplifyDataClient,
): AmplifyJobDescriptionModelClient {
  return {
    async get(input) {
      const client = await getClient();
      return client.models.JobDescription.get(input);
    },
    async list() {
      const client = await getClient();
      return client.models.JobDescription.list();
    },
    async update(input) {
      const client = await getClient();
      return client.models.JobDescription.update(input);
    },
  };
}

async function defaultGetAmplifyDataClient(): Promise<AmplifyDataModelsClient> {
  const { generateClient } = await import('aws-amplify/data');
  return generateClient() as unknown as AmplifyDataModelsClient;
}

export function createDefaultAmplifyCorpusDeps(): AmplifyCorpusDeps {
  return createAmplifyCorpusDeps(createAmplifyJobDescriptionModelClient());
}
