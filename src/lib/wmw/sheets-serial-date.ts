/**
 * Google Sheets serial dates (UNFORMATTED_VALUE + SERIAL_NUMBER) → calendar date.
 * Epoch is 1899-12-30 (Sheets/Excel convention).
 */

const SHEETS_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Convert a Sheets date serial to YYYY-MM-DD in UTC calendar space. */
export function sheetsSerialToIsoDate(serial: number): string {
  if (!Number.isFinite(serial)) {
    throw new Error(`Invalid Sheets date serial: ${String(serial)}`);
  }
  const wholeDays = Math.trunc(serial);
  const ms = SHEETS_EPOCH_UTC_MS + wholeDays * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Parse a cell that may be a serial number or an ISO/date-like string. */
export function cellToIsoDate(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return sheetsSerialToIsoDate(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    const asNumber = Number(trimmed);
    if (trimmed !== '' && Number.isFinite(asNumber)) {
      return sheetsSerialToIsoDate(asNumber);
    }
  }
  return null;
}
