/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';

import type { Note } from '@/db/schema';

import { groupNotesByDay } from '../groupNotesByDay';

function note(id: string, text: string, createdAt: number): Note {
  return { id, text, createdAt, updatedAt: createdAt };
}

describe('groupNotesByDay', () => {
  it('buckets notes into one group per calendar day they were created on', () => {
    const day1 = new Date(2026, 8, 1, 10, 0, 0).getTime();
    const day2 = new Date(2026, 8, 2, 10, 0, 0).getTime();
    const day3 = new Date(2026, 8, 3, 10, 0, 0).getTime();

    const groups = groupNotesByDay([
      note('a', 'a', day1),
      note('b', 'b', day2),
      note('c', 'c', day3),
    ]);

    expect(groups).toHaveLength(3);
  });

  it('orders groups and notes within a group newest-first, regardless of input order', () => {
    const day1 = new Date(2026, 8, 1, 9, 0, 0).getTime();
    const day1Later = new Date(2026, 8, 1, 18, 0, 0).getTime();
    const day2 = new Date(2026, 8, 2, 9, 0, 0).getTime();

    // Deliberately shuffled input.
    const groups = groupNotesByDay([
      note('day1-early', 'early', day1),
      note('day2', 'later day', day2),
      note('day1-late', 'late', day1Later),
    ]);

    expect(groups.map((g) => g.dayStart)).toEqual([
      new Date(2026, 8, 2, 0, 0, 0, 0).getTime(),
      new Date(2026, 8, 1, 0, 0, 0, 0).getTime(),
    ]);
    expect(groups[1].notes.map((n) => n.id)).toEqual(['day1-late', 'day1-early']);
  });

  it('produces no group for a day with zero notes (empty range)', () => {
    expect(groupNotesByDay([])).toEqual([]);
  });
});
