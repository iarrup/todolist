import { startOfMonth } from '@/db/monthRange';
import type { Task } from '@/db/schema';

import { groupTasksByDay, type TaskDayGroup } from './groupTasksByDay';

export interface TaskMonthGroup {
  /** epoch ms — `startOfMonth` of every task's `dueAt` in this group */
  monthStart: number;
  /** this month's tasks, grouped by day, ascending (see `groupTasksByDay`) */
  days: TaskDayGroup[];
}

/**
 * Buckets scheduled tasks by the local calendar month of their `dueAt`, then
 * by day within each month (via `groupTasksByDay`) — used for Browse mode's
 * Year granularity only (F10). Months and, within each month, days/tasks
 * are all ordered ascending (earliest first), matching `groupTasksByDay`'s
 * chronological rule. Callers must pass only tasks with a non-null `dueAt`.
 */
export function groupTasksByMonthAndDay(tasks: Task[]): TaskMonthGroup[] {
  const byMonth = new Map<number, Task[]>();
  for (const task of tasks) {
    const month = startOfMonth(new Date(task.dueAt as number));
    const bucket = byMonth.get(month);
    if (bucket) bucket.push(task);
    else byMonth.set(month, [task]);
  }
  return Array.from(byMonth, ([monthStart, monthTasks]) => ({
    monthStart,
    days: groupTasksByDay(monthTasks),
  })).sort((a, b) => a.monthStart - b.monthStart);
}
