/**
 * Inclusive epoch-millisecond bounds for the local calendar week containing
 * `date`. Weeks start on Sunday (`Date.getDay() === 0`), mirroring
 * `dayRange.ts`'s dependency-free style. Uses the device's local timezone.
 */
export function startOfWeek(date: Date): number {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfWeek(date: Date): number {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 6);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
