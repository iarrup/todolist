# Implementation Plan: F6 — Voice Capture

## Context

Phase 1 has shipped F1–F5: local SQLite storage, typed note capture
(`NoteComposer`), a Today view, inline long-press editing, and day/week/month
browsing. F6 is the last Phase 1 feature and closes out `ideas-refined.md`'s
"Add by voice" requirement. It touches only the composer: a mic button beside
the existing send button starts/stops on-device speech recognition
(`expo-speech-recognition`), streaming recognized text **live** into the exact
same `value` state the `TextInput` already uses — no new screen, no separate
transcript-review step, no cloud dependency. Interaction is **tap-to-toggle**
(not press-and-hold), matching the decisions confirmed with the user when the
spec (`.claude/specs/1-f6-voice-capture.md`) was written. This plan implements
that spec exactly; every design call below either follows directly from the
spec or resolves a question the spec explicitly left open for this stage
("technical plan decides").

One practical constraint shaped the verification approach: on-device checks in
this project are driven by me, headlessly, via `adb`/`uiautomator` on an
Android emulator (see prior F3–F5 gate approvals) — I have no microphone.
**Confirmed with the user:** verification will inject a pre-recorded WAV file
as the emulator's virtual mic input (via host-audio-loopback routing) so the
full speak → transcribe → save flow can still be verified end-to-end without a
human present. This is a new technique for this project and is called out
explicitly in Risks.

## Approach

Bottom-up: a pure, headlessly-testable merge helper first, then a stateful
hook wrapping the native module, then the component wiring, then tests, then
the native rebuild + on-device pass last — mirroring how F5 layered its work.

**Key design decisions:**

- **A `useVoiceCapture` hook, not inline in `NoteComposer`.** `NoteComposer`
  already owns text state, the trim/submit guard, and layout; adding
  permission-lifecycle handling and three `useSpeechRecognitionEvent`
  subscriptions directly would mix concerns. Same reasoning F5 used to extract
  `useNoteEditing` out of `NoteList`. Lives in `src/hooks/` (stateful,
  React-dependent — `src/lib/` stays pure-function-only, per F5's convention).
  Surface: `{ status: 'idle' | 'listening' | 'unavailable', toggle: () => void }`.
- **One source of truth, enforced by construction.** The hook is called as
  `useVoiceCapture(value, setValue)` and never owns its own transcript state —
  every recognized-text write goes through the exact `setValue` already wired
  to the `TextInput`. No second "voice result" state anywhere (spec rule).
- **Merge is replace-per-event, not append-per-event — isolated in one pure
  function.** `expo-speech-recognition`'s native backing (Android
  `SpeechRecognizer` / iOS `Speech`) delivers each `result` event as the
  *cumulative* hypothesis for the current listening session, not an
  incremental delta. So each event rebuilds `value` from a **snapshot taken
  when listening started** (`baseText`) plus the latest transcript, rather
  than concatenating onto whatever `value` currently is (which would
  duplicate words on every partial update). This is the single riskiest,
  most native-behavior-dependent assumption in the plan, so it's isolated in
  `mergeVoiceTranscript(baseText, transcript)` — fully unit-testable, and a
  one-function fix if on-device testing shows the real stream is incremental
  instead (see Risks).
- **`continuous: true`, `interimResults: true`** on `start()`. Tap-to-toggle
  means the *user* decides when listening ends, not the recognizer — without
  `continuous: true` the native recognizer would auto-stop after one
  utterance, silently breaking "tap again to stop."
- **Typing is disabled while actively listening** (`editable={status !==
  'listening'}`) — this resolves the spec's explicitly open question. The
  hook snapshots `baseText` once, at listening-start; if the user typed
  concurrently, each incoming `result` event would silently overwrite those
  keystrokes (since the merge always rebuilds from the frozen snapshot, not
  from whatever `value` has become since). Disabling input during listening
  removes that race entirely. DoD 5 only requires editability *after*
  stopping — this satisfies it — and native `TextInput` `editable={false}`
  styling is stock RN behavior, not new custom chrome, so it doesn't conflict
  with the spec's "only new chrome is the mic button's own visual state" rule.
