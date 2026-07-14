import type {
  ListThemeLabelOverridesDeps,
  SetThemeLabelOverrideDeps,
  ThemeLabelOverrideRecord,
} from './job-market-theme-labels';

export type AmplifyThemeLabelOverrideRow = {
  clusterKey: string;
  label: string;
};

type AmplifyDataResult<T> = {
  data: T;
  errors?: Array<{ message: string }> | null;
};

export type AmplifyThemeLabelOverrideModelClient = {
  list: () => Promise<AmplifyDataResult<AmplifyThemeLabelOverrideRow[] | null>>;
  get: (input: { id: string }) => Promise<AmplifyDataResult<AmplifyThemeLabelOverrideRow | null>>;
  create: (
    input: { id: string; clusterKey: string; label: string },
  ) => Promise<AmplifyDataResult<AmplifyThemeLabelOverrideRow | null>>;
  update: (
    input: { id: string; clusterKey?: string; label?: string },
  ) => Promise<AmplifyDataResult<AmplifyThemeLabelOverrideRow | null>>;
};

function throwIfErrors(errors: Array<{ message: string }> | null | undefined): void {
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
}

export function createAmplifyThemeLabelOverrideDeps(
  client: AmplifyThemeLabelOverrideModelClient,
): ListThemeLabelOverridesDeps & SetThemeLabelOverrideDeps {
  return {
    async listOverrides() {
      const { data, errors } = await client.list();
      throwIfErrors(errors);
      return (data ?? []).map((row) => ({
        clusterKey: row.clusterKey,
        label: row.label,
      }));
    },
    async saveOverride(record: ThemeLabelOverrideRecord) {
      const existing = await client.get({ id: record.clusterKey });
      throwIfErrors(existing.errors);

      if (existing.data) {
        const { errors } = await client.update({
          id: record.clusterKey,
          clusterKey: record.clusterKey,
          label: record.label,
        });
        throwIfErrors(errors);
        return;
      }

      const { errors } = await client.create({
        id: record.clusterKey,
        clusterKey: record.clusterKey,
        label: record.label,
      });
      throwIfErrors(errors);
    },
  };
}

type AmplifyDataModelsClient = {
  models: {
    ThemeLabelOverride: {
      list: AmplifyThemeLabelOverrideModelClient['list'];
      get: AmplifyThemeLabelOverrideModelClient['get'];
      create: AmplifyThemeLabelOverrideModelClient['create'];
      update: AmplifyThemeLabelOverrideModelClient['update'];
    };
  };
};

export function createAmplifyThemeLabelOverrideModelClient(
  getClient: () => Promise<AmplifyDataModelsClient> = defaultGetAmplifyDataClient,
): AmplifyThemeLabelOverrideModelClient {
  return {
    async list() {
      const client = await getClient();
      return client.models.ThemeLabelOverride.list();
    },
    async get(input) {
      const client = await getClient();
      return client.models.ThemeLabelOverride.get(input);
    },
    async create(input) {
      const client = await getClient();
      return client.models.ThemeLabelOverride.create(input);
    },
    async update(input) {
      const client = await getClient();
      return client.models.ThemeLabelOverride.update(input);
    },
  };
}

async function defaultGetAmplifyDataClient(): Promise<AmplifyDataModelsClient> {
  const { generateClient } = await import('aws-amplify/data');
  return generateClient() as unknown as AmplifyDataModelsClient;
}

export function createDefaultAmplifyThemeLabelOverrideDeps(): ListThemeLabelOverridesDeps &
  SetThemeLabelOverrideDeps {
  return createAmplifyThemeLabelOverrideDeps(
    createAmplifyThemeLabelOverrideModelClient(),
  );
}
