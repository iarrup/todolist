import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { NoteComposer } from '../NoteComposer';

// Avoid needing a SafeAreaProvider around each render.
jest.mock('react-native-safe-area-context', () => ({
  ...(jest.requireActual('react-native-safe-area-context') as object),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('NoteComposer', () => {
  it('trims text, submits it, and clears the field on send', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(<NoteComposer onSubmit={onSubmit} />);

    fireEvent.changeText(getByTestId('note-input'), '  hi  ');
    fireEvent.press(getByTestId('note-send'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('hi');
    expect(getByTestId('note-input').props.value).toBe('');
  });

  it('submits multi-line notes with their newlines intact', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(<NoteComposer onSubmit={onSubmit} />);

    fireEvent.changeText(getByTestId('note-input'), 'line one\nline two');
    fireEvent.press(getByTestId('note-send'));

    expect(onSubmit).toHaveBeenCalledWith('line one\nline two');
  });

  it('does not submit when the field is empty or whitespace-only', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(<NoteComposer onSubmit={onSubmit} />);

    const send = getByTestId('note-send');
    expect(send.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(getByTestId('note-input'), '   ');
    fireEvent.press(send);

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
