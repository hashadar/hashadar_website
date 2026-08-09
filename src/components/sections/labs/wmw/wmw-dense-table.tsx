import { cn } from '@/lib/utils';

export function WmwDenseTable({
  columns,
  empty,
  isEmpty,
  children,
  caption,
  className,
}: {
  columns: string[];
  empty: React.ReactNode;
  isEmpty: boolean;
  children: React.ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn('max-w-3xl overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="sticky top-0 bg-[var(--background)]">
          <tr className="border-b border-[var(--border)]">
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-2 py-1.5 font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[var(--mono-500)] first:pl-0 last:pr-0"
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
