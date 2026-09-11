import { describe, expect, it } from '@jest/globals';

import { parseRecurrenceDays, serializeRecurrenceDays } from '../recurrence';

describe('parseRecurrenceDays / serializeRecurrenceDays', () => {
  it('serializes a day list to comma-separated text', () => {
    expect(serializeRecurrenceDays([1, 3, 5])).toBe('1,3,5');
  });

  it('serializes null to null', () => {
    expect(serializeRecurrenceDays(null)).toBeNull();
  });

  it('serializes an empty array to null', () => {
    expect(serializeRecurrenceDays([])).toBeNull();
  });

  it('parses comma-separated text back to a number array', () => {
    expect(parseRecurrenceDays('1,3,5')).toEqual([1, 3, 5]);
  });

  it('parses null to null', () => {
    expect(parseRecurrenceDays(null)).toBeNull();
  });

  it('parses an empty string to null', () => {
    expect(parseRecurrenceDays('')).toBeNull();
  });

  it('round-trips', () => {
    const days = [0, 2, 4, 6];
    expect(parseRecurrenceDays(serializeRecurrenceDays(days))).toEqual(days);
  });
});
