import {
  CANONICAL_CV_ID,
  type CanonicalCvDeps,
  type CanonicalCvRecord,
} from './canonical-cv';

export type AmplifyCanonicalCvRow = {
  id: string;
  body: string;
  updatedAt: string;
};

type AmplifyDataResult<T> = {
  data: T;
  errors?: Array<{ message: string }> | null;
};

export type AmplifyCanonicalCvModelClient = {
  get: (input: { id: string }) => Promise<AmplifyDataResult<AmplifyCanonicalCvRow | null>>;
  create: (
    input: Pick<AmplifyCanonicalCvRow, 'id' | 'body' | 'updatedAt'>,
  ) => Promise<AmplifyDataResult<AmplifyCanonicalCvRow | null>>;
  update: (
    input: Pick<AmplifyCanonicalCvRow, 'id' | 'body' | 'updatedAt'>,
  ) => Promise<AmplifyDataResult<AmplifyCanonicalCvRow | null>>;
};

function throwIfErrors(errors: Array<{ message: string }> | null | undefined): void {
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
}

function toCanonicalCvRecord(row: AmplifyCanonicalCvRow): CanonicalCvRecord {
  return {
    id: CANONICAL_CV_ID,
    body: row.body,
    updatedAt: row.updatedAt,
  };
}

export function createAmplifyCanonicalCvDeps(
  client: AmplifyCanonicalCvModelClient,
): CanonicalCvDeps {
  return {
    async getCanonicalCv() {
      const { data, errors } = await client.get({ id: CANONICAL_CV_ID });
      throwIfErrors(errors);
      return data ? toCanonicalCvRecord(data) : null;
    },
    async saveCanonicalCv(input) {
      const existing = await client.get({ id: CANONICAL_CV_ID });
      throwIfErrors(existing.errors);

      if (existing.data) {
        const { data, errors } = await client.update({
          id: CANONICAL_CV_ID,
          body: input.body,
          updatedAt: input.updatedAt,
        });
        throwIfErrors(errors);
        if (!data) {
          throw new Error('Canonical CV update returned no data');
        }
        return toCanonicalCvRecord(data);
      }

      const { data, errors } = await client.create({
        id: CANONICAL_CV_ID,
        body: input.body,
        updatedAt: input.updatedAt,
      });
      throwIfErrors(errors);
      if (!data) {
        throw new Error('Canonical CV create returned no data');
      }
      return toCanonicalCvRecord(data);
    },
  };
}

type AmplifyDataModelsClient = {
  models: {
    CanonicalCv: AmplifyCanonicalCvModelClient;
  };
};

export function createAmplifyCanonicalCvModelClient(
  getClient: () => Promise<AmplifyDataModelsClient> = defaultGetAmplifyDataClient,
): AmplifyCanonicalCvModelClient {
  return {
    async get(input) {
      const client = await getClient();
      return client.models.CanonicalCv.get(input);
    },
    async create(input) {
      const client = await getClient();
      return client.models.CanonicalCv.create(input);
    },
    async update(input) {
      const client = await getClient();
      return client.models.CanonicalCv.update(input);
    },
  };
}

async function defaultGetAmplifyDataClient(): Promise<AmplifyDataModelsClient> {
  const { generateClient } = await import('aws-amplify/data');
  return generateClient({ authMode: 'userPool' }) as unknown as AmplifyDataModelsClient;
}

export function createDefaultAmplifyCanonicalCvDeps(): CanonicalCvDeps {
  return createAmplifyCanonicalCvDeps(createAmplifyCanonicalCvModelClient());
}

export { CANONICAL_CV_ID };
