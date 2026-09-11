import * as Notifications from 'expo-notifications';

import type { Task } from '@/db/schema';
import type { SnoozePreset } from '@/lib/snooze';

/**
 * Thin wrapper around `expo-notifications` (F12) — mirrors `pickDateTime.ts`'s
 * "wrap the imperative native API in a clean async function" shape. Reminder
 * scheduling is driven reactively: `reconcileTaskReminders` is the one entry
 * point, called from `_layout.tsx` (once, at cold launch) and `tasks.tsx`
 * (on every live-query change) with the current open-tasks list — it derives
 * the correct scheduled/cancelled state from scratch each time rather than
 * tracking incremental per-action diffs.
 */

export const TASK_REMINDER_CATEGORY = 'task_reminder';

export const SNOOZE_ACTION_TO_PRESET: Record<string, SnoozePreset> = {
  snooze_10min: '10min',
  snooze_1hour: '1hour',
  snooze_tomorrow: 'tomorrow',
};

/**
 * Called once at app startup (`_layout.tsx`). Sets how a reminder displays
 * while the app is in the foreground — SDK 57 suppresses foreground alerts
 * unless a handler is explicitly set — and registers the fired
 * notification's three snooze action buttons.
 */
export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  await Notifications.setNotificationCategoryAsync(TASK_REMINDER_CATEGORY, [
    { identifier: 'snooze_10min', buttonTitle: 'Snooze 10 min' },
    { identifier: 'snooze_1hour', buttonTitle: 'Snooze 1 hour' },
    { identifier: 'snooze_tomorrow', buttonTitle: 'Tomorrow' },
  ]);
}

/**
 * Checks (and requests, once) notification permission. Never re-prompts a
 * prior denial — Android doesn't show a second system dialog after a denial
 * anyway, but this also avoids a redundant native round-trip on every
 * reconciliation pass.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (current.status === 'denied') return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

/**
 * Reconciles all task reminders against the given open-tasks list: computes
 * the target set (open tasks with a future `dueAt`); cancels any currently
 * scheduled reminder no longer in that set (covers completed, deleted,
 * unscheduled, or rolled-past-due tasks — cancelling never needs
 * permission); and, only when there's at least one target task to actually
 * schedule, checks/requests permission (returning `false` if denied — the
 * caller shows the in-app "reminders are off" notice) and cancels-then-
 * reschedules every target. Permission is deliberately not requested when
 * there's nothing to schedule — this is what keeps the request lazy ("at
 * first schedule," not at every cold launch/reconciliation pass regardless
 * of whether the user has scheduled anything). Always cancels before
 * scheduling rather than trusting a reused `identifier` to silently
 * overwrite a pending notification — that behavior isn't documented by
 * `expo-notifications`.
 */
export async function reconcileTaskReminders(openTasks: Task[]): Promise<boolean> {
  const now = Date.now();
  const targets = openTasks.filter(
    (task): task is Task & { dueAt: number } =>
      task.dueAt != null && task.dueAt > now && !task.completed,
  );
  const targetIds = new Set(targets.map((task) => task.id));

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => !targetIds.has(notification.identifier))
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier),
      ),
  );

  if (targets.length === 0) return true;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await Promise.all(targets.map(scheduleTaskReminder));
  return true;
}

async function scheduleTaskReminder(task: Task & { dueAt: number }): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(task.id);
  await Notifications.scheduleNotificationAsync({
    identifier: task.id,
    content: {
      body: task.text,
      data: { taskId: task.id, dueAt: task.dueAt },
      categoryIdentifier: TASK_REMINDER_CATEGORY,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(task.dueAt),
    },
  });
}
