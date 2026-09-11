/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';

import { startOfYear, endOfYear } from '../yearRange';

describe('startOfYear / endOfYear', () => {
  it('bounds a mid-year date to its calendar year', () => {
    const midYear = new Date(2026, 8, 9, 12, 0, 0);
    expect(new Date(startOfYear(midYear))).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
    expect(new Date(endOfYear(midYear))).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
  });

  it('includes Feb 29 within a leap year', () => {
    const leapYear = new Date(2028, 5, 1);
    const feb29 = new Date(2028, 1, 29, 12, 0, 0).getTime();
    expect(feb29).toBeGreaterThanOrEqual(startOfYear(leapYear));
    expect(feb29).toBeLessThanOrEqual(endOfYear(leapYear));
  });
});
