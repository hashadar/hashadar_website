/**
 * Job OS facade — sole read/write seam for Employer → Opportunity → Application
 * and Decision Events. Persistence and Body storage are injected adapters.
 */

export const ANON_EMPLOYER_NAME = 'Anon Employer';

export const VOCABULARY_KINDS = [
  'size_tier',
  'prestige_tier',
  'sector',
  'seniority',
  'role_family',
] as const;

export type VocabularyKind = (typeof VOCABULARY_KINDS)[number];

/** Seed values for size tier Vocabulary terms. */
export const EMPLOYER_SIZE_TIERS = [
  'startup',
  'scaleup',
  'enterprise',
  'big4',
  'other',
] as const;

/** Seed values for prestige Vocabulary terms. */
export const EMPLOYER_PRESTIGE_TIERS = ['low', 'mid', 'high', 'elite'] as const;

/** Seed values for sector Vocabulary terms. */
export const EMPLOYER_SECTORS = [
  'financial_services',
  'law',
  'consulting',
  'technology',
  'healthcare',
  'energy',
  'government',
  'media',
  'education',
  'other',
] as const;

export const OPPORTUNITY_STATUSES = ['open', 'closed'] as const;

/** Seed values for seniority Vocabulary terms. */
export const OPPORTUNITY_SENIORITIES = [
  'junior',
  'mid',
  'senior',
  'lead',
  'principal',
] as const;

/** Seed values for role family Vocabulary terms. */
export const OPPORTUNITY_ROLE_FAMILIES = [
  'data_science',
  'analytics',
  'engineering',
  'ml_ops',
  'product',
  'other',
] as const;

export const COMPENSATION_PERIODS = ['year', 'month', 'day', 'hour'] as const;

export const COMPENSATION_DISCLOSURES = [
  'range',
  'competitive',
  'unknown',
] as const;

export const APPLICATION_STATUSES = [
  'researching',
  'applied',
  'interviewing',
  'offer',
  'accepted',
  'rejected',
  'withdrawn',
] as const;

export const DECISION_EVENT_KINDS = [
  'opportunity_passed',
  'application_started',
  'application_status_changed',
] as const;

export type EmployerSizeTier = string;
export type EmployerPrestigeTier = string;
export type EmployerSector = string;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];
export type OpportunitySeniority = string;
export type OpportunityRoleFamily = string;
export type CompensationPeriod = (typeof COMPENSATION_PERIODS)[number];
export type CompensationDisclosure = (typeof COMPENSATION_DISCLOSURES)[number];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type DecisionEventKind = (typeof DECISION_EVENT_KINDS)[number];

export type BodyEntityKind = 'employer' | 'opportunity' | 'application';

const BODY_ENTITY_PATH_SEGMENTS: Record<BodyEntityKind, string> = {
  employer: 'employers',
  opportunity: 'opportunities',
  application: 'applications',
};

export function bodyEntityS3Key(
  entityKind: BodyEntityKind,
  entityId: string,
): string {
  return `bodies/${BODY_ENTITY_PATH_SEGMENTS[entityKind]}/${entityId}.md`;
}

export type VocabularyTermRecord = {
  id: string;
  kind: VocabularyKind;
  value: string;
  label: string;
  sortOrder?: number;
  active: boolean;
};

export type CreateVocabularyTermInput = {
  kind: VocabularyKind;
  value: string;
  label: string;
  sortOrder?: number;
};

export type UpdateVocabularyTermInput = {
  id: string;
  label?: string;
  active?: boolean;
  sortOrder?: number;
};

