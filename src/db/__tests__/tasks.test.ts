/**
 * @jest-environment node
 *
 * Headless storage smoke test for tasks (Phase 2, F7). Mirrors
 * notes.test.ts's pattern: a Drizzle instance over an in-memory
 * better-sqlite3 using the SAME schema and the SAME generated migrations the
 * app ships, since the real `db` singleton can't be imported headlessly (it
 * pulls in expo-sqlite).
 */
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

import { describe, expect, it } from '@jest/globals';
import Database from 'better-sqlite3';
import { and, asc, desc, eq, gte, isNotNull, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { endOfDay, startOfDay } from '../dayRange';
import { endOfMonth, startOfMonth } from '../monthRange';
import { endOfWeek, startOfWeek } from '../weekRange';
import { endOfYear, startOfYear } from '../yearRange';
import { tasks, type Task } from '../schema';
import { nextOccurrence } from '@/lib/nextOccurrence';
import { parseRecurrenceDays, serializeRecurrenceDays, type Recurrence } from '@/lib/recurrence';
import type { TaskGranularity } from '@/lib/taskGranularity';

const DRIZZLE_DIR = path.join(__dirname, '../../../drizzle');

/** Apply every generated migration to a fresh in-memory DB. */
function makeDb() {
  const sqlite = new Database(':memory:');
  const files = fs
    .readdirSync(DRIZZLE_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sqlText = fs.readFileSync(path.join(DRIZZLE_DIR, file), 'utf8');
    for (const stmt of sqlText.split('--> statement-breakpoint')) {
      const trimmed = stmt.trim();
      if (trimmed) sqlite.exec(trimmed);
    }
  }
  return drizzle(sqlite, { schema: { tasks } });
}

type Db = ReturnType<typeof makeDb>;

function seed(
  db: Db,
  text: string,
  createdAt: number,
  completed = false,
  dueAt: number | null = null,
  recurrence: Recurrence | null = null,
  recurrenceDays: number[] | null = null,
): Task {
  const row: Task = {
    id: randomUUID(),
    text,
    completed,
    dueAt,
    recurrence,
    recurrenceDays: serializeRecurrenceDays(recurrenceDays),
    createdAt,
    updatedAt: createdAt,
  };
  db.insert(tasks).values(row).run();
  return row;
}

function listAll(db: Db): Task[] {
  return db.select().from(tasks).orderBy(desc(tasks.createdAt)).all();
}

function listOpen(db: Db): Task[] {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.completed, false))
    .orderBy(desc(tasks.createdAt))
    .all();
}

function updateText(db: Db, id: string, text: string, updatedAt: number): void {
  db.update(tasks).set({ text, updatedAt }).where(eq(tasks.id, id)).run();
}

/** Mirrors db/tasks.ts's setTaskCompleted, including its F11 recurrence-aware branch. */
function setCompleted(db: Db, id: string, completed: boolean, updatedAt: number): void {
  if (completed) {
    const task = findById(db, id);
    if (task?.recurrence != null && task.dueAt != null) {
      const next = nextOccurrence(
        new Date(task.dueAt),
        task.recurrence,
        parseRecurrenceDays(task.recurrenceDays),
      );
      db.update(tasks).set({ dueAt: next.getTime(), updatedAt }).where(eq(tasks.id, id)).run();
      return;
    }
  }
  db.update(tasks).set({ completed, updatedAt }).where(eq(tasks.id, id)).run();
}

/** Mirrors db/tasks.ts's updateTaskSchedule, including clearing recurrence when dueAt clears. */
function setSchedule(db: Db, id: string, dueAt: number | null, updatedAt: number): void {
  const updates: Partial<Task> = { dueAt, updatedAt };
  if (dueAt === null) {
    updates.recurrence = null;
    updates.recurrenceDays = null;
  }
  db.update(tasks).set(updates).where(eq(tasks.id, id)).run();
}

/** Mirrors db/tasks.ts's updateTaskRecurrence. */
function setRecurrence(
  db: Db,
  id: string,
  recurrence: Recurrence | null,
  recurrenceDays: number[] | null,
  updatedAt: number,
): void {
  db.update(tasks)
    .set({ recurrence, recurrenceDays: serializeRecurrenceDays(recurrenceDays), updatedAt })
    .where(eq(tasks.id, id))
    .run();
}

function removeTask(db: Db, id: string): void {
  db.delete(tasks).where(eq(tasks.id, id)).run();
}

