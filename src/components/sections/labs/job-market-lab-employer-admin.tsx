'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Heading, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import {
  createEmployer,
  updateEmployer,
  listEmployers,
  EMPLOYER_PRESTIGE_TIERS,
  EMPLOYER_SIZE_TIERS,
  type EmployerPrestigeTier,
  type EmployerRecord,
  type EmployerSizeTier,
} from '@/lib/job-market-employers';
import {
  createDefaultAmplifyEmployerDeps,
  type AmplifyEmployerDeps,
} from '@/lib/job-market-employers-amplify';

export type JobMarketLabEmployerAdminProps = {
  employers?: AmplifyEmployerDeps;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; records: EmployerRecord[] }
  | { status: 'error' };

type CreateState =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'created'; name: string }
  | { status: 'rejected'; reason: string };

type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; name: string }
  | { status: 'rejected'; reason: string };

const fieldClassName =
  'w-full rounded-md border border-[color-mix(in_oklab,var(--foreground)_20%,transparent)] bg-transparent px-3 py-2 font-body text-base text-[var(--foreground)]';

export function JobMarketLabEmployerAdmin({
  employers: employerDepsProp,
}: JobMarketLabEmployerAdminProps) {
  const { session, isLoading } = useSiteAuth();
  const [deps] = useState(() => employerDepsProp ?? createDefaultAmplifyEmployerDeps());
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [createState, setCreateState] = useState<CreateState>({ status: 'idle' });
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const [createName, setCreateName] = useState('');
  const [createSizeTier, setCreateSizeTier] = useState<EmployerSizeTier>('startup');
  const [createPrestigeTier, setCreatePrestigeTier] = useState<EmployerPrestigeTier>('low');
  const [drafts, setDrafts] = useState<Record<string, EmployerRecord>>({});

  const loadRecords = useCallback(async () => {
    return listEmployers(deps);
  }, [deps]);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const records = await loadRecords();
        if (!cancelled) {
          setLoadState({ status: 'ready', records });
          setDrafts(Object.fromEntries(records.map((record) => [record.id, { ...record }])));
        }
      } catch {
        if (!cancelled) {
          setLoadState({ status: 'error' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, session, loadRecords]);

  if (isLoading || session?.status !== 'authenticated') {
    return null;
  }

  async function refresh() {
    setLoadState({ status: 'loading' });
    try {
      const records = await loadRecords();
      setLoadState({ status: 'ready', records });
      setDrafts(Object.fromEntries(records.map((record) => [record.id, { ...record }])));
    } catch {
      setLoadState({ status: 'error' });
    }
  }

  async function handleCreate() {
    setCreateState({ status: 'creating' });
    const result = await createEmployer(
      {
        name: createName,
        sizeTier: createSizeTier,
        prestigeTier: createPrestigeTier,
      },
      deps,
    );

    if (result.status === 'rejected') {
      setCreateState({ status: 'rejected', reason: result.reason });
      return;
    }

    setCreateName('');
    setCreateState({ status: 'created', name: result.employer.name });
    await refresh();
  }

  async function handleSave(record: EmployerRecord) {
    setSaveState({ status: 'saving' });
    const result = await updateEmployer(record, deps);

    if (result.status === 'rejected') {
      setSaveState({ status: 'rejected', reason: result.reason });
      return;
    }

    if (result.status === 'not_found') {
      setSaveState({ status: 'rejected', reason: 'Employer not found' });
      return;
    }

    setSaveState({ status: 'saved', name: result.employer.name });
    await refresh();
  }

  function updateDraft(id: string, patch: Partial<EmployerRecord>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  return (
    <section className="mt-16 space-y-6" aria-labelledby="job-market-employer-admin-heading">
      <div className="max-w-2xl space-y-4">
        <SectionHeader
          id="job-market-employer-admin-heading"
          as="h2"
          size="md"
          animated={false}
          showLeftAccent={false}
        >
          {jobMarketLab.employerAdmin.heading}
        </SectionHeader>
        <Text variant="muted">{jobMarketLab.employerAdmin.description}</Text>
      </div>

      <form
        className="max-w-2xl space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleCreate();
        }}
      >
        <label className="block space-y-2">
          <Text size="sm">{jobMarketLab.employerAdmin.nameLabel}</Text>
          <input
            className={fieldClassName}
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            aria-label={`New ${jobMarketLab.employerAdmin.nameLabel}`}
          />
        </label>
        <label className="block space-y-2">
          <Text size="sm">{jobMarketLab.employerAdmin.sizeTierLabel}</Text>
          <select
            className={fieldClassName}
            value={createSizeTier}
            onChange={(event) => setCreateSizeTier(event.target.value as EmployerSizeTier)}
            aria-label={`New ${jobMarketLab.employerAdmin.sizeTierLabel}`}
          >
            {EMPLOYER_SIZE_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <Text size="sm">{jobMarketLab.employerAdmin.prestigeTierLabel}</Text>
          <select
            className={fieldClassName}
            value={createPrestigeTier}
            onChange={(event) =>
              setCreatePrestigeTier(event.target.value as EmployerPrestigeTier)
            }
            aria-label={`New ${jobMarketLab.employerAdmin.prestigeTierLabel}`}
          >
            {EMPLOYER_PRESTIGE_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={createState.status === 'creating'}>
          {createState.status === 'creating'
            ? jobMarketLab.employerAdmin.creatingLabel
            : jobMarketLab.employerAdmin.createButtonLabel}
        </Button>
      </form>

      {createState.status === 'created' ? (
        <Text>
          {jobMarketLab.employerAdmin.createdMessage.replace('{name}', createState.name)}
        </Text>
      ) : null}

      {createState.status === 'rejected' ? (
        <div role="alert" className="space-y-2">
          <Heading as="h3" size="sm">
            {jobMarketLab.employerAdmin.rejectedHeading}
          </Heading>
          <Text>{createState.reason}</Text>
        </div>
      ) : null}

      {loadState.status === 'loading' || loadState.status === 'idle' ? (
        <Text variant="muted">{jobMarketLab.employerAdmin.loadingLabel}</Text>
      ) : null}

      {loadState.status === 'error' ? (
        <p role="alert" className="font-body text-lg leading-relaxed text-[var(--foreground)]">
          {jobMarketLab.employerAdmin.errorLabel}
        </p>
      ) : null}

      {loadState.status === 'ready' && loadState.records.length === 0 ? (
        <Text variant="muted">{jobMarketLab.employerAdmin.emptyList}</Text>
      ) : null}

      {loadState.status === 'ready' && loadState.records.length > 0 ? (
        <ul className="space-y-6">
          {loadState.records.map((record) => {
            const draft = drafts[record.id] ?? record;
            return (
              <li
                key={record.id}
                className="space-y-4 border-b border-[color-mix(in_oklab,var(--foreground)_12%,transparent)] py-4"
              >
                <Text className="font-medium">{record.name}</Text>
                <label className="block space-y-2">
                  <Text size="sm">{jobMarketLab.employerAdmin.nameLabel}</Text>
                  <input
                    className={fieldClassName}
                    value={draft.name}
                    onChange={(event) => updateDraft(record.id, { name: event.target.value })}
                    aria-label={`${jobMarketLab.employerAdmin.nameLabel} (${record.id})`}
                  />
                </label>
                <label className="block space-y-2">
                  <Text size="sm">{jobMarketLab.employerAdmin.sizeTierLabel}</Text>
                  <select
                    className={fieldClassName}
                    value={draft.sizeTier}
                    onChange={(event) =>
                      updateDraft(record.id, {
                        sizeTier: event.target.value as EmployerSizeTier,
                      })
                    }
                    aria-label={`${jobMarketLab.employerAdmin.sizeTierLabel} (${record.id})`}
                  >
                    {EMPLOYER_SIZE_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <Text size="sm">{jobMarketLab.employerAdmin.prestigeTierLabel}</Text>
                  <select
                    className={fieldClassName}
                    value={draft.prestigeTier}
                    onChange={(event) =>
                      updateDraft(record.id, {
                        prestigeTier: event.target.value as EmployerPrestigeTier,
                      })
                    }
                    aria-label={`${jobMarketLab.employerAdmin.prestigeTierLabel} (${record.id})`}
                  >
                    {EMPLOYER_PRESTIGE_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saveState.status === 'saving'}
                  onClick={() => void handleSave(draft)}
                >
                  {saveState.status === 'saving'
                    ? jobMarketLab.employerAdmin.savingLabel
                    : jobMarketLab.employerAdmin.saveButtonLabel}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {saveState.status === 'saved' ? (
        <Text>
          {jobMarketLab.employerAdmin.savedMessage.replace('{name}', saveState.name)}
        </Text>
      ) : null}

      {saveState.status === 'rejected' ? (
        <div role="alert" className="space-y-2">
          <Heading as="h3" size="sm">
            {jobMarketLab.employerAdmin.rejectedHeading}
          </Heading>
          <Text>{saveState.reason}</Text>
        </div>
      ) : null}
    </section>
  );
}
