/**
 * @jest-environment node
 *
 * Headless storage smoke test. Proves the persistence layer round-trips and
 * that the day filter works, without the native expo-sqlite runtime: it builds
 * a Drizzle instance over an in-memory better-sqlite3 using the SAME schema and
 * the SAME generated migration the app ships.
 */
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

import { describe, expect, it } from '@jest/globals';
import Database from 'better-sqlite3';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { endOfDay, startOfDay } from '../dayRange';
import { notes, type Note } from '../schema';

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
  return drizzle(sqlite, { schema: { notes } });
}

type Db = ReturnType<typeof makeDb>;

function seed(db: Db, text: string, createdAt: number): Note {
  const row: Note = { id: randomUUID(), text, createdAt, updatedAt: createdAt };
  db.insert(notes).values(row).run();
  return row;
}

function listForDay(db: Db, date: Date): Note[] {
  return db
    .select()
    .from(notes)
    .where(and(gte(notes.createdAt, startOfDay(date)), lte(notes.createdAt, endOfDay(date))))
    .orderBy(desc(notes.createdAt))
    .all();
}

function updateText(db: Db, id: string, text: string, updatedAt: number): void {
  db.update(notes).set({ text, updatedAt }).where(eq(notes.id, id)).run();
}

function findById(db: Db, id: string): Note {
  const [row] = db.select().from(notes).where(eq(notes.id, id)).all();
  return row;
}

describe('notes storage', () => {
  it('round-trips an inserted note', () => {
    const db = makeDb();
    const written = seed(db, 'hello world', Date.now());

    const today = listForDay(db, new Date());

    expect(today).toHaveLength(1);
    expect(today[0].id).toBe(written.id);
    expect(today[0].text).toBe('hello world');
  });

  it('scopes the day view to the given day', () => {
    const db = makeDb();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    seed(db, 'old note', yesterday.getTime());
    seed(db, 'todays note', Date.now());

    const today = listForDay(db, new Date());

    expect(today).toHaveLength(1);
    expect(today[0].text).toBe('todays note');
  });

  it('updates a note’s text and updatedAt, leaving id and createdAt unchanged', () => {
    const db = makeDb();
    const original = seed(db, 'before', 1000);

    updateText(db, original.id, 'after', 5000);

    const updated = findById(db, original.id);
    expect(updated.text).toBe('after');
    expect(updated.updatedAt).toBe(5000);
    expect(updated.id).toBe(original.id);
    expect(updated.createdAt).toBe(original.createdAt);
  });
});
