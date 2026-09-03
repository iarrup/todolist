import { startOfDay } from '@/db/dayRange';

/**
 * Heading label for a given day, e.g. "Today, Sep 3" or "Sep 1" for any other
 * day. `now` defaults to the current time; pass it explicitly for deterministic
 * comparisons (tests, or F5 comparing against a browsed "today").
 */
export function formatDayHeading(date: Date, now: Date = new Date()): string {
  const isToday = startOfDay(date) === startOfDay(now);
  const formatted = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    date,
  );
  return isToday ? `Today, ${formatted}` : formatted;
}
