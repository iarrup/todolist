import { desc, eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import { db } from './client';
import { tasks, type Task } from './schema';

/**
 * Data-access for tasks (Phase 2, F7). Mirrors src/db/notes.ts's shape.
 */

/** Insert a task (id + timestamps generated here) and return the stored row. */
export async function insertTask(text: string): Promise<Task> {
  const now = Date.now();
  const row: Task = {
    id: Crypto.randomUUID(),
    text,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(tasks).values(row);
  return row;
}

/**
 * All tasks, newest-first, unfiltered (open + completed) — F7 scope only.
 * Superseded as the Tasks tab's source by `openTasksQuery` (F8); kept since
 * nothing requires removing a working query.
 */
export function tasksQuery() {
  return db.select().from(tasks).orderBy(desc(tasks.createdAt));
}

/**
 * Open (incomplete) tasks, newest-created-first — the Tasks tab's default
 * view (F8). Returned unexecuted so screens can pass it to `useLiveQuery`.
 */
export function openTasksQuery() {
  return db.select().from(tasks).where(eq(tasks.completed, false)).orderBy(desc(tasks.createdAt));
}

/** Update a task's text (and `updatedAt`); `id` and `createdAt` are untouched. */
export async function updateTaskText(id: string, text: string): Promise<void> {
  await db.update(tasks).set({ text, updatedAt: Date.now() }).where(eq(tasks.id, id));
}

/** Set a task's completed flag (and `updatedAt`). */
export async function setTaskCompleted(id: string, completed: boolean): Promise<void> {
  await db.update(tasks).set({ completed, updatedAt: Date.now() }).where(eq(tasks.id, id));
}

/** Delete a task. */
export async function deleteTask(id: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
}
