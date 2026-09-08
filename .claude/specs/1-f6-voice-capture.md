# Spec: Voice Capture (Phase 1 · F6)

## Overview
F6 adds hands-free note capture: a mic button in the existing `NoteComposer`
lets the user speak a note instead of typing it. Tapping the mic starts
on-device speech recognition; the recognized text streams live into the same
composer text field the user already types into, so partial results are
visible as they're spoken and the result is immediately editable — no new
screen, no separate "review transcript" step. Tapping the mic again (or the
recognizer reaching a natural end-of-speech) stops listening; the user then
saves with the existing send button, exactly as with a typed note. This closes
out Phase 1's note-taking feature set (typing done in F2, editing in F4,
browsing in F5) per `ideas-refined.md`'s "Add by voice" requirement. Per
decisions confirmed with the user for this feature: transcription uses
`expo-speech-recognition` (wraps the native platform speech APIs —
Android `SpeechRecognizer` / iOS `Speech` framework — no cloud API key,
consistent with Phase 1's local-first constraint), the mic is a **tap-to-toggle**
control (not press-and-hold), and results **stream live** into the composer
rather than appearing only after recognition ends.

## Depends on
- **F2 — Typed note capture (DONE):** provides `NoteComposer` (the text input
  + send button this feature adds a mic button to) and `normalizeNoteInput`
  (`src/lib/noteInput.ts`), reused unchanged for the trim/empty guard on
  send — voice capture does not bypass or duplicate it.
- F6 does not depend on F3/F4/F5 (Today view, edit, time browsing) — the mic
  button lives in the composer, which is unaffected by which view is
  currently showing, and is independent of edit-in-place behavior.

## Files to change
- `src/components/NoteComposer.tsx` — add a mic button beside the existing
  send button; wire it to start/stop `expo-speech-recognition` and write
  partial + final transcript events into the same `value`/`setValue` state
  the text input already uses (no second source of truth for the field's
  text). Handle the listening/error/no-permission states described below.
- `app.json` — add the `expo-speech-recognition` config plugin (required for
  the native permission entries — `RECORD_AUDIO` on Android, microphone/speech
  usage descriptions on iOS) and the `expo-speech-recognition` plugin to the
  `plugins` array, mirroring how `expo-sqlite`'s plugin is already registered.
- `CLAUDE.md` — update the **Status** section once F6 lands (tracked as F6
  progresses, not part of the initial code diff).
- `PROGRESS.md` — advance F6 through the pipeline stages and record gate
  approvals in the decision log as F6 progresses (tracked separately from the
  code diff).

## Files to create
Exact paths are settled in the technical plan; F6 should include:

- **A test** covering the composer's new voice-related logic that *is*
  reasonably unit-testable without a native module — e.g. a small pure helper
  if the technical plan extracts one (such as merging partial-result events
  into composer text, or the permission-denied state transition), and/or a
  component test that mocks `expo-speech-recognition`'s module surface to
  verify: tapping the mic while idle starts listening and toggles button
  state; tapping again while listening stops it; a mocked partial-result
  event updates the visible field text; a mocked permission-denied result
  leaves the composer typeable and surfaces a clear fallback state instead of
  crashing.
- No new files are required beyond the composer changes and its test unless
  the technical plan finds a dedicated speech-state hook/helper clarifies the
  component (e.g. `src/hooks/useVoiceCapture.ts`) — optional, not required by
  this spec.

## New dependencies
- **`expo-speech-recognition`** (community Expo config-plugin module) — wraps
  Android `SpeechRecognizer` and iOS `Speech`/`SFSpeechRecognizer` for
  on-device/platform speech-to-text. No API key, no required network call for
  Android on-device recognition. This is the one approved exception to "no
  new dependencies" seen in prior Phase 1 specs, since voice capture is
  impossible without a speech engine.
- Adding this dependency requires a native rebuild (`npx expo prebuild
  --platform android` regenerating `android/`, then `npx expo run:android`)
  since the module isn't available in Expo Go — consistent with how this
  project already builds (see CLAUDE.md build/run instructions).

## Rules for implementation
- **Minimalism (minimalism-guard):** the only new UI is one mic button next
  to send. No transcript preview modal, no "confirm transcript" screen, no
  waveform visualizer, no language picker, no punctuation/formatting toggle.
  The mic button's own visual state (idle / listening) is the only new
  chrome.
- **One text field, one source of truth:** recognized text (partial and
  final) is written into the exact same `value` state `NoteComposer` already
  uses for typed input. The user can type before, during (if the engine
  allows concurrent edits — otherwise disable the input while actively
  listening, technical plan decides), or after using voice — there is no
  separate "voice result" state that gets merged in later.
- **Tap-to-toggle, not press-and-hold:** tapping the mic while idle starts
  listening; tapping again while listening stops it. No long-press
  interaction (long-press is reserved for F4's note-edit gesture on list
  rows, unrelated to this control, but the composer should not overload
  long-press either, to avoid an inconsistent gesture vocabulary).
- **Reuse F2's save rule:** the send button's enable/disable and trim/empty
  guard continue to run through `normalizeNoteInput`, unchanged — a voice
  transcript is just text that landed in the field the normal way.
- **Permission handling:** request microphone/speech-recognition permission
  when the mic is first tapped (not eagerly on screen load). If denied, the
  mic button shows a clear non-blocking state (e.g. disabled or an inline
  hint) and **typing remains fully available** — voice is additive, never a
  blocker to the core capture flow.
- **Error / no-speech handling:** if recognition errors out or ends with no
  speech detected, listening state ends cleanly (mic button returns to idle);
  any text already in the field (partial results received before the error,
  or text the user had already typed) is left as-is, not cleared or
  discarded.
- **Local-first only:** recognition must not require this project to add a
  backend, account, or API key. `expo-speech-recognition`'s Android on-device
  path satisfies this; if the technical plan finds live testing requires
  network-backed recognition on the emulator, that's a device/emulator
  limitation to document, not a change to the local-first requirement.
- **Android is the target surface:** verify on Android; keep code
  cross-platform (`expo-speech-recognition` supports iOS too) but do not
  build/verify iOS or web.
- **No scope creep:** no voice input for editing existing notes (that's a
  natural F4 extension, not part of F6), no voice commands/actions (e.g.
  "delete note"), no task/todo voice capture (Phase 2), no continuous
  background listening.

## Definition of done
Each item is verifiable by running the app or the test suite:

1. **Mic button is present:** the composer shows a mic button beside the
   existing send button, with a distinct visual state when idle vs.
   listening.
2. **Tap starts listening:** tapping the mic while idle requests
   permission (if not already granted) and begins listening; the button
   reflects the listening state.
3. **Live partial results appear:** while listening, recognized speech
   appears in the composer's text field as partial results arrive (not only
   after stopping) — verified on-device by speaking and watching text form
   incrementally.
