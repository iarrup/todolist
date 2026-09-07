import { startOfWeek, endOfWeek } from '@/db/weekRange';

const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

/**
 * Heading label for the calendar week containing `date`, e.g. "This Week" or
 * "Sep 1 – Sep 7" (the month is always shown on both ends, even when the week
 * doesn't cross a month boundary). `now` defaults to the current time; pass
 * it explicitly for deterministic comparisons (tests, or comparing against a
 * browsed "today").
 */
export function formatWeekHeading(date: Date, now: Date = new Date()): string {
  const isThisWeek = startOfWeek(date) === startOfWeek(now);
  if (isThisWeek) return 'This Week';
  const start = shortDate.format(new Date(startOfWeek(date)));
  const end = shortDate.format(new Date(endOfWeek(date)));
  return `${start} – ${end}`;
}
