# Implementation Plan: F13 — Voice Capture for Tasks

## References
Approved spec: `.claude/specs/2-f13-voice-capture-tasks.md`.

## Context

F6 (Phase 1) built voice capture for notes: `useVoiceCapture`
(`src/hooks/useVoiceCapture.ts`) wraps `expo-speech-recognition`'s
start/stop/event stream around a generic `(value, setValue)` pair, with the
riskiest bit of logic — merging streamed transcript segments without
duplicating or discarding text — isolated in a pure helper,
`mergeVoiceTranscript` (`src/lib/mergeVoiceTranscript.ts`). Neither file has
any note-specific assumption baked in. `NoteComposer.tsx` is the only current
caller.

F13 adds a second caller: `TaskComposer.tsx`. Per the approved spec this is
**pure reuse** — no changes to `useVoiceCapture.ts` or
`mergeVoiceTranscript.ts`, no new dependency (`expo-speech-recognition` is
already installed and its config plugin already registered in `app.json`
from F6, so no native rebuild is required for this feature specifically).
The only work is wiring `TaskComposer` up the same way `NoteComposer` already
is, and adding the same shape of test coverage.

## Approach

Mechanical mirror of `NoteComposer`'s existing wiring — no new design
decisions:

- **Call `useVoiceCapture(value, setValue)` in `TaskComposer`, unchanged
  signature.** Same one-field-one-source-of-truth guarantee as F6.
- **Mic button placed between the text input and the send button** — i.e.
  `[schedule 🕐] [input] [mic] [send]`. This matches `NoteComposer`'s
  `[input] [mic] [send]` ordering (mic immediately before send) while
  leaving F9's existing leftmost schedule button untouched.
- **Same three visual states, same emoji glyphs, same styles** as
  `NoteComposer`'s mic button (🎤 idle / ⏹ listening, gray/red/dimmed
  backgrounds) — copied verbatim rather than extracted into a shared
  component. Two ~15-line `StyleSheet` blocks with matching values is
  consistent with this codebase's existing precedent (`TaskComposer` and
  `NoteComposer` already duplicate their `input`/`sendButton`/
  `sendButtonDisabled` styles rather than sharing a base style module) —
  introducing a shared `MicButton` component for one duplicated block would
  be more abstraction than the current codebase uses anywhere else.
- **`TextInput` disabled only while `status === 'listening'`** — identical
  rule to `NoteComposer`, applied to `task-input`.
- **testID `task-mic`** (mirrors `note-mic`, and the existing
  `task-input`/`task-send` naming already in this file).
- **No interaction with schedule/recurrence state** — `useVoiceCapture` only
  ever touches `value`/`setValue`; `pendingDueAt`/`pendingRecurrence`/
  `pendingRecurrenceDays` state is untouched by this change, so DoD 8
  (no interference) holds by construction, not by an explicit guard.

## Files to change

**`src/components/TaskComposer.tsx`:**

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RepeatPicker } from './RepeatPicker';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { formatRecurrence } from '@/lib/formatRecurrence';
import { formatTaskDueAt } from '@/lib/formatTaskDueAt';
import { normalizeNoteInput } from '@/lib/noteInput';
import { pickDateTime } from '@/lib/pickDateTime';
import type { Recurrence } from '@/lib/recurrence';

// ...component doc comment: add one sentence noting the mic button, same
// wording style as NoteComposer's...

export function TaskComposer({ onSubmit }: TaskComposerProps) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const voice = useVoiceCapture(value, setValue);
  const [pendingDueAt, setPendingDueAt] = useState<number | null>(null);
  // ...pendingRecurrence, pendingRecurrenceDays, repeatPickerVisible: unchanged...

  const trimmed = normalizeNoteInput(value);
  const canSubmit = trimmed !== null;

  // ...handleSend, handleOpenPicker, handleClearSchedule: unchanged...

  const micLabel =
    voice.status === 'listening'
      ? 'Stop voice input'
      : voice.status === 'unavailable'
        ? 'Voice input unavailable'
        : 'Start voice input';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {/* ...scheduleRow, RepeatPicker: unchanged... */}
      <View style={styles.inputRow}>
        {/* ...task-composer-add-schedule Pressable: unchanged... */}
        <TextInput
          testID="task-input"
          style={styles.input}
          value={value}
          onChangeText={setValue}
          editable={voice.status !== 'listening'}
          placeholder="Add a task…"
          placeholderTextColor="#8a8a8e"
          multiline
          submitBehavior="newline"
        />
        <Pressable
          testID="task-mic"
          accessibilityRole="button"
          accessibilityLabel={micLabel}
          accessibilityState={{
            disabled: voice.status === 'unavailable',
            selected: voice.status === 'listening',
          }}
          disabled={voice.status === 'unavailable'}
          onPress={voice.toggle}
          style={[
            styles.micButton,
            voice.status === 'listening' && styles.micButtonListening,
            voice.status === 'unavailable' && styles.micButtonDisabled,
          ]}
        >
          <Text style={styles.micButtonText}>{voice.status === 'listening' ? '⏹' : '🎤'}</Text>
        </Pressable>
        {/* ...task-send Pressable: unchanged... */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ...all existing styles unchanged, plus (copied verbatim from NoteComposer):
  micButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#8a8a8e',
  },
  micButtonListening: {
    backgroundColor: '#EF4444',
  },
  micButtonDisabled: {
    opacity: 0.4,
  },
  micButtonText: {
    fontSize: 18,
  },
});
```

Every line outside the diff above (schedule row, `RepeatPicker` wiring,
`pendingDueAt`/`pendingRecurrence` state and handlers, the send button)
stays exactly as it is today — this is strictly additive.

**`src/components/__tests__/TaskComposer.test.tsx`:**

Add the same `expo-speech-recognition` mock and `emitSpeechEvent` helper
`NoteComposer.test.tsx` already uses (copied verbatim — same mock shape,
same helper), then five new test cases ported from
`NoteComposer.test.tsx`'s voice cases, renamed to this file's `task-*`
testIDs and adjusted for `TaskComposer`'s 4-argument `onSubmit`:

```tsx
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { pickDateTime } from '@/lib/pickDateTime';

