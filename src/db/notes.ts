import { and, desc, eq, gte, lte } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import { db } from './client';
import { startOfDay, endOfDay } from './dayRange';
import { startOfMonth, endOfMonth } from './monthRange';
import { startOfWeek, endOfWeek } from './weekRange';
import { notes, type Note } from './schema';
import type { Granularity } from '@/lib/granularity';

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
 * Drizzle query for notes created within `[start, end]` (inclusive epoch
 * ms), newest first. The one range-query path every granularity builds on.
 * Returned unexecuted so screens can pass it to `useLiveQuery`.
 */
function notesForRangeQuery(start: number, end: number) {
  return db
    .select()
    .from(notes)
    .where(and(gte(notes.createdAt, start), lte(notes.createdAt, end)))
    .orderBy(desc(notes.createdAt));
}

/** Notes created on the local calendar day containing `date`. */
export function notesForDayQuery(date: Date) {
  return notesForRangeQuery(startOfDay(date), endOfDay(date));
}

/** Notes created in the local calendar week (Sunday-start) containing `date`. */
export function notesForWeekQuery(date: Date) {
  return notesForRangeQuery(startOfWeek(date), endOfWeek(date));
}

/** Notes created in the local calendar month containing `date`. */
export function notesForMonthQuery(date: Date) {
  return notesForRangeQuery(startOfMonth(date), endOfMonth(date));
}

/** Dispatches to the right `notesFor*Query` for the current granularity. */
export function notesForGranularityQuery(granularity: Granularity, date: Date) {
  switch (granularity) {
    case 'day':
      return notesForDayQuery(date);
    case 'week':
      return notesForWeekQuery(date);
    case 'month':
      return notesForMonthQuery(date);
  }
}

/** Execute {@link notesForDayQuery} once. */
export async function listNotesForDay(date: Date): Promise<Note[]> {
  return notesForDayQuery(date);
}

/** Update a note's text (and `updatedAt`); `id` and `createdAt` are untouched. */
export async function updateNoteText(id: string, text: string): Promise<void> {
  await db.update(notes).set({ text, updatedAt: Date.now() }).where(eq(notes.id, id));
}
