import { startOfDay } from '@/db/dayRange';
import type { Note } from '@/db/schema';

export interface NoteDayGroup {
  /** epoch ms — `startOfDay` of every note in this group */
  dayStart: number;
  /** notes for this day, newest-first */
  notes: Note[];
}

/**
 * Buckets notes by local calendar day for the week/month grouped view (F5).
 * Groups and the notes within each group are both explicitly sorted
 * newest-first (not assumed pre-sorted), so this is independently correct
 * and testable. A day with zero notes simply never produces a group.
 */
export function groupNotesByDay(notes: Note[]): NoteDayGroup[] {
  const byDay = new Map<number, Note[]>();
  for (const note of notes) {
    const day = startOfDay(new Date(note.createdAt));
    const bucket = byDay.get(day);
    if (bucket) bucket.push(note);
    else byDay.set(day, [note]);
  }
  return Array.from(byDay, ([dayStart, dayNotes]) => ({
    dayStart,
    notes: [...dayNotes].sort((a, b) => b.createdAt - a.createdAt),
  })).sort((a, b) => b.dayStart - a.dayStart);
}
