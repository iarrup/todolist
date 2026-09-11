import type { TaskGranularity } from './taskGranularity';

/**
 * Steps `date` by one unit of `granularity` in `direction` (-1 back, +1
 * forward), for tasks' Browse mode (F10). A task-typed sibling of
 * `stepDate` (not a generalization of it) — `stepDate.ts` is an F5-gated
 * file outside F10's spec'd file list, and widening it to a 4th granularity
 * would force touching `index.tsx` too (to pass the extra option), which is
 * out of scope. Day/week/month cases are duplicated verbatim; year is new.
 */
export function stepTaskDate(date: Date, granularity: TaskGranularity, direction: -1 | 1): Date {
  if (granularity === 'day') {
    const d = new Date(date);
    d.setDate(d.getDate() + direction);
    return d;
  }
  if (granularity === 'week') {
    const d = new Date(date);
    d.setDate(d.getDate() + direction * 7);
    return d;
  }
  if (granularity === 'year') {
    return stepYear(date, direction);
  }
  return stepMonth(date, direction);
}

/**
 * Steps by one calendar month, clamping the day-of-month to the target
 * month's last day instead of letting it overflow (native `setMonth(+1)` on
 * Jan 31 rolls into March; this lands in Feb instead). Verbatim copy of
 * `stepDate.ts`'s `stepMonth`.
 */
function stepMonth(date: Date, direction: -1 | 1): Date {
  const targetMonth = date.getMonth() + direction;
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

/**
 * Steps by one calendar year, clamping Feb 29 to Feb 28 when the target
 * year isn't a leap year (mirrors `stepMonth`'s day-of-month clamping).
 */
function stepYear(date: Date, direction: -1 | 1): Date {
  const targetYear = date.getFullYear() + direction;
  const isFeb29 = date.getMonth() === 1 && date.getDate() === 29;
  const targetIsLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;
  const clampedDay = isFeb29 && !targetIsLeap ? 28 : date.getDate();
  return new Date(
    targetYear,
    date.getMonth(),
    clampedDay,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}
