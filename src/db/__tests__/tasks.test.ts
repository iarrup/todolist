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
import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { tasks, type Task } from '../schema';

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

function seed(db: Db, text: string, createdAt: number, completed = false): Task {
  const row: Task = { id: randomUUID(), text, completed, createdAt, updatedAt: createdAt };
  db.insert(tasks).values(row).run();
  return row;
}

function listAll(db: Db): Task[] {
  return db.select().from(tasks).orderBy(desc(tasks.createdAt)).all();
}

function updateText(db: Db, id: string, text: string, updatedAt: number): void {
  db.update(tasks).set({ text, updatedAt }).where(eq(tasks.id, id)).run();
}

function setCompleted(db: Db, id: string, completed: boolean, updatedAt: number): void {
  db.update(tasks).set({ completed, updatedAt }).where(eq(tasks.id, id)).run();
}

function removeTask(db: Db, id: string): void {
  db.delete(tasks).where(eq(tasks.id, id)).run();
}

function findById(db: Db, id: string): Task | undefined {
  const [row] = db.select().from(tasks).where(eq(tasks.id, id)).all();
  return row;
}

describe('tasks storage', () => {
  it('round-trips an inserted task, defaulting to incomplete', () => {
    const db = makeDb();
    const written = seed(db, 'buy milk', Date.now());

    const all = listAll(db);

    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(written.id);
    expect(all[0].text).toBe('buy milk');
    expect(all[0].completed).toBe(false);
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

  it('deletes a task', () => {
    const db = makeDb();
    const toDelete = seed(db, 'delete me', 1000);
    seed(db, 'keep me', 2000);

    removeTask(db, toDelete.id);

    const all = listAll(db);
    expect(all).toHaveLength(1);
    expect(all[0].text).toBe('keep me');
  });
});
