/** British English GBP / rate formatting for WMW Overview. */

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const gbpPrecise = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 2,
});

const percent = new Intl.NumberFormat('en-GB', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const asOfFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

export function formatGbp(amount: number, precise = false): string {
  return (precise ? gbpPrecise : gbp).format(amount);
}

/** Decimal annualised rate (0.12 → 12.0%). */
export function formatAnnualisedRate(rate: number): string {
  return percent.format(rate);
}

export function formatAsOf(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return `${asOfFormatter.format(ms)} UTC`;
}

export function formatCalendarMonth(month: string): string {
  const [year, mon] = month.split('-');
  if (!year || !mon) return month;
  const date = new Date(Date.UTC(Number(year), Number(mon) - 1, 1));
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
