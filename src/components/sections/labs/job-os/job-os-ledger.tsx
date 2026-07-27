import { cn } from '@/lib/utils';
import { Heading, Text } from '@/components/ui';

export function JobOsWorkspaceIntro({
  heading,
  description,
  actions,
}: {
  heading: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl space-y-1">
        <Heading size="md" as="h2">
          {heading}
        </Heading>
        <Text variant="muted">{description}</Text>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function JobOsCaptureStrip({
  open,
  title,
  dismissLabel,
  onDismiss,
  children,
  className,
}: {
  open: boolean;
  title: string;
  dismissLabel: string;
  onDismiss: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <section
      className={cn(
        'rounded-lg border border-[color-mix(in_oklab,var(--primary)_28%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_6%,var(--background))] p-4 md:p-5',
        className,
      )}
      aria-label={title}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Heading size="sm" as="h3">
          {title}
        </Heading>
        <button
          type="button"
          onClick={onDismiss}
          className="font-body text-sm text-[var(--mono-500)] underline-offset-4 hover:underline"
        >
          {dismissLabel}
        </button>
      </div>
      {children}
    </section>
  );
}

export function JobOsLedger({
  columns,
  empty,
  isEmpty,
  children,
  caption,
}: {
  columns: string[];
  empty: React.ReactNode;
  isEmpty: boolean;
  children: React.ReactNode;
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-[var(--border)]">
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-2 py-2 font-body text-xs font-medium uppercase tracking-[0.08em] text-[var(--mono-500)] first:pl-0 last:pr-0"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-0 py-8 font-body text-sm text-[var(--mono-500)]"
              >
                {empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function JobOsLedgerRow({
  children,
  highlighted,
  className,
}: {
  children: React.ReactNode;
  highlighted?: boolean;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        'border-b border-[color-mix(in_oklab,var(--border)_80%,transparent)] transition-colors hover:bg-[color-mix(in_oklab,var(--muted)_55%,transparent)]',
        highlighted &&
          'bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function JobOsLedgerCell({
  children,
  className,
  mono,
}: {
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <td
      className={cn(
        'px-2 py-3 align-middle font-body text-sm text-[var(--foreground)] first:pl-0 last:pr-0',
        mono && 'tabular-nums text-[var(--mono-500)]',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function JobOsPill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'open' | 'closed' | 'passed' | 'pursuit' | 'anon';
}) {
  const tones: Record<typeof tone, string> = {
    neutral:
      'bg-[color-mix(in_oklab,var(--muted)_80%,transparent)] text-[var(--foreground)]',
    open: 'bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-[var(--foreground)]',
    closed:
      'bg-[color-mix(in_oklab,var(--muted)_70%,transparent)] text-[var(--mono-500)]',
    passed:
      'bg-[color-mix(in_oklab,var(--muted)_75%,transparent)] text-[var(--mono-500)]',
    pursuit:
      'bg-[color-mix(in_oklab,var(--primary)_22%,transparent)] text-[var(--foreground)]',
    anon: 'border border-[var(--border)] text-[var(--mono-500)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 font-body text-xs font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function JobOsFocusSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-[var(--border)] pt-6 first:border-t-0 first:pt-0">
      <Heading size="sm" as="h3">
        {title}
      </Heading>
      {children}
    </section>
  );
}

export function formatNoticedAge(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '—';
  }
  const deltaMs = Math.max(0, now - then);
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) {
    return minutes <= 1 ? 'just now' : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 14) {
    return `${days}d`;
  }
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatCompensation(input: {
  disclosure?: string | null;
  currency?: string | null;
  min?: number | null;
  max?: number | null;
  period?: string | null;
}): string {
  if (input.disclosure === 'competitive') {
    return 'Competitive';
  }
  if (
    input.disclosure === 'range' &&
    input.min != null &&
    input.max != null
  ) {
    const currency = input.currency?.trim() || '';
    const period = input.period ? `/${input.period}` : '';
    const format = (value: number) =>
      value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
    return `${currency}${format(input.min)}–${format(input.max)}${period}`.trim();
  }
  return '—';
}
