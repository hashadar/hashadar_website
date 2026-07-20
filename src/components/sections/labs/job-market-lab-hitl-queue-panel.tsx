'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import matter from 'gray-matter';
import { Button, Heading, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import {
  acceptScrapeCandidate,
  applyOwnerMetadata,
  createDefaultAmplifyEmployerDeps,
  listEmployers,
  listPendingScrapeCandidates,
  parseJobListingFromUrl,
  rejectScrapeCandidate,
  uploadJobDescription,
  type AcceptScrapeCandidateResult,
  type EmployerRecord,
  type ParseJobListingFromUrl,
  type ParseJobListingFromUrlResult,
  type RejectScrapeCandidateResult,
  type ScrapeCandidateRecord,
} from '@/lib/job-market-lab';
import {
  createDefaultAmplifyScrapeCandidateDeps,
} from '@/lib/scrape-candidates-amplify';
import { cn } from '@/lib/utils';

export type ScrapeCandidateQueueDeps = {
  listScrapeCandidates: () => Promise<ScrapeCandidateRecord[]>;
  getScrapeCandidate: (id: string) => Promise<ScrapeCandidateRecord | null>;
  saveScrapeCandidate: (record: ScrapeCandidateRecord) => Promise<void>;
};

export type AcceptScrapeCandidateFn = (
  id: string,
) => Promise<AcceptScrapeCandidateResult>;

export type RejectScrapeCandidateFn = (
  id: string,
) => Promise<RejectScrapeCandidateResult>;

export type ListEmployersFn = () => Promise<EmployerRecord[]>;

export type JobMarketLabHitlQueuePanelProps = {
  scrapeCandidates?: ScrapeCandidateQueueDeps;
  acceptScrapeCandidateFn?: AcceptScrapeCandidateFn;
  rejectScrapeCandidateFn?: RejectScrapeCandidateFn;
  parseJobListingFromUrlFn?: ParseJobListingFromUrl;
  listEmployersFn?: ListEmployersFn;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; candidates: ScrapeCandidateRecord[] }
  | { status: 'error' };

type EmployersState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; employers: EmployerRecord[] }
  | { status: 'error' };

type ActionFeedback =
  | { kind: 'accepted'; s3Key: string }
  | { kind: 'rejected' }
  | { kind: 'error'; reason: string };

type ParsePhase = 'idle' | 'fetching' | 'extracting';

type ParseFeedback =
  | { kind: 'success'; result: ParseJobListingFromUrlResult }
  | { kind: 'failure'; result: ParseJobListingFromUrlResult };

type CandidateTagsDraft = {
  title: string;
  source: string;
  collectedAt: string;
  employerId: string;
};

const EXTRACTING_HINT_MS = 1500;

const fieldClassName =
  'w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 font-body text-sm text-[var(--foreground)]';

function toTagsDraft(candidate: ScrapeCandidateRecord): CandidateTagsDraft {
  return {
    title: candidate.title ?? '',
    source: candidate.source ?? '',
    collectedAt: candidate.collectedAt ?? '',
    employerId: candidate.employerId ?? '',
  };
}

function draftsFromCandidates(
  candidates: ScrapeCandidateRecord[],
): Record<string, CandidateTagsDraft> {
  return Object.fromEntries(
    candidates.map((candidate) => [candidate.id, toTagsDraft(candidate)]),
  );
}

function bodyPreview(body: string): string {
  try {
    return matter(body).content.trim();
  } catch {
    return body.trim();
  }
}

