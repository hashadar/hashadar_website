import { cn } from '@/lib/utils';

export type WmwDenseColumn = {
  label: string;
  align?: 'left' | 'right';
};

export function WmwDenseTable({
  columns,
  empty,
  isEmpty,
  children,
  caption,
  className,
}: {
  columns: Array<string | WmwDenseColumn>;
  empty: React.ReactNode;
  isEmpty: boolean;
  children: React.ReactNode;
  caption?: string;
  className?: string;
}) {
  const normalised = columns.map((column) =>
    typeof column === 'string'
      ? { label: column, align: 'left' as const }
      : { align: 'left' as const, ...column },
  );

  return (
    <div className={cn('max-w-3xl overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="sticky top-0 bg-[var(--background)]">
          <tr className="border-b border-[var(--border)]">
            {normalised.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={cn(
                  'px-2 py-1.5 font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[var(--mono-500)] first:pl-0 last:pr-0',
                  column.align === 'right' && 'text-right',
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td
                colSpan={normalised.length}
                className="px-0 py-4 font-body text-sm text-[var(--mono-500)]"
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

export function WmwDenseRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        'border-b border-[color-mix(in_oklab,var(--border)_75%,transparent)]',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function WmwDenseCell({
  children,
  className,
  align = 'left',
  mono,
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
  mono?: boolean;
}) {
  return (
    <td
      className={cn(
        'px-2 py-1 align-middle font-body text-sm text-[var(--foreground)] first:pl-0 last:pr-0',
        align === 'right' && 'text-right',
        mono && 'font-mono tabular-nums',
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Gradated MoM colour: green up, red down, muted flat/missing. */
export function momDeltaClassName(delta: number | null): string {
  if (delta === null || delta === 0) {
    return 'text-[var(--mono-500)]';
  }
  if (delta > 0) {
    return 'text-[color-mix(in_oklab,#15803d_85%,var(--foreground))]';
  }
  return 'text-[color-mix(in_oklab,#b91c1c_85%,var(--foreground))]';
}
