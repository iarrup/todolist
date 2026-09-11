import { startOfDay } from '@/db/dayRange';

/**
 * Display label for a task's due moment, e.g. "Today, 3:00 PM" or
 * "Sep 12, 3:00 PM" for any other day. `now` defaults to the current time;
 * pass it explicitly for deterministic comparisons (tests).
 */
export function formatTaskDueAt(dueAt: number, now: Date = new Date()): string {
  const date = new Date(dueAt);
  const isToday = startOfDay(date) === startOfDay(now);
  const day = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    date,
  );
  return `${isToday ? 'Today' : day}, ${time}`;
}
