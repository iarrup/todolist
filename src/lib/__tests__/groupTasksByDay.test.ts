/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';

import type { Task } from '@/db/schema';

import { groupTasksByDay } from '../groupTasksByDay';

function task(id: string, dueAt: number, completed = false): Task {
  return { id, text: id, completed, dueAt, createdAt: dueAt, updatedAt: dueAt };
}

describe('groupTasksByDay', () => {
  it('buckets tasks into one group per calendar day of their dueAt', () => {
    const day1 = new Date(2026, 8, 1, 10, 0, 0).getTime();
    const day2 = new Date(2026, 8, 2, 10, 0, 0).getTime();
    const day3 = new Date(2026, 8, 3, 10, 0, 0).getTime();

    const groups = groupTasksByDay([task('a', day1), task('b', day2), task('c', day3)]);

    expect(groups).toHaveLength(3);
  });

  it('orders groups ascending by day and tasks within a group ascending by due time', () => {
    const day1Early = new Date(2026, 8, 1, 9, 0, 0).getTime();
    const day1Late = new Date(2026, 8, 1, 18, 0, 0).getTime();
    const day2 = new Date(2026, 8, 2, 9, 0, 0).getTime();

    // Deliberately shuffled input.
    const groups = groupTasksByDay([
      task('day2', day2),
      task('day1-late', day1Late),
      task('day1-early', day1Early),
    ]);

    expect(groups.map((g) => g.dayStart)).toEqual([
      new Date(2026, 8, 1, 0, 0, 0, 0).getTime(),
      new Date(2026, 8, 2, 0, 0, 0, 0).getTime(),
    ]);
    expect(groups[0].tasks.map((t) => t.id)).toEqual(['day1-early', 'day1-late']);
  });

  it('includes completed tasks in their day group', () => {
    const day1 = new Date(2026, 8, 1, 9, 0, 0).getTime();
    const groups = groupTasksByDay([task('done', day1, true)]);
    expect(groups[0].tasks[0].completed).toBe(true);
  });

  it('produces no groups for an empty input', () => {
    expect(groupTasksByDay([])).toEqual([]);
  });
});