export const VOCABULARY_SEED_DEFAULTS: ReadonlyArray<{
  kind: VocabularyKind;
  value: string;
  label: string;
  sortOrder: number;
}> = [
  { kind: 'size_tier', value: 'startup', label: 'Startup', sortOrder: 0 },
  { kind: 'size_tier', value: 'scaleup', label: 'Scale-up', sortOrder: 1 },
  { kind: 'size_tier', value: 'enterprise', label: 'Enterprise', sortOrder: 2 },
  { kind: 'size_tier', value: 'big4', label: 'Big 4', sortOrder: 3 },
  { kind: 'size_tier', value: 'other', label: 'Other', sortOrder: 4 },
  { kind: 'prestige_tier', value: 'low', label: 'Low', sortOrder: 0 },
  { kind: 'prestige_tier', value: 'mid', label: 'Mid', sortOrder: 1 },
  { kind: 'prestige_tier', value: 'high', label: 'High', sortOrder: 2 },
  { kind: 'prestige_tier', value: 'elite', label: 'Elite', sortOrder: 3 },
  {
    kind: 'sector',
    value: 'financial_services',
    label: 'Financial services',
    sortOrder: 0,
  },
  { kind: 'sector', value: 'law', label: 'Law', sortOrder: 1 },
  { kind: 'sector', value: 'consulting', label: 'Consulting', sortOrder: 2 },
  { kind: 'sector', value: 'technology', label: 'Technology', sortOrder: 3 },
  { kind: 'sector', value: 'healthcare', label: 'Healthcare', sortOrder: 4 },
  { kind: 'sector', value: 'energy', label: 'Energy', sortOrder: 5 },
  { kind: 'sector', value: 'government', label: 'Government', sortOrder: 6 },
  { kind: 'sector', value: 'media', label: 'Media', sortOrder: 7 },
  { kind: 'sector', value: 'education', label: 'Education', sortOrder: 8 },
  { kind: 'sector', value: 'other', label: 'Other', sortOrder: 9 },
  { kind: 'seniority', value: 'junior', label: 'Junior', sortOrder: 0 },
  { kind: 'seniority', value: 'mid', label: 'Mid', sortOrder: 1 },
  { kind: 'seniority', value: 'senior', label: 'Senior', sortOrder: 2 },
  { kind: 'seniority', value: 'lead', label: 'Lead', sortOrder: 3 },
  { kind: 'seniority', value: 'principal', label: 'Principal', sortOrder: 4 },
  {
    kind: 'role_family',
    value: 'data_science',
    label: 'Data science',
    sortOrder: 0,
  },
  { kind: 'role_family', value: 'analytics', label: 'Analytics', sortOrder: 1 },
  {
    kind: 'role_family',
    value: 'engineering',
    label: 'Engineering',
    sortOrder: 2,
  },
  { kind: 'role_family', value: 'ml_ops', label: 'ML Ops', sortOrder: 3 },
  { kind: 'role_family', value: 'product', label: 'Product', sortOrder: 4 },
  { kind: 'role_family', value: 'other', label: 'Other', sortOrder: 5 },
];

export type EmployerRecord = {
  id: string;
  name: string;
  sizeTier: EmployerSizeTier;
  prestigeTier: EmployerPrestigeTier;
  sector: EmployerSector;
  summary?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  notes?: string;
  s3Key?: string;
  isAnon: boolean;
};

export type OpportunityRecord = {
  id: string;
  employerId: string;
  status: OpportunityStatus;
  title?: string;
  source?: string;
  noticedAt: string;
  seniority?: OpportunitySeniority;
  roleFamily?: OpportunityRoleFamily;
  compensationCurrency?: string;
  compensationMin?: number;
  compensationMax?: number;
  compensationPeriod?: CompensationPeriod;
  compensationDisclosure?: CompensationDisclosure;
  technologies?: string[];
  s3Key?: string;
};

export type ApplicationRecord = {
  id: string;
  opportunityId: string;
  status: ApplicationStatus;
  trackingNote?: string;
  s3Key?: string;
};

export type DecisionEventRecord = {
  id: string;
  kind: DecisionEventKind;
  opportunityId: string;
  applicationId?: string;
  fromStatus?: string;
  toStatus?: string;
  occurredAt: string;
};

export type CreateEmployerInput = {
  name: string;
  sizeTier: EmployerSizeTier;
  prestigeTier: EmployerPrestigeTier;
  sector: EmployerSector;
  summary?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  notes?: string;
};

export type UpdateEmployerInput = CreateEmployerInput & {
  id: string;
};

export type CreateOpportunityInput = {
  employerId: string;
  status?: OpportunityStatus;
  title?: string;
  source?: string;
  noticedAt: string;
  seniority?: OpportunitySeniority;
  roleFamily?: OpportunityRoleFamily;
  compensationCurrency?: string;
  compensationMin?: number;
  compensationMax?: number;
  compensationPeriod?: CompensationPeriod;
  compensationDisclosure?: CompensationDisclosure;
  technologies?: string[];
};

export type UpdateOpportunityInput = CreateOpportunityInput & {
  id: string;
};

