/** Shared class names for the CFA Lab's utility surfaces (mobile-first). */

export const cfaFieldClassName =
  'mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-body text-base text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]';

export const cfaLabelClassName = 'block font-body text-sm text-[var(--mono-500)]';

export const cfaCardClassName =
  'rounded-lg border border-[var(--border)] bg-[var(--background)] p-4';

export const cfaMutedClassName = 'font-body text-sm text-[var(--mono-500)]';

export const cfaLinkClassName =
  'font-body text-sm text-[var(--foreground)] underline underline-offset-4 hover:text-[var(--primary)]';

export const cfaButtonClassName =
  'inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 font-body text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none';

export const cfaPrimaryButtonClassName = `${cfaButtonClassName} bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]`;

export const cfaSecondaryButtonClassName = `${cfaButtonClassName} border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]`;

export const cfaBadgeClassName =
  'inline-flex items-center rounded-full border border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] px-2 py-0.5 font-body text-[0.7rem] font-medium uppercase tracking-[0.06em] text-[var(--primary)]';

export const cfaErrorClassName = 'font-body text-sm text-red-700 dark:text-red-400';

export const cfaWarningClassName = 'font-body text-sm text-amber-700 dark:text-amber-400';

export const cfaCorrectClassName = 'text-emerald-700 dark:text-emerald-400';
