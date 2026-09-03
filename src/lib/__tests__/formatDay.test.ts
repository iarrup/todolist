/**
 * @jest-environment node
 *
 * Headless test for the pure day-heading formatter (no React Native runtime
 * needed).
 */
import { describe, expect, it } from '@jest/globals';

import { formatDayHeading } from '../formatDay';

const format = (date: Date) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);

describe('formatDayHeading', () => {
  it('prefixes "Today" when the date is the same calendar day as now', () => {
    const now = new Date(2026, 8, 3, 9, 0, 0);
    const date = new Date(2026, 8, 3, 23, 30, 0);
    expect(formatDayHeading(date, now)).toBe(`Today, ${format(date)}`);
  });

  it('has no "Today" prefix for a different calendar day', () => {
    const now = new Date(2026, 8, 3);
    const date = new Date(2026, 8, 1);
    expect(formatDayHeading(date, now)).toBe(format(date));
  });
});
