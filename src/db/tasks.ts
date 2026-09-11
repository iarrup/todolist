import { and, asc, desc, eq, gte, isNotNull, lte } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import { db } from './client';
import { startOfDay, endOfDay } from './dayRange';
import { startOfMonth, endOfMonth } from './monthRange';
import { startOfWeek, endOfWeek } from './weekRange';
import { startOfYear, endOfYear } from './yearRange';
import { tasks, type Task } from './schema';
import { nextOccurrence } from '@/lib/nextOccurrence';
import { parseRecurrenceDays, serializeRecurrenceDays, type Recurrence } from '@/lib/recurrence';
import type { TaskGranularity } from '@/lib/taskGranularity';

/**
 * Data-access for tasks (Phase 2, F7). Mirrors src/db/notes.ts's shape.
 */

/**
 * Insert a task (id + timestamps generated here) and return the stored row.
 * `dueAt` is optional (epoch ms); omitted/`null` means unscheduled (F9).
 * `recurrence`/`recurrenceDays` are optional (F11); omitted/`null` means the
 * task does not repeat. Recurrence without a `dueAt` is accepted here (no
 * runtime validation) — the invariant that recurrence requires a schedule is
 * enforced by the UI (the Repeat control is only reachable once scheduled),
 * not by this function; `setTaskCompleted` below defends against the
 * violation case rather than trusting callers.
 */
export async function insertTask(
  text: string,
  dueAt: number | null = null,
  recurrence: Recurrence | null = null,
  recurrenceDays: number[] | null = null,
): Promise<Task> {
  const now = Date.now();
  const row: Task = {
    id: Crypto.randomUUID(),
    text,
    completed: false,
    dueAt,
    recurrence,
    recurrenceDays: serializeRecurrenceDays(recurrenceDays),
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

/**
 * Set a task's completed flag (and `updatedAt`). For a recurring task
 * (F11), completing it (`completed === true`) does **not** set
 * `completed = true` — instead it rolls `dueAt` forward to the next
 * occurrence via `nextOccurrence` and leaves `completed = false`, so the
 * task stays open. That recurring path is taken only when both
 * `recurrence` and `dueAt` are non-null on the stored row: the "recurrence
 * requires a schedule" invariant is enforced by the UI, not by
 * `insertTask`'s signature, so this function must not assume
 * `recurrence != null` implies `dueAt != null` — every other case
 * (non-recurring, unchecking, or that invariant-violation case) falls
 * through to the plain single-statement update F7/F8 always did.
 */
export async function setTaskCompleted(id: string, completed: boolean): Promise<void> {
  if (completed) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (task?.recurrence != null && task.dueAt != null) {
      const next = nextOccurrence(
        new Date(task.dueAt),
        task.recurrence,
        parseRecurrenceDays(task.recurrenceDays),
      );
      await db
        .update(tasks)
        .set({ dueAt: next.getTime(), updatedAt: Date.now() })
        .where(eq(tasks.id, id));
      return;
    }
  }
  await db.update(tasks).set({ completed, updatedAt: Date.now() }).where(eq(tasks.id, id));
}

/**
 * Set or clear a task's due moment (F9). `dueAt` is epoch ms; `null` clears
 * the schedule, returning the task to unscheduled. Clearing also clears any
 * recurrence (F11) — a recurrence rule without an anchor date is invalid
 * state. Bumps `updatedAt`.
 */
export async function updateTaskSchedule(id: string, dueAt: number | null): Promise<void> {
  const updates: Partial<Task> = { dueAt, updatedAt: Date.now() };
  if (dueAt === null) {
    updates.recurrence = null;
    updates.recurrenceDays = null;
  }
  await db.update(tasks).set(updates).where(eq(tasks.id, id));
}

/**
 * Set, change, or clear a task's recurrence rule (F11), independent of its
 * `dueAt`. Does not validate that `dueAt` is set — that invariant is a
 * UI-level gate (the Repeat control is only reachable once a task is
 * scheduled). Bumps `updatedAt`.
 */
export async function updateTaskRecurrence(
  id: string,
  recurrence: Recurrence | null,
  recurrenceDays: number[] | null,
): Promise<void> {
  await db
    .update(tasks)
    .set({
      recurrence,
      recurrenceDays: serializeRecurrenceDays(recurrenceDays),
      updatedAt: Date.now(),
    })
    .where(eq(tasks.id, id));
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
