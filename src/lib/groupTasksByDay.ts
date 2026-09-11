import { startOfDay } from '@/db/dayRange';
import type { Task } from '@/db/schema';

export interface TaskDayGroup {
  /** epoch ms — `startOfDay` of every task's `dueAt` in this group */
  dayStart: number;
  /** tasks for this day, earliest-due-time-first */
  tasks: Task[];
}

/**
 * Buckets scheduled tasks by the local calendar day of their `dueAt` (not
 * `createdAt`) for Browse mode's Week/Month granularities (F10). Unlike
 * `groupNotesByDay`, both the day groups and the tasks within each group are
 * ordered **ascending** (earliest day first, earliest due time first) —
 * Browse mode is a calendar view, not a journal. Callers must pass only
 * tasks that already have a non-null `dueAt` (e.g. from
 * `scheduledTasksForRangeQuery`); a `null` `dueAt` would break the day-key
 * computation.
 */
export function groupTasksByDay(tasks: Task[]): TaskDayGroup[] {
  const byDay = new Map<number, Task[]>();
  for (const task of tasks) {
    const day = startOfDay(new Date(task.dueAt as number));
    const bucket = byDay.get(day);
    if (bucket) bucket.push(task);
    else byDay.set(day, [task]);
  }
  return Array.from(byDay, ([dayStart, dayTasks]) => ({
    dayStart,
    tasks: [...dayTasks].sort((a, b) => (a.dueAt as number) - (b.dueAt as number)),
  })).sort((a, b) => a.dayStart - b.dayStart);
}
