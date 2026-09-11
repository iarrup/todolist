/**
 * @jest-environment node
 *
 * Headless test for the pure due-at formatter (no React Native runtime
 * needed).
 */
import { describe, expect, it } from '@jest/globals';

import { formatTaskDueAt } from '../formatTaskDueAt';

const time = (date: Date) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
const day = (date: Date) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);

describe('formatTaskDueAt', () => {
  it('prefixes "Today" when the due date is the same calendar day as now', () => {
    const now = new Date(2026, 8, 3, 9, 0, 0);
    const dueAt = new Date(2026, 8, 3, 15, 30, 0);
    expect(formatTaskDueAt(dueAt.getTime(), now)).toBe(`Today, ${time(dueAt)}`);
  });

  it('shows the month/day for a different calendar day', () => {
    const now = new Date(2026, 8, 3);
    const dueAt = new Date(2026, 8, 12, 15, 30, 0);
    expect(formatTaskDueAt(dueAt.getTime(), now)).toBe(`${day(dueAt)}, ${time(dueAt)}`);
  });

  it('shows the month/day for a past due date', () => {
    const now = new Date(2026, 8, 12);
    const dueAt = new Date(2026, 8, 1, 8, 0, 0);
    expect(formatTaskDueAt(dueAt.getTime(), now)).toBe(`${day(dueAt)}, ${time(dueAt)}`);
  });
});
