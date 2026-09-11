import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import type { Task } from '@/db/schema';

import { YearGroupedTaskList } from '../YearGroupedTaskList';

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

const janDay1 = new Date(2026, 0, 5, 9, 0, 0).getTime();
const janDay2 = new Date(2026, 0, 20, 9, 0, 0).getTime();
const marDay1 = new Date(2026, 2, 1, 9, 0, 0).getTime();

const noop = () => {
  // used where a callback is required but not under test
};

describe('YearGroupedTaskList', () => {
  it('shows the empty message when there are no tasks', () => {
    const { getByText, queryAllByTestId } = render(
      <YearGroupedTaskList
        tasks={[]}
        onEditTask={noop}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
        onSnoozeTask={noop}
      />,
    );

    expect(getByText('No tasks this year')).toBeTruthy();
    expect(queryAllByTestId('task-text')).toHaveLength(0);
  });

  it('renders one section per month, ascending, with nested day sub-headings', () => {
    const tasks = [
      task('3', 'march task', marDay1),
      task('1', 'jan task 1', janDay1),
      task('2', 'jan task 2', janDay2),
    ];
    const { getAllByTestId } = render(
      <YearGroupedTaskList
        tasks={tasks}
        onEditTask={noop}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
        onSnoozeTask={noop}
      />,
    );

    expect(getAllByTestId(/^month-subheading-/)).toHaveLength(2);
    expect(getAllByTestId(/^day-subheading-/)).toHaveLength(3);

    const texts = getAllByTestId('task-text').map((el) => el.props.children);
    // January's two days first (ascending), then March.
    expect(texts).toEqual(['jan task 1', 'jan task 2', 'march task']);
  });

  it('includes a completed task', () => {
    const tasks = [task('1', 'done thing', janDay1, true)];
    const { getByText } = render(
      <YearGroupedTaskList
        tasks={tasks}
        onEditTask={noop}
        onToggleComplete={noop}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
        onSnoozeTask={noop}
      />,
    );

    expect(getByText('done thing')).toBeTruthy();
  });

  it('passes through checkbox/edit/schedule callbacks via the shared TaskRow', () => {
    const onToggleComplete = jest.fn();
    const onEditTask = jest.fn();
    const tasks = [task('1', 'buy milk', janDay1)];
    const { getByTestId } = render(
      <YearGroupedTaskList
        tasks={tasks}
        onEditTask={onEditTask}
        onToggleComplete={onToggleComplete}
        onDeleteTask={noop}
        onScheduleTask={noop}
        onSetRecurrence={noop}
        onSnoozeTask={noop}
      />,
    );

    fireEvent.press(getByTestId('task-checkbox'));
    expect(onToggleComplete).toHaveBeenCalledWith('1', true);

    fireEvent(getByTestId('task-text-pressable-1'), 'longPress');
    fireEvent.changeText(getByTestId('task-edit-input'), 'updated');
    fireEvent(getByTestId('task-edit-input'), 'blur');
    expect(onEditTask).toHaveBeenCalledWith('1', 'updated');
  });
});
