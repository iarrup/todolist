import type { Recurrence } from './recurrence';

/**
 * Computes a recurring task's next due `Date` given its current due `Date`
 * and its recurrence rule (F11). Pure — no DB/React import. The search for
 * a matching day always starts the day *after* `current`, never the same
 * day (so a task due today that recurs on today's weekday rolls to next
 * week, not today again). Time-of-day always carries forward unchanged.
 *
 * Monthly/annual recurrence clamps to the target period's last valid day
 * when the exact day doesn't exist (e.g. the 31st in a 30-day month, Feb 29
 * in a non-leap year) — mirrors `stepDate.ts`'s `stepMonth` clamping
 * exactly, duplicated rather than imported since `stepDate.ts`'s
 * `Granularity` is notes' 3-way type, outside this feature's file list (same
 * parallel-not-modify precedent as F10's `stepTaskDate.ts`). The clamp is
 * not reversible, matching that same existing precedent.
 */
export function nextOccurrence(
  current: Date,
  recurrence: Recurrence,
  recurrenceDays: number[] | null,
): Date {
  switch (recurrence) {
    case 'daily':
      return addDays(current, 1);
    case 'weekdays':
      return nextMatchingDay(current, (day) => day >= 1 && day <= 5);
    case 'weekends':
      return nextMatchingDay(current, (day) => day === 0 || day === 6);
    case 'specific-days':
      if (!recurrenceDays || recurrenceDays.length === 0) {
        throw new Error('specific-days recurrence requires at least one day');
      }
      return nextMatchingDay(current, (day) => recurrenceDays.includes(day));
    case 'monthly':
      return addMonthsClamped(current, 1);
    case 'annually':
      return addMonthsClamped(current, 12);
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function nextMatchingDay(current: Date, matches: (dayOfWeek: number) => boolean): Date {
  let d = addDays(current, 1);
  while (!matches(d.getDay())) {
    d = addDays(d, 1);
  }
  return d;
}

/** Adds `months` calendar months, clamping the day-of-month to the target month's last day. */
function addMonthsClamped(date: Date, months: number): Date {
  const targetMonth = date.getMonth() + months;
  const lastDayOfTargetMonth = new Date(date.getFullYear(), targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(date.getDate(), lastDayOfTargetMonth);
  return new Date(
    date.getFullYear(),
    targetMonth,
    clampedDay,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}
