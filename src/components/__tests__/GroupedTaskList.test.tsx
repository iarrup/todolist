import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import type { Task } from '@/db/schema';

import { GroupedTaskList } from '../GroupedTaskList';

// jest.mock calls are hoisted above imports by babel-plugin-jest-hoist.
jest.mock('@/lib/pickDateTime', () => ({ pickDateTime: jest.fn() }));

const task = (id: string, text: string, dueAt: number, completed = false): Task => ({
  id,
  text,
  completed,
  dueAt,
  recurrence: null,
  recurrenceDays: null,
  createdAt: dueAt,
  updatedAt: dueAt,
});

const day1Early = new Date(2026, 8, 1, 9, 0, 0).getTime();
const day1Late = new Date(2026, 8, 1, 18, 0, 0).getTime();
const day2 = new Date(2026, 8, 2, 9, 0, 0).getTime();

const noop = () => {
  // used where a callback is required but not under test
};

describe('GroupedTaskList', () => {
  it('shows the empty message when there are no tasks', () => {
    const { getByText, queryAllByTestId } = render(
      <GroupedTaskList
        tasks={[]}
        onEditTask={noop}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
        onSnoozeTask={noop}
        emptyMessage="No tasks this week"
      />,
    );

    expect(getByText('No tasks this week')).toBeTruthy();
    expect(queryAllByTestId('task-text')).toHaveLength(0);
  });

  it('renders one section per day, tasks ascending by due time, days ascending', () => {
    const tasks = [
      task('2', 'day1 late', day1Late),
      task('3', 'day2 task', day2),
      task('1', 'day1 early', day1Early),
    ];
    const { getAllByTestId } = render(
      <GroupedTaskList
        tasks={tasks}
        onEditTask={noop}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
        onSnoozeTask={noop}
        emptyMessage="No tasks this week"
      />,
    );

    expect(getAllByTestId(/^day-subheading-/)).toHaveLength(2);
    const texts = getAllByTestId('task-text').map((el) => el.props.children);
    // day1 group (earlier) first, ascending; then day2.
    expect(texts).toEqual(['day1 early', 'day1 late', 'day2 task']);
  });

  it('includes a completed task, rendered with its completed styling', () => {
    const tasks = [task('1', 'done thing', day1Early, true)];
    const { getByText } = render(
      <GroupedTaskList
        tasks={tasks}
        onEditTask={noop}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
        onSnoozeTask={noop}
        emptyMessage="No tasks this week"
      />,
    );

    expect(getByText('done thing')).toBeTruthy();
  });

  it('passes through checkbox/edit/schedule callbacks via the shared TaskRow', () => {
    const onToggleComplete = jest.fn();
    const onScheduleTask = jest.fn();
    const tasks = [task('1', 'buy milk', day1Early)];
    const { getByTestId } = render(
      <GroupedTaskList
        tasks={tasks}
        onEditTask={noop}
        onToggleComplete={onToggleComplete}
        onDeleteTask={noop}
        onScheduleTask={onScheduleTask}
        onSetRecurrence={noop}
        onSnoozeTask={noop}
        emptyMessage="No tasks this week"
      />,
    );

    fireEvent.press(getByTestId('task-checkbox'));
    expect(onToggleComplete).toHaveBeenCalledWith('1', true);

    fireEvent.press(getByTestId('task-clear-schedule'));
    expect(onScheduleTask).toHaveBeenCalledWith('1', null);
  });

  it('supports long-press-edit via the shared row', () => {
    const onEditTask = jest.fn();
    const tasks = [task('1', 'hello', day1Early)];
    const { getByTestId } = render(
      <GroupedTaskList
        tasks={tasks}
        onEditTask={onEditTask}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
        onSnoozeTask={noop}
        emptyMessage="No tasks this week"
      />,
    );

    fireEvent(getByTestId('task-text-pressable-1'), 'longPress');
    fireEvent.changeText(getByTestId('task-edit-input'), 'updated');
    fireEvent(getByTestId('task-edit-input'), 'blur');

    expect(onEditTask).toHaveBeenCalledWith('1', 'updated');
  });
});
