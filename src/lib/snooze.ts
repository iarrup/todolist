import type { Task } from '@/db/schema';

/**
 * Snooze presets for an overdue task (F12). Pure — no DB/native import, so
 * both the in-app row action and the fired notification's action buttons
 * (`src/lib/reminders.ts`) compute an identical result by calling the same
 * function.
 */
export const SNOOZE_PRESETS = ['10min', '1hour', 'tomorrow'] as const;
export type SnoozePreset = (typeof SNOOZE_PRESETS)[number];

export const SNOOZE_PRESET_LABELS: Record<SnoozePreset, string> = {
  '10min': '10 min',
  '1hour': '1 hour',
  tomorrow: 'Tomorrow',
};

/**
 * The new due moment for a snooze preset. "10 min"/"1 hour" are relative to
 * `now` (the moment of snoozing), not the task's original due time. "Tomorrow"
 * is the next calendar day at the same time-of-day the task was originally
 * due — computed via `setDate`/`setHours` (mirrors `dayRange.ts`'s idiom),
 * not `+ 24 * 60 * 60 * 1000`, so it's safe across a DST transition.
 */
export function computeSnoozeTime(preset: SnoozePreset, now: Date, originalDueAt: number): Date {
  switch (preset) {
    case '10min': {
      const d = new Date(now);
      d.setMinutes(d.getMinutes() + 10);
      return d;
    }
    case '1hour': {
      const d = new Date(now);
      d.setHours(d.getHours() + 1);
      return d;
    }
    case 'tomorrow': {
      const original = new Date(originalDueAt);
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(original.getHours(), original.getMinutes(), 0, 0);
      return d;
    }
  }
}

/** A task is overdue when it has a due moment in the past and is still open. */
export function isTaskOverdue(task: Pick<Task, 'dueAt' | 'completed'>, now: Date): boolean {
  return task.dueAt != null && task.dueAt < now.getTime() && !task.completed;
}
