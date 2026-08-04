import { and, desc, gte, lte } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import { db } from './client';
import { startOfDay, endOfDay } from './dayRange';
import { notes, type Note } from './schema';

/**
 * Data-access for notes. These are the seams later Phase 1 features build on
 * (F2 capture, F3 Today view, F4 edit, F5 time views). F1 uses only insert +
 * list-for-day to prove the persistence round-trip.
 */

/** Insert a note (id + timestamps generated here) and return the stored row. */
export async function insertNote(text: string): Promise<Note> {
  const now = Date.now();
  const row: Note = {
    id: Crypto.randomUUID(),
    text,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(notes).values(row);
  return row;
}

/**
 * Drizzle query for the notes created on the local calendar day of `date`,
 * newest first. Returned unexecuted so screens can pass it to `useLiveQuery`.
 */
export function notesForDayQuery(date: Date) {
  return db
    .select()
    .from(notes)
    .where(and(gte(notes.createdAt, startOfDay(date)), lte(notes.createdAt, endOfDay(date))))
    .orderBy(desc(notes.createdAt));
}

/** Execute {@link notesForDayQuery} once. */
export async function listNotesForDay(date: Date): Promise<Note[]> {
  return notesForDayQuery(date);
}