import { TaskComposer } from '../TaskComposer';

jest.mock('@/lib/pickDateTime', () => ({ pickDateTime: jest.fn() }));

jest.mock('react-native-safe-area-context', () => ({
  ...(jest.requireActual('react-native-safe-area-context') as object),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Same mock as NoteComposer.test.tsx — see that file's comment for why.
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

  // ...all existing schedule/recurrence tests stay unmodified...

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
    emitSpeechEvent('result', { results: [{ transcript: 'milk', confidence: 0.9 }], isFinal: false });
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
```

(`appendVoiceSegment`-style continuous-recognition coverage — F6's
"appends a second speech segment after the first" test — is not duplicated
here: it tests `mergeVoiceTranscript`'s own behavior, which is already
covered by `src/lib/__tests__/mergeVoiceTranscript.test.ts` and is unchanged
by this feature. Re-testing it through a second component would be
redundant coverage of the same unmodified function, not a new
`TaskComposer`-specific risk.)

## New dependencies
None. `expo-speech-recognition` and its `app.json` config plugin already
exist from F6; no native rebuild is required specifically for this feature
(any rebuild needed is only because `TaskComposer.tsx` itself changed, same
as any other JS-only component edit — `npx expo run:android` picks it up
without a fresh `prebuild`).

## Ordered implementation steps
1. Update `src/components/TaskComposer.tsx` per the diff above — import
   `useVoiceCapture`, call it, add the `task-mic` `Pressable`, wire
   `editable`, add the four mic styles. *(DoD 1, 2, 3, 4, 5, 6, 7, 8)*
2. Add the `expo-speech-recognition` mock + `emitSpeechEvent` helper and six
   new test cases to `TaskComposer.test.tsx` (five ported 1:1 from
   `NoteComposer.test.tsx`, plus the schedule-survives-voice case). *(DoD 1–8, 10)*
3. Headless gates: `npm test`, `npm run typecheck`, `npm run lint`, `npm run
   format:check`. *(DoD 10, 11)*
4. Grep check for DoD 9: confirm no new entry in `package.json`'s
   `dependencies`, no new file under `src/app/`, and that
   `src/components/NoteComposer.tsx`, `src/hooks/useVoiceCapture.ts`, and
   `src/lib/mergeVoiceTranscript.ts` are untouched (`git diff --stat` shows
   only `TaskComposer.tsx` and `TaskComposer.test.tsx`).
5. `npx expo run:android` and walk DoD 12 on a physical device (same
   WAV-injection limitation as F6 doesn't apply here — a real device's mic
   works, per the `android-build-toolchain` memory's confirmation this
   already works for `expo-speech-recognition` on the Pixel 6a/10 Pro): tap
   the mic in the Tasks tab, speak a short task, watch it transcribe live,
   stop, edit a word, optionally add a schedule, send; force-stop and
   relaunch to confirm persistence.
6. Update `CLAUDE.md` Status and `PROGRESS.md` (stage advance + decision-log
   entry for plan approval, then implementation/gate outcome).

## Verification

**Headless gates:** `npm test` (all suites green, including the existing
unmodified `TaskComposer` schedule/recurrence cases plus the new voice
cases), `npm run typecheck`, `npm run lint`, `npm run format:check`.

**Grep/diff checks:**
- `git diff --stat` touches only `TaskComposer.tsx`,
  `TaskComposer.test.tsx`, `CLAUDE.md`, `PROGRESS.md` — no
  `NoteComposer.tsx`, `useVoiceCapture.ts`, or `mergeVoiceTranscript.ts`
  change, no `package.json` change, no new file under `src/app/`.

**On-device verification (Android, DoD 12):** on a physical device (Pixel
6a or 10 Pro, both already confirmed working for `expo-speech-recognition`
per F6's on-device pass), tap `task-mic`, speak a short task, confirm live
partial transcription, stop, edit by typing, optionally set a schedule via
the existing 🕐 control, send, confirm the task appears in the Open list,
force-stop and relaunch to confirm persistence. No emulator/WAV-injection
path is needed for this feature — F6 already established that real-device
testing is the reliable path for this native module, and a physical device
is on hand.

## Risks / tradeoffs
- **Duplicated mic-button styles/markup between `NoteComposer` and
  `TaskComposer`.** Accepted, matching this codebase's existing pattern of
  each composer owning its own `StyleSheet` rather than sharing one — see
  Approach. If a third composer ever needs voice capture, that's the trigger
  to extract a shared `MicButton`, not before (avoids premature
  abstraction for two call sites).
- **No new risk surface.** Because `useVoiceCapture`/`mergeVoiceTranscript`
  are unchanged and already exercised on-device by F6, this plan carries
  none of F6's original risks (native-module mock accuracy, cumulative vs.
  incremental transcript behavior, permission-string assumptions) — those
  were already resolved and verified when F6 shipped.

## Critical files
- `src/components/TaskComposer.tsx`
- `src/components/__tests__/TaskComposer.test.tsx`
