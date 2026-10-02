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
import { endOfMonth, startOfMonth } from '../monthRange';
import { endOfWeek, startOfWeek } from '../weekRange';
import { isLive } from '../liveFilter';
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
  const row: Note = { id: randomUUID(), text, createdAt, updatedAt: createdAt, deletedAt: null };
  db.insert(notes).values(row).run();
  return row;
}

function listForDay(db: Db, date: Date): Note[] {
  return db
    .select()
    .from(notes)
    .where(
      and(
        isLive(notes),
        gte(notes.createdAt, startOfDay(date)),
        lte(notes.createdAt, endOfDay(date)),
      ),
    )
    .orderBy(desc(notes.createdAt))
    .all();
}

function listForWeek(db: Db, date: Date): Note[] {
  return db
    .select()
    .from(notes)
    .where(
      and(
        isLive(notes),
        gte(notes.createdAt, startOfWeek(date)),
        lte(notes.createdAt, endOfWeek(date)),
      ),
    )
    .orderBy(desc(notes.createdAt))
    .all();
}

function listForMonth(db: Db, date: Date): Note[] {
  return db
    .select()
    .from(notes)
    .where(
      and(
        isLive(notes),
        gte(notes.createdAt, startOfMonth(date)),
        lte(notes.createdAt, endOfMonth(date)),
      ),
    )
    .orderBy(desc(notes.createdAt))
    .all();
}

function updateText(db: Db, id: string, text: string, updatedAt: number): void {
  db.update(notes)
    .set({ text, updatedAt })
    .where(and(eq(notes.id, id), isLive(notes)))
    .run();
}

/** Mirrors db/notes.ts's deleteNote (F17 soft delete). */
function deleteById(db: Db, id: string, now = Date.now()): void {
  db.update(notes)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(notes.id, id), isLive(notes)))
    .run();
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

  it('scopes the week view to notes within the Sunday-start calendar week', () => {
    const db = makeDb();
    // Sat, Sep 5, 2026 (last day of the prior week) vs Sun, Sep 6, 2026 (first
    // day of the week containing Sep 9).
    const saturdayBeforeWeek = new Date(2026, 8, 5, 23, 0, 0).getTime();
    const sundayInWeek = new Date(2026, 8, 6, 0, 0, 0).getTime();
    seed(db, 'just before the week', saturdayBeforeWeek);
    seed(db, 'first day of the week', sundayInWeek);

    const week = listForWeek(db, new Date(2026, 8, 9)); // Wed, Sep 9

    expect(week).toHaveLength(1);
    expect(week[0].text).toBe('first day of the week');
  });

  it('scopes the month view to notes within the calendar month', () => {
    const db = makeDb();
    const lastDayOfAugust = new Date(2026, 7, 31, 23, 0, 0).getTime();
    const firstDayOfSeptember = new Date(2026, 8, 1, 0, 0, 0).getTime();
    seed(db, 'just before the month', lastDayOfAugust);
    seed(db, 'first day of the month', firstDayOfSeptember);

    const month = listForMonth(db, new Date(2026, 8, 15));

    expect(month).toHaveLength(1);
    expect(month[0].text).toBe('first day of the month');
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

  it('soft-deletes only the target note; an unknown id is a no-op', () => {
    const db = makeDb();
    const keep = seed(db, 'keep', 1000);
    const drop = seed(db, 'drop', 2000);
    const day = new Date(2000);

    deleteById(db, drop.id, 3000);
    expect(listForDay(db, day).map((n) => n.id)).toEqual([keep.id]);

    deleteById(db, 'does-not-exist');
    expect(db.select().from(notes).all()).toHaveLength(2);
  });

  describe('soft delete (F17)', () => {
    it('hides a deleted note from day, week, and month queries (AC1)', () => {
      const db = makeDb();
      const date = new Date(2026, 8, 10, 12, 0);
      const gone = seed(db, 'gone', date.getTime());
      const kept = seed(db, 'kept', date.getTime() + 1000);

      deleteById(db, gone.id, date.getTime() + 2000);

      expect(listForDay(db, date).map((n) => n.id)).toEqual([kept.id]);
      expect(listForWeek(db, date).map((n) => n.id)).toEqual([kept.id]);
      expect(listForMonth(db, date).map((n) => n.id)).toEqual([kept.id]);
    });

    it('keeps the row, with deletedAt equal to updatedAt (AC3)', () => {
      const db = makeDb();
      const note = seed(db, 'bye', 1000);

      deleteById(db, note.id, 7000);

      const row = findById(db, note.id);
      expect(row).toBeDefined();
      expect(row.deletedAt).toBe(7000);
      expect(row.updatedAt).toBe(7000);
      expect(row.text).toBe('bye');
    });

    it('does not let an edit resurrect or alter a deleted note (AC5)', () => {
      const db = makeDb();
      const note = seed(db, 'before', 1000);
      deleteById(db, note.id, 2000);

      updateText(db, note.id, 'after', 9000);

      const row = findById(db, note.id);
      expect(row.text).toBe('before');
      expect(row.deletedAt).toBe(2000);
      expect(row.updatedAt).toBe(2000);
    });

    it('is idempotent: a second delete does not advance updatedAt (AC6)', () => {
      const db = makeDb();
      const note = seed(db, 'twice', 1000);

      deleteById(db, note.id, 2000);
      deleteById(db, note.id, 8000);

      const row = findById(db, note.id);
      expect(row.deletedAt).toBe(2000);
      expect(row.updatedAt).toBe(2000);
    });

    it('migrates existing rows as not-deleted, fields unchanged (AC4)', () => {
      const sqlite = new Database(':memory:');
      const files = fs
        .readdirSync(DRIZZLE_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();
      const apply = (file: string) => {
        const sqlText = fs.readFileSync(path.join(DRIZZLE_DIR, file), 'utf8');
        for (const stmt of sqlText.split('--> statement-breakpoint')) {
          if (stmt.trim()) sqlite.exec(stmt.trim());
        }
      };
      const f17 = files.findIndex((f) => f.startsWith('0004'));
      files.slice(0, f17).forEach(apply); // the F14-era schema
      sqlite
        .prepare('INSERT INTO notes (id, text, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .run('n1', 'pre-existing', 1000, 1500);

      apply(files[f17]);

      const row = sqlite.prepare('SELECT * FROM notes WHERE id = ?').get('n1') as Record<
        string,
        unknown
      >;
      expect(row).toMatchObject({
        id: 'n1',
        text: 'pre-existing',
        created_at: 1000,
        updated_at: 1500,
        deleted_at: null,
      });
    });
  });
});
