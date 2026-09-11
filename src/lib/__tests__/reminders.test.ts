/**
 * @jest-environment node
 *
 * Headless test for reminders.ts, mocking expo-notifications entirely (no
 * native implementation under Jest) — same precedent as the
 * expo-speech-recognition mock in NoteComposer.test.tsx: every export is a
 * plain jest.fn().
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as Notifications from 'expo-notifications';

import {
  configureNotifications,
  reconcileTaskReminders,
  requestNotificationPermission,
  TASK_REMINDER_CATEGORY,
} from '../reminders';
import type { Task } from '@/db/schema';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

interface PermissionResult {
  status: 'granted' | 'denied' | 'undetermined';
}
interface ScheduledNotification {
  identifier: string;
  content: Record<string, unknown>;
  trigger: Record<string, unknown>;
}

const mocked = Notifications as unknown as {
  setNotificationHandler: jest.Mock<() => void>;
  setNotificationCategoryAsync: jest.Mock<() => Promise<void>>;
  getPermissionsAsync: jest.Mock<() => Promise<PermissionResult>>;
  requestPermissionsAsync: jest.Mock<() => Promise<PermissionResult>>;
  getAllScheduledNotificationsAsync: jest.Mock<() => Promise<ScheduledNotification[]>>;
  scheduleNotificationAsync: jest.Mock<() => Promise<string>>;
  cancelScheduledNotificationAsync: jest.Mock<() => Promise<void>>;
};

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    text: 'Buy milk',
    completed: false,
    dueAt: null,
    recurrence: null,
    recurrenceDays: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('configureNotifications', () => {
  it('sets the foreground handler and registers the 3 snooze actions', async () => {
    await configureNotifications();
    expect(mocked.setNotificationHandler).toHaveBeenCalledTimes(1);
    expect(mocked.setNotificationCategoryAsync).toHaveBeenCalledWith(
      TASK_REMINDER_CATEGORY,
      expect.arrayContaining([
        expect.objectContaining({ identifier: 'snooze_10min' }),
        expect.objectContaining({ identifier: 'snooze_1hour' }),
        expect.objectContaining({ identifier: 'snooze_tomorrow' }),
      ]),
    );
  });
});

describe('requestNotificationPermission', () => {
  it('returns true and does not prompt when already granted', async () => {
    mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    const result = await requestNotificationPermission();
    expect(result).toBe(true);
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('returns false and does not re-prompt when already denied', async () => {
    mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('prompts once when undetermined, returning the prompt result', async () => {
    mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
    mocked.requestPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    const result = await requestNotificationPermission();
    expect(result).toBe(true);
    expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});

describe('reconcileTaskReminders', () => {
  it('never checks/requests permission when there is nothing to schedule (lazy, not at every cold launch)', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValueOnce([]);
    const result = await reconcileTaskReminders([makeTask({ dueAt: null })]);
    expect(result).toBe(true);
    expect(mocked.getPermissionsAsync).not.toHaveBeenCalled();
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('returns false and schedules nothing when permission is denied, but still cancels stale reminders', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
      { identifier: 'stale-task', content: {}, trigger: {} },
    ]);
    mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    const result = await reconcileTaskReminders([makeTask({ dueAt: Date.now() + 100000 })]);
    expect(result).toBe(false);
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith('stale-task');
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('cancels a scheduled notification whose task is no longer in the target set', async () => {
    mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    mocked.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
      { identifier: 'stale-task', content: {}, trigger: {} },
    ]);

    const result = await reconcileTaskReminders([]);

    expect(result).toBe(true);
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith('stale-task');
  });

  it('cancels-then-reschedules every open task with a future dueAt', async () => {
    mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    mocked.getAllScheduledNotificationsAsync.mockResolvedValueOnce([]);
    const dueAt = Date.now() + 60 * 60 * 1000;
    const task = makeTask({ id: 'task-2', text: 'Call mom', dueAt });

    const result = await reconcileTaskReminders([task]);

    expect(result).toBe(true);
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith('task-2');
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'task-2',
        content: expect.objectContaining({
          body: 'Call mom',
          data: { taskId: 'task-2', dueAt },
          categoryIdentifier: TASK_REMINDER_CATEGORY,
        }),
        trigger: { type: 'date', date: new Date(dueAt) },
      }),
    );
  });

  it('excludes unscheduled and past-due tasks from the target set', async () => {
    mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    mocked.getAllScheduledNotificationsAsync.mockResolvedValueOnce([]);
    const tasks = [
      makeTask({ id: 'unscheduled', dueAt: null }),
      makeTask({ id: 'past-due', dueAt: Date.now() - 1000 }),
      makeTask({ id: 'completed', dueAt: Date.now() + 100000, completed: true }),
    ];

    await reconcileTaskReminders(tasks);

    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
