import { and, asc, desc, eq, gte, isNotNull, lte } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import { db } from './client';
import { startOfDay, endOfDay } from './dayRange';
import { startOfMonth, endOfMonth } from './monthRange';
import { startOfWeek, endOfWeek } from './weekRange';
import { startOfYear, endOfYear } from './yearRange';
import { tasks, type Task } from './schema';
import type { TaskGranularity } from '@/lib/taskGranularity';

/**
 * Data-access for tasks (Phase 2, F7). Mirrors src/db/notes.ts's shape.
 */

/**
 * Insert a task (id + timestamps generated here) and return the stored row.
 * `dueAt` is optional (epoch ms); omitted/`null` means unscheduled (F9).
 */
export async function insertTask(text: string, dueAt: number | null = null): Promise<Task> {
  const now = Date.now();
  const row: Task = {
    id: Crypto.randomUUID(),
    text,
    completed: false,
    dueAt,
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

/**
 * Set or clear a task's due moment (F9). `dueAt` is epoch ms; `null` clears
 * the schedule, returning the task to unscheduled. Bumps `updatedAt`.
 */
export async function updateTaskSchedule(id: string, dueAt: number | null): Promise<void> {
  await db.update(tasks).set({ dueAt, updatedAt: Date.now() }).where(eq(tasks.id, id));
}

/** Delete a task. */
export async function deleteTask(id: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
}

/**
 * Scheduled tasks (`dueAt` non-null) due within `[start, end]` (inclusive
 * epoch ms), earliest-due-first — the Tasks tab's Browse mode (F10). Unlike
 * `openTasksQuery`, this deliberately has no `completed` filter: a browsed
 * day/week/month/year is a calendar/history review, so completed tasks stay
 * visible there. The one range-query path every Browse granularity builds
 * on, mirroring `notes.ts`'s `notesForRangeQuery`. Returned unexecuted so
 * screens can pass it to `useLiveQuery`.
 */
function scheduledTasksForRangeQuery(start: number, end: number) {
  return db
    .select()
    .from(tasks)
    .where(and(isNotNull(tasks.dueAt), gte(tasks.dueAt, start), lte(tasks.dueAt, end)))
    .orderBy(asc(tasks.dueAt));
}

/** Scheduled tasks due on the local calendar day containing `date`. */
export function scheduledTasksForDayQuery(date: Date) {
  return scheduledTasksForRangeQuery(startOfDay(date), endOfDay(date));
}

/** Scheduled tasks due in the local calendar week (Sunday-start) containing `date`. */
export function scheduledTasksForWeekQuery(date: Date) {
  return scheduledTasksForRangeQuery(startOfWeek(date), endOfWeek(date));
}

/** Scheduled tasks due in the local calendar month containing `date`. */
export function scheduledTasksForMonthQuery(date: Date) {
  return scheduledTasksForRangeQuery(startOfMonth(date), endOfMonth(date));
}

/** Scheduled tasks due in the local calendar year containing `date`. */
export function scheduledTasksForYearQuery(date: Date) {
  return scheduledTasksForRangeQuery(startOfYear(date), endOfYear(date));
}

/** Dispatches to the right `scheduledTasksFor*Query` for the current Browse granularity. */
export function scheduledTasksForGranularityQuery(granularity: TaskGranularity, date: Date) {
  switch (granularity) {
    case 'day':
      return scheduledTasksForDayQuery(date);
    case 'week':
      return scheduledTasksForWeekQuery(date);
    case 'month':
      return scheduledTasksForMonthQuery(date);
    case 'year':
      return scheduledTasksForYearQuery(date);
  }
}
