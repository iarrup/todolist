import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import type { Task } from '@/db/schema';
import type { TaskEditingController } from '@/hooks/useTaskEditing';
import { pickDateTime } from '@/lib/pickDateTime';

import { TaskRow } from '../TaskRow';

// jest.mock calls are hoisted above imports by babel-plugin-jest-hoist, so
// this still applies to the pickDateTime import above.
jest.mock('@/lib/pickDateTime', () => ({ pickDateTime: jest.fn() }));

const mockPickDateTime = pickDateTime as jest.MockedFunction<typeof pickDateTime>;

const task = (id: string, text: string, completed = false, dueAt: number | null = null): Task => ({
  id,
  text,
  completed,
  dueAt,
  recurrence: null,
  recurrenceDays: null,
  createdAt: 1,
  updatedAt: 1,
});

function notEditing(): TaskEditingController {
  return {
    editingId: null,
    draftText: '',
    setDraftText: jest.fn(),
    handleLongPress: jest.fn(),
    commitEdit: jest.fn(),
  };
}

describe('TaskRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the task text and an unchecked checkbox for an open task', () => {
    const { getByTestId, getByText } = render(
      <TaskRow
        task={task('1', 'buy milk')}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    expect(getByText('buy milk')).toBeTruthy();
    expect(getByTestId('task-checkbox').props.accessibilityState.checked).toBe(false);
  });

  it('shows a checked, struck-through state for a completed task', () => {
    const { getByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk', true)}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    expect(getByTestId('task-checkbox').props.accessibilityState.checked).toBe(true);
    const style = [getByTestId('task-text').props.style].flat();
    expect(style).toEqual(
      expect.arrayContaining([expect.objectContaining({ textDecorationLine: 'line-through' })]),
    );
  });

  it('tapping the checkbox toggles complete with the flipped value', () => {
    const onToggleComplete = jest.fn();
    const { getByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk', false)}
        editing={notEditing()}
        onToggleComplete={onToggleComplete}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('task-checkbox'));

    expect(onToggleComplete).toHaveBeenCalledWith('1', true);
  });

  it('long-pressing the text starts an edit via the editing controller', () => {
    const editing = notEditing();
    const { getByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk')}
        editing={editing}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    fireEvent(getByTestId('task-text-pressable-1'), 'longPress');

    expect(editing.handleLongPress).toHaveBeenCalledWith(task('1', 'buy milk'));
  });

  it('renders an inline editable field pre-filled with the draft when this task is being edited', () => {
    const editing: TaskEditingController = {
      editingId: '1',
      draftText: 'buy milk and eggs',
      setDraftText: jest.fn(),
      handleLongPress: jest.fn(),
      commitEdit: jest.fn(),
    };
    const { getByTestId, queryByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk')}
        editing={editing}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    expect(getByTestId('task-edit-input').props.value).toBe('buy milk and eggs');
    expect(queryByTestId('task-text-pressable-1')).toBeNull();
  });

  it('blurring the edit field commits through the editing controller', () => {
    const editing: TaskEditingController = {
      editingId: '1',
      draftText: 'updated',
      setDraftText: jest.fn(),
      handleLongPress: jest.fn(),
      commitEdit: jest.fn(),
    };
    const { getByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk')}
        editing={editing}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    fireEvent(getByTestId('task-edit-input'), 'blur');

    expect(editing.commitEdit).toHaveBeenCalledWith('1', 'updated');
  });

  it('the revealed Delete button is present but does not delete on its own', () => {
    // Swipeable renders its right-actions content in the tree regardless of
    // swipe state (revealed via animated transform, not conditional mount) —
    // so the button existing here doesn't mean a swipe has happened, and its
    // mere presence must not have called onDeleteTask.
    const onDeleteTask = jest.fn();
    const { getByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk')}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={onDeleteTask}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    expect(getByTestId('task-delete-button')).toBeTruthy();
    expect(onDeleteTask).not.toHaveBeenCalled();
  });

  it('tapping the revealed Delete button deletes the task', () => {
    const onDeleteTask = jest.fn();
    const { getByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk')}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={onDeleteTask}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('task-delete-button'));

    expect(onDeleteTask).toHaveBeenCalledWith('1');
  });

  it('shows an add-schedule affordance and no due-at subtitle for an unscheduled task', () => {
    const { getByTestId, queryByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk')}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    expect(getByTestId('task-add-schedule')).toBeTruthy();
    expect(queryByTestId('task-due-at')).toBeNull();
    expect(queryByTestId('task-clear-schedule')).toBeNull();
  });

  it('shows the due date/time and a clear button for a scheduled task', () => {
    const dueAt = new Date(2026, 8, 20, 15, 30).getTime();
    const { getByTestId, queryByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk', false, dueAt)}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    expect(getByTestId('task-due-at')).toBeTruthy();
    expect(getByTestId('task-clear-schedule')).toBeTruthy();
    expect(queryByTestId('task-add-schedule')).toBeNull();
  });

  it('tapping add-schedule opens the picker and forwards a picked date as the new schedule', async () => {
    mockPickDateTime.mockResolvedValueOnce(new Date(2026, 8, 20, 15, 30));
    const onScheduleTask = jest.fn();
    const { getByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk')}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={onScheduleTask}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('task-add-schedule'));

    await waitFor(() =>
      expect(onScheduleTask).toHaveBeenCalledWith('1', new Date(2026, 8, 20, 15, 30).getTime()),
    );
  });

  it('tapping the due-at subtitle reopens the picker seeded with the current schedule', () => {
    const dueAt = new Date(2026, 8, 20, 15, 30).getTime();
    mockPickDateTime.mockResolvedValueOnce(null);
    const { getByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk', false, dueAt)}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('task-due-at'));

    expect(mockPickDateTime).toHaveBeenCalledWith(new Date(dueAt));
  });

  it('cancelling the picker (null result) does not change the schedule', async () => {
    mockPickDateTime.mockResolvedValueOnce(null);
    const onScheduleTask = jest.fn();
    const { getByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk')}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={onScheduleTask}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('task-add-schedule'));

    await waitFor(() => expect(mockPickDateTime).toHaveBeenCalled());
    expect(onScheduleTask).not.toHaveBeenCalled();
  });

  it('tapping the clear button removes the schedule directly, without opening the picker', () => {
    const dueAt = new Date(2026, 8, 20, 15, 30).getTime();
    const onScheduleTask = jest.fn();
    const { getByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk', false, dueAt)}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={onScheduleTask}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('task-clear-schedule'));

    expect(onScheduleTask).toHaveBeenCalledWith('1', null);
    expect(mockPickDateTime).not.toHaveBeenCalled();
  });

  it('does not show the snooze row for a task due in the future', () => {
    const dueAt = Date.now() + 60 * 60 * 1000;
    const { queryByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk', false, dueAt)}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    expect(queryByTestId('task-snooze-10min')).toBeNull();
  });

  it('does not show the snooze row for an unscheduled task', () => {
    const { queryByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk')}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    expect(queryByTestId('task-snooze-10min')).toBeNull();
  });

  it('does not show the snooze row for a completed task even if its dueAt is in the past', () => {
    const dueAt = Date.now() - 60 * 60 * 1000;
    const { queryByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk', true, dueAt)}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    expect(queryByTestId('task-snooze-10min')).toBeNull();
  });

  it('shows the snooze row (10 min / 1 hour / Tomorrow) for an overdue task', () => {
    const dueAt = Date.now() - 60 * 60 * 1000;
    const { getByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk', false, dueAt)}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={jest.fn()}
      />,
    );

    expect(getByTestId('task-snooze-10min')).toBeTruthy();
    expect(getByTestId('task-snooze-1hour')).toBeTruthy();
    expect(getByTestId('task-snooze-tomorrow')).toBeTruthy();
  });

  it('tapping a snooze preset calls onSnoozeTask with the computed new due time', () => {
    const dueAt = new Date(2026, 8, 9, 9, 0).getTime(); // overdue relative to real "now"
    const onSnoozeTask = jest.fn();
    const { getByTestId } = render(
      <TaskRow
        task={task('1', 'buy milk', false, dueAt)}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
        onScheduleTask={jest.fn()}
        onSetRecurrence={jest.fn()}
        onSnoozeTask={onSnoozeTask}
      />,
    );

    fireEvent.press(getByTestId('task-snooze-10min'));

    expect(onSnoozeTask).toHaveBeenCalledTimes(1);
    const [id, newDueAt] = onSnoozeTask.mock.calls[0] as [string, number];
    expect(id).toBe('1');
    // 10 min from "now" (real time), not from the original dueAt.
    expect(newDueAt).toBeGreaterThan(Date.now());
    expect(newDueAt).toBeLessThanOrEqual(Date.now() + 10 * 60 * 1000 + 1000);
  });
});
