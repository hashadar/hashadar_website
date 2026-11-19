'use client';

import { Heading, Text } from '@/components/ui';
import { useCfa } from '@/components/sections/labs/cfa/cfa-context';
import {
  cfaErrorClassName,
  cfaMutedClassName,
  cfaSecondaryButtonClassName,
} from '@/components/sections/labs/cfa/cfa-ui';
import { cfa } from '@/data';

export type CfaPageHeaderProps = {
  heading: string;
  description?: string;
  actions?: React.ReactNode;
};

export function CfaPageHeader({ heading, description, actions }: CfaPageHeaderProps) {
  return (
    <header className="space-y-1.5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Heading as="h1" size="md" className="tracking-tight">
          {heading}
        </Heading>
        {actions}
      </div>
      {description ? (
        <Text variant="muted" size="sm">
          {description}
        </Text>
      ) : null}
    </header>
  );
}

/** Loading / error / unavailable states shared by every CFA page. Renders children when ready. */
export function CfaReady({ children }: { children: React.ReactNode }) {
  const { status, reload } = useCfa();
  if (status === 'unavailable') {
    return <p className={cfaErrorClassName}>{cfa.common.notConfiguredLabel}</p>;
  }
  if (status === 'loading') {
    return <p className={cfaMutedClassName}>{cfa.common.loadingLabel}</p>;
  }
  if (status === 'error') {
    return (
      <div className="space-y-2" role="alert">
        <p className={cfaErrorClassName}>{cfa.common.errorLabel}</p>
        <button type="button" className={cfaSecondaryButtonClassName} onClick={reload}>
          {cfa.common.retryLabel}
        </button>
      </div>
    );
  }
  return <>{children}</>;
}