- **Mic button: three visual states, one `Pressable`, testID `note-mic`**
  (matches the `note-send` naming convention):
  - **idle** — gray fill (`#8a8a8e`), label "Mic", `accessibilityLabel="Start
    voice input"`, `accessibilityState={{ disabled: false, selected: false }}`.
  - **listening** — red fill (`#EF4444`), label "Stop", `accessibilityLabel="Stop
    voice input"`, `accessibilityState={{ disabled: false, selected: true }}`.
  - **unavailable** — idle fill + `opacity: 0.4` (same technique as
    `sendButtonDisabled`), `disabled` set, `accessibilityLabel="Voice input
    unavailable"`, `accessibilityState={{ disabled: true, selected: false }}`.
  No icon library added — the existing send button is plain `Text`, this
  mirrors it exactly (no `@expo/vector-icons` anywhere in this repo today).
- **Permission-denied state is in-memory only, not persisted to disk.** After
  one denial, `status` flips to `'unavailable'` and `toggle()` short-circuits
  without re-requesting for the rest of the mount — satisfying "clear
  non-blocking state, no re-prompt spam" without adding a persistence layer.
  On a fresh launch, the OS remains the durable source of truth for the real
  grant. Documented as an accepted characteristic in Risks, not a gap.
- **Optimistic `listening` transition.** `status` flips to `'listening'`
  synchronously right after `ExpoSpeechRecognitionModule.start()` is called,
  not after waiting for a native `"start"` event — instant UI feedback; a
  failed native start is caught by the `"error"` event flipping status back
  within one event-loop turn. No `"start"` listener is added (unused
  otherwise — consistent with F5's "don't add unused symmetry" rule).

## Files to create

**1. `src/lib/mergeVoiceTranscript.ts`** — pure, no RN imports:

```ts
/**
 * Pure merge rule for streaming speech-recognition transcripts into the
 * composer's text field. expo-speech-recognition delivers each `result`
 * event (partial or final) as the *cumulative* hypothesis for the current
 * listening session, not an incremental delta — so each event replaces the
 * previous transcript rather than appending to it. `baseText` is whatever
 * was in the field the moment listening started; it is always preserved as
 * a prefix so voice capture never discards existing content.
 */
export function mergeVoiceTranscript(baseText: string, transcript: string): string {
  if (transcript.length === 0) return baseText;
  if (baseText.length === 0) return transcript;
  const needsSpace = !/\s$/.test(baseText);
  return baseText + (needsSpace ? ' ' : '') + transcript;
}
```

**2. `src/lib/__tests__/mergeVoiceTranscript.test.ts`**:

```ts
import { describe, expect, it } from '@jest/globals';

import { mergeVoiceTranscript } from '../mergeVoiceTranscript';

describe('mergeVoiceTranscript', () => {
  it('returns the transcript alone when there is no base text', () => {
    expect(mergeVoiceTranscript('', 'hello world')).toBe('hello world');
  });

  it('appends after a single space when base text has no trailing whitespace', () => {
    expect(mergeVoiceTranscript('shopping:', 'milk')).toBe('shopping: milk');
  });

  it('does not double a trailing space already present on the base text', () => {
    expect(mergeVoiceTranscript('shopping: ', 'milk')).toBe('shopping: milk');
  });

  it('returns the base text unchanged when the transcript is empty', () => {
    expect(mergeVoiceTranscript('kept', '')).toBe('kept');
  });

  it('replaces the previous transcript on each call rather than concatenating', () => {
    expect(mergeVoiceTranscript('note:', 'milk')).toBe('note: milk');
    expect(mergeVoiceTranscript('note:', 'milk and eggs')).toBe('note: milk and eggs');
  });
});
```

**3. `src/hooks/useVoiceCapture.ts`**:

```ts
import { useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import { mergeVoiceTranscript } from '@/lib/mergeVoiceTranscript';

export type VoiceCaptureStatus = 'idle' | 'listening' | 'unavailable';

export interface VoiceCaptureController {
  status: VoiceCaptureStatus;
  toggle: () => void;
}

/**
 * Wires expo-speech-recognition's start/stop + event stream into the
 * composer's existing value/setValue text state — no separate "voice
 * transcript" state (one field, one source of truth). Permission is
 * requested lazily on the first tap, never on mount. One denial flips
 * status to 'unavailable' for the rest of this mount so the mic button
 * stops re-prompting on every tap; typing stays available regardless of
 * status (the caller disables the TextInput only while status === 'listening').
 */
export function useVoiceCapture(
  value: string,
  setValue: (text: string) => void,
): VoiceCaptureController {
  const [status, setStatus] = useState<VoiceCaptureStatus>('idle');
  const baseTextRef = useRef('');
  const valueRef = useRef(value);
  valueRef.current = value;

  useSpeechRecognitionEvent('result', (event) => {
    if (status !== 'listening') return;
    const transcript = event.results[0]?.transcript ?? '';
    setValue(mergeVoiceTranscript(baseTextRef.current, transcript));
  });

  useSpeechRecognitionEvent('error', (event) => {
    setStatus(event.error === 'not-allowed' ? 'unavailable' : 'idle');
  });

  useSpeechRecognitionEvent('end', () => {
    setStatus((current) => (current === 'unavailable' ? 'unavailable' : 'idle'));
  });

  async function start() {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setStatus('unavailable');
      return;
    }
    baseTextRef.current = valueRef.current;
    setStatus('listening');
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: true });
  }

  function stop() {
    ExpoSpeechRecognitionModule.stop();
    setStatus('idle');
  }

  function toggle() {
    if (status === 'unavailable') return;
    if (status === 'listening') stop();
    else void start();
  }

  return { status, toggle };
}
```

No dedicated `useVoiceCapture.test.ts` — mirrors F5's precedent of testing
`useNoteEditing` only through its consuming component's test file, not at the
hook level. `NoteComposer.test.tsx`'s new cases are the hook's coverage;
`mergeVoiceTranscript` covers the one piece of logic worth isolating.

## Files to change

**`src/components/NoteComposer.tsx`** — add the mic button and wire the hook:

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { normalizeNoteInput } from '@/lib/noteInput';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';

interface NoteComposerProps {
  onSubmit: (text: string) => void;
}

export function NoteComposer({ onSubmit }: NoteComposerProps) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const voice = useVoiceCapture(value, setValue);

  const trimmed = normalizeNoteInput(value);
  const canSubmit = trimmed !== null;

  const handleSend = () => {
    if (trimmed === null) return;
    onSubmit(trimmed);
    setValue('');
  };

  const micLabel =
    voice.status === 'listening'
      ? 'Stop voice input'
      : voice.status === 'unavailable'
        ? 'Voice input unavailable'
        : 'Start voice input';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <TextInput
        testID="note-input"
        style={styles.input}
        value={value}
        onChangeText={setValue}
        editable={voice.status !== 'listening'}
        placeholder="Write a note…"
        placeholderTextColor="#8a8a8e"
        multiline
        submitBehavior="newline"
      />
      <Pressable
        testID="note-mic"
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
        <Text style={styles.micButtonText}>{voice.status === 'listening' ? 'Stop' : 'Mic'}</Text>
      </Pressable>
      <Pressable
        testID="note-send"
        accessibilityRole="button"
        accessibilityLabel="Save note"
        accessibilityState={{ disabled: !canSubmit }}
        disabled={!canSubmit}
        onPress={handleSend}
        style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
      >
        <Text style={styles.sendButtonText}>Send</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(120,120,128,0.3)' },
  input: { flex: 1, minHeight: 40, maxHeight: 140, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, fontSize: 16, backgroundColor: 'rgba(120,120,128,0.12)' },
  micButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#8a8a8e' },
  micButtonListening: { backgroundColor: '#EF4444' },
  micButtonDisabled: { opacity: 0.4 },
  micButtonText: { color: '#fff', fontWeight: '600' },
  sendButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: '#208AEF' },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { color: '#fff', fontWeight: '600' },
});
```

**`src/components/__tests__/NoteComposer.test.tsx`** — add this repo's first
explicit native-module mock (same inline style as the existing
`react-native-safe-area-context` mock in this file) plus five new cases,
alongside the three existing unmodified tests:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';

import { NoteComposer } from '../NoteComposer';

jest.mock('react-native-safe-area-context', () => ({
  ...(jest.requireActual('react-native-safe-area-context') as object),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// First native-module mock in this repo: expo-speech-recognition has no
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

import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

function emitSpeechEvent(eventName: string, event: unknown) {
  const calls = [...(useSpeechRecognitionEvent as jest.Mock).mock.calls].reverse();
  const call = calls.find(([name]) => name === eventName);
  if (!call) throw new Error(`no "${eventName}" handler registered`);
  act(() => (call[1] as (e: unknown) => void)(event));
}

describe('NoteComposer', () => {
  // ...the 3 existing tests stay unmodified (trim/submit/clear, multiline, empty-rejected)...

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

  it('streams partial results into the field, preserving pre-typed text', async () => {
    const { getByTestId } = render(<NoteComposer onSubmit={jest.fn()} />);
    fireEvent.changeText(getByTestId('note-input'), 'shopping:');
    await act(async () => {
      fireEvent.press(getByTestId('note-mic'));
    });
    emitSpeechEvent('result', { results: [{ transcript: 'milk', confidence: 0.9 }], isFinal: false });
    expect(getByTestId('note-input').props.value).toBe('shopping: milk');
    emitSpeechEvent('result', { results: [{ transcript: 'milk and eggs', confidence: 0.95 }], isFinal: true });
    expect(getByTestId('note-input').props.value).toBe('shopping: milk and eggs');
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
    (ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
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
```

