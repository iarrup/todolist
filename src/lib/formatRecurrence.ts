import { WEEKDAY_LABELS, type Recurrence } from './recurrence';

/**
 * Display label for a task's recurrence rule (F11), e.g. "Repeats daily" or
 * "Repeats weekly on Mon, Wed, Fri". Returns `null` for `recurrence === null`
 * so call sites render nothing (a non-recurring task's row is unchanged
 * from F9).
 */
export function formatRecurrence(
  recurrence: Recurrence | null,
  recurrenceDays: number[] | null,
): string | null {
  switch (recurrence) {
    case null:
      return null;
    case 'daily':
      return 'Repeats daily';
    case 'weekdays':
      return 'Repeats on weekdays';
    case 'weekends':
      return 'Repeats on weekends';
    case 'specific-days':
      return `Repeats weekly on ${formatDays(recurrenceDays)}`;
    case 'monthly':
      return 'Repeats monthly';
    case 'annually':
      return 'Repeats annually';
  }
}

function formatDays(days: number[] | null): string {
  if (!days || days.length === 0) return '';
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .join(', ');
}
