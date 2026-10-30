'use client';

import { useId } from 'react';
import { courtBoard } from '@/data';
import type { GuestInput } from '@/lib/court-board/validation';
import { fillTemplate } from './fill-template';

export interface GuestDraft {
  /** Stable React key; never sent to the server. */
  key: string;
  name: string;
  tier: GuestInput['tier'];
}

let draftCounter = 0;

export function newGuestDraft(): GuestDraft {
  draftCounter += 1;
  return { key: `guest-${draftCounter}`, name: '', tier: 'external' };
}

export function toGuestPayload(drafts: readonly GuestDraft[]): GuestInput[] {
  return drafts.map(({ name, tier }) => ({ name, tier }));
}

export interface GuestFieldsProps {
  guests: GuestDraft[];
  onChange: (guests: GuestDraft[]) => void;
  /** Most guests that may be listed; null means no limit (from Top-up). */
  max: number | null;
  disabled?: boolean;
}

const GUEST_TIERS = ['alumni', 'external'] as const;

/** Guest rows: a name, Alumni or External, and a remove button each. */
export function GuestFields({ guests, onChange, max, disabled }: GuestFieldsProps) {
  const copy = courtBoard.player.signup;
  const base = useId();
  const canAdd = max === null || guests.length < max;

  const update = (key: string, patch: Partial<GuestDraft>) =>
    onChange(guests.map((g) => (g.key === key ? { ...g, ...patch } : g)));

  return (
    <div className="space-y-3">
      {guests.map((guest, index) => {
        const n = index + 1;
        return (
          <div key={guest.key} className="flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem] flex-1">
              <label
                htmlFor={`${base}-${guest.key}-name`}
                className="mb-1 block font-body text-xs"
              >
                {fillTemplate(copy.guestNameLabel, { n })}
              </label>
              <input
                id={`${base}-${guest.key}-name`}
                name={`guest-${n}-name`}
                type="text"
                required
                maxLength={40}
                autoComplete="off"
                disabled={disabled}
                value={guest.name}
                onChange={(event) => update(guest.key, { name: event.target.value })}
                className="block min-h-11 w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 py-2 font-body text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label
                htmlFor={`${base}-${guest.key}-tier`}
                className="mb-1 block font-body text-xs"
              >
                {fillTemplate(copy.guestTierLabel, { n })}
              </label>
              <select
                id={`${base}-${guest.key}-tier`}
                name={`guest-${n}-tier`}
                disabled={disabled}
                value={guest.tier}
                onChange={(event) =>
                  update(guest.key, { tier: event.target.value as GuestDraft['tier'] })
                }
                className="block min-h-11 border-2 border-[var(--border)] bg-[var(--background)] px-3 font-body text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                {GUEST_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {courtBoard.tiers[tier]}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(guests.filter((g) => g.key !== guest.key))}
              className="min-h-11 min-w-11 px-3 font-body text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {fillTemplate(copy.removeGuest, { n })}
            </button>
          </div>
        );
      })}
      {canAdd ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...guests, newGuestDraft()])}
          className="min-h-11 border-2 border-dashed border-[var(--border)] px-4 font-body text-sm hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {copy.addGuest}
        </button>
      ) : null}
    </div>
  );
}
