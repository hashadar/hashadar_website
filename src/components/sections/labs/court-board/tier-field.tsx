'use client';

import { useId } from 'react';
import { courtBoard } from '@/data';
import type { Tier } from '@/lib/court-board/types';
import { cn } from '@/lib/utils';

export interface TierFieldProps {
  legend: string;
  help?: string;
  value: Tier | null;
  onChange: (tier: Tier) => void;
  tiers?: readonly Tier[];
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
}

/** "I am": a segmented radio group. Tier is self-declared, on trust. */
export function TierField({
  legend,
  help,
  value,
  onChange,
  tiers = ['employee', 'alumni', 'external'],
  disabled,
  required,
  invalid,
}: TierFieldProps) {
  const name = useId();
  const helpId = `${name}-help`;
  return (
    <fieldset aria-describedby={help ? helpId : undefined} disabled={disabled}>
      <legend className="mb-1 font-body text-sm font-medium">{legend}</legend>
      <div
        className={cn(
          'inline-flex flex-wrap border-2',
          invalid ? 'border-red-600' : 'border-[var(--border)]',
        )}
      >
        {tiers.map((tier) => (
          <label
            key={tier}
            className={cn(
              'flex min-h-11 cursor-pointer items-center px-4 font-body text-sm',
              'has-[:checked]:bg-[var(--primary)] has-[:checked]:text-white',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-[var(--primary)]',
              'has-[:checked:focus-visible]:ring-white',
            )}
          >
            <input
              type="radio"
              name={name}
              value={tier}
              checked={value === tier}
              required={required}
              onChange={() => onChange(tier)}
              className="sr-only"
            />
            {courtBoard.tiers[tier]}
          </label>
        ))}
      </div>
      {help ? (
        <p id={helpId} className="mt-1 font-body text-xs text-[var(--mono-500)]">
          {help}
        </p>
      ) : null}
    </fieldset>
  );
}