function sortEmployers(employers: EmployerRecord[]): EmployerRecord[] {
  return [...employers].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

function suggestEmployerId(
  employers: EmployerRecord[],
  listingUrl: string,
): string | undefined {
  try {
    const host = new URL(listingUrl).hostname.toLowerCase().replace(/^www\./, '');
    const match = employers.find((employer) => {
      const slug = employer.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
      return slug.length >= 3 && host.includes(slug.slice(0, Math.min(slug.length, 12)));
    });
    return match?.id;
  } catch {
    return undefined;
  }
}

function defaultAcceptFn(deps: ScrapeCandidateQueueDeps): AcceptScrapeCandidateFn {
  return (id) =>
    acceptScrapeCandidate(id, {
      ...deps,
      uploadJobDescription,
    });
}

function defaultRejectFn(deps: ScrapeCandidateQueueDeps): RejectScrapeCandidateFn {
  return (id) => rejectScrapeCandidate(id, deps);
}

function defaultListEmployersFn(): ListEmployersFn {
  const employerDeps = createDefaultAmplifyEmployerDeps();
  return () => listEmployers(employerDeps);
}

function failureHeading(status: ParseJobListingFromUrlResult['status']): string {
  const copy = jobMarketLab.hitlQueue.parseListing;
  if (status === 'unfetchable') return copy.unfetchableHeading;
  if (status === 'extract_failed') return copy.extractFailedHeading;
  return copy.rejectedHeading;
}

function formatEstimatedCost(costUsd: number | undefined): string | null {
  if (typeof costUsd !== 'number' || !Number.isFinite(costUsd)) {
    return null;
  }
  return jobMarketLab.hitlQueue.parseListing.costLabel.replace(
    '{cost}',
    `$${costUsd.toFixed(4)}`,
  );
}

function pickSelectedId(
  candidates: ScrapeCandidateRecord[],
  preferredId: string | null,
): string | null {
  if (preferredId && candidates.some((candidate) => candidate.id === preferredId)) {
    return preferredId;
  }
  return candidates[0]?.id ?? null;
}

export function JobMarketLabHitlQueuePanel({
  scrapeCandidates,
  acceptScrapeCandidateFn,
  rejectScrapeCandidateFn,
  parseJobListingFromUrlFn = parseJobListingFromUrl,
  listEmployersFn,
}: JobMarketLabHitlQueuePanelProps) {
  const { session, isLoading } = useSiteAuth();
  const [deps] = useState(
    () => scrapeCandidates ?? createDefaultAmplifyScrapeCandidateDeps(),
  );
  const [listEmployersResolved] = useState(
    () => listEmployersFn ?? defaultListEmployersFn(),
  );
  const acceptFn = acceptScrapeCandidateFn ?? defaultAcceptFn(deps);
  const rejectFn = rejectScrapeCandidateFn ?? defaultRejectFn(deps);
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [employersState, setEmployersState] = useState<EmployersState>({
    status: 'idle',
  });
  const [drafts, setDrafts] = useState<Record<string, CandidateTagsDraft>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'accept' | 'reject' | null>(
    null,
  );
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [listingUrl, setListingUrl] = useState('');
  const [pageText, setPageText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [parsePhase, setParsePhase] = useState<ParsePhase>('idle');
  const [parseFeedback, setParseFeedback] = useState<ParseFeedback | null>(null);
  const extractingHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCandidates = useCallback(async () => {
    return listPendingScrapeCandidates(deps);
  }, [deps]);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const candidates = await loadCandidates();
        if (!cancelled) {
          setLoadState({ status: 'ready', candidates });
          setDrafts(draftsFromCandidates(candidates));
          setSelectedId((current) => pickSelectedId(candidates, current));
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
  }, [isLoading, session, loadCandidates]);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    void (async () => {
      setEmployersState({ status: 'loading' });
      try {
        const employers = sortEmployers(await listEmployersResolved());
        if (!cancelled) {
          setEmployersState({ status: 'ready', employers });
        }
      } catch {
        if (!cancelled) {
          setEmployersState({ status: 'error' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, session, listEmployersResolved]);

  useEffect(() => {
    return () => {
      if (extractingHintTimer.current) {
        clearTimeout(extractingHintTimer.current);
      }
    };
  }, []);

  if (isLoading || session?.status !== 'authenticated') {
    return null;
  }

  async function refresh(preferredId?: string | null) {
    setLoadState({ status: 'loading' });
    try {
      const candidates = await loadCandidates();
      setLoadState({ status: 'ready', candidates });
      setDrafts(draftsFromCandidates(candidates));
      setSelectedId((current) =>
        pickSelectedId(candidates, preferredId !== undefined ? preferredId : current),
      );
    } catch {
      setLoadState({ status: 'error' });
    }
  }

  function updateDraft(id: string, patch: Partial<CandidateTagsDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {
          title: '',
          source: '',
          collectedAt: '',
          employerId: '',
        }),
        ...patch,
      },
    }));
  }

  async function handleSubmitToCorpus(candidate: ScrapeCandidateRecord) {
    const draft = drafts[candidate.id] ?? toTagsDraft(candidate);
    setPendingAction('accept');
    setFeedback(null);
    try {
      const metadata = applyOwnerMetadata(candidate, draft);
      if (!metadata.ok) {
        setFeedback({ kind: 'error', reason: metadata.reason });
        return;
      }
      await deps.saveScrapeCandidate(metadata.candidate);
      const result = await acceptFn(candidate.id);
      if (result.status === 'accepted') {
        setFeedback({ kind: 'accepted', s3Key: result.s3Key });
        await refresh(null);
        return;
      }
      if (result.status === 'rejected') {
        setFeedback({ kind: 'error', reason: result.reason });
        return;
      }
      setFeedback({
        kind: 'error',
        reason: jobMarketLab.hitlQueue.actionErrorHeading,
      });
    } catch {
      setFeedback({
        kind: 'error',
        reason: jobMarketLab.hitlQueue.actionErrorHeading,
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDiscard(id: string) {
    setPendingAction('reject');
    setFeedback(null);
    try {
      const result = await rejectFn(id);
      if (result.status === 'rejected') {
        setFeedback({ kind: 'rejected' });
        await refresh(null);
        return;
      }
      setFeedback({
        kind: 'error',
        reason: jobMarketLab.hitlQueue.actionErrorHeading,
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function runParse(options: { usePaste: boolean }) {
    const url = listingUrl.trim();
    if (!url || parsePhase !== 'idle') {
      return;
    }
    if (options.usePaste && !pageText.trim()) {
      return;
    }

    setParseFeedback(null);
    setFeedback(null);
    setParsePhase(options.usePaste ? 'extracting' : 'fetching');
    if (!options.usePaste) {
      extractingHintTimer.current = setTimeout(() => {
        setParsePhase((current) =>
          current === 'fetching' ? 'extracting' : current,
        );
      }, EXTRACTING_HINT_MS);
    }

    try {
      const result = await parseJobListingFromUrlFn({
        url,
        ...(options.usePaste ? { pageText } : {}),
      });
      if (result.status === 'enqueued') {
        setParseFeedback({ kind: 'success', result });
        setListingUrl('');
        setPageText('');
        setShowPaste(false);
        await refresh(result.candidateId ?? null);

        if (
          result.candidateId &&
          employersState.status === 'ready' &&
          url
        ) {
          const suggested = suggestEmployerId(employersState.employers, url);
          if (suggested) {
            setDrafts((current) => {
              const existing = current[result.candidateId!];
              if (!existing || existing.employerId) return current;
              return {
                ...current,
                [result.candidateId!]: { ...existing, employerId: suggested },
              };
            });
          }
        }
        return;
      }
      setParseFeedback({ kind: 'failure', result });
      if (result.status === 'unfetchable' && !options.usePaste) {
        setShowPaste(true);
      }
    } finally {
      if (extractingHintTimer.current) {
        clearTimeout(extractingHintTimer.current);
        extractingHintTimer.current = null;
      }
      setParsePhase('idle');
    }
  }

  async function handleParseListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runParse({ usePaste: false });
  }

  async function handleParsePasted(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runParse({ usePaste: true });
  }

  const parseCopy = jobMarketLab.hitlQueue.parseListing;
  const queueCopy = jobMarketLab.hitlQueue;
  const isParsing = parsePhase !== 'idle';
  const isBusy = pendingAction !== null;
  const costLabel =
    parseFeedback?.kind === 'success'
      ? formatEstimatedCost(parseFeedback.result.estimatedCostUsd)
      : null;
  const candidates =
    loadState.status === 'ready' ? loadState.candidates : [];
  const selected =
    selectedId === null
      ? undefined
      : candidates.find((candidate) => candidate.id === selectedId);
  const selectedDraft = selected
    ? (drafts[selected.id] ?? toTagsDraft(selected))
    : null;
  const employers =
    employersState.status === 'ready' ? employersState.employers : [];

  return (
    <section className="space-y-4" aria-labelledby="job-market-intake-heading">
      <div className="max-w-2xl space-y-1.5">
        <SectionHeader
          id="job-market-intake-heading"
          as="h2"
          size="md"
          animated={false}
          showLeftAccent
        >
          {queueCopy.heading}
        </SectionHeader>
        <Text size="sm" variant="muted">
          {queueCopy.description}
        </Text>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4 lg:sticky lg:top-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Heading as="h3" size="sm">
                {queueCopy.controlsHeading}
              </Heading>
              <Text size="sm" variant="muted">
                {parseCopy.description}
              </Text>
            </div>
            <form
              className="space-y-2"
              onSubmit={(event) => void handleParseListing(event)}
            >
              <label className="block space-y-1" htmlFor="job-market-parse-listing-url">
                <Text size="sm" as="span" className="block text-[var(--mono-500)]">
                  {parseCopy.urlLabel}
                </Text>
                <input
                  id="job-market-parse-listing-url"
                  type="url"
                  name="listingUrl"
                  value={listingUrl}
                  onChange={(event) => setListingUrl(event.target.value)}
                  placeholder={parseCopy.urlPlaceholder}
                  disabled={isParsing}
                  className={fieldClassName}
                  autoComplete="off"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isParsing || !listingUrl.trim()}
                >
                  {parsePhase === 'fetching'
                    ? parseCopy.fetchingLabel
                    : parsePhase === 'extracting' && !showPaste
                      ? parseCopy.extractingLabel
                      : parseCopy.submitLabel}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isParsing}
                  onClick={() => setShowPaste((current) => !current)}
                >
                  {showPaste ? parseCopy.hidePasteLabel : parseCopy.showPasteLabel}
                </Button>
              </div>
            </form>

            {showPaste ? (
              <form
                className="space-y-2 border-t border-[var(--border)] pt-3"
                onSubmit={(event) => void handleParsePasted(event)}
              >
                <div className="space-y-1">
                  <Heading as="h4" size="sm">
                    {parseCopy.pasteFallbackHeading}
                  </Heading>
                  <Text size="sm" variant="muted">
                    {parseCopy.pasteFallbackDescription}
                  </Text>
                </div>
                <label className="block space-y-1" htmlFor="job-market-parse-listing-paste">
                  <Text size="sm" as="span" className="block text-[var(--mono-500)]">
                    {parseCopy.pasteLabel}
                  </Text>
                  <textarea
                    id="job-market-parse-listing-paste"
                    name="pageText"
                    rows={8}
                    value={pageText}
                    onChange={(event) => setPageText(event.target.value)}
                    placeholder={parseCopy.pastePlaceholder}
                    disabled={isParsing}
                    className={cn(fieldClassName, 'min-h-[10rem] resize-y')}
                  />
                </label>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isParsing || !listingUrl.trim() || !pageText.trim()}
                >
                  {parsePhase === 'extracting'
                    ? parseCopy.extractingLabel
                    : parseCopy.pasteSubmitLabel}
                </Button>
              </form>
            ) : null}

            {parseFeedback?.kind === 'success' ? (
              <div role="status" className="space-y-1">
                <Text size="sm" className="font-medium">
                  {parseCopy.successHeading}
                </Text>
                <Text size="sm" variant="muted">
                  {parseCopy.successMessage.replace(
                    '{title}',
                    parseFeedback.result.previewTitle?.trim() ||
                      queueCopy.untitledLabel,
                  )}
                </Text>
                {costLabel ? (
                  <Text size="sm" variant="muted">
                    {costLabel}
                  </Text>
                ) : null}
              </div>
            ) : null}

            {parseFeedback?.kind === 'failure' ? (
              <div role="alert" className="space-y-1">
                <Text size="sm" className="font-medium">
                  {failureHeading(parseFeedback.result.status)}
                </Text>
                <Text size="sm">
                  {parseFeedback.result.reason?.trim() || parseCopy.rejectedHeading}
                </Text>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            <Heading as="h3" size="sm">
              {candidates.length === 0
                ? queueCopy.pendingHeading
                : queueCopy.pendingCountLabel.replace(
                    '{count}',
                    String(candidates.length),
                  )}
            </Heading>

            {loadState.status === 'loading' || loadState.status === 'idle' ? (
              <Text size="sm" variant="muted">
                {queueCopy.loadingLabel}
              </Text>
            ) : null}

            {loadState.status === 'error' ? (
              <p
                role="alert"
                className="font-body text-sm leading-relaxed text-[var(--foreground)]"
              >
                {queueCopy.errorLabel}
              </p>
            ) : null}

            {loadState.status === 'ready' && candidates.length === 0 ? (
              <Text size="sm" variant="muted">
                {queueCopy.emptyList}
              </Text>
            ) : null}

            {candidates.length > 0 ? (
              <ul className="space-y-1" aria-label={queueCopy.pendingHeading}>
                {candidates.map((candidate) => {
                  const label =
                    drafts[candidate.id]?.title?.trim() ||
                    candidate.title?.trim() ||
                    queueCopy.untitledLabel;
                  const isSelected = candidate.id === selectedId;
                  return (
                    <li key={candidate.id}>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setSelectedId(candidate.id);
                          setFeedback(null);
                        }}
                        className={cn(
                          'w-full rounded-md border px-2.5 py-2 text-left font-body text-sm transition-colors',
                          isSelected
                            ? 'border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_8%,var(--background))] text-[var(--foreground)]'
                            : 'border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]',
                        )}
                      >
                        <span className="line-clamp-2 font-medium">{label}</span>
                        {candidate.source ? (
                          <span className="mt-0.5 block truncate text-[var(--mono-500)]">
                            {candidate.source}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 space-y-3 rounded-md border border-[var(--border)] border-l-4 border-l-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_3%,var(--background))] px-4 py-4">
          <Heading as="h3" size="sm">
            {queueCopy.reviewHeading}
          </Heading>

          {!selected || !selectedDraft ? (
            <div className="space-y-1 py-6">
              <Text size="sm" variant="muted">
                {queueCopy.emptyReview}
              </Text>
              {candidates.length > 0 ? (
                <Text size="sm" variant="muted">
                  {queueCopy.selectPendingHint}
                </Text>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 sm:col-span-2">
                  <Text size="sm" className="text-[var(--mono-500)]">
                    {queueCopy.titleLabel}
                  </Text>
                  <input
                    className={fieldClassName}
                    value={selectedDraft.title}
                    disabled={isBusy}
                    onChange={(event) =>
                      updateDraft(selected.id, { title: event.target.value })
                    }
                    aria-label={`${queueCopy.titleLabel} (${selected.id})`}
                  />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <Text size="sm" className="text-[var(--mono-500)]">
                    {queueCopy.employerLabel}
                  </Text>
                  {employersState.status === 'loading' ||
                  employersState.status === 'idle' ? (
                    <Text size="sm" variant="muted">
                      {queueCopy.employersLoadingLabel}
                    </Text>
                  ) : null}
                  {employersState.status === 'error' ? (
                    <p role="alert" className="font-body text-sm text-[var(--foreground)]">
                      {queueCopy.employersErrorLabel}
                    </p>
                  ) : null}
                  {employersState.status === 'ready' ? (
                    <select
                      className={fieldClassName}
                      value={selectedDraft.employerId}
                      disabled={isBusy}
                      onChange={(event) =>
                        updateDraft(selected.id, {
                          employerId: event.target.value,
                        })
                      }
                      aria-label={`${queueCopy.employerLabel} (${selected.id})`}
                    >
                      <option value="">{queueCopy.noEmployerOption}</option>
                      {employers.map((employer) => (
                        <option key={employer.id} value={employer.id}>
                          {employer.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {employersState.status === 'ready' &&
                  !selectedDraft.employerId ? (
                    <p
                      role="status"
                      className="font-body text-sm text-[var(--mono-500)]"
                    >
                      {queueCopy.employerUnsetWarning}
                    </p>
                  ) : null}
                  {employersState.status === 'ready' &&
                  selectedDraft.employerId &&
                  !employers.some(
                    (employer) => employer.id === selectedDraft.employerId,
                  ) ? (
                    <p role="alert" className="font-body text-sm text-[var(--foreground)]">
                      {queueCopy.employerUnknownWarning.replace(
                        '{id}',
                        selectedDraft.employerId,
                      )}
                    </p>
                  ) : null}
                </label>
                <label className="block space-y-1">
                  <Text size="sm" className="text-[var(--mono-500)]">
                    {queueCopy.sourceLabel}
                  </Text>
                  <input
                    className={fieldClassName}
                    value={selectedDraft.source}
                    disabled={isBusy}
                    onChange={(event) =>
                      updateDraft(selected.id, { source: event.target.value })
                    }
                    aria-label={`${queueCopy.sourceLabel} (${selected.id})`}
                  />
                </label>
                <label className="block space-y-1">
                  <Text size="sm" className="text-[var(--mono-500)]">
                    {queueCopy.collectedAtLabel}
                  </Text>
                  <input
                    className={fieldClassName}
                    value={selectedDraft.collectedAt}
                    disabled={isBusy}
                    onChange={(event) =>
                      updateDraft(selected.id, {
                        collectedAt: event.target.value,
                      })
                    }
                    aria-label={`${queueCopy.collectedAtLabel} (${selected.id})`}
                  />
                </label>
              </div>

              <div className="space-y-1">
                <Text size="sm" className="text-[var(--mono-500)]">
                  {queueCopy.bodyPreviewLabel}
                </Text>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-body text-sm leading-relaxed text-[var(--foreground)]">
                  {bodyPreview(selected.body) || '—'}
                </pre>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => void handleSubmitToCorpus(selected)}
                >
                  {pendingAction === 'accept'
                    ? queueCopy.acceptingLabel
                    : queueCopy.acceptLabel}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => void handleDiscard(selected.id)}
                >
                  {pendingAction === 'reject'
                    ? queueCopy.rejectingLabel
                    : queueCopy.rejectLabel}
                </Button>
              </div>
            </>
          )}

          {feedback?.kind === 'accepted' ? (
            <p
              role="status"
              className="font-body text-sm leading-relaxed text-[var(--foreground)]"
            >
              {queueCopy.acceptedMessage.replace('{s3Key}', feedback.s3Key)}
            </p>
          ) : null}

          {feedback?.kind === 'rejected' ? (
            <p
              role="status"
              className="font-body text-sm leading-relaxed text-[var(--foreground)]"
            >
              {queueCopy.rejectedMessage}
            </p>
          ) : null}

          {feedback?.kind === 'error' ? (
            <div role="alert" className="space-y-1">
              <Text size="sm" className="font-medium">
                {queueCopy.actionErrorHeading}
              </Text>
              <Text size="sm">{feedback.reason}</Text>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
