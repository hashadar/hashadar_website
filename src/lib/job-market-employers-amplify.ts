import type {
  CreateEmployerDeps,
  EmployerPrestigeTier,
  EmployerRecord,
  EmployerSizeTier,
  ListEmployersDeps,
  UpdateEmployerDeps,
  UpdateJobDescriptionStructuredFieldsDeps,
} from './job-market-employers';
import { createDefaultAmplifyCorpusDeps } from './job-market-corpus-amplify';
import { fetchJobDescriptionMarkdown } from './fetch-job-description-markdown';
import { createDefaultFetchJobDescriptionMarkdownDeps } from './fetch-job-description-markdown-client';
import { overwriteJobDescriptionMarkdown } from './upload-job-description';

export type AmplifyEmployerRow = {
  id: string;
  name: string;
  sizeTier: EmployerSizeTier;
  prestigeTier: EmployerPrestigeTier;
};

type AmplifyDataResult<T> = {
  data: T;
  errors?: Array<{ message: string }> | null;
};

export type AmplifyEmployerModelClient = {
  get: (input: { id: string }) => Promise<AmplifyDataResult<AmplifyEmployerRow | null>>;
  list: () => Promise<AmplifyDataResult<AmplifyEmployerRow[] | null>>;
  create: (
    input: Omit<AmplifyEmployerRow, 'id'>,
  ) => Promise<AmplifyDataResult<AmplifyEmployerRow | null>>;
  update: (
    input: AmplifyEmployerRow,
  ) => Promise<AmplifyDataResult<AmplifyEmployerRow | null>>;
};

export type AmplifyEmployerDeps = ListEmployersDeps &
  Pick<UpdateJobDescriptionStructuredFieldsDeps, 'getEmployer'> & {
    insertEmployer: CreateEmployerDeps['insertEmployer'];
    persistEmployer: UpdateEmployerDeps['persistEmployer'];
  };

function throwIfErrors(errors: Array<{ message: string }> | null | undefined): void {
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
}

function toEmployerRecord(row: AmplifyEmployerRow): EmployerRecord {
  return {
    id: row.id,
    name: row.name,
    sizeTier: row.sizeTier,
    prestigeTier: row.prestigeTier,
  };
}

export function createAmplifyEmployerDeps(
  client: AmplifyEmployerModelClient,
): AmplifyEmployerDeps {
  return {
    async listEmployers() {
      const { data, errors } = await client.list();
      throwIfErrors(errors);
      return (data ?? []).map(toEmployerRecord);
    },
    async getEmployer(id) {
      const { data, errors } = await client.get({ id });
      throwIfErrors(errors);
      return data ? toEmployerRecord(data) : null;
    },
    async insertEmployer(input) {
      const { data, errors } = await client.create(
        input as Omit<AmplifyEmployerRow, 'id'>,
      );
      throwIfErrors(errors);
      if (!data) {
        throw new Error('Employer create returned no data');
      }
      return toEmployerRecord(data);
    },
    async persistEmployer(record) {
      const { errors } = await client.update(record);
      throwIfErrors(errors);
    },
  };
}

type AmplifyDataModelsClient = {
  models: {
    Employer: {
      get: AmplifyEmployerModelClient['get'];
      list: AmplifyEmployerModelClient['list'];
      create: AmplifyEmployerModelClient['create'];
      update: AmplifyEmployerModelClient['update'];
    };
  };
};

export function createAmplifyEmployerModelClient(
  getClient: () => Promise<AmplifyDataModelsClient> = defaultGetAmplifyDataClient,
): AmplifyEmployerModelClient {
  return {
    async get(input) {
      const client = await getClient();
      return client.models.Employer.get(input);
    },
    async list() {
      const client = await getClient();
      return client.models.Employer.list();
    },
    async create(input) {
      const client = await getClient();
      return client.models.Employer.create(input);
    },
    async update(input) {
      const client = await getClient();
      return client.models.Employer.update(input);
    },
  };
}

async function defaultGetAmplifyDataClient(): Promise<AmplifyDataModelsClient> {
  const { generateClient } = await import('aws-amplify/data');
  return generateClient() as unknown as AmplifyDataModelsClient;
}

export function createDefaultAmplifyEmployerDeps(): AmplifyEmployerDeps {
  return createAmplifyEmployerDeps(createAmplifyEmployerModelClient());
}

export function createAmplifyMetadataDeps(
  corpusDeps: {
    getJobDescription: UpdateJobDescriptionStructuredFieldsDeps['getJobDescription'];
    saveJobDescription: UpdateJobDescriptionStructuredFieldsDeps['saveJobDescription'];
  },
  employerDeps: Pick<UpdateJobDescriptionStructuredFieldsDeps, 'getEmployer'>,
  markdownDeps?: Pick<
    UpdateJobDescriptionStructuredFieldsDeps,
    'getMarkdown' | 'overwriteMarkdown'
  >,
): UpdateJobDescriptionStructuredFieldsDeps {
  return {
    getJobDescription: corpusDeps.getJobDescription,
    saveJobDescription: corpusDeps.saveJobDescription,
    getEmployer: employerDeps.getEmployer,
    getMarkdown:
      markdownDeps?.getMarkdown ??
      (async (s3Key) => {
        const deps = await createDefaultFetchJobDescriptionMarkdownDeps();
        if (!deps) {
          return null;
        }
        return fetchJobDescriptionMarkdown(s3Key, deps);
      }),
    overwriteMarkdown:
      markdownDeps?.overwriteMarkdown ??
      ((input) => overwriteJobDescriptionMarkdown(input)),
  };
}

export function createDefaultAmplifyMetadataDeps(): UpdateJobDescriptionStructuredFieldsDeps {
  const corpusDeps = createDefaultAmplifyCorpusDeps();
  const employerDeps = createDefaultAmplifyEmployerDeps();
  return createAmplifyMetadataDeps(corpusDeps, employerDeps);
}
