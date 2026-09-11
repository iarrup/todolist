/**
 * Inclusive epoch-millisecond bounds for the local calendar year containing
 * `date`. Same dependency-free style as `weekRange.ts`/`monthRange.ts`. Used
 * by tasks' Year browse granularity (F10) — notes stop at month (F5).
 */
export function startOfYear(date: Date): number {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
}

export function endOfYear(date: Date): number {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
}
