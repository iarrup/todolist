/**
 * Shared recurrence types/constants (F11), so the six-type list and weekday
 * labels aren't duplicated across `schema.ts`, `nextOccurrence.ts`,
 * `formatRecurrence.ts`, and `RepeatPicker.tsx` — mirrors `taskGranularity.ts`'s
 * role for F10's browse granularities.
 */

export const RECURRENCE_TYPES = [
  'daily',
  'weekdays',
  'weekends',
  'specific-days',
  'monthly',
  'annually',
] as const;

export type Recurrence = (typeof RECURRENCE_TYPES)[number];

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  'specific-days': 'Specific days of the week',
  monthly: 'Monthly',
  annually: 'Annually',
};

/** Index = `Date.getDay()` (0 = Sunday … 6 = Saturday), matching `weekRange.ts`. */
export const WEEKDAY_LABELS: readonly string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Parses the `recurrenceDays` column's stored comma-separated
 * day-of-week-integer text (e.g. `"1,3,5"`) into `number[]`. `null` or an
 * empty string parses to `null` (no days set).
 */
export function parseRecurrenceDays(raw: string | null): number[] | null {
  if (raw === null || raw.trim() === '') return null;
  return raw.split(',').map((n) => Number(n));
}

/** Serializes `number[]` into the column's comma-separated text form. `null`/empty stays `null`. */
export function serializeRecurrenceDays(days: number[] | null): string | null {
  if (days === null || days.length === 0) return null;
  return days.join(',');
}
