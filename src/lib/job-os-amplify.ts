import type {
  ApplicationRecord,
  ApplicationStatus,
  CompensationDisclosure,
  CompensationPeriod,
  DecisionEventKind,
  DecisionEventRecord,
  EmployerRecord,
  JobOsStore,
  OpportunityRecord,
  OpportunityStatus,
  VocabularyKind,
  VocabularyTermRecord,
} from '@/lib/job-os';

type AmplifyDataResult<T> = {
  data: T;
  errors?: Array<{ message: string }> | null;
};

export type AmplifyEmployerRow = {
  id: string;
  name: string;
  sizeTier: string;
  prestigeTier: string;
  /** May be missing on rows written before sector existed. */
  sector?: string | null;
  summary?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  notes?: string | null;
  s3Key?: string | null;
  /** May be null/undefined on legacy rows written before the field existed. */
  isAnon?: boolean | null;
};

export type AmplifyOpportunityRow = {
  id: string;
  employerId: string;
  status: OpportunityStatus;
  title?: string | null;
  source?: string | null;
  noticedAt: string;
  seniority?: string | null;
  roleFamily?: string | null;
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

export type AmplifyVocabularyTermRow = {
  id: string;
  kind: string;
  value: string;
  label: string;
  sortOrder?: number | null;
  active?: boolean | null;
};

type ModelClient<
  TRow,
  TCreate = Omit<TRow, 'id'> & { id?: string },
> = {
  get: (input: { id: string }) => Promise<AmplifyDataResult<TRow | null>>;
  list: (input?: {
    filter?: Record<string, unknown>;
  }) => Promise<AmplifyDataResult<Array<TRow | null> | null>>;
  create: (input: TCreate) => Promise<AmplifyDataResult<TRow | null>>;
  update: (input: TRow) => Promise<AmplifyDataResult<TRow | null>>;
};

export type AmplifyJobOsModelsClient = {
  Employer: ModelClient<AmplifyEmployerRow>;
  Opportunity: ModelClient<AmplifyOpportunityRow>;
  Application: ModelClient<AmplifyApplicationRow>;
  DecisionEvent: ModelClient<AmplifyDecisionEventRow>;
  VocabularyTerm: ModelClient<AmplifyVocabularyTermRow>;
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
    sector: optionalString(row.sector) ?? 'other',
    summary: optionalString(row.summary),
    websiteUrl: optionalString(row.websiteUrl),
    linkedinUrl: optionalString(row.linkedinUrl),
    notes: optionalString(row.notes),
    s3Key: optionalString(row.s3Key),
    isAnon: row.isAnon === true,
  };
}

function isEmployerRow(
  row: AmplifyEmployerRow | null | undefined,
): row is AmplifyEmployerRow {
  return row != null && typeof row.id === 'string' && row.id.length > 0;
}

