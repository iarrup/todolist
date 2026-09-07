/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';

import { formatWeekHeading } from '../formatWeek';

const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

describe('formatWeekHeading', () => {
  it('labels "This Week" when the date falls in the same week as now', () => {
    const now = new Date(2026, 8, 9, 9, 0, 0); // Wed
    const date = new Date(2026, 8, 11, 20, 0, 0); // Fri, same week
    expect(formatWeekHeading(date, now)).toBe('This Week');
  });

  it('labels a range with the month repeated on both ends when out of range', () => {
    const now = new Date(2026, 9, 20); // October, unrelated week
    const date = new Date(2026, 8, 9); // Sep 6 - Sep 12 week
    const start = shortDate.format(new Date(2026, 8, 6));
    const end = shortDate.format(new Date(2026, 8, 12));
    expect(formatWeekHeading(date, now)).toBe(`${start} – ${end}`);
  });
});
