/**
 * The four time-based browsing granularities the Tasks tab's Browse mode
 * supports (F10). A separate type from `./granularity`'s `Granularity`
 * (day/week/month only, used by notes) rather than widening it, so notes'
 * existing 3-way exhaustiveness checks are unaffected by a 4th value they
 * never use.
 */
export type TaskGranularity = 'day' | 'week' | 'month' | 'year';
