/**
 * Job OS facade — sole read/write seam for Employer → Opportunity → Application
 * and Decision Events. Persistence and Body storage are injected adapters.
 */

export const ANON_EMPLOYER_NAME = 'Anon Employer';

export const EMPLOYER_SIZE_TIERS = [
  'startup',
  'scaleup',
  'enterprise',
  'big4',
  'other',
] as const;

export const EMPLOYER_PRESTIGE_TIERS = ['low', 'mid', 'high', 'elite'] as const;

export const OPPORTUNITY_STATUSES = ['open', 'closed'] as const;

export const OPPORTUNITY_SENIORITIES = [
  'junior',
  'mid',
  'senior',
  'lead',
  'principal',
] as const;

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

export type EmployerSizeTier = (typeof EMPLOYER_SIZE_TIERS)[number];
export type EmployerPrestigeTier = (typeof EMPLOYER_PRESTIGE_TIERS)[number];
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];
export type OpportunitySeniority = (typeof OPPORTUNITY_SENIORITIES)[number];
export type OpportunityRoleFamily = (typeof OPPORTUNITY_ROLE_FAMILIES)[number];
export type CompensationPeriod = (typeof COMPENSATION_PERIODS)[number];
export type CompensationDisclosure = (typeof COMPENSATION_DISCLOSURES)[number];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type DecisionEventKind = (typeof DECISION_EVENT_KINDS)[number];

export type BodyEntityKind = 'employer' | 'opportunity' | 'application';

export type EmployerRecord = {
  id: string;
  name: string;
  sizeTier: EmployerSizeTier;
  prestigeTier: EmployerPrestigeTier;
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

const TERMINAL_APPLICATION_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  'accepted',
  'rejected',
  'withdrawn',
]);

const APPLICATION_TRANSITIONS: Record<
  ApplicationStatus,
  ReadonlySet<ApplicationStatus>
> = {
  researching: new Set(['applied', 'withdrawn', 'rejected']),
  applied: new Set(['interviewing', 'rejected', 'withdrawn']),
  interviewing: new Set(['offer', 'rejected', 'withdrawn']),
  offer: new Set(['accepted', 'rejected', 'withdrawn']),
  accepted: new Set(),
  rejected: new Set(),
  withdrawn: new Set(),
};

function includesValue<T extends string>(
  allowed: readonly T[],
  value: string,
): value is T {
  return (allowed as readonly string[]).includes(value);
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

function validateEmployerFields(
  input: CreateEmployerInput,
): { status: 'valid' } | Rejected {
  if (!input.name.trim()) {
    return { status: 'rejected', reason: 'Employer name is required' };
  }
  if (!includesValue(EMPLOYER_SIZE_TIERS, input.sizeTier)) {
    return { status: 'rejected', reason: 'Unrecognised employer size tier' };
  }
  if (!includesValue(EMPLOYER_PRESTIGE_TIERS, input.prestigeTier)) {
    return {
      status: 'rejected',
      reason: 'Unrecognised employer prestige tier',
    };
  }
  return { status: 'valid' };
}

function validateOpportunityFields(
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
    input.seniority !== undefined &&
    !includesValue(OPPORTUNITY_SENIORITIES, input.seniority)
  ) {
    return { status: 'rejected', reason: 'Unrecognised seniority value' };
  }
  if (
    input.roleFamily !== undefined &&
    !includesValue(OPPORTUNITY_ROLE_FAMILIES, input.roleFamily)
  ) {
    return { status: 'rejected', reason: 'Unrecognised role family value' };
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
  if (from === to) {
    return false;
  }
  if (TERMINAL_APPLICATION_STATUSES.has(from)) {
    return false;
  }
  return APPLICATION_TRANSITIONS[from].has(to);
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

  async function ensureAnonEmployer(): Promise<EmployerRecord> {
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
      isAnon: true,
    });
  }

  async function createEmployer(
    input: CreateEmployerInput,
  ): Promise<
    | { status: 'created'; employer: EmployerRecord }
    | Rejected
  > {
    const validation = validateEmployerFields(input);
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

    const validation = validateEmployerFields(input);
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
    const validation = validateOpportunityFields(input);
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

    const validation = validateOpportunityFields(input);
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
      const s3Key = `bodies/${entityKind}s/${entityId}.md`;
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
  };
}