4. **Tap stops listening:** tapping the mic again while listening stops
   recognition; the button returns to idle; the field retains the final
   recognized text.
5. **Result is editable and savable:** after stopping, the transcribed text
   can be edited by typing (same field, same keyboard) and is saved via the
   existing send button through the existing `normalizeNoteInput` guard and
   `insertNote` — the saved note appears in the list exactly as a typed note
   would.
6. **Permission denial doesn't block typing:** if microphone/speech
   permission is denied, the composer's text input and send button remain
   fully usable for typing; the mic button reflects a clear
   disabled/unavailable state instead of silently failing or crashing.
7. **No-speech / error recovers cleanly:** triggering a no-speech timeout or
   recognition error ends the listening state without crashing and without
   discarding any text already present in the field.
8. **No new fields or screens:** grep-checkable — no new title/tag/metadata
   field, no transcript-review modal/screen, no waveform or language-picker
   UI anywhere in the diff.
9. **Test passes:** `npm test` passes, including new/updated tests covering
   the mic toggle state transitions and (via a mocked `expo-speech-recognition`)
   the partial-result-into-field and permission-denied behaviors.
10. **Quality gates pass:** `npm run typecheck`, `npm run lint`, and
    `npm run format:check` all run clean.
11. **No forbidden surface:** no backend/account/API-key/network-dependent
    transcription code introduced (grep-checkable: no HTTP client to a cloud
    speech API, no auth SDK).
12. **On-device verification:** on an Android device/emulator, tap the mic,
    speak a short note, watch it transcribe live, stop, edit a word by
    typing, and send — the note appears in the Today list with the edited
    text and survives a full app force-stop + relaunch.
</content>
