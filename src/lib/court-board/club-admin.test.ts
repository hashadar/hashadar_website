import { describe, expect, it } from 'vitest';
import { parseClubInput } from './club-admin';

const valid = {
  name: 'Lunchtime Badminton',
  venue: 'Sports hall',
  start: '09:00',
  end: '11:00',
};

describe('parseClubInput', () => {
  it('accepts a valid Club and trims whitespace', () => {
    expect(parseClubInput({ ...valid, name: '  Lunchtime Badminton ' })).toEqual({
      ok: true,
      input: valid,
    });
  });

  it.each([
    ['null', null],
    ['a string', 'club'],
    ['missing venue', { ...valid, venue: undefined }],
    ['non-string name', { ...valid, name: 7 }],
    ['blank name', { ...valid, name: '   ' }],
    ['over-long name', { ...valid, name: 'x'.repeat(61) }],
    ['over-long venue', { ...valid, venue: 'x'.repeat(81) }],
    ['bad start time', { ...valid, start: '9am' }],
    ['out-of-range end time', { ...valid, end: '24:00' }],
    ['end before start', { ...valid, start: '11:00', end: '09:00' }],
    ['end equal to start', { ...valid, start: '09:00', end: '09:00' }],
  ])('rejects %s', (_label, raw) => {
    expect(parseClubInput(raw)).toEqual({ ok: false, error: 'invalid' });
  });
});
