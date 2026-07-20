'use client';

import { useState } from 'react';
import { SectionHeader, Text } from '@/components/ui';
import { JobMarketLabComparePanel } from '@/components/sections/labs/job-market-lab-compare-panel';
import { JobMarketLabCvPanel } from '@/components/sections/labs/job-market-lab-cv-panel';
import { JobMarketLabMarketComparePanel } from '@/components/sections/labs/job-market-lab-market-compare-panel';
import { jobMarketLab } from '@/data';
import type { AmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
import type { CanonicalCvDeps } from '@/lib/canonical-cv';
import { cn } from '@/lib/utils';

export type JobMarketFitWorkspaceProps = {
  corpus?: AmplifyCorpusDeps;
  canonicalCv?: CanonicalCvDeps;
};

type FitMode = 'role' | 'market';

export function JobMarketFitWorkspace({
  corpus,
  canonicalCv,
}: JobMarketFitWorkspaceProps) {
  const copy = jobMarketLab.console.fitWorkspace;
  const [mode, setMode] = useState<FitMode>('role');

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SectionHeader as="h2" size="md" animated={false} showLeftAccent>
          {copy.heading}
        </SectionHeader>
        <Text variant="muted">{copy.description}</Text>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside className="min-w-0 lg:sticky lg:top-24">
          <JobMarketLabCvPanel canonicalCv={canonicalCv} embedded />
        </aside>

        <div className="min-w-0 space-y-5">
          <div
            role="tablist"
            aria-label={copy.heading}
            className="inline-flex flex-wrap gap-1 border-b border-[var(--border)] pb-px"
          >
            {(
              [
                { id: 'role' as const, label: copy.modeRoleLabel },
                { id: 'market' as const, label: copy.modeMarketLabel },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={mode === tab.id}
                className={cn(
                  'px-3 py-2 font-body text-sm transition-colors',
                  mode === tab.id
                    ? 'border-b-2 border-b-[var(--primary)] text-[var(--foreground)]'
                    : 'text-[var(--mono-500)] hover:text-[var(--foreground)]',
                )}
                onClick={() => setMode(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {mode === 'role' ? (
            <JobMarketLabComparePanel
              corpus={corpus}
              canonicalCv={canonicalCv}
              embedded
              showHeading={false}
            />
          ) : (
            <JobMarketLabMarketComparePanel
              canonicalCv={canonicalCv}
              embedded
              showHeading={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
