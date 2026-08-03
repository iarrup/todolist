import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * A note is just its text. No title, no metadata (minimalism principle).
 *
 * Sync-ready shape for the Phase 3 backend without a later rewrite:
 *  - `id` is a globally-unique string (UUID), not an autoincrement int.
 *  - `createdAt` / `updatedAt` are epoch milliseconds, set by the app.
 * Task columns (schedule, recurrence, completion) are deliberately absent —
 * they arrive in Phase 2.
 */
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
