/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';

import { formatYearHeading } from '../formatYear';

const yearOnly = new Intl.DateTimeFormat(undefined, { year: 'numeric' });

describe('formatYearHeading', () => {
  it('labels "This Year" when the date falls in the same year as now', () => {
    const now = new Date(2026, 8, 3, 9, 0, 0);
    const date = new Date(2026, 0, 1, 0, 0, 0);
    expect(formatYearHeading(date, now)).toBe('This Year');
  });

  it('labels a plain year when out of range', () => {
    const now = new Date(2026, 9, 1);
    const date = new Date(2027, 2, 15);
    expect(formatYearHeading(date, now)).toBe(yearOnly.format(date));
  });
});
