import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { pickDateTime } from '@/lib/pickDateTime';

import { TaskComposer } from '../TaskComposer';

// jest.mock calls are hoisted above imports by babel-plugin-jest-hoist, so
// these still apply to the imports above.
jest.mock('@/lib/pickDateTime', () => ({ pickDateTime: jest.fn() }));

// Avoid needing a SafeAreaProvider around each render.
jest.mock('react-native-safe-area-context', () => ({
  ...(jest.requireActual('react-native-safe-area-context') as object),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockPickDateTime = pickDateTime as jest.MockedFunction<typeof pickDateTime>;

describe('TaskComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trims text, submits it with no schedule, and clears the field on send', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(<TaskComposer onSubmit={onSubmit} />);

    fireEvent.changeText(getByTestId('task-input'), '  buy milk  ');
    fireEvent.press(getByTestId('task-send'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('buy milk', null);
    expect(getByTestId('task-input').props.value).toBe('');
  });

  it('submits multi-line tasks with their newlines intact', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(<TaskComposer onSubmit={onSubmit} />);

    fireEvent.changeText(getByTestId('task-input'), 'line one\nline two');
    fireEvent.press(getByTestId('task-send'));

    expect(onSubmit).toHaveBeenCalledWith('line one\nline two', null);
  });

  it('does not submit when the field is empty or whitespace-only', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(<TaskComposer onSubmit={onSubmit} />);

    const send = getByTestId('task-send');
    expect(send.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(getByTestId('task-input'), '   ');
    fireEvent.press(send);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not show a pending schedule until the schedule control is used', () => {
    const { queryByTestId } = render(<TaskComposer onSubmit={jest.fn()} />);

    expect(queryByTestId('task-composer-due-at')).toBeNull();
  });

  it('picking a date/time shows it and submits it with the task', async () => {
    mockPickDateTime.mockResolvedValueOnce(new Date(2026, 8, 20, 15, 30));
    const onSubmit = jest.fn();
    const { getByTestId, findByTestId } = render(<TaskComposer onSubmit={onSubmit} />);

    fireEvent.press(getByTestId('task-composer-add-schedule'));
    await findByTestId('task-composer-due-at');

    fireEvent.changeText(getByTestId('task-input'), 'buy milk');
    fireEvent.press(getByTestId('task-send'));

    expect(onSubmit).toHaveBeenCalledWith('buy milk', new Date(2026, 8, 20, 15, 30).getTime());
  });

  it('sending resets the pending schedule for the next task', async () => {
    mockPickDateTime.mockResolvedValueOnce(new Date(2026, 8, 20, 15, 30));
    const { getByTestId, findByTestId, queryByTestId } = render(
      <TaskComposer onSubmit={jest.fn()} />,
    );

    fireEvent.press(getByTestId('task-composer-add-schedule'));
    await findByTestId('task-composer-due-at');
    fireEvent.changeText(getByTestId('task-input'), 'buy milk');
    fireEvent.press(getByTestId('task-send'));

    expect(queryByTestId('task-composer-due-at')).toBeNull();
  });

  it('cancelling the picker (null result) leaves no pending schedule', async () => {
    mockPickDateTime.mockResolvedValueOnce(null);
    const { getByTestId, queryByTestId } = render(<TaskComposer onSubmit={jest.fn()} />);

    fireEvent.press(getByTestId('task-composer-add-schedule'));

    await waitFor(() => expect(mockPickDateTime).toHaveBeenCalled());
    expect(queryByTestId('task-composer-due-at')).toBeNull();
  });

  it('clearing a pending schedule removes it without reopening the picker', async () => {
    mockPickDateTime.mockResolvedValueOnce(new Date(2026, 8, 20, 15, 30));
    const { getByTestId, findByTestId, queryByTestId } = render(
      <TaskComposer onSubmit={jest.fn()} />,
    );

    fireEvent.press(getByTestId('task-composer-add-schedule'));
    await findByTestId('task-composer-due-at');

    fireEvent.press(getByTestId('task-composer-clear-schedule'));

    expect(queryByTestId('task-composer-due-at')).toBeNull();
    expect(mockPickDateTime).toHaveBeenCalledTimes(1);
  });
});
