import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import type { Task } from '@/db/schema';

import { TaskList } from '../TaskList';

// jest.mock calls are hoisted above imports by babel-plugin-jest-hoist.
jest.mock('@/lib/pickDateTime', () => ({ pickDateTime: jest.fn() }));

const task = (id: string, text: string, createdAt: number, completed = false): Task => ({
  id,
  text,
  completed,
  dueAt: null,
  recurrence: null,
  recurrenceDays: null,
  createdAt,
  updatedAt: createdAt,
});

const noop = () => {
  // used where a callback is required but not under test
};

describe('TaskList', () => {
  it('shows the empty state when there are no tasks', () => {
    const { getByText, queryAllByTestId } = render(
      <TaskList
        tasks={[]}
        onEditTask={noop}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
      />,
    );

    expect(getByText('All caught up!')).toBeTruthy();
    expect(queryAllByTestId('task-text')).toHaveLength(0);
  });

  it('shows a custom empty message when emptyMessage is given (F10 Browse/Day)', () => {
    const { getByText, queryByText } = render(
      <TaskList
        tasks={[]}
        onEditTask={noop}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
        emptyMessage="No tasks today"
      />,
    );

    expect(getByText('No tasks today')).toBeTruthy();
    expect(queryByText('All caught up!')).toBeNull();
  });

  it('renders tasks in the order given, without re-sorting', () => {
    const tasks = [task('1', 'oldest', 1), task('2', 'newest', 3), task('3', 'middle', 2)];
    const { getAllByTestId } = render(
      <TaskList
        tasks={tasks}
        onEditTask={noop}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
      />,
    );

    const texts = getAllByTestId('task-text').map((el) => el.props.children);
    expect(texts).toEqual(['oldest', 'newest', 'middle']);
  });

  it('renders whatever tasks it is given, without filtering by completed state', () => {
    const tasks = [task('1', 'open one', 2, false), task('2', 'done one', 1, true)];
    const { getByText } = render(
      <TaskList
        tasks={tasks}
        onEditTask={noop}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
      />,
    );

    expect(getByText('open one')).toBeTruthy();
    expect(getByText('done one')).toBeTruthy();
  });

  it('toggling a checkbox calls onToggleComplete with that task’s id and flipped state', () => {
    const onToggleComplete = jest.fn();
    const tasks = [task('1', 'buy milk', 1, false)];
    const { getByTestId } = render(
      <TaskList
        tasks={tasks}
        onEditTask={noop}
        onToggleComplete={onToggleComplete}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
      />,
    );

    fireEvent.press(getByTestId('task-checkbox'));

    expect(onToggleComplete).toHaveBeenCalledWith('1', true);
  });

  it('enters edit mode on long-press, pre-filled with the task’s text', () => {
    const tasks = [task('1', 'hello', 1)];
    const { getByTestId, queryByTestId } = render(
      <TaskList
        tasks={tasks}
        onEditTask={noop}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
      />,
    );

    fireEvent(getByTestId('task-text-pressable-1'), 'longPress');

    expect(queryByTestId('task-text-pressable-1')).toBeNull();
    expect(getByTestId('task-edit-input').props.value).toBe('hello');
  });

  it('commits the edit when the field is blurred with non-empty text', () => {
    const onEditTask = jest.fn();
    const tasks = [task('1', 'hello', 1)];
    const { getByTestId } = render(
      <TaskList
        tasks={tasks}
        onEditTask={onEditTask}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
      />,
    );

    fireEvent(getByTestId('task-text-pressable-1'), 'longPress');
    fireEvent.changeText(getByTestId('task-edit-input'), '  updated  ');
    fireEvent(getByTestId('task-edit-input'), 'blur');

    expect(onEditTask).toHaveBeenCalledTimes(1);
    expect(onEditTask).toHaveBeenCalledWith('1', 'updated');
  });

  it('reverts without saving when blurred with empty/whitespace text', () => {
    const onEditTask = jest.fn();
    const tasks = [task('1', 'hello', 1)];
    const { getByTestId, getByText, queryByTestId } = render(
      <TaskList
        tasks={tasks}
        onEditTask={onEditTask}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
      />,
    );

    fireEvent(getByTestId('task-text-pressable-1'), 'longPress');
    fireEvent.changeText(getByTestId('task-edit-input'), '   ');
    fireEvent(getByTestId('task-edit-input'), 'blur');

    expect(onEditTask).not.toHaveBeenCalled();
    expect(queryByTestId('task-edit-input')).toBeNull();
    expect(getByText('hello')).toBeTruthy();
  });

  it('only allows one task to be edited at a time, committing the first on switch', () => {
    const onEditTask = jest.fn();
    const tasks = [task('1', 'first', 2), task('2', 'second', 1)];
    const { getByTestId } = render(
      <TaskList
        tasks={tasks}
        onEditTask={onEditTask}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
      />,
    );

    fireEvent(getByTestId('task-text-pressable-1'), 'longPress');
    fireEvent.changeText(getByTestId('task-edit-input'), 'edited first');
    fireEvent(getByTestId('task-text-pressable-2'), 'longPress');

    expect(onEditTask).toHaveBeenCalledWith('1', 'edited first');
    expect(getByTestId('task-edit-input').props.value).toBe('second');
  });

  it('tapping clear-schedule on a scheduled task calls onScheduleTask with that task’s id and null', () => {
    const onScheduleTask = jest.fn();
    const dueAt = new Date(2026, 8, 20, 15, 30).getTime();
    const tasks = [{ ...task('1', 'buy milk', 1), dueAt }];
    const { getByTestId } = render(
      <TaskList
        tasks={tasks}
        onEditTask={noop}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={onScheduleTask}
        onSetRecurrence={noop}
      />,
    );

    fireEvent.press(getByTestId('task-clear-schedule'));

    expect(onScheduleTask).toHaveBeenCalledWith('1', null);
  });
});
