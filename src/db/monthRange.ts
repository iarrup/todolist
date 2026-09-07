/**
 * Inclusive epoch-millisecond bounds for the local calendar month containing
 * `date`. Uses "day 0 of next month" to get the last day of the current
 * month, letting `Date` handle year rollover itself. Uses the device's local
 * timezone.
 */
export function startOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0).getTime();
}

export function endOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
}
