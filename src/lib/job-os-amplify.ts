import type {
  ApplicationRecord,
  ApplicationStatus,
  CompensationDisclosure,
  CompensationPeriod,
  DecisionEventKind,
  DecisionEventRecord,
  EmployerPrestigeTier,
  EmployerRecord,
  EmployerSizeTier,
  JobOsStore,
  OpportunityRecord,
  OpportunityRoleFamily,
  OpportunitySeniority,
  OpportunityStatus,
} from '@/lib/job-os';

type AmplifyDataResult<T> = {
  data: T;
  errors?: Array<{ message: string }> | null;
};

export type AmplifyEmployerRow = {
  id: string;
  name: string;
  sizeTier: EmployerSizeTier;
  prestigeTier: EmployerPrestigeTier;
  summary?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  notes?: string | null;
  s3Key?: string | null;
  isAnon: boolean;
};

export type AmplifyOpportunityRow = {
  id: string;
  employerId: string;
  status: OpportunityStatus;
  title?: string | null;
  source?: string | null;
  noticedAt: string;
  seniority?: OpportunitySeniority | null;
  roleFamily?: OpportunityRoleFamily | null;
  compensationCurrency?: string | null;
  compensationMin?: number | null;
  compensationMax?: number | null;
  compensationPeriod?: CompensationPeriod | null;
  compensationDisclosure?: CompensationDisclosure | null;
  technologies?: string[] | null;
  s3Key?: string | null;
};

export type AmplifyApplicationRow = {
  id: string;
  opportunityId: string;
  status: ApplicationStatus;
  trackingNote?: string | null;
  s3Key?: string | null;
};

export type AmplifyDecisionEventRow = {
  id: string;
  kind: DecisionEventKind;
  opportunityId: string;
  applicationId?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  occurredAt: string;
};

type ModelClient<TRow, TCreate = Omit<TRow, 'id'>> = {
  get: (input: { id: string }) => Promise<AmplifyDataResult<TRow | null>>;
  list: (input?: {
    filter?: Record<string, unknown>;
  }) => Promise<AmplifyDataResult<TRow[] | null>>;
  create: (input: TCreate) => Promise<AmplifyDataResult<TRow | null>>;
  update: (input: TRow) => Promise<AmplifyDataResult<TRow | null>>;
};

export type AmplifyJobOsModelsClient = {
  Employer: ModelClient<AmplifyEmployerRow>;
  Opportunity: ModelClient<AmplifyOpportunityRow>;
  Application: ModelClient<AmplifyApplicationRow>;
  DecisionEvent: ModelClient<AmplifyDecisionEventRow>;
};

function throwIfErrors(
  errors: Array<{ message: string }> | null | undefined,
): void {
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
}

function optionalString(
  value: string | null | undefined,
): string | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  return value;
}

function toEmployerRecord(row: AmplifyEmployerRow): EmployerRecord {
  return {
    id: row.id,
    name: row.name,
    sizeTier: row.sizeTier,
    prestigeTier: row.prestigeTier,
    summary: optionalString(row.summary),
    websiteUrl: optionalString(row.websiteUrl),
    linkedinUrl: optionalString(row.linkedinUrl),
    notes: optionalString(row.notes),
    s3Key: optionalString(row.s3Key),
    isAnon: row.isAnon,
  };
}

function toOpportunityRecord(row: AmplifyOpportunityRow): OpportunityRecord {
  return {
    id: row.id,
    employerId: row.employerId,
    status: row.status,
    title: optionalString(row.title),
    source: optionalString(row.source),
    noticedAt: row.noticedAt,
    seniority: row.seniority ?? undefined,
    roleFamily: row.roleFamily ?? undefined,
    compensationCurrency: optionalString(row.compensationCurrency),
    compensationMin: row.compensationMin ?? undefined,
    compensationMax: row.compensationMax ?? undefined,
    compensationPeriod: row.compensationPeriod ?? undefined,
    compensationDisclosure: row.compensationDisclosure ?? undefined,
    technologies: row.technologies ?? undefined,
    s3Key: optionalString(row.s3Key),
  };
}

