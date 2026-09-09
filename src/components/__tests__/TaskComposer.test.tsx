import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { TaskComposer } from '../TaskComposer';

// Avoid needing a SafeAreaProvider around each render.
jest.mock('react-native-safe-area-context', () => ({
  ...(jest.requireActual('react-native-safe-area-context') as object),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('TaskComposer', () => {
  it('trims text, submits it, and clears the field on send', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(<TaskComposer onSubmit={onSubmit} />);

    fireEvent.changeText(getByTestId('task-input'), '  buy milk  ');
    fireEvent.press(getByTestId('task-send'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('buy milk');
    expect(getByTestId('task-input').props.value).toBe('');
  });

  it('submits multi-line tasks with their newlines intact', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(<TaskComposer onSubmit={onSubmit} />);

    fireEvent.changeText(getByTestId('task-input'), 'line one\nline two');
    fireEvent.press(getByTestId('task-send'));

    expect(onSubmit).toHaveBeenCalledWith('line one\nline two');
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
});
