import { describe, expect, it } from 'vitest';
import {
  cellToIsoDate,
  sheetsSerialToIsoDate,
} from '@/lib/wmw/sheets-serial-date';
import {
  SERIAL_2024_01_15,
  SERIAL_2024_02_01,
} from '@/lib/wmw/fixtures/sample-workbook';

describe('sheetsSerialToIsoDate', () => {
  it('converts known Sheets serials to calendar dates', () => {
    expect(sheetsSerialToIsoDate(SERIAL_2024_01_15)).toBe('2024-01-15');
    expect(sheetsSerialToIsoDate(SERIAL_2024_02_01)).toBe('2024-02-01');
  });

  it('truncates fractional time-of-day toward the calendar day', () => {
    expect(sheetsSerialToIsoDate(SERIAL_2024_01_15 + 0.75)).toBe('2024-01-15');
  });
});

describe('cellToIsoDate', () => {
  it('accepts serial numbers and ISO strings', () => {
    expect(cellToIsoDate(SERIAL_2024_01_15)).toBe('2024-01-15');
    expect(cellToIsoDate('2024-01-15')).toBe('2024-01-15');
    expect(cellToIsoDate('2024-01-15T12:00:00Z')).toBe('2024-01-15');
  });

  it('returns null for empty or unusable cells', () => {
    expect(cellToIsoDate('')).toBeNull();
    expect(cellToIsoDate(null)).toBeNull();
    expect(cellToIsoDate(undefined)).toBeNull();
    expect(cellToIsoDate('not-a-date')).toBeNull();
  });
});