function toApplicationRecord(row: AmplifyApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    opportunityId: row.opportunityId,
    status: row.status,
    trackingNote: optionalString(row.trackingNote),
    s3Key: optionalString(row.s3Key),
  };
}

function toDecisionEventRecord(
  row: AmplifyDecisionEventRow,
): DecisionEventRecord {
  return {
    id: row.id,
    kind: row.kind,
    opportunityId: row.opportunityId,
    applicationId: optionalString(row.applicationId),
    fromStatus: optionalString(row.fromStatus),
    toStatus: optionalString(row.toStatus),
    occurredAt: row.occurredAt,
  };
}

function employerToRow(record: EmployerRecord): AmplifyEmployerRow {
  return {
    id: record.id,
    name: record.name,
    sizeTier: record.sizeTier,
    prestigeTier: record.prestigeTier,
    summary: record.summary ?? null,
    websiteUrl: record.websiteUrl ?? null,
    linkedinUrl: record.linkedinUrl ?? null,
    notes: record.notes ?? null,
    s3Key: record.s3Key ?? null,
    isAnon: record.isAnon,
  };
}

function opportunityToRow(record: OpportunityRecord): AmplifyOpportunityRow {
  return {
    id: record.id,
    employerId: record.employerId,
    status: record.status,
    title: record.title ?? null,
    source: record.source ?? null,
    noticedAt: record.noticedAt,
    seniority: record.seniority ?? null,
    roleFamily: record.roleFamily ?? null,
    compensationCurrency: record.compensationCurrency ?? null,
    compensationMin: record.compensationMin ?? null,
    compensationMax: record.compensationMax ?? null,
    compensationPeriod: record.compensationPeriod ?? null,
    compensationDisclosure: record.compensationDisclosure ?? null,
    technologies: record.technologies ?? null,
    s3Key: record.s3Key ?? null,
  };
}

function applicationToRow(record: ApplicationRecord): AmplifyApplicationRow {
  return {
    id: record.id,
    opportunityId: record.opportunityId,
    status: record.status,
    trackingNote: record.trackingNote ?? null,
    s3Key: record.s3Key ?? null,
  };
}

export function createAmplifyJobOsStore(
  client: AmplifyJobOsModelsClient,
): JobOsStore {
  return {
    async listEmployers() {
      const { data, errors } = await client.Employer.list();
      throwIfErrors(errors);
      return (data ?? []).map(toEmployerRecord);
    },
    async getEmployer(id) {
      const { data, errors } = await client.Employer.get({ id });
      throwIfErrors(errors);
      return data ? toEmployerRecord(data) : null;
    },
    async insertEmployer(input) {
      const { id: _ignored, ...fields } = employerToRow({
        ...input,
        id: input.id ?? '',
      });
      void _ignored;
      const { data, errors } = await client.Employer.create(fields);
      throwIfErrors(errors);
      if (!data) {
        throw new Error('Employer create returned no data');
      }
      return toEmployerRecord(data);
    },
    async persistEmployer(record) {
      const { errors } = await client.Employer.update(employerToRow(record));
      throwIfErrors(errors);
    },
    async listOpportunities() {
      const { data, errors } = await client.Opportunity.list();
      throwIfErrors(errors);
      return (data ?? []).map(toOpportunityRecord);
    },
    async getOpportunity(id) {
      const { data, errors } = await client.Opportunity.get({ id });
      throwIfErrors(errors);
      return data ? toOpportunityRecord(data) : null;
    },
    async insertOpportunity(input) {
      const { id: _ignored, ...fields } = opportunityToRow({
        ...input,
        id: input.id ?? '',
      });
      void _ignored;
      const { data, errors } = await client.Opportunity.create(fields);
      throwIfErrors(errors);
      if (!data) {
        throw new Error('Opportunity create returned no data');
      }
      return toOpportunityRecord(data);
    },
    async persistOpportunity(record) {
      const { errors } = await client.Opportunity.update(
        opportunityToRow(record),
      );
      throwIfErrors(errors);
    },
    async listApplications() {
      const { data, errors } = await client.Application.list();
      throwIfErrors(errors);
      return (data ?? []).map(toApplicationRecord);
    },
    async getApplication(id) {
      const { data, errors } = await client.Application.get({ id });
      throwIfErrors(errors);
      return data ? toApplicationRecord(data) : null;
    },
    async getApplicationByOpportunityId(opportunityId) {
      const { data, errors } = await client.Application.list({
        filter: { opportunityId: { eq: opportunityId } },
      });
      throwIfErrors(errors);
      const row = data?.[0];
      return row ? toApplicationRecord(row) : null;
    },
    async insertApplication(input) {
      const { id: _ignored, ...fields } = applicationToRow({
        ...input,
        id: input.id ?? '',
      });
      void _ignored;
      const { data, errors } = await client.Application.create(fields);
      throwIfErrors(errors);
      if (!data) {
        throw new Error('Application create returned no data');
      }
      return toApplicationRecord(data);
    },
    async persistApplication(record) {
      const { errors } = await client.Application.update(
        applicationToRow(record),
      );
      throwIfErrors(errors);
    },
    async listDecisionEventsForOpportunity(opportunityId) {
      const { data, errors } = await client.DecisionEvent.list({
        filter: { opportunityId: { eq: opportunityId } },
      });
      throwIfErrors(errors);
      return (data ?? []).map(toDecisionEventRecord);
    },
    async appendDecisionEvent(input) {
      const row = {
        kind: input.kind,
        opportunityId: input.opportunityId,
        applicationId: input.applicationId ?? null,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus ?? null,
        occurredAt: input.occurredAt,
      };
      const { data, errors } = await client.DecisionEvent.create(row);
      throwIfErrors(errors);
      if (!data) {
        throw new Error('DecisionEvent create returned no data');
      }
      return toDecisionEventRecord(data);
    },
  };
}

