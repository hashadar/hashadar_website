'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, SectionHeader, Text } from '@/components/ui';
import { careerProfile, jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import {
  getCanonicalCv,
  saveCanonicalCv,
  seedCanonicalCvFromProfile,
  type CanonicalCvDeps,
} from '@/lib/canonical-cv';
import { createDefaultAmplifyCanonicalCvDeps } from '@/lib/canonical-cv-amplify';

export type JobMarketLabCvPanelProps = {
  canonicalCv?: CanonicalCvDeps;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; body: string }
  | { status: 'error' };

export function JobMarketLabCvPanel({
  canonicalCv,
}: JobMarketLabCvPanelProps) {
  const { session, isLoading } = useSiteAuth();
  const [deps] = useState(() => canonicalCv ?? createDefaultAmplifyCanonicalCvDeps());
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [draftBody, setDraftBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [seededMessage, setSeededMessage] = useState<string | null>(null);

  const loadCv = useCallback(async () => {
    const record = await getCanonicalCv(deps);
    return record?.body ?? '';
  }, [deps]);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoadState({ status: 'loading' });
      try {
        const body = await loadCv();
        if (!cancelled) {
          setDraftBody(body);
          setLoadState({ status: 'ready', body });
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
  }, [isLoading, session, loadCv]);

  if (isLoading || session?.status !== 'authenticated') {
    return null;
  }

  const cvCopy = jobMarketLab.console.cv;
  const isEmpty = loadState.status === 'ready' && loadState.body.trim() === '';

  async function handleSeed() {
    setIsSeeding(true);
    setSeededMessage(null);
    setSavedMessage(null);
    const seeded = seedCanonicalCvFromProfile(careerProfile);
    setDraftBody(seeded);
    setIsSeeding(false);
    setSeededMessage(cvCopy.seededMessage);
  }

  async function handleSave() {
    setIsSaving(true);
    setSavedMessage(null);
    setSeededMessage(null);
    try {
      await saveCanonicalCv(draftBody, deps);
      setLoadState({ status: 'ready', body: draftBody });
      setSavedMessage(cvCopy.savedMessage);
    } catch {
      setLoadState({ status: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-16 space-y-6" aria-labelledby="job-market-cv-heading">
      <div className="max-w-2xl space-y-4">
        <SectionHeader
          id="job-market-cv-heading"
          as="h2"
          size="md"
          animated={false}
          showLeftAccent={false}
        >
          {cvCopy.heading}
        </SectionHeader>
        <Text variant="muted">{cvCopy.description}</Text>
      </div>

      {loadState.status === 'loading' ? (
        <Text variant="muted">{cvCopy.loadingLabel}</Text>
      ) : null}

      {loadState.status === 'error' ? (
        <Text role="alert">{cvCopy.errorLabel}</Text>
      ) : null}

      {loadState.status === 'ready' || loadState.status === 'idle' ? (
        <div className="max-w-2xl space-y-4">
          {isEmpty ? (
            <Text variant="muted">{cvCopy.emptyHint}</Text>
          ) : null}

          <label className="block space-y-2" htmlFor="job-market-cv-body">
            <Text size="sm">{cvCopy.bodyLabel}</Text>
            <textarea
              id="job-market-cv-body"
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              rows={16}
              className="block w-full rounded border border-[var(--border)] bg-[var(--background)] p-3 font-body text-base leading-relaxed text-[var(--foreground)]"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            {isEmpty ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSeed()}
                disabled={isSeeding}
              >
                {isSeeding ? cvCopy.seedingLabel : cvCopy.seedButtonLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || draftBody.trim() === ''}
            >
              {isSaving ? cvCopy.savingLabel : cvCopy.saveButtonLabel}
            </Button>
          </div>

          {seededMessage ? (
            <p role="status" className="font-body text-base leading-relaxed text-[var(--foreground)]">
              {seededMessage}
            </p>
          ) : null}

          {savedMessage ? (
            <p role="status" className="font-body text-base leading-relaxed text-[var(--foreground)]">
              {savedMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