**`app.json`** — insert into `plugins`, after `"expo-sqlite"` (same
`[name, config]` two-element form already used for `expo-splash-screen`):

```json
"plugins": [
  "expo-router",
  ["expo-splash-screen", { "backgroundColor": "#208AEF", "image": "./assets/images/splash-icon.png", "imageWidth": 76 }],
  "expo-sqlite",
  [
    "expo-speech-recognition",
    {
      "microphonePermission": "Allow $(PRODUCT_NAME) to use the microphone.",
      "speechRecognitionPermission": "Allow $(PRODUCT_NAME) to use speech recognition.",
      "androidSpeechServicePackages": ["com.google.android.googlequicksearchbox"]
    }
  ]
]
```

**`package.json`** — one new dependency line (alphabetical, between
`expo-router` and `expo-splash-screen`): `"expo-speech-recognition": "~57.0.0"`
(confirmed against the npm registry: current published version is exactly
`57.0.0`, `peerDependencies: { expo: '*', react: '*', 'react-native': '*' }`).

**`CLAUDE.md`** / **`PROGRESS.md`** — doc-only updates once implementation and
the gate pass, matching the exact pattern used for F2–F5 (Status section,
pipeline stage, decision-log entry).

## New dependencies

- **`expo-speech-recognition`**, pinned `~57.0.0` (verified current on npm).
  Community Expo config-plugin module wrapping native Android
  `SpeechRecognizer` / iOS `Speech`; no API key, no required network call for
  Android on-device recognition — the one approved exception to "no new
  dependencies" in this project's Phase 1 specs, per the approved spec.