export type JobOsStore = {
  listEmployers: () => Promise<EmployerRecord[]>;
  getEmployer: (id: string) => Promise<EmployerRecord | null>;
  insertEmployer: (
    input: Omit<EmployerRecord, 'id'> & { id?: string },
  ) => Promise<EmployerRecord>;
  persistEmployer: (record: EmployerRecord) => Promise<void>;

  listOpportunities: () => Promise<OpportunityRecord[]>;
  getOpportunity: (id: string) => Promise<OpportunityRecord | null>;
  insertOpportunity: (
    input: Omit<OpportunityRecord, 'id'> & { id?: string },
  ) => Promise<OpportunityRecord>;
  persistOpportunity: (record: OpportunityRecord) => Promise<void>;

  listApplications: () => Promise<ApplicationRecord[]>;
  getApplication: (id: string) => Promise<ApplicationRecord | null>;
  getApplicationByOpportunityId: (
    opportunityId: string,
  ) => Promise<ApplicationRecord | null>;
  insertApplication: (
    input: Omit<ApplicationRecord, 'id'> & { id?: string },
  ) => Promise<ApplicationRecord>;
  persistApplication: (record: ApplicationRecord) => Promise<void>;

  listDecisionEventsForOpportunity: (
    opportunityId: string,
  ) => Promise<DecisionEventRecord[]>;
  appendDecisionEvent: (
    input: Omit<DecisionEventRecord, 'id'> & { id?: string },
  ) => Promise<DecisionEventRecord>;

  listVocabularyTerms: (
    kind?: VocabularyKind,
  ) => Promise<VocabularyTermRecord[]>;
  getVocabularyTerm: (id: string) => Promise<VocabularyTermRecord | null>;
  insertVocabularyTerm: (
    input: Omit<VocabularyTermRecord, 'id'> & { id?: string },
  ) => Promise<VocabularyTermRecord>;
  persistVocabularyTerm: (record: VocabularyTermRecord) => Promise<void>;
};

export type JobOsBodyStorage = {
  putBody: (input: {
    entityKind: BodyEntityKind;
    entityId: string;
    prose: string;
  }) => Promise<{ s3Key: string }>;
  getBody: (s3Key: string) => Promise<string | null>;
};

export type JobOsDeps = {
  store: JobOsStore;
  bodies: JobOsBodyStorage;
  now?: () => string;
  createId?: () => string;
};

export type Rejected = { status: 'rejected'; reason: string };
export type NotFound = { status: 'not_found' };

function includesValue<T extends string>(
  allowed: readonly T[],
  value: string,
): value is T {
  return (allowed as readonly string[]).includes(value);
}

