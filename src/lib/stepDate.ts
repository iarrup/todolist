import type { Granularity } from './granularity';

/**
 * Steps `date` by one unit of `granularity` in `direction` (-1 back, +1
 * forward). Used by the prev/next browsing controls (F5).
 */
export function stepDate(date: Date, granularity: Granularity, direction: -1 | 1): Date {
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
  return stepMonth(date, direction);
}

/**
 * Steps by one calendar month, clamping the day-of-month to the target
 * month's last day instead of letting it overflow (native `setMonth(+1)` on
 * Jan 31 rolls into March; this lands in Feb instead). The clamp is not
 * reversible (Jan 31 -> Feb 28 -> back a month lands on Jan 28), matching
 * common calendar-app behavior.
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