- **Requires a native rebuild** — not available in Expo Go. After `npm
  install` + the `app.json` plugin change: `npx expo prebuild --platform
  android` (regenerates `android/`, wiring `RECORD_AUDIO` + speech
  permissions into the manifest) then `npx expo run:android`.

## Ordered implementation steps

1. `npm install expo-speech-recognition@~57.0.0`.
2. Add the config plugin block to `app.json`; `npx expo prebuild --platform
   android`; confirm `RECORD_AUDIO` + speech permissions land in the
   generated manifest. *(prerequisite for DoD 2, 6, 12)*
3. Create `src/lib/mergeVoiceTranscript.ts` + its test. *(DoD 3, 5, 9)*
4. Create `src/hooks/useVoiceCapture.ts`. *(DoD 1, 2, 3, 4, 6, 7)*
5. Update `src/components/NoteComposer.tsx` — mic button, `editable` wiring,
   styles. *(DoD 1, 2, 3, 4, 5, 6, 7, 8)*
6. Add the `expo-speech-recognition` jest mock + five new test cases to
   `NoteComposer.test.tsx`. *(DoD 1–7, 9)*
7. Headless gates: `npm test`, `npm run typecheck`, `npm run lint`, `npm run
   format:check`. *(DoD 9, 10)*
8. Grep checks for DoD 8 (no new fields/screens) and DoD 11 (no forbidden
   network/cloud surface) — see Verification.
9. Set up host-audio-loopback WAV injection (see Verification) and
   `npx expo run:android` on the Pixel 10 Pro emulator; walk the full DoD 12
   checklist end-to-end, including the injected-audio speak step.
10. Update `CLAUDE.md` Status and `PROGRESS.md` (stage advance + decision-log
    entry for plan approval, then implementation/gate outcome).

## Verification

**Headless gates:** `npm test` (all suites green, including the 3 existing
unmodified `NoteComposer` cases + new `mergeVoiceTranscript` + new
`NoteComposer` voice cases), `npm run typecheck`, `npm run lint`, `npm run
format:check`.

**Grep checks:**
- DoD 8 (no new fields/screens): no new file under `src/app/`; no new
  `Modal` usage; no `title`/`tag`/`transcriptPreview`/`language`/waveform
  state or props anywhere in the diff.
- DoD 11 (no forbidden cloud surface): `grep -rn "fetch(\|axios\|XMLHttpRequest\|https://api\."
  src/` and `grep -rn "apiKey\|API_KEY\|Authorization:" src/` show no new
  hits from this feature's code (the native module's own internals are out of
  this project's code and out of scope for the check).