export function normaliseVocabularyValue(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function optionalTrim(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function resolveCompensationDisclosure(input: {
  compensationDisclosure?: CompensationDisclosure;
  compensationMin?: number;
  compensationMax?: number;
}): CompensationDisclosure {
  if (input.compensationDisclosure === 'competitive') {
    return 'competitive';
  }
  if (input.compensationMin != null && input.compensationMax != null) {
    return 'range';
  }
  if (input.compensationDisclosure === 'range') {
    return 'range';
  }
  return 'unknown';
}

function clearCompensationWhenNotRange<
  T extends {
    compensationDisclosure: CompensationDisclosure;
    compensationCurrency?: string;
    compensationMin?: number;
    compensationMax?: number;
    compensationPeriod?: CompensationPeriod;
  },
>(fields: T): T {
  if (fields.compensationDisclosure === 'range') {
    return fields;
  }
  return {
    ...fields,
    compensationCurrency: undefined,
    compensationMin: undefined,
    compensationMax: undefined,
    compensationPeriod: undefined,
  };
}

function validateEmployerShape(
  input: CreateEmployerInput,
): { status: 'valid' } | Rejected {
  if (!input.name.trim()) {
    return { status: 'rejected', reason: 'Employer name is required' };
  }
  if (!input.sizeTier.trim()) {
    return { status: 'rejected', reason: 'Employer size tier is required' };
  }
  if (!input.prestigeTier.trim()) {
    return { status: 'rejected', reason: 'Employer prestige tier is required' };
  }
  if (!input.sector.trim()) {
    return { status: 'rejected', reason: 'Employer sector is required' };
  }
  return { status: 'valid' };
}

function validateOpportunityShape(
  input: CreateOpportunityInput,
): { status: 'valid' } | Rejected {
  if (!input.employerId.trim()) {
    return { status: 'rejected', reason: 'Employer is required' };
  }
  if (!input.noticedAt.trim()) {
    return { status: 'rejected', reason: 'Noticed-at date is required' };
  }
  if (
    input.status !== undefined &&
    !includesValue(OPPORTUNITY_STATUSES, input.status)
  ) {
    return { status: 'rejected', reason: 'Opportunity status must be open or closed' };
  }
  if (
    input.compensationDisclosure !== undefined &&
    !includesValue(COMPENSATION_DISCLOSURES, input.compensationDisclosure)
  ) {
    return {
      status: 'rejected',
      reason: 'Unrecognised compensation disclosure',
    };
  }
  if (
    input.compensationPeriod !== undefined &&
    !includesValue(COMPENSATION_PERIODS, input.compensationPeriod)
  ) {
    return { status: 'rejected', reason: 'Unrecognised compensation period' };
  }
  if (
    input.compensationMin != null &&
    input.compensationMax != null &&
    input.compensationMin > input.compensationMax
  ) {
    return {
      status: 'rejected',
      reason: 'Compensation minimum cannot exceed maximum',
    };
  }
  return { status: 'valid' };
}

function buildOpportunityFields(
  input: CreateOpportunityInput,
): Omit<OpportunityRecord, 'id' | 'employerId' | 'noticedAt' | 'status'> & {
  status: OpportunityStatus;
  noticedAt: string;
} {
  const disclosure = resolveCompensationDisclosure({
    compensationDisclosure: input.compensationDisclosure,
    compensationMin: input.compensationMin,
    compensationMax: input.compensationMax,
  });
  const cleared = clearCompensationWhenNotRange({
    compensationDisclosure: disclosure,
    compensationCurrency: optionalTrim(input.compensationCurrency),
    compensationMin: input.compensationMin,
    compensationMax: input.compensationMax,
    compensationPeriod: input.compensationPeriod,
  });

  return {
    status: input.status ?? 'open',
    title: optionalTrim(input.title),
    source: optionalTrim(input.source),
    noticedAt: input.noticedAt.trim(),
    seniority: input.seniority,
    roleFamily: input.roleFamily,
    ...cleared,
    technologies: input.technologies?.map((tech) => tech.trim()).filter(Boolean),
  };
}

export function isApplicationTransitionAllowed(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return from !== to;
}

export function createJobOs(deps: JobOsDeps) {
  const now = deps.now ?? (() => new Date().toISOString());
  const createId =
    deps.createId ??
    (() =>
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  async function withAdapterRejection<T>(
    reason: string,
    operation: () => Promise<T>,
  ): Promise<T | Rejected> {
    try {
      return await operation();
    } catch {
      return { status: 'rejected', reason };
    }
  }

  async function hasActiveVocabularyValue(
    kind: VocabularyKind,
    value: string,
  ): Promise<boolean> {
    const terms = await deps.store.listVocabularyTerms(kind);
    return terms.some((term) => term.active && term.value === value);
  }

  async function validateEmployerVocabulary(
    input: CreateEmployerInput,
  ): Promise<{ status: 'valid' } | Rejected> {
    if (!(await hasActiveVocabularyValue('size_tier', input.sizeTier))) {
      return { status: 'rejected', reason: 'Unrecognised employer size tier' };
    }
    if (!(await hasActiveVocabularyValue('prestige_tier', input.prestigeTier))) {
      return {
        status: 'rejected',
        reason: 'Unrecognised employer prestige tier',
      };
    }
    if (!(await hasActiveVocabularyValue('sector', input.sector))) {
      return { status: 'rejected', reason: 'Unrecognised employer sector' };
    }
    return { status: 'valid' };
  }

  async function validateOpportunityVocabulary(
    input: CreateOpportunityInput,
  ): Promise<{ status: 'valid' } | Rejected> {
    if (
      input.seniority !== undefined &&
      input.seniority.trim() &&
      !(await hasActiveVocabularyValue('seniority', input.seniority))
    ) {
      return { status: 'rejected', reason: 'Unrecognised seniority value' };
    }
    if (
      input.roleFamily !== undefined &&
      input.roleFamily.trim() &&
      !(await hasActiveVocabularyValue('role_family', input.roleFamily))
    ) {
      return { status: 'rejected', reason: 'Unrecognised role family value' };
    }
    return { status: 'valid' };
  }

  async function ensureVocabularyDefaults(): Promise<VocabularyTermRecord[]> {
    const existing = await deps.store.listVocabularyTerms();
    const existingKeys = new Set(
      existing.map((term) => `${term.kind}:${term.value}`),
    );
    for (const seed of VOCABULARY_SEED_DEFAULTS) {
      const key = `${seed.kind}:${seed.value}`;
      if (existingKeys.has(key)) {
        continue;
      }
      await deps.store.insertVocabularyTerm({
        id: createId(),
        kind: seed.kind,
        value: seed.value,
        label: seed.label,
        sortOrder: seed.sortOrder,
        active: true,
      });
      existingKeys.add(key);
    }
    return listVocabularyTerms();
  }

  async function listVocabularyTerms(
    kind?: VocabularyKind,
  ): Promise<VocabularyTermRecord[]> {
    const terms = await deps.store.listVocabularyTerms(kind);
    return [...terms].sort((a, b) => {
      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.label.localeCompare(b.label);
    });
  }

  async function createVocabularyTerm(
    input: CreateVocabularyTermInput,
  ): Promise<
    | { status: 'created'; term: VocabularyTermRecord }
    | Rejected
  > {
    if (!includesValue(VOCABULARY_KINDS, input.kind)) {
      return { status: 'rejected', reason: 'Unrecognised vocabulary kind' };
    }
    const value = normaliseVocabularyValue(input.value);
    if (!value) {
      return { status: 'rejected', reason: 'Vocabulary value is required' };
    }
    const label = input.label.trim();
    if (!label) {
      return { status: 'rejected', reason: 'Vocabulary label is required' };
    }
    const existing = await deps.store.listVocabularyTerms(input.kind);
    if (existing.some((term) => term.value === value)) {
      return {
        status: 'rejected',
        reason: 'A Vocabulary term with this value already exists',
      };
    }
    const sortOrder =
      input.sortOrder ??
      existing.reduce(
        (max, term) => Math.max(max, term.sortOrder ?? -1),
        -1,
      ) + 1;
    const term = await deps.store.insertVocabularyTerm({
      id: createId(),
      kind: input.kind,
      value,
      label,
      sortOrder,
      active: true,
    });
    return { status: 'created', term };
  }

  async function updateVocabularyTerm(
    input: UpdateVocabularyTermInput,
  ): Promise<
    | { status: 'updated'; term: VocabularyTermRecord }
    | NotFound
    | Rejected
  > {
    const existing = await deps.store.getVocabularyTerm(input.id);
    if (!existing) {
      return { status: 'not_found' };
    }
    if (input.label !== undefined && !input.label.trim()) {
      return { status: 'rejected', reason: 'Vocabulary label is required' };
    }
    const term: VocabularyTermRecord = {
      ...existing,
      label: input.label !== undefined ? input.label.trim() : existing.label,
      active: input.active !== undefined ? input.active : existing.active,
      sortOrder:
        input.sortOrder !== undefined ? input.sortOrder : existing.sortOrder,
    };
    await deps.store.persistVocabularyTerm(term);
    return { status: 'updated', term };
  }

  async function ensureAnonEmployer(): Promise<EmployerRecord> {
    await ensureVocabularyDefaults();
    const existing = (await deps.store.listEmployers()).find(
      (employer) => employer.isAnon,
    );
    if (existing) {
      return existing;
    }

    return deps.store.insertEmployer({
      id: createId(),
      name: ANON_EMPLOYER_NAME,
      sizeTier: 'other',
      prestigeTier: 'low',
      sector: 'other',
      isAnon: true,
    });
  }

  async function createEmployer(
    input: CreateEmployerInput,
  ): Promise<
    | { status: 'created'; employer: EmployerRecord }
    | Rejected
  > {
    await ensureVocabularyDefaults();
    const shape = validateEmployerShape(input);
    if (shape.status === 'rejected') {
      return shape;
    }
    const validation = await validateEmployerVocabulary(input);
    if (validation.status === 'rejected') {
      return validation;
    }

    const name = input.name.trim();
    if (name === ANON_EMPLOYER_NAME) {
      return {
        status: 'rejected',
        reason: 'Anon Employer is reserved; use ensureAnonEmployer',
      };
    }

    const employer = await deps.store.insertEmployer({
      id: createId(),
      name,
      sizeTier: input.sizeTier,
      prestigeTier: input.prestigeTier,
      sector: input.sector,
      summary: optionalTrim(input.summary),
      websiteUrl: optionalTrim(input.websiteUrl),
      linkedinUrl: optionalTrim(input.linkedinUrl),
      notes: optionalTrim(input.notes),
      isAnon: false,
    });

    return { status: 'created', employer };
  }

  async function listEmployers(): Promise<EmployerRecord[]> {
    const employers = await deps.store.listEmployers();
    return [...employers].sort((a, b) => {
      if (a.isAnon !== b.isAnon) {
        return a.isAnon ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  async function getEmployer(
    id: string,
  ): Promise<{ status: 'ok'; employer: EmployerRecord } | NotFound> {
    const employer = await deps.store.getEmployer(id);
    if (!employer) {
      return { status: 'not_found' };
    }
    return { status: 'ok', employer };
  }

  async function updateEmployer(
    input: UpdateEmployerInput,
  ): Promise<
    | { status: 'updated'; employer: EmployerRecord }
    | NotFound
    | Rejected
  > {
    const existing = await deps.store.getEmployer(input.id);
    if (!existing) {
      return { status: 'not_found' };
    }

    if (existing.isAnon) {
      return {
        status: 'rejected',
        reason: 'Anon Employer cannot be renamed or retiered',
      };
    }

    await ensureVocabularyDefaults();
    const shape = validateEmployerShape(input);
    if (shape.status === 'rejected') {
      return shape;
    }
    const validation = await validateEmployerVocabulary(input);
    if (validation.status === 'rejected') {
      return validation;
    }

    const name = input.name.trim();
    if (name === ANON_EMPLOYER_NAME) {
      return {
        status: 'rejected',
        reason: 'Anon Employer is reserved; use ensureAnonEmployer',
      };
    }

    const employer: EmployerRecord = {
      ...existing,
      name,
      sizeTier: input.sizeTier,
      prestigeTier: input.prestigeTier,
      sector: input.sector,
      summary: optionalTrim(input.summary),
      websiteUrl: optionalTrim(input.websiteUrl),
      linkedinUrl: optionalTrim(input.linkedinUrl),
      notes: optionalTrim(input.notes),
    };
    await deps.store.persistEmployer(employer);
    return { status: 'updated', employer };
  }

  async function updateEmployerBody(
    id: string,
    prose: string,
  ): Promise<
    | { status: 'updated'; employer: EmployerRecord; body: string }
    | NotFound
    | Rejected
  > {
    const existing = await deps.store.getEmployer(id);
    if (!existing) {
      return { status: 'not_found' };
    }

    const trimmed = prose.trim();
    if (!trimmed) {
      return { status: 'rejected', reason: 'Body prose cannot be blank' };
    }

    return withAdapterRejection('Could not save Employer Body', async () => {
      const { s3Key } = await deps.bodies.putBody({
        entityKind: 'employer',
        entityId: id,
        prose: trimmed,
      });
      const employer: EmployerRecord = { ...existing, s3Key };
      await deps.store.persistEmployer(employer);
      return { status: 'updated' as const, employer, body: trimmed };
    });
  }

  async function getEmployerBody(
    id: string,
  ): Promise<
    | { status: 'ok'; body: string | null; employer: EmployerRecord }
    | NotFound
  > {
    const existing = await deps.store.getEmployer(id);
    if (!existing) {
      return { status: 'not_found' };
    }
    if (!existing.s3Key) {
      return { status: 'ok', body: null, employer: existing };
    }
    const body = await deps.bodies.getBody(existing.s3Key);
    return { status: 'ok', body, employer: existing };
  }

  async function createOpportunity(
    input: CreateOpportunityInput,
  ): Promise<
    | { status: 'created'; opportunity: OpportunityRecord }
    | Rejected
  > {
    await ensureVocabularyDefaults();
    const shape = validateOpportunityShape(input);
    if (shape.status === 'rejected') {
      return shape;
    }
    const validation = await validateOpportunityVocabulary(input);
    if (validation.status === 'rejected') {
      return validation;
    }

    const employer = await deps.store.getEmployer(input.employerId);
    if (!employer) {
      return { status: 'rejected', reason: 'Employer not found' };
    }

    const fields = buildOpportunityFields(input);
    const opportunity = await deps.store.insertOpportunity({
      id: createId(),
      employerId: input.employerId,
      ...fields,
    });

    return { status: 'created', opportunity };
  }

  async function listOpportunities(): Promise<OpportunityRecord[]> {
    const opportunities = await deps.store.listOpportunities();
    return [...opportunities].sort((a, b) =>
      b.noticedAt.localeCompare(a.noticedAt),
    );
  }

  async function getOpportunity(
    id: string,
  ): Promise<{ status: 'ok'; opportunity: OpportunityRecord } | NotFound> {
    const opportunity = await deps.store.getOpportunity(id);
    if (!opportunity) {
      return { status: 'not_found' };
    }
    return { status: 'ok', opportunity };
  }

  async function updateOpportunity(
    input: UpdateOpportunityInput,
  ): Promise<
    | { status: 'updated'; opportunity: OpportunityRecord }
    | NotFound
    | Rejected
  > {
    const existing = await deps.store.getOpportunity(input.id);
    if (!existing) {
      return { status: 'not_found' };
    }

    await ensureVocabularyDefaults();
    const shape = validateOpportunityShape(input);
    if (shape.status === 'rejected') {
      return shape;
    }
    const validation = await validateOpportunityVocabulary(input);
    if (validation.status === 'rejected') {
      return validation;
    }

    const employer = await deps.store.getEmployer(input.employerId);
    if (!employer) {
      return { status: 'rejected', reason: 'Employer not found' };
    }

    const fields = buildOpportunityFields(input);
    const opportunity: OpportunityRecord = {
      ...existing,
      employerId: input.employerId,
      ...fields,
    };
    await deps.store.persistOpportunity(opportunity);
    return { status: 'updated', opportunity };
  }

  async function updateOpportunityBody(
    id: string,
    prose: string,
  ): Promise<
    | { status: 'updated'; opportunity: OpportunityRecord; body: string }
    | NotFound
    | Rejected
  > {
    const existing = await deps.store.getOpportunity(id);
    if (!existing) {
      return { status: 'not_found' };
    }

    const trimmed = prose.trim();
    if (!trimmed) {
      return { status: 'rejected', reason: 'Body prose cannot be blank' };
    }

    return withAdapterRejection('Could not save Opportunity Body', async () => {
      const { s3Key } = await deps.bodies.putBody({
        entityKind: 'opportunity',
        entityId: id,
        prose: trimmed,
      });
      const opportunity: OpportunityRecord = { ...existing, s3Key };
      await deps.store.persistOpportunity(opportunity);
      return { status: 'updated' as const, opportunity, body: trimmed };
    });
  }

  async function getOpportunityBody(
    id: string,
  ): Promise<
    | { status: 'ok'; body: string | null; opportunity: OpportunityRecord }
    | NotFound
  > {
    const existing = await deps.store.getOpportunity(id);
    if (!existing) {
      return { status: 'not_found' };
    }
    if (!existing.s3Key) {
      return { status: 'ok', body: null, opportunity: existing };
    }
    const body = await deps.bodies.getBody(existing.s3Key);
    return { status: 'ok', body, opportunity: existing };
  }

  async function passOpportunity(
    opportunityId: string,
  ): Promise<
    | {
        status: 'passed';
        opportunity: OpportunityRecord;
        event: DecisionEventRecord;
      }
    | NotFound
    | Rejected
  > {
    const opportunity = await deps.store.getOpportunity(opportunityId);
    if (!opportunity) {
      return { status: 'not_found' };
    }

    return withAdapterRejection('Could not record Pass decision', async () => {
      const event = await deps.store.appendDecisionEvent({
        id: createId(),
        kind: 'opportunity_passed',
        opportunityId,
        occurredAt: now(),
      });

      return { status: 'passed' as const, opportunity, event };
    });
  }

  async function listDecisionEvents(
    opportunityId: string,
  ): Promise<DecisionEventRecord[]> {
    const events =
      await deps.store.listDecisionEventsForOpportunity(opportunityId);
    return [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }

  async function pursueOpportunity(
    opportunityId: string,
  ): Promise<
    | {
        status: 'pursued';
        application: ApplicationRecord;
        event: DecisionEventRecord;
      }
    | NotFound
    | Rejected
  > {
    const opportunity = await deps.store.getOpportunity(opportunityId);
    if (!opportunity) {
      return { status: 'not_found' };
    }

    const existing =
      await deps.store.getApplicationByOpportunityId(opportunityId);
    if (existing) {
      return {
        status: 'rejected',
        reason: 'Opportunity already has an Application',
      };
    }

    return withAdapterRejection('Could not start Application', async () => {
      const application = await deps.store.insertApplication({
        id: createId(),
        opportunityId,
        status: 'researching',
      });

      const event = await deps.store.appendDecisionEvent({
        id: createId(),
        kind: 'application_started',
        opportunityId,
        applicationId: application.id,
        toStatus: 'researching',
        occurredAt: now(),
      });

      return { status: 'pursued' as const, application, event };
    });
  }

  async function listApplications(): Promise<ApplicationRecord[]> {
    return deps.store.listApplications();
  }

  async function getApplication(
    id: string,
  ): Promise<{ status: 'ok'; application: ApplicationRecord } | NotFound> {
    const application = await deps.store.getApplication(id);
    if (!application) {
      return { status: 'not_found' };
    }
    return { status: 'ok', application };
  }

  async function updateApplicationStatus(
    id: string,
    toStatus: ApplicationStatus,
  ): Promise<
    | {
        status: 'updated';
        application: ApplicationRecord;
        event: DecisionEventRecord;
      }
    | NotFound
    | Rejected
  > {
    const existing = await deps.store.getApplication(id);
    if (!existing) {
      return { status: 'not_found' };
    }

    if (!includesValue(APPLICATION_STATUSES, toStatus)) {
      return { status: 'rejected', reason: 'Unrecognised application status' };
    }

    if (!isApplicationTransitionAllowed(existing.status, toStatus)) {
      return {
        status: 'rejected',
        reason: `Cannot move Application from ${existing.status} to ${toStatus}`,
      };
    }

    const application: ApplicationRecord = { ...existing, status: toStatus };
    await deps.store.persistApplication(application);

    const event = await deps.store.appendDecisionEvent({
      id: createId(),
      kind: 'application_status_changed',
      opportunityId: existing.opportunityId,
      applicationId: existing.id,
      fromStatus: existing.status,
      toStatus,
      occurredAt: now(),
    });

    return { status: 'updated', application, event };
  }

  async function updateTrackingNote(
    id: string,
    trackingNote: string,
  ): Promise<
    | { status: 'updated'; application: ApplicationRecord }
    | NotFound
  > {
    const existing = await deps.store.getApplication(id);
    if (!existing) {
      return { status: 'not_found' };
    }

    const application: ApplicationRecord = {
      ...existing,
      trackingNote: optionalTrim(trackingNote) ?? '',
    };
    if (!application.trackingNote) {
      delete application.trackingNote;
    }
    await deps.store.persistApplication(application);
    return { status: 'updated', application };
  }

  async function updateApplicationBody(
    id: string,
    prose: string,
  ): Promise<
    | { status: 'updated'; application: ApplicationRecord; body: string }
    | NotFound
    | Rejected
  > {
    const existing = await deps.store.getApplication(id);
    if (!existing) {
      return { status: 'not_found' };
    }

    const trimmed = prose.trim();
    if (!trimmed) {
      return { status: 'rejected', reason: 'Body prose cannot be blank' };
    }

    const { s3Key } = await deps.bodies.putBody({
      entityKind: 'application',
      entityId: id,
      prose: trimmed,
    });
    const application: ApplicationRecord = { ...existing, s3Key };
    await deps.store.persistApplication(application);
    return { status: 'updated', application, body: trimmed };
  }

  async function getApplicationBody(
    id: string,
  ): Promise<
    | { status: 'ok'; body: string | null; application: ApplicationRecord }
    | NotFound
  > {
    const existing = await deps.store.getApplication(id);
    if (!existing) {
      return { status: 'not_found' };
    }
    if (!existing.s3Key) {
      return { status: 'ok', body: null, application: existing };
    }
    const body = await deps.bodies.getBody(existing.s3Key);
    return { status: 'ok', body, application: existing };
  }

  return {
    ensureAnonEmployer,
    ensureVocabularyDefaults,
    listVocabularyTerms,
    createVocabularyTerm,
    updateVocabularyTerm,
    createEmployer,
    listEmployers,
    getEmployer,
    updateEmployer,
    updateEmployerBody,
    getEmployerBody,
    createOpportunity,
    listOpportunities,
    getOpportunity,
    updateOpportunity,
    updateOpportunityBody,
    getOpportunityBody,
    passOpportunity,
    listDecisionEvents,
    pursueOpportunity,
    listApplications,
    getApplication,
    updateApplicationStatus,
    updateTrackingNote,
    updateApplicationBody,
    getApplicationBody,
  };
}

export type JobOs = ReturnType<typeof createJobOs>;

export function createMemoryJobOsBodyStorage(): JobOsBodyStorage {
  const bodies = new Map<string, string>();

  return {
    async putBody({ entityKind, entityId, prose }) {
      const s3Key = bodyEntityS3Key(entityKind, entityId);
      bodies.set(s3Key, prose);
      return { s3Key };
    },
    async getBody(s3Key) {
      return bodies.get(s3Key) ?? null;
    },
  };
}

export function createMemoryJobOsStore(): JobOsStore {
  const employers = new Map<string, EmployerRecord>();
  const opportunities = new Map<string, OpportunityRecord>();
  const applications = new Map<string, ApplicationRecord>();
  const vocabulary = new Map<string, VocabularyTermRecord>();
  const events: DecisionEventRecord[] = [];
  let seq = 0;
  const nextId = () => `mem-${++seq}`;

  return {
    async listEmployers() {
      return [...employers.values()];
    },
    async getEmployer(id) {
      return employers.get(id) ?? null;
    },
    async insertEmployer(input) {
      const id = input.id ?? nextId();
      const record: EmployerRecord = { ...input, id };
      employers.set(id, record);
      return record;
    },
    async persistEmployer(record) {
      employers.set(record.id, record);
    },
    async listOpportunities() {
      return [...opportunities.values()];
    },
    async getOpportunity(id) {
      return opportunities.get(id) ?? null;
    },
    async insertOpportunity(input) {
      const id = input.id ?? nextId();
      const record: OpportunityRecord = { ...input, id };
      opportunities.set(id, record);
      return record;
    },
    async persistOpportunity(record) {
      opportunities.set(record.id, record);
    },
    async listApplications() {
      return [...applications.values()];
    },
    async getApplication(id) {
      return applications.get(id) ?? null;
    },
    async getApplicationByOpportunityId(opportunityId) {
      return (
        [...applications.values()].find(
          (application) => application.opportunityId === opportunityId,
        ) ?? null
      );
    },
    async insertApplication(input) {
      const id = input.id ?? nextId();
      const record: ApplicationRecord = { ...input, id };
      applications.set(id, record);
      return record;
    },
    async persistApplication(record) {
      applications.set(record.id, record);
    },
    async listDecisionEventsForOpportunity(opportunityId) {
      return events.filter((event) => event.opportunityId === opportunityId);
    },
    async appendDecisionEvent(input) {
      const id = input.id ?? nextId();
      const record: DecisionEventRecord = { ...input, id };
      events.push(record);
      return record;
    },
    async listVocabularyTerms(kind) {
      const terms = [...vocabulary.values()];
      if (!kind) {
        return terms;
      }
      return terms.filter((term) => term.kind === kind);
    },
    async getVocabularyTerm(id) {
      return vocabulary.get(id) ?? null;
    },
    async insertVocabularyTerm(input) {
      const id = input.id ?? nextId();
      const record: VocabularyTermRecord = { ...input, id };
      vocabulary.set(id, record);
      return record;
    },
    async persistVocabularyTerm(record) {
      vocabulary.set(record.id, record);
    },
  };
}
