/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';

import { startOfMonth, endOfMonth } from '../monthRange';

describe('startOfMonth / endOfMonth', () => {
  it('bounds a mid-month date to its calendar month', () => {
    const midMonth = new Date(2026, 8, 15, 12, 0, 0);
    expect(new Date(startOfMonth(midMonth))).toEqual(new Date(2026, 8, 1, 0, 0, 0, 0));
    expect(new Date(endOfMonth(midMonth))).toEqual(new Date(2026, 8, 30, 23, 59, 59, 999));
  });

  it('bounds a 31-day month correctly', () => {
    const inOctober = new Date(2026, 9, 10);
    expect(new Date(endOfMonth(inOctober))).toEqual(new Date(2026, 9, 31, 23, 59, 59, 999));
  });

  it('bounds February to 28 days in a non-leap year', () => {
    const inFeb2026 = new Date(2026, 1, 10);
    expect(new Date(endOfMonth(inFeb2026))).toEqual(new Date(2026, 1, 28, 23, 59, 59, 999));
  });

  it('bounds February to 29 days in a leap year', () => {
    const inFeb2028 = new Date(2028, 1, 10);
    expect(new Date(endOfMonth(inFeb2028))).toEqual(new Date(2028, 1, 29, 23, 59, 59, 999));
  });
});