**On-device verification (Android, DoD 12) — WAV-injection method, per
the user's confirmed choice:**
1. On the Pixel 10 Pro emulator, enable **Extended Controls → Microphone →
   "Virtual microphone uses host audio input."**
2. Route a short pre-recorded WAV (e.g. "buy milk") into the host's audio
   input via a loopback: on Linux, a PulseAudio/PipeWire null-sink +
   loopback module set as the default source (`pactl load-module
   module-null-sink` / `module-loopback`, or the `pw-loopback` equivalent
   under PipeWire), then play the WAV into that sink (`paplay`/`pw-play`)
   while the emulator "listens" via host-audio passthrough. **This exact
   recipe is new to this project and must be validated as the first
   implementation step of stage 9** — document whatever concrete commands
   actually work in this environment as part of that step, since the
   available audio server (PulseAudio vs. PipeWire vs. other) is
   environment-dependent (see Risks).
3. Drive the rest via `adb`/`uiautomator` as usual: launch the app, tap
   `note-mic`, confirm the permission prompt appears and the button switches
   to its listening state, trigger playback of the WAV into the loopback
   sink, confirm the field fills in with the recognized text (partial then
   final), tap `note-mic` again to stop, confirm typing/editing works, tap
   `note-send`, confirm the note appears in the Today list.
4. Force-stop and relaunch — confirm the note persisted.
5. Reset app permissions (or use a fresh install) and repeat the mic tap —
   confirm the composer stays typeable, the mic button shows its
   disabled/unavailable state, no crash, and a second tap does not
   re-prompt.
6. Trigger a no-speech case (tap mic, do not play any audio, wait for the
   recognizer's timeout) — confirm listening ends cleanly and any existing
   field text is untouched.

## Risks / tradeoffs

- **WAV-injection mic testing is new to this project and inherently
  environment-dependent.** There is no established recipe in this repo for
  feeding synthetic audio into the emulator's microphone. The loopback setup
  (PulseAudio vs. PipeWire, exact module names, whether the CI/dev host even
  has an audio server running) will need to be worked out and documented
  during implementation step 9, not assumed to work on the first try. If it
  proves unworkable in this specific environment, escalate back to the user
  for the fallback (a short manual speaking pass) rather than silently
  skipping DoD 3/12's live-transcription check.
- **First native-module jest mock in this repo — accepted headless/on-device
  gap.** The mocked `ExpoSpeechRecognitionModule`/`useSpeechRecognitionEvent`
  surface and event payload shapes are authored from the package's published
  README (verified via web research), not from having run the real native
  module before this plan. Two assumptions carry the most risk: (a) that
  `result` events are cumulative-per-session, not incremental (drives
  `mergeVoiceTranscript`'s replace-not-append design), and (b) the exact
  error string for permission denial (`"not-allowed"`). If either is wrong,
  headless tests can pass while on-device behavior diverges — same category
  of limitation F4's plan flagged for its own headless coverage. Mitigation:
  DoD 12's on-device pass (now with real injected audio, not just button-state
  checks) is mandatory, and the riskiest assumption is isolated in the small
  `mergeVoiceTranscript` function, not spread across the hook/component.
- **`androidSpeechServicePackages` device-availability variance.** Pinning to
  Google's speech service assumes Google Play Services is present — true for
  the Pixel 10 Pro emulator image used in this project, but if `start()`
  fails with a service-unavailable error during on-device testing, that's a
  device/emulator limitation to document per the spec's own local-first
  carve-out language, not a code defect to chase.
- **Typing-disabled-while-listening tradeoff.** Chosen to eliminate a silent
  data-loss race between live partial-result writes and concurrent manual
  edits. Costs the ability to correct a word mid-listen without stopping
  first; accepted as consistent with the spec's minimal-chrome intent (DoD 5
  only requires post-stop editability).
- **In-memory-only permission-denied state.** `status === 'unavailable'`
  resets on every fresh mount/relaunch by design — the OS grant is the
  durable state; re-querying on next launch is correct, not a missed
  persistence requirement.
- **Expo Go incompatibility.** `expo-speech-recognition` requires the custom
  dev-client build (`npx expo run:android`); it is unavailable under plain
  Expo Go. Consistent with how this project already builds per CLAUDE.md, but
  the first native module in this app requiring that path explicitly.

## Critical files
- `src/components/NoteComposer.tsx`
- `src/hooks/useVoiceCapture.ts`
- `src/lib/mergeVoiceTranscript.ts`
- `src/components/__tests__/NoteComposer.test.tsx`
- `app.json`
</content>
