/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';

import { formatMonthHeading } from '../formatMonth';

const longMonth = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

describe('formatMonthHeading', () => {
  it('labels "This Month" when the date falls in the same month as now', () => {
    const now = new Date(2026, 8, 3, 9, 0, 0);
    const date = new Date(2026, 8, 29, 20, 0, 0);
    expect(formatMonthHeading(date, now)).toBe('This Month');
  });

  it('labels a plain month/year when out of range', () => {
    const now = new Date(2026, 9, 1);
    const date = new Date(2026, 8, 15);
    expect(formatMonthHeading(date, now)).toBe(longMonth.format(date));
  });
});
