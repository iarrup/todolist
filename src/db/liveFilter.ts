import { isNull } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

/**
 * `WHERE` predicate for "not soft-deleted" (F17). Every read of `notes`/`tasks`
 * and every mutation by id must include it, so a deleted item is invisible and
 * can't be resurrected. Kept free of native imports (no `expo-sqlite`) so tests
 * can use this same helper instead of re-stating the filter.
 */
export function isLive(table: { deletedAt: SQLiteColumn }) {
  return isNull(table.deletedAt);
}