function findById(db: Db, id: string): Task | undefined {
  const [row] = db.select().from(tasks).where(eq(tasks.id, id)).all();
  return row;
}

function scheduledForRange(db: Db, start: number, end: number): Task[] {
  return db
    .select()
    .from(tasks)
    .where(and(isNotNull(tasks.dueAt), gte(tasks.dueAt, start), lte(tasks.dueAt, end)))
    .orderBy(asc(tasks.dueAt))
    .all();
}

function scheduledForGranularity(db: Db, granularity: TaskGranularity, date: Date): Task[] {
  switch (granularity) {
    case 'day':
      return scheduledForRange(db, startOfDay(date), endOfDay(date));
    case 'week':
      return scheduledForRange(db, startOfWeek(date), endOfWeek(date));
    case 'month':
      return scheduledForRange(db, startOfMonth(date), endOfMonth(date));
    case 'year':
      return scheduledForRange(db, startOfYear(date), endOfYear(date));
  }
}

describe('tasks storage', () => {
  it('round-trips an inserted task, defaulting to incomplete and unscheduled', () => {
    const db = makeDb();
    const written = seed(db, 'buy milk', Date.now());

    const all = listAll(db);

    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(written.id);
    expect(all[0].text).toBe('buy milk');
    expect(all[0].completed).toBe(false);
    expect(all[0].dueAt).toBeNull();
  });

  it('round-trips an inserted task with a due date (F9)', () => {
    const db = makeDb();
    const dueAt = new Date(2026, 8, 20, 15, 30).getTime();
    const written = seed(db, 'call dentist', Date.now(), false, dueAt);

    const found = findById(db, written.id);
    expect(found?.dueAt).toBe(dueAt);
  });

  it('lists all tasks newest-first, unfiltered by completed state', () => {
    const db = makeDb();
    seed(db, 'older, completed', 1000, true);
    seed(db, 'newer, open', 2000, false);

    const all = listAll(db);

    expect(all).toHaveLength(2);
    expect(all[0].text).toBe('newer, open');
    expect(all[1].text).toBe('older, completed');
  });

  it('lists only open tasks, newest-first, while listAll still shows completed ones too (F8)', () => {
    const db = makeDb();
    seed(db, 'older, completed', 1000, true);
    seed(db, 'newer, open', 2000, false);
    seed(db, 'newest, also completed', 3000, true);

    const open = listOpen(db);
    expect(open).toHaveLength(1);
    expect(open[0].text).toBe('newer, open');

    const all = listAll(db);
    expect(all).toHaveLength(3);
  });

  it('updates a task’s text and updatedAt, leaving id, createdAt, and completed unchanged', () => {
    const db = makeDb();
    const original = seed(db, 'before', 1000, true);

    updateText(db, original.id, 'after', 5000);

    const updated = findById(db, original.id);
    expect(updated?.text).toBe('after');
    expect(updated?.updatedAt).toBe(5000);
    expect(updated?.id).toBe(original.id);
    expect(updated?.createdAt).toBe(original.createdAt);
    expect(updated?.completed).toBe(true);
  });

  it('toggles completed and updatedAt, leaving text unchanged', () => {
    const db = makeDb();
    const original = seed(db, 'walk the dog', 1000, false);

    setCompleted(db, original.id, true, 5000);

    const updated = findById(db, original.id);
    expect(updated?.completed).toBe(true);
    expect(updated?.updatedAt).toBe(5000);
    expect(updated?.text).toBe('walk the dog');
  });

  it('sets a due date on a previously unscheduled task, bumping updatedAt (F9)', () => {
    const db = makeDb();
    const original = seed(db, 'renew passport', 1000);
    const dueAt = new Date(2026, 9, 1, 9, 0).getTime();

    setSchedule(db, original.id, dueAt, 5000);

    const updated = findById(db, original.id);
    expect(updated?.dueAt).toBe(dueAt);
    expect(updated?.updatedAt).toBe(5000);
    expect(updated?.text).toBe('renew passport');
  });

  it('changes an existing due date to a new one (F9)', () => {
    const db = makeDb();
    const oldDueAt = new Date(2026, 8, 20).getTime();
    const original = seed(db, 'renew passport', 1000, false, oldDueAt);
    const newDueAt = new Date(2026, 9, 1).getTime();

    setSchedule(db, original.id, newDueAt, 5000);

    expect(findById(db, original.id)?.dueAt).toBe(newDueAt);
  });

  it('clears a due date back to unscheduled (F9)', () => {
    const db = makeDb();
    const dueAt = new Date(2026, 8, 20).getTime();
    const original = seed(db, 'renew passport', 1000, false, dueAt);

    setSchedule(db, original.id, null, 5000);

    const updated = findById(db, original.id);
    expect(updated?.dueAt).toBeNull();
    expect(updated?.updatedAt).toBe(5000);
  });

  it('accepts a past due date without error (F9)', () => {
    const db = makeDb();
    const pastDueAt = new Date(2020, 0, 1).getTime();

    const written = seed(db, 'overdue thing', 1000, false, pastDueAt);

    expect(findById(db, written.id)?.dueAt).toBe(pastDueAt);
  });

  it('deletes a task', () => {
    const db = makeDb();
    const toDelete = seed(db, 'delete me', 1000);
    seed(db, 'keep me', 2000);

    removeTask(db, toDelete.id);

    const all = listAll(db);
    expect(all).toHaveLength(1);
    expect(all[0].text).toBe('keep me');
  });

  it('excludes unscheduled tasks from a scheduled-range query (F10)', () => {
    const db = makeDb();
    const dueAt = new Date(2026, 8, 10, 9, 0).getTime();
    seed(db, 'scheduled', 1000, false, dueAt);
    seed(db, 'unscheduled', 2000);

    const scoped = scheduledForRange(
      db,
      startOfDay(new Date(2026, 8, 10)),
      endOfDay(new Date(2026, 8, 10)),
    );

    expect(scoped).toHaveLength(1);
    expect(scoped[0].text).toBe('scheduled');
  });

  it('includes completed tasks in a scheduled-range query, unlike listOpen (F10)', () => {
    const db = makeDb();
    const dueAt = new Date(2026, 8, 10, 9, 0).getTime();
    seed(db, 'done but scheduled', 1000, true, dueAt);

    const scoped = scheduledForRange(
      db,
      startOfDay(new Date(2026, 8, 10)),
      endOfDay(new Date(2026, 8, 10)),
    );

    expect(scoped).toHaveLength(1);
    expect(scoped[0].completed).toBe(true);
  });

  it('orders a scheduled-range query ascending by due time', () => {
    const db = makeDb();
    const later = new Date(2026, 8, 10, 17, 0).getTime();
    const earlier = new Date(2026, 8, 10, 9, 0).getTime();
    seed(db, 'later', 1000, false, later);
    seed(db, 'earlier', 2000, false, earlier);

    const scoped = scheduledForRange(
      db,
      startOfDay(new Date(2026, 8, 10)),
      endOfDay(new Date(2026, 8, 10)),
    );

    expect(scoped.map((t) => t.text)).toEqual(['earlier', 'later']);
  });

  it('scopes the day/week/month/year Browse granularities to the matching dueAt range (F10)', () => {
    const db = makeDb();
    const inDay = new Date(2026, 8, 9, 9, 0).getTime(); // Wed, Sep 9
    const inWeekNotDay = new Date(2026, 8, 6, 9, 0).getTime(); // Sun, same week
    const inMonthNotWeek = new Date(2026, 8, 20, 9, 0).getTime(); // still Sep
    const inYearNotMonth = new Date(2026, 0, 5, 9, 0).getTime(); // Jan, same year
    const nextYear = new Date(2027, 0, 5, 9, 0).getTime();
    seed(db, 'in-day', 1, false, inDay);
    seed(db, 'in-week', 2, false, inWeekNotDay);
    seed(db, 'in-month', 3, false, inMonthNotWeek);
    seed(db, 'in-year', 4, false, inYearNotMonth);
    seed(db, 'next-year', 5, false, nextYear);

    const anchor = new Date(2026, 8, 9);
    expect(scheduledForGranularity(db, 'day', anchor).map((t) => t.text)).toEqual(['in-day']);
    expect(
      scheduledForGranularity(db, 'week', anchor)
        .map((t) => t.text)
        .sort(),
    ).toEqual(['in-day', 'in-week'].sort());
    expect(
      scheduledForGranularity(db, 'month', anchor)
        .map((t) => t.text)
        .sort(),
    ).toEqual(['in-day', 'in-week', 'in-month'].sort());
    expect(
      scheduledForGranularity(db, 'year', anchor)
        .map((t) => t.text)
        .sort(),
    ).toEqual(['in-day', 'in-week', 'in-month', 'in-year'].sort());
  });

  it('round-trips an inserted task with a recurrence rule (F11)', () => {
    const db = makeDb();
    const dueAt = new Date(2026, 8, 20, 9, 0).getTime();
    const written = seed(
      db,
      'take out trash',
      Date.now(),
      false,
      dueAt,
      'specific-days',
      [1, 3, 5],
    );

    const found = findById(db, written.id);
    expect(found?.recurrence).toBe('specific-days');
    expect(found?.recurrenceDays).toBe('1,3,5');
  });

  it('completing a daily recurring task rolls dueAt forward one day and stays open (F11)', () => {
    const db = makeDb();
    const dueAt = new Date(2026, 8, 9, 9, 0).getTime(); // Wed Sep 9, 9:00
    const original = seed(db, 'water plants', 1000, false, dueAt, 'daily');

    setCompleted(db, original.id, true, 5000);

    const updated = findById(db, original.id);
    expect(updated?.completed).toBe(false);
    expect(updated?.dueAt).toBe(new Date(2026, 8, 10, 9, 0).getTime());
    expect(updated?.updatedAt).toBe(5000);
  });

  it('completing a monthly recurring task anchored on the 31st clamps into a 30-day month (F11)', () => {
    const db = makeDb();
    const dueAt = new Date(2026, 7, 31, 8, 0).getTime(); // Aug 31, 8:00
    const original = seed(db, 'pay rent', 1000, false, dueAt, 'monthly');

    setCompleted(db, original.id, true, 5000);

    const updated = findById(db, original.id);
    expect(updated?.dueAt).toBe(new Date(2026, 8, 30, 8, 0).getTime()); // Sep 30
  });

  it('completing a specific-days recurring task rolls to the next matching weekday, wrapping the week (F11)', () => {
    const db = makeDb();
    const friday = new Date(2026, 8, 11, 10, 0).getTime(); // Fri Sep 11
    const original = seed(db, 'gym', 1000, false, friday, 'specific-days', [1, 3, 5]); // Mon/Wed/Fri

    setCompleted(db, original.id, true, 5000);

    const updated = findById(db, original.id);
    expect(updated?.dueAt).toBe(new Date(2026, 8, 14, 10, 0).getTime()); // next Mon, Sep 14
  });

  it('completing a non-recurring task is unaffected by F11 (regression)', () => {
    const db = makeDb();
    const dueAt = new Date(2026, 8, 9, 9, 0).getTime();
    const original = seed(db, 'one-off', 1000, false, dueAt);

    setCompleted(db, original.id, true, 5000);

    const updated = findById(db, original.id);
    expect(updated?.completed).toBe(true);
    expect(updated?.dueAt).toBe(dueAt);
  });

  it('completing a task with recurrence set but no dueAt (invariant violation) completes normally instead of throwing (F11)', () => {
    const db = makeDb();
    const original = seed(db, 'malformed', 1000, false, null, 'daily');

    expect(() => setCompleted(db, original.id, true, 5000)).not.toThrow();

    const updated = findById(db, original.id);
    expect(updated?.completed).toBe(true);
    expect(updated?.dueAt).toBeNull();
  });

  it('clearing a schedule also clears recurrence (F11)', () => {
    const db = makeDb();
    const dueAt = new Date(2026, 8, 9, 9, 0).getTime();
    const original = seed(db, 'daily reminder', 1000, false, dueAt, 'daily');

    setSchedule(db, original.id, null, 5000);

    const updated = findById(db, original.id);
    expect(updated?.dueAt).toBeNull();
    expect(updated?.recurrence).toBeNull();
    expect(updated?.recurrenceDays).toBeNull();
  });

  it('setRecurrence sets, changes, and clears a task’s recurrence independent of dueAt (F11)', () => {
    const db = makeDb();
    const dueAt = new Date(2026, 8, 9, 9, 0).getTime();
    const original = seed(db, 'standup', 1000, false, dueAt);

    setRecurrence(db, original.id, 'weekdays', null, 3000);
    expect(findById(db, original.id)?.recurrence).toBe('weekdays');
    expect(findById(db, original.id)?.dueAt).toBe(dueAt);

    setRecurrence(db, original.id, 'specific-days', [2, 4], 4000);
    expect(findById(db, original.id)?.recurrence).toBe('specific-days');
    expect(findById(db, original.id)?.recurrenceDays).toBe('2,4');

    setRecurrence(db, original.id, null, null, 5000);
    expect(findById(db, original.id)?.recurrence).toBeNull();
    expect(findById(db, original.id)?.dueAt).toBe(dueAt);
  });
});
