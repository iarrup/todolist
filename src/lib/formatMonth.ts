import { startOfMonth } from '@/db/monthRange';

const longMonth = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

/**
 * Heading label for the calendar month containing `date`, e.g. "This Month"
 * or "September 2026". `now` defaults to the current time; pass it
 * explicitly for deterministic comparisons (tests, or comparing against a
 * browsed "today").
 */
export function formatMonthHeading(date: Date, now: Date = new Date()): string {
  const isThisMonth = startOfMonth(date) === startOfMonth(now);
  return isThisMonth ? 'This Month' : longMonth.format(date);
}
