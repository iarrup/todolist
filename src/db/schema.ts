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

/**
 * A task is its text plus a completed flag (Phase 2, F7). Same minimalism
 * principle as notes: no title, no other metadata. Schedule/recurrence
 * columns are deliberately absent — they arrive with F9/F11's own
 * migrations.
 */
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
