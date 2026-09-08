import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import { NoteComposer } from '../NoteComposer';

// Avoid needing a SafeAreaProvider around each render.
jest.mock('react-native-safe-area-context', () => ({
  ...(jest.requireActual('react-native-safe-area-context') as object),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// First native-module mock in this repo: expo-speech-recognition has no
// native implementation under Jest. useSpeechRecognitionEvent is a plain
// jest.fn(); its .mock.calls log is inspected to find the most recently
// registered handler per event name, invoked directly (inside act()) to
// simulate a native result/error/end event. jest.mock calls are hoisted
// above imports by babel-plugin-jest-hoist, so this still applies even
// though the import above appears first in source order.
jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

function emitSpeechEvent(eventName: string, event: unknown) {
  const calls = [...(useSpeechRecognitionEvent as jest.Mock).mock.calls].reverse();
  const call = calls.find(([name]) => name === eventName);
  if (!call) throw new Error(`no "${eventName}" handler registered`);
  act(() => (call[1] as (e: unknown) => void)(event));
}

describe('NoteComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('tapping the mic requests permission and starts listening', async () => {
    const { getByTestId } = render(<NoteComposer onSubmit={jest.fn()} />);

    await act(async () => {
      fireEvent.press(getByTestId('note-mic'));
    });

    expect(ExpoSpeechRecognitionModule.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(1);
    expect(getByTestId('note-mic').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('note-input').props.editable).toBe(false);
  });

  it('streams partial results into the field while listening, preserving pre-typed text', async () => {
    const { getByTestId } = render(<NoteComposer onSubmit={jest.fn()} />);

    fireEvent.changeText(getByTestId('note-input'), 'shopping:');
    await act(async () => {
      fireEvent.press(getByTestId('note-mic'));
    });

    emitSpeechEvent('result', {
      results: [{ transcript: 'milk', confidence: 0.9 }],
      isFinal: false,
    });
    expect(getByTestId('note-input').props.value).toBe('shopping: milk');

    emitSpeechEvent('result', {
      results: [{ transcript: 'milk and eggs', confidence: 0.95 }],
      isFinal: true,
    });
    expect(getByTestId('note-input').props.value).toBe('shopping: milk and eggs');
  });

  it('appends a second speech segment after the first instead of overwriting it', async () => {
    // Continuous recognition resets its transcript per segment: after a
    // pause, the next segment's `result` events start over from empty
    // rather than continuing the previous segment's text. Only a
    // `isFinal: true` result should be committed as the new base so the
    // next segment appends instead of replacing everything said so far.
    const { getByTestId } = render(<NoteComposer onSubmit={jest.fn()} />);

    await act(async () => {
      fireEvent.press(getByTestId('note-mic'));
    });

    emitSpeechEvent('result', {
      results: [{ transcript: 'okay let us try the mic test' }],
      isFinal: true,
    });
    expect(getByTestId('note-input').props.value).toBe('okay let us try the mic test');

    // Second segment starts over from empty, as the real recognizer does.
    emitSpeechEvent('result', { results: [{ transcript: 'tomorrow' }], isFinal: false });
    expect(getByTestId('note-input').props.value).toBe('okay let us try the mic test tomorrow');
  });

  it('tapping the mic again while listening stops recognition and re-enables typing', async () => {
    const { getByTestId } = render(<NoteComposer onSubmit={jest.fn()} />);

    await act(async () => {
      fireEvent.press(getByTestId('note-mic'));
    });
    emitSpeechEvent('result', { results: [{ transcript: 'hello' }], isFinal: false });

    fireEvent.press(getByTestId('note-mic'));

    expect(ExpoSpeechRecognitionModule.stop).toHaveBeenCalledTimes(1);
    expect(getByTestId('note-mic').props.accessibilityState.selected).toBe(false);
    expect(getByTestId('note-input').props.editable).toBe(true);
    expect(getByTestId('note-input').props.value).toBe('hello');
  });

  it('permission denial leaves the composer typeable and disables the mic without re-prompting', async () => {
    (
      ExpoSpeechRecognitionModule.requestPermissionsAsync as unknown as jest.Mock<
        () => Promise<{ granted: boolean }>
      >
    ).mockResolvedValueOnce({ granted: false });
    const onSubmit = jest.fn();
    const { getByTestId } = render(<NoteComposer onSubmit={onSubmit} />);

    await act(async () => {
      fireEvent.press(getByTestId('note-mic'));
    });
    expect(getByTestId('note-mic').props.accessibilityState.disabled).toBe(true);
    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('note-mic')); // second tap: no re-prompt
    expect(ExpoSpeechRecognitionModule.requestPermissionsAsync).toHaveBeenCalledTimes(1);

    fireEvent.changeText(getByTestId('note-input'), 'still typeable');
    fireEvent.press(getByTestId('note-send'));
    expect(onSubmit).toHaveBeenCalledWith('still typeable');
  });

  it('a no-speech/error event ends listening cleanly without discarding field text', async () => {
    const { getByTestId } = render(<NoteComposer onSubmit={jest.fn()} />);

    fireEvent.changeText(getByTestId('note-input'), 'kept');
    await act(async () => {
      fireEvent.press(getByTestId('note-mic'));
    });

    emitSpeechEvent('error', { error: 'no-speech', message: 'no speech detected' });

    expect(getByTestId('note-mic').props.accessibilityState.selected).toBe(false);
    expect(getByTestId('note-mic').props.accessibilityState.disabled).toBe(false);
    expect(getByTestId('note-input').props.value).toBe('kept');
  });
});