function toOpportunityRecord(row: AmplifyOpportunityRow): OpportunityRecord {
  return {
    id: row.id,
    employerId: row.employerId,
    status: row.status,
    title: optionalString(row.title),
    source: optionalString(row.source),
    noticedAt: row.noticedAt,
    seniority: optionalString(row.seniority),
    roleFamily: optionalString(row.roleFamily),
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

function toVocabularyTermRecord(
  row: AmplifyVocabularyTermRow,
): VocabularyTermRecord {
  return {
    id: row.id,
    kind: row.kind as VocabularyKind,
    value: row.value,
    label: row.label,
    sortOrder: row.sortOrder ?? undefined,
    active: row.active !== false,
  };
}

function employerToRow(record: EmployerRecord): AmplifyEmployerRow {
  return {
    id: record.id,
    name: record.name,
    sizeTier: record.sizeTier,
    prestigeTier: record.prestigeTier,
    sector: record.sector,
    summary: record.summary ?? null,
    websiteUrl: record.websiteUrl ?? null,
    linkedinUrl: record.linkedinUrl ?? null,
    notes: record.notes ?? null,
    s3Key: record.s3Key ?? null,
    // Always send a concrete boolean — some clients omit `false`.
    isAnon: record.isAnon === true,
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

function vocabularyTermToRow(
  record: VocabularyTermRecord,
): AmplifyVocabularyTermRow {
  return {
    id: record.id,
    kind: record.kind,
    value: record.value,
    label: record.label,
    sortOrder: record.sortOrder ?? null,
    active: record.active,
  };
}

export function createAmplifyJobOsStore(
  client: AmplifyJobOsModelsClient,
): JobOsStore {
  return {
    async listEmployers() {
      const { data, errors } = await client.Employer.list();
      const rows = (data ?? []).filter(isEmployerRow);
      // Prefer recoverable rows over failing the whole workspace when some
      // GraphQL items null out (e.g. legacy missing isAnon under Boolean!).
      if (rows.length === 0) {
        throwIfErrors(errors);
        return [];
      }
      const employers = rows.map(toEmployerRecord);
      // Persist default sector onto legacy rows so DynamoDB attrs catch up.
      await Promise.all(
        rows
          .filter((row) => row.sector == null || row.sector === '')
          .map(async (row) => {
            const result = await client.Employer.update({
              ...employerToRow(toEmployerRecord(row)),
              sector: 'other',
            });
            throwIfErrors(result?.errors);
          }),
      );
      return employers;
    },
    async getEmployer(id) {
      const { data, errors } = await client.Employer.get({ id });
      throwIfErrors(errors);
      return data && isEmployerRow(data) ? toEmployerRecord(data) : null;
    },
    async insertEmployer(input) {
      const row = employerToRow({
        ...input,
        id: input.id ?? '',
      });
      const { id, ...fields } = row;
      const { data, errors } = await client.Employer.create({
        ...fields,
        // Explicit so Amplify persists false (not "unset").
        isAnon: row.isAnon === true,
        ...(id ? { id } : {}),
      });
      throwIfErrors(errors);
      if (!data || !isEmployerRow(data)) {
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
      return (data ?? [])
        .filter((row): row is AmplifyOpportunityRow => row != null)
        .map(toOpportunityRecord);
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
      return (data ?? [])
        .filter((row): row is AmplifyApplicationRow => row != null)
        .map(toApplicationRecord);
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
      return (data ?? [])
        .filter((row): row is AmplifyDecisionEventRow => row != null)
        .map(toDecisionEventRecord);
    },
    async appendDecisionEvent(input) {
      const row: {
        id?: string;
        kind: typeof input.kind;
        opportunityId: string;
        applicationId?: string;
        fromStatus?: string;
        toStatus?: string;
        occurredAt: string;
      } = {
        kind: input.kind,
        opportunityId: input.opportunityId,
        occurredAt: input.occurredAt,
      };
      // Omit optional GSI keys — DynamoDB rejects NULL on index attributes.
      if (input.id) {
        row.id = input.id;
      }
      if (input.applicationId) {
        row.applicationId = input.applicationId;
      }
      if (input.fromStatus) {
        row.fromStatus = input.fromStatus;
      }
      if (input.toStatus) {
        row.toStatus = input.toStatus;
      }
      const { data, errors } = await client.DecisionEvent.create(row);
      throwIfErrors(errors);
      if (!data) {
        throw new Error('DecisionEvent create returned no data');
      }
      return toDecisionEventRecord(data);
    },
    async listVocabularyTerms(kind) {
      const { data, errors } = await client.VocabularyTerm.list(
        kind ? { filter: { kind: { eq: kind } } } : undefined,
      );
      throwIfErrors(errors);
      return (data ?? [])
        .filter((row): row is AmplifyVocabularyTermRow => row != null)
        .map(toVocabularyTermRecord);
    },
    async getVocabularyTerm(id) {
      const { data, errors } = await client.VocabularyTerm.get({ id });
      throwIfErrors(errors);
      return data ? toVocabularyTermRecord(data) : null;
    },
    async insertVocabularyTerm(input) {
      const row = vocabularyTermToRow({
        ...input,
        id: input.id ?? '',
      });
      const { id, ...fields } = row;
      const { data, errors } = await client.VocabularyTerm.create({
        ...fields,
        active: row.active !== false,
        ...(id ? { id } : {}),
      });
      throwIfErrors(errors);
      if (!data) {
        throw new Error('VocabularyTerm create returned no data');
      }
      return toVocabularyTermRecord(data);
    },
    async persistVocabularyTerm(record) {
      const { errors } = await client.VocabularyTerm.update(
        vocabularyTermToRow(record),
      );
      throwIfErrors(errors);
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
    VocabularyTerm: {
      async get(input) {
        const client = await getClient();
        return client.models.VocabularyTerm.get(input);
      },
      async list(input) {
        const client = await getClient();
        return client.models.VocabularyTerm.list(input);
      },
      async create(input) {
        const client = await getClient();
        return client.models.VocabularyTerm.create(input);
      },
      async update(input) {
        const client = await getClient();
        return client.models.VocabularyTerm.update(input);
      },
    },
  };
}

export function createDefaultAmplifyJobOsStore(): JobOsStore {
  return createAmplifyJobOsStore(createAmplifyJobOsModelsClient());
}
