import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
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

// Same mock as NoteComposer.test.tsx (F6) — expo-speech-recognition has no
// native implementation under Jest. useSpeechRecognitionEvent is a plain
// jest.fn(); its .mock.calls log is inspected to find the most recently
// registered handler per event name, invoked directly (inside act()) to
// simulate a native result/error/end event.
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
    expect(onSubmit).toHaveBeenCalledWith('buy milk', null, null, null);
    expect(getByTestId('task-input').props.value).toBe('');
  });

  it('submits multi-line tasks with their newlines intact', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(<TaskComposer onSubmit={onSubmit} />);

    fireEvent.changeText(getByTestId('task-input'), 'line one\nline two');
    fireEvent.press(getByTestId('task-send'));

    expect(onSubmit).toHaveBeenCalledWith('line one\nline two', null, null, null);
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

    expect(onSubmit).toHaveBeenCalledWith(
      'buy milk',
      new Date(2026, 8, 20, 15, 30).getTime(),
      null,
      null,
    );
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

  it('the Repeat control does not appear until a schedule is pending (F11)', () => {
    const { queryByTestId } = render(<TaskComposer onSubmit={jest.fn()} />);

    expect(queryByTestId('task-composer-repeat')).toBeNull();
  });

  it('scheduling and picking a repeat type sends the recurrence with the task (F11)', async () => {
    mockPickDateTime.mockResolvedValueOnce(new Date(2026, 8, 20, 15, 30));
    const onSubmit = jest.fn();
    const { getByTestId, findByTestId } = render(<TaskComposer onSubmit={onSubmit} />);

    fireEvent.press(getByTestId('task-composer-add-schedule'));
    await findByTestId('task-composer-due-at');

    fireEvent.press(getByTestId('task-composer-repeat'));
    fireEvent.press(getByTestId('repeat-option-daily'));
    fireEvent.press(getByTestId('repeat-confirm'));

    fireEvent.changeText(getByTestId('task-input'), 'water plants');
    fireEvent.press(getByTestId('task-send'));

    expect(onSubmit).toHaveBeenCalledWith(
      'water plants',
      new Date(2026, 8, 20, 15, 30).getTime(),
      'daily',
      null,
    );
  });

  it('scheduling without touching Repeat still submits recurrence: null (regression, F11)', async () => {
    mockPickDateTime.mockResolvedValueOnce(new Date(2026, 8, 20, 15, 30));
    const onSubmit = jest.fn();
    const { getByTestId, findByTestId } = render(<TaskComposer onSubmit={onSubmit} />);

    fireEvent.press(getByTestId('task-composer-add-schedule'));
    await findByTestId('task-composer-due-at');
    fireEvent.changeText(getByTestId('task-input'), 'buy milk');
    fireEvent.press(getByTestId('task-send'));

    expect(onSubmit).toHaveBeenCalledWith(
      'buy milk',
      new Date(2026, 8, 20, 15, 30).getTime(),
      null,
      null,
    );
  });

  it('clearing the pending schedule also clears any pending recurrence (F11)', async () => {
    mockPickDateTime.mockResolvedValueOnce(new Date(2026, 8, 20, 15, 30));
    const { getByTestId, findByTestId, queryByTestId } = render(
      <TaskComposer onSubmit={jest.fn()} />,
    );

    fireEvent.press(getByTestId('task-composer-add-schedule'));
    await findByTestId('task-composer-due-at');
    fireEvent.press(getByTestId('task-composer-repeat'));
    fireEvent.press(getByTestId('repeat-option-daily'));
    fireEvent.press(getByTestId('repeat-confirm'));

    fireEvent.press(getByTestId('task-composer-clear-schedule'));

    expect(queryByTestId('task-composer-repeat')).toBeNull();
    expect(queryByTestId('task-composer-due-at')).toBeNull();
  });

  it('sending resets pending recurrence too, for the next task (F11)', async () => {
    mockPickDateTime.mockResolvedValueOnce(new Date(2026, 8, 20, 15, 30));
    const { getByTestId, findByTestId, queryByTestId } = render(
      <TaskComposer onSubmit={jest.fn()} />,
    );

    fireEvent.press(getByTestId('task-composer-add-schedule'));
    await findByTestId('task-composer-due-at');
    fireEvent.press(getByTestId('task-composer-repeat'));
    fireEvent.press(getByTestId('repeat-option-daily'));
    fireEvent.press(getByTestId('repeat-confirm'));

    fireEvent.changeText(getByTestId('task-input'), 'buy milk');
    fireEvent.press(getByTestId('task-send'));

    expect(queryByTestId('task-composer-due-at')).toBeNull();
    expect(queryByTestId('task-composer-repeat')).toBeNull();
  });

  it('tapping the mic requests permission and starts listening', async () => {
    const { getByTestId } = render(<TaskComposer onSubmit={jest.fn()} />);

    await act(async () => {
      fireEvent.press(getByTestId('task-mic'));
    });

    expect(ExpoSpeechRecognitionModule.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(1);
    expect(getByTestId('task-mic').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('task-input').props.editable).toBe(false);
  });

  it('streams partial results into the field while listening, preserving pre-typed text', async () => {
    const { getByTestId } = render(<TaskComposer onSubmit={jest.fn()} />);

    fireEvent.changeText(getByTestId('task-input'), 'shopping:');
    await act(async () => {
      fireEvent.press(getByTestId('task-mic'));
    });

    emitSpeechEvent('result', {
      results: [{ transcript: 'milk', confidence: 0.9 }],
      isFinal: false,
    });
    expect(getByTestId('task-input').props.value).toBe('shopping: milk');

    emitSpeechEvent('result', {
      results: [{ transcript: 'milk and eggs', confidence: 0.95 }],
      isFinal: true,
    });
    expect(getByTestId('task-input').props.value).toBe('shopping: milk and eggs');
  });

  it('tapping the mic again while listening stops recognition and re-enables typing', async () => {
    const { getByTestId } = render(<TaskComposer onSubmit={jest.fn()} />);

    await act(async () => {
      fireEvent.press(getByTestId('task-mic'));
    });
    emitSpeechEvent('result', { results: [{ transcript: 'hello' }], isFinal: false });

    fireEvent.press(getByTestId('task-mic'));

    expect(ExpoSpeechRecognitionModule.stop).toHaveBeenCalledTimes(1);
    expect(getByTestId('task-mic').props.accessibilityState.selected).toBe(false);
    expect(getByTestId('task-input').props.editable).toBe(true);
    expect(getByTestId('task-input').props.value).toBe('hello');
  });

  it('permission denial leaves the composer typeable and disables the mic without re-prompting', async () => {
    (
      ExpoSpeechRecognitionModule.requestPermissionsAsync as unknown as jest.Mock<
        () => Promise<{ granted: boolean }>
      >
    ).mockResolvedValueOnce({ granted: false });
    const onSubmit = jest.fn();
    const { getByTestId } = render(<TaskComposer onSubmit={onSubmit} />);

    await act(async () => {
      fireEvent.press(getByTestId('task-mic'));
    });
    expect(getByTestId('task-mic').props.accessibilityState.disabled).toBe(true);
    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('task-mic')); // second tap: no re-prompt
    expect(ExpoSpeechRecognitionModule.requestPermissionsAsync).toHaveBeenCalledTimes(1);

    fireEvent.changeText(getByTestId('task-input'), 'still typeable');
    fireEvent.press(getByTestId('task-send'));
    expect(onSubmit).toHaveBeenCalledWith('still typeable', null, null, null);
  });

  it('a no-speech/error event ends listening cleanly without discarding field text', async () => {
    const { getByTestId } = render(<TaskComposer onSubmit={jest.fn()} />);

    fireEvent.changeText(getByTestId('task-input'), 'kept');
    await act(async () => {
      fireEvent.press(getByTestId('task-mic'));
    });

    emitSpeechEvent('error', { error: 'no-speech', message: 'no speech detected' });

    expect(getByTestId('task-mic').props.accessibilityState.selected).toBe(false);
    expect(getByTestId('task-mic').props.accessibilityState.disabled).toBe(false);
    expect(getByTestId('task-input').props.value).toBe('kept');
  });

  it('a pending schedule survives filling the text field by voice (DoD 8)', async () => {
    mockPickDateTime.mockResolvedValueOnce(new Date(2026, 8, 20, 15, 30));
    const { getByTestId, findByTestId } = render(<TaskComposer onSubmit={jest.fn()} />);

    fireEvent.press(getByTestId('task-composer-add-schedule'));
    await findByTestId('task-composer-due-at');

    await act(async () => {
      fireEvent.press(getByTestId('task-mic'));
    });
    emitSpeechEvent('result', { results: [{ transcript: 'water plants' }], isFinal: true });

    expect(getByTestId('task-input').props.value).toBe('water plants');
    expect(getByTestId('task-composer-due-at')).toBeTruthy();
  });
});
