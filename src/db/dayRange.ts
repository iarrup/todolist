/**
 * Inclusive epoch-millisecond bounds for the local calendar day containing
 * `date`. Used to scope time-based views (day is the Phase 1 default; week /
 * month arrive in F5). Uses the device's local timezone.
 */
export function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
