import { startOfYear } from '@/db/yearRange';

const yearOnly = new Intl.DateTimeFormat(undefined, { year: 'numeric' });

/**
 * Heading label for the calendar year containing `date`, e.g. "This Year" or
 * "2027". `now` defaults to the current time; pass it explicitly for
 * deterministic comparisons (tests, or comparing against a browsed "today").
 */
export function formatYearHeading(date: Date, now: Date = new Date()): string {
  const isThisYear = startOfYear(date) === startOfYear(now);
  return isThisYear ? 'This Year' : yearOnly.format(date);
}
