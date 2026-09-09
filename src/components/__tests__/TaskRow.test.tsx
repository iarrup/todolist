import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import type { Task } from '@/db/schema';
import type { TaskEditingController } from '@/hooks/useTaskEditing';

import { TaskRow } from '../TaskRow';

const task = (id: string, text: string, completed = false): Task => ({
  id,
  text,
  completed,
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
  it('renders the task text and an unchecked checkbox for an open task', () => {
    const { getByTestId, getByText } = render(
      <TaskRow
        task={task('1', 'buy milk')}
        editing={notEditing()}
        onToggleComplete={jest.fn()}
        onDeleteTask={jest.fn()}
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
      />,
    );

    fireEvent.press(getByTestId('task-delete-button'));

    expect(onDeleteTask).toHaveBeenCalledWith('1');
  });
});
