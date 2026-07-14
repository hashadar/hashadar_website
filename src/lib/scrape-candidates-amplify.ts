import type {
  CreateScrapeCandidate,
  ListScrapeCandidatesDeps,
  ScrapeCandidateRecord,
  ScrapeCandidateStatus,
  ScrapeCandidateStoreDeps,
} from './scrape-candidates';

export type AmplifyScrapeCandidateRow = {
  id: string;
  fileName: string;
  body: string;
  status: ScrapeCandidateStatus;
  title?: string | null;
  source?: string | null;
  collectedAt?: string | null;
  candidateS3Key?: string | null;
};

type AmplifyDataResult<T> = {
  data: T;
  errors?: Array<{ message: string }> | null;
};

export type AmplifyScrapeCandidateModelClient = {
  get: (input: { id: string }) => Promise<AmplifyDataResult<AmplifyScrapeCandidateRow | null>>;
  list: () => Promise<AmplifyDataResult<AmplifyScrapeCandidateRow[] | null>>;
  create: (
    input: Omit<AmplifyScrapeCandidateRow, 'id'>,
  ) => Promise<AmplifyDataResult<AmplifyScrapeCandidateRow | null>>;
  update: (
    input: Pick<AmplifyScrapeCandidateRow, 'id' | 'status'> &
      Partial<Omit<AmplifyScrapeCandidateRow, 'id' | 'status'>>,
  ) => Promise<AmplifyDataResult<AmplifyScrapeCandidateRow | null>>;
};

function throwIfErrors(errors: Array<{ message: string }> | null | undefined): void {
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
}

function toScrapeCandidateRecord(row: AmplifyScrapeCandidateRow): ScrapeCandidateRecord {
  return {
    id: row.id,
    fileName: row.fileName,
    body: row.body,
    status: row.status,
    title: row.title ?? undefined,
    source: row.source ?? undefined,
    collectedAt: row.collectedAt ?? undefined,
    candidateS3Key: row.candidateS3Key ?? undefined,
  };
}

export function createAmplifyScrapeCandidateDeps(
  client: AmplifyScrapeCandidateModelClient,
): ListScrapeCandidatesDeps & ScrapeCandidateStoreDeps & { createScrapeCandidate: CreateScrapeCandidate } {
  return {
    async listScrapeCandidates() {
      const { data, errors } = await client.list();
      throwIfErrors(errors);
      return (data ?? []).map(toScrapeCandidateRecord);
    },
    async getScrapeCandidate(id) {
      const { data, errors } = await client.get({ id });
      throwIfErrors(errors);
      return data ? toScrapeCandidateRecord(data) : null;
    },
    async saveScrapeCandidate(record) {
      const { errors } = await client.update({
        id: record.id,
        status: record.status,
        ...(record.fileName !== undefined ? { fileName: record.fileName } : {}),
        ...(record.body !== undefined ? { body: record.body } : {}),
        ...(record.title !== undefined ? { title: record.title } : {}),
        ...(record.source !== undefined ? { source: record.source } : {}),
        ...(record.collectedAt !== undefined ? { collectedAt: record.collectedAt } : {}),
        ...(record.candidateS3Key !== undefined
          ? { candidateS3Key: record.candidateS3Key }
          : {}),
      });
      throwIfErrors(errors);
    },
    async createScrapeCandidate(input) {
      const { data, errors } = await client.create({
        fileName: input.fileName,
        body: input.body,
        status: input.status,
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.source !== undefined ? { source: input.source } : {}),
        ...(input.collectedAt !== undefined ? { collectedAt: input.collectedAt } : {}),
        ...(input.candidateS3Key !== undefined
          ? { candidateS3Key: input.candidateS3Key }
          : {}),
      });
      throwIfErrors(errors);
      if (!data) {
        throw new Error('Failed to create scrape candidate');
      }
      return toScrapeCandidateRecord(data);
    },
  };
}

type AmplifyDataModelsClient = {
  models: {
    ScrapeCandidate: AmplifyScrapeCandidateModelClient;
  };
};

export function createAmplifyScrapeCandidateModelClient(
  getClient: () => Promise<AmplifyDataModelsClient> = defaultGetAmplifyDataClient,
): AmplifyScrapeCandidateModelClient {
  return {
    async get(input) {
      const client = await getClient();
      return client.models.ScrapeCandidate.get(input);
    },
    async list() {
      const client = await getClient();
      return client.models.ScrapeCandidate.list();
    },
    async create(input) {
      const client = await getClient();
      return client.models.ScrapeCandidate.create(input);
    },
    async update(input) {
      const client = await getClient();
      return client.models.ScrapeCandidate.update(input);
    },
  };
}

async function defaultGetAmplifyDataClient(): Promise<AmplifyDataModelsClient> {
  const { generateClient } = await import('aws-amplify/data');
  return generateClient() as unknown as AmplifyDataModelsClient;
}

export function createDefaultAmplifyScrapeCandidateDeps(): ListScrapeCandidatesDeps &
  ScrapeCandidateStoreDeps & { createScrapeCandidate: CreateScrapeCandidate } {
  return createAmplifyScrapeCandidateDeps(createAmplifyScrapeCandidateModelClient());
}
