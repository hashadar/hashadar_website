'use client';

import { useEffect, useState } from 'react';
import { Button, Text } from '@/components/ui';
import { jobOsFieldClassName } from '@/components/sections/labs/job-os/job-os-field-styles';
import {
  JobOsFocusSection,
  JobOsWorkspaceIntro,
} from '@/components/sections/labs/job-os/job-os-ledger';
import { jobOs } from '@/data';
import {
  COMPENSATION_PERIODS,
  type CompensationPeriod,
  type HuntProfileRecord,
  type JobOs,
  type OpportunityRoleFamily,
  type OpportunitySeniority,
  type VocabularyTermRecord,
} from '@/lib/job-os';
import { getDefaultJobOs } from '@/lib/job-os-default';

export type JobOsProfileWorkspaceProps = {
  jobOsClient?: JobOs;
};

function splitTags(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function joinTags(values: string[] | undefined): string {
  return (values ?? []).join(', ');
}

function activeTerms(
  terms: VocabularyTermRecord[],
  kind: VocabularyTermRecord['kind'],
): VocabularyTermRecord[] {
  return terms.filter((term) => term.kind === kind && term.active);
}

export function JobOsProfileWorkspace({
  jobOsClient,
}: JobOsProfileWorkspaceProps) {
  const copy = jobOs.profile;
  const [client, setClient] = useState<JobOs | null>(jobOsClient ?? null);
  const [vocabulary, setVocabulary] = useState<VocabularyTermRecord[]>([]);
  const [profile, setProfile] = useState<HuntProfileRecord | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [targetSeniority, setTargetSeniority] = useState<
    OpportunitySeniority | ''
  >('');
  const [targetRoleFamily, setTargetRoleFamily] = useState<
    OpportunityRoleFamily | ''
  >('');
  const [locationFlexibility, setLocationFlexibility] = useState('');
  const [compensationFloor, setCompensationFloor] = useState('');
  const [compensationCurrency, setCompensationCurrency] = useState('GBP');
  const [compensationPeriod, setCompensationPeriod] = useState<
    CompensationPeriod | ''
  >('year');
  const [mustHaveTags, setMustHaveTags] = useState('');
  const [dealBreakerTags, setDealBreakerTags] = useState('');
  const [escapePains, setEscapePains] = useState('');
  const [seekDesires, setSeekDesires] = useState('');
  const [body, setBody] = useState('');

  function applyProfile(next: HuntProfileRecord | null, nextBody: string | null) {
    setProfile(next);
    setTargetSeniority(next?.targetSeniority ?? '');
    setTargetRoleFamily(next?.targetRoleFamily ?? '');
    setLocationFlexibility(next?.locationFlexibility ?? '');
    setCompensationFloor(
      next?.compensationFloor != null ? String(next.compensationFloor) : '',
    );
    setCompensationCurrency(next?.compensationCurrency ?? 'GBP');
    setCompensationPeriod(next?.compensationPeriod ?? 'year');
    setMustHaveTags(joinTags(next?.mustHaveTags));
    setDealBreakerTags(joinTags(next?.dealBreakerTags));
    setEscapePains(joinTags(next?.escapePains));
    setSeekDesires(joinTags(next?.seekDesires));
    setBody(nextBody ?? '');
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resolved = jobOsClient ?? (await getDefaultJobOs());
        if (cancelled) {
          return;
        }
        setClient(resolved);
        await resolved.ensureVocabularyDefaults();
        const [terms, bodyResult] = await Promise.all([
          resolved.listVocabularyTerms(),
          resolved.getHuntProfileBody(),
        ]);
        if (cancelled) {
          return;
        }
        setVocabulary(terms);
        applyProfile(bodyResult.profile, bodyResult.body);
        setLoadState('ready');
      } catch {
        if (!cancelled) {
          setLoadState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobOsClient]);

  async function handleSaveProfile() {
    if (!client) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const floorRaw = compensationFloor.trim();
      const floor = floorRaw ? Number(floorRaw) : undefined;
      if (floorRaw && Number.isNaN(floor)) {
        setError('Compensation floor must be a number');
        return;
      }
      const result = await client.upsertHuntProfile({
        targetSeniority: targetSeniority || undefined,
        targetRoleFamily: targetRoleFamily || undefined,
        locationFlexibility: locationFlexibility || undefined,
        compensationFloor: floor,
        compensationCurrency: compensationCurrency || undefined,
        compensationPeriod: compensationPeriod || undefined,
        mustHaveTags: splitTags(mustHaveTags),
        dealBreakerTags: splitTags(dealBreakerTags),
        escapePains: splitTags(escapePains),
        seekDesires: splitTags(seekDesires),
      });
      if (result.status === 'rejected') {
        setError(result.reason);
        return;
      }
      applyProfile(result.profile, body || null);
      setMessage(copy.savedLabel);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveBody() {
    if (!client) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (!profile) {
        setError(copy.emptyHint);
        return;
      }
      const result = await client.updateHuntProfileBody(body);
      if (result.status === 'rejected') {
        setError(result.reason);
        return;
      }
      if (result.status === 'not_found') {
        setError(copy.emptyHint);
        return;
      }
      applyProfile(result.profile, result.body);
      setMessage(copy.bodySavedLabel);
    } finally {
      setBusy(false);
    }
  }

  if (loadState === 'loading') {
    return <Text variant="muted">{copy.loadingLabel}</Text>;
  }
  if (loadState === 'error') {
    return <Text variant="muted">{copy.errorLabel}</Text>;
  }

  return (
    <div className="space-y-8">
      <JobOsWorkspaceIntro
        heading={copy.heading}
        description={copy.description}
      />
      {!profile ? (
        <Text variant="muted">{copy.emptyHint}</Text>
      ) : null}

      <JobOsFocusSection title={copy.targetsHeading}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block font-body text-sm">
            {copy.targetSeniorityLabel}
            <select
              className={jobOsFieldClassName}
              value={targetSeniority}
              onChange={(event) =>
                setTargetSeniority(
                  event.target.value as OpportunitySeniority | '',
                )
              }
            >
              <option value="">—</option>
              {activeTerms(vocabulary, 'seniority').map((term) => (
                <option key={term.id} value={term.value}>
                  {term.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-body text-sm">
            {copy.targetRoleFamilyLabel}
            <select
              className={jobOsFieldClassName}
              value={targetRoleFamily}
              onChange={(event) =>
                setTargetRoleFamily(
                  event.target.value as OpportunityRoleFamily | '',
                )
              }
            >
              <option value="">—</option>
              {activeTerms(vocabulary, 'role_family').map((term) => (
                <option key={term.id} value={term.value}>
                  {term.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-body text-sm md:col-span-2">
            {copy.locationFlexibilityLabel}
            <input
              className={jobOsFieldClassName}
              value={locationFlexibility}
              onChange={(event) => setLocationFlexibility(event.target.value)}
            />
          </label>
        </div>
      </JobOsFocusSection>

      <JobOsFocusSection title={copy.constraintsHeading}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block font-body text-sm">
            {copy.compensationFloorLabel}
            <input
              className={jobOsFieldClassName}
              value={compensationFloor}
              onChange={(event) => setCompensationFloor(event.target.value)}
            />
          </label>
          <label className="block font-body text-sm">
            {copy.compensationCurrencyLabel}
            <input
              className={jobOsFieldClassName}
              value={compensationCurrency}
              onChange={(event) => setCompensationCurrency(event.target.value)}
            />
          </label>
          <label className="block font-body text-sm">
            {copy.compensationPeriodLabel}
            <select
              className={jobOsFieldClassName}
              value={compensationPeriod}
              onChange={(event) =>
                setCompensationPeriod(
                  event.target.value as CompensationPeriod | '',
                )
              }
            >
              <option value="">—</option>
              {COMPENSATION_PERIODS.map((value) => (
                <option key={value} value={value}>
                  {copy.compensationPeriodOptions[value] ?? value}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-body text-sm md:col-span-2">
            {copy.mustHaveTagsLabel}
            <input
              className={jobOsFieldClassName}
              value={mustHaveTags}
              onChange={(event) => setMustHaveTags(event.target.value)}
            />
          </label>
          <label className="block font-body text-sm md:col-span-2">
            {copy.dealBreakerTagsLabel}
            <input
              className={jobOsFieldClassName}
              value={dealBreakerTags}
              onChange={(event) => setDealBreakerTags(event.target.value)}
            />
          </label>
        </div>
      </JobOsFocusSection>

      <JobOsFocusSection title={copy.motivationsHeading}>
        <div className="grid gap-3">
          <label className="block font-body text-sm">
            {copy.escapePainsLabel}
            <input
              className={jobOsFieldClassName}
              value={escapePains}
              onChange={(event) => setEscapePains(event.target.value)}
            />
          </label>
          <label className="block font-body text-sm">
            {copy.seekDesiresLabel}
            <input
              className={jobOsFieldClassName}
              value={seekDesires}
              onChange={(event) => setSeekDesires(event.target.value)}
            />
          </label>
        </div>
      </JobOsFocusSection>

      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={() => void handleSaveProfile()}
      >
        {busy ? copy.savingLabel : copy.saveLabel}
      </Button>

      <JobOsFocusSection title={copy.bodyHeading}>
        <label className="block font-body text-sm">
          <Text variant="muted" className="mb-2 block text-sm">
            {copy.bodyHint}
          </Text>
          <textarea
            className={jobOsFieldClassName}
            rows={8}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={copy.noBodyLabel}
          />
        </label>
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || !profile}
            onClick={() => void handleSaveBody()}
          >
            {busy ? copy.savingBodyLabel : copy.saveBodyLabel}
          </Button>
        </div>
      </JobOsFocusSection>

      {message ? <Text>{message}</Text> : null}
      {error ? <Text>{error}</Text> : null}
    </div>
  );
}
