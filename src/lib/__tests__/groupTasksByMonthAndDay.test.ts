/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';

import type { Task } from '@/db/schema';

import { groupTasksByMonthAndDay } from '../groupTasksByMonthAndDay';

function task(id: string, dueAt: number): Task {
  return {
    id,
    text: id,
    completed: false,
    dueAt,
    recurrence: null,
    recurrenceDays: null,
    createdAt: dueAt,
    updatedAt: dueAt,
  };
}

describe('groupTasksByMonthAndDay', () => {
  it('buckets tasks into one group per calendar month of their dueAt, ascending', () => {
    const jan = new Date(2026, 0, 15, 9, 0, 0).getTime();
    const mar = new Date(2026, 2, 5, 9, 0, 0).getTime();
    const feb = new Date(2026, 1, 20, 9, 0, 0).getTime();

    // Deliberately shuffled input.
    const groups = groupTasksByMonthAndDay([task('mar', mar), task('jan', jan), task('feb', feb)]);

    expect(groups.map((g) => g.monthStart)).toEqual([
      new Date(2026, 0, 1, 0, 0, 0, 0).getTime(),
      new Date(2026, 1, 1, 0, 0, 0, 0).getTime(),
      new Date(2026, 2, 1, 0, 0, 0, 0).getTime(),
    ]);
  });

  it("groups each month's tasks by day, ascending, matching groupTasksByDay", () => {
    const day1 = new Date(2026, 0, 5, 9, 0, 0).getTime();
    const day2Early = new Date(2026, 0, 10, 8, 0, 0).getTime();
    const day2Late = new Date(2026, 0, 10, 17, 0, 0).getTime();

    const groups = groupTasksByMonthAndDay([
      task('d2-late', day2Late),
      task('d1', day1),
      task('d2-early', day2Early),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].days).toHaveLength(2);
    expect(groups[0].days[0].tasks.map((t) => t.id)).toEqual(['d1']);
    expect(groups[0].days[1].tasks.map((t) => t.id)).toEqual(['d2-early', 'd2-late']);
  });

  it('produces no groups for an empty input', () => {
    expect(groupTasksByMonthAndDay([])).toEqual([]);
  });
});
