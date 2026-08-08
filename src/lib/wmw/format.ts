/** British English GBP / rate formatting for WMW Overview and Account detail. */

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

const quantity = new Intl.NumberFormat('en-GB', {
  maximumFractionDigits: 4,
});

const integer = new Intl.NumberFormat('en-GB', {
  maximumFractionDigits: 0,
});

const asOfFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

const isoDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
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

/** Calendar day YYYY-MM-DD → en-GB short date. */
export function formatIsoDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return isoDateFormatter.format(date);
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

export function formatQuantity(value: number): string {
  return quantity.format(value);
}

export function formatMileage(value: number): string {
  return integer.format(value);
}