type AmplifyDataModelsClient = {
  models: AmplifyJobOsModelsClient;
};

async function defaultGetAmplifyDataClient(): Promise<AmplifyDataModelsClient> {
  const { generateClient } = await import('aws-amplify/data');
  return generateClient() as unknown as AmplifyDataModelsClient;
}

export function createAmplifyJobOsModelsClient(
  getClient: () => Promise<AmplifyDataModelsClient> = defaultGetAmplifyDataClient,
): AmplifyJobOsModelsClient {
  return {
    Employer: {
      async get(input) {
        const client = await getClient();
        return client.models.Employer.get(input);
      },
      async list(input) {
        const client = await getClient();
        return client.models.Employer.list(input);
      },
      async create(input) {
        const client = await getClient();
        return client.models.Employer.create(input);
      },
      async update(input) {
        const client = await getClient();
        return client.models.Employer.update(input);
      },
    },
    Opportunity: {
      async get(input) {
        const client = await getClient();
        return client.models.Opportunity.get(input);
      },
      async list(input) {
        const client = await getClient();
        return client.models.Opportunity.list(input);
      },
      async create(input) {
        const client = await getClient();
        return client.models.Opportunity.create(input);
      },
      async update(input) {
        const client = await getClient();
        return client.models.Opportunity.update(input);
      },
    },
    Application: {
      async get(input) {
        const client = await getClient();
        return client.models.Application.get(input);
      },
      async list(input) {
        const client = await getClient();
        return client.models.Application.list(input);
      },
      async create(input) {
        const client = await getClient();
        return client.models.Application.create(input);
      },
      async update(input) {
        const client = await getClient();
        return client.models.Application.update(input);
      },
    },
    DecisionEvent: {
      async get(input) {
        const client = await getClient();
        return client.models.DecisionEvent.get(input);
      },
      async list(input) {
        const client = await getClient();
        return client.models.DecisionEvent.list(input);
      },
      async create(input) {
        const client = await getClient();
        return client.models.DecisionEvent.create(input);
      },
      async update(input) {
        const client = await getClient();
        return client.models.DecisionEvent.update(input);
      },
    },
  };
}

export function createDefaultAmplifyJobOsStore(): JobOsStore {
  return createAmplifyJobOsStore(createAmplifyJobOsModelsClient());
}
