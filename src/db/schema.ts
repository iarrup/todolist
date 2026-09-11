import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { RECURRENCE_TYPES } from '../lib/recurrence';

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
 * A task is its text plus a completed flag (Phase 2, F7), an optional due
 * moment (Phase 2, F9), and an optional recurrence rule (Phase 2, F11). Same
 * minimalism principle as notes: no title, no other metadata. `dueAt` is
 * nullable epoch milliseconds (unscheduled = `null`), matching
 * `createdAt`/`updatedAt`'s plain-integer style. `recurrence` is `null` for
 * a non-recurring task (today's behavior, unchanged); `recurrenceDays` is
 * only ever non-null when `recurrence = 'specific-days'`, storing
 * comma-separated day-of-week integers (`0`=Sunday … `6`=Saturday, matching
 * `Date.getDay()`/`weekRange.ts`). Recurrence has no meaning without a
 * `dueAt` anchor — enforced at the UI/data-access layer, not by a DB
 * constraint (see `src/db/tasks.ts`).
 */
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  dueAt: integer('due_at'),
  recurrence: text('recurrence', { enum: RECURRENCE_TYPES }),
  recurrenceDays: text('recurrence_days'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
