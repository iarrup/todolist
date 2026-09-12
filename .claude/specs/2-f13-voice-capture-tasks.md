# Spec: Voice Capture for Tasks (Phase 2 · F13)

## Overview
F13 extends F6's voice-to-text capture — currently only available in
`NoteComposer` — to `TaskComposer`. A mic button, identical in behavior to
the note composer's, lets the user speak a task instead of typing it: tapping
the mic starts on-device speech recognition, recognized text streams live
into the same text field the user already types into, and tapping again (or
end-of-speech) stops it. No new screen, no transcript-review step — voice is
just another way to fill the same text field, exactly as in F6. This closes a
gap surfaced during on-device testing of the finished Phase 2 feature set
(F7–F12): task capture had every affordance note capture has except voice.
This is a user-directed addition, not a line item in `ideas-refined.md`
(which lists "Add by voice" only under Notes) — added by explicit user
decision after trying the app on-device, scoped as pure reuse rather than new
design.

## Depends on
- **F6 — Voice capture (DONE):** provides the two pieces this feature wires
  into `TaskComposer` **unchanged** — `useVoiceCapture`
  (`src/hooks/useVoiceCapture.ts`) and `mergeVoiceTranscript`
  (`src/lib/mergeVoiceTranscript.ts`). Both already operate on a generic
  `value`/`setValue` pair with no note-specific assumptions, and
  `expo-speech-recognition` is already installed and registered as a config
  plugin in `app.json` — no dependency or native-config work remains.
- **F7 — Task management (DONE):** provides `TaskComposer`, the component
  this feature adds a mic button to, and the existing text input + send
  button flow the transcript feeds into.
- Independent of F8–F12 (list view, scheduling, browsing, recurrence,
  reminders) — the mic button lives in the composer, which those features
  don't touch.

## Files to change
- `src/components/TaskComposer.tsx` — add a mic button beside the existing
  schedule (🕐) and send buttons, wired through `useVoiceCapture(value,
  setValue)` exactly as `NoteComposer` already does: tap-to-toggle, disable
  the `TextInput` only while `status === 'listening'`, render the mic's
  idle/listening/unavailable states with the same `accessibilityState`
  (`selected`/`disabled`) pattern `NoteComposer` uses (so `note-mic`'s test
  patterns carry over 1:1 to a new `task-mic` testID).
- `CLAUDE.md` — update the **Status** section once F13 lands (tracked as F13
  progresses, not part of the initial code diff).
- `PROGRESS.md` — advance F13 through the pipeline stages and record gate
  approvals in the decision log as F13 progresses (tracked separately from
  the code diff).

## Files to create
- **No new library/hook files.** `useVoiceCapture` and `mergeVoiceTranscript`
  are reused as-is; if the technical plan finds either needs even a small
  change to fit `TaskComposer`, that's a signal the reuse assumption was
  wrong and it should come back for a spec/scope discussion rather than
  proceeding.
- **Test additions to `src/components/__tests__/TaskComposer.test.tsx`**
  mirroring `NoteComposer.test.tsx`'s existing voice-flow tests: tapping the
  mic requests permission and starts listening; a mocked partial/final
  result updates the visible task field text (including mid-schedule-pending
  state, to confirm no interaction with F9/F11 UI); tapping again while
  listening stops it and re-enables typing; permission denial leaves the
  composer typeable and disables the mic without re-prompting.

## New dependencies
None. `expo-speech-recognition` is already a dependency and already
configured (Android `RECORD_AUDIO` permission, config plugin in `app.json`)
from F6 — this feature adds zero new packages and requires no new native
prebuild step beyond what F6 already did.

## Rules for implementation
- **Minimalism (minimalism-guard):** the only new UI is one mic button,
  matching F6's footprint exactly — no transcript preview, no waveform, no
  language picker. Voice stays fully opt-in, never a gate in front of typing.
- **One text field, one source of truth:** recognized text (partial and
  final) is written into the exact same `value` state `TaskComposer` already
  uses for typed input — no second "voice result" state.
- **Tap-to-toggle, not press-and-hold:** identical to F6 — no long-press
  interaction on the mic (long-press stays reserved for the edit-in-place
  gesture used elsewhere on task rows).
- **No interaction with scheduling/recurrence:** the mic button sits
  alongside the existing schedule (🕐) and repeat controls without changing
  their layout or logic; voice only ever fills the text field. A pending
  schedule/recurrence must survive using voice for the text, and vice versa.
- **Reuse F7's save rule:** the send button's enable/disable and trim/empty
  guard continue to run through the composer's existing normalization,
  unchanged — a voice transcript is just text that landed in the field the
  normal way.
- **Permission handling:** requested lazily on first tap (not eagerly on
  screen load) — identical to F6. If denied, the mic shows the same
  disabled/unavailable state F6 defines, and typing/sending a task remains
  fully available.
- **Error / no-speech handling:** identical to F6 — recognition errors or a
  no-speech timeout end listening cleanly without discarding any text
  already in the field.
- **Local-first only, Android is the target surface:** no backend/account/
  API-key code; verify on Android, keep code cross-platform (inherited for
  free since `useVoiceCapture` is platform-agnostic already).
- **No scope creep:** no voice input for `TaskRow`'s inline edit, no voice
  control of scheduling/recurrence/completion, no voice commands, no changes
  to `NoteComposer`/`useVoiceCapture`/`mergeVoiceTranscript` themselves.

## Definition of done
Each item is verifiable by running the app or the test suite:

1. **Mic button is present:** `TaskComposer` shows a mic button beside the
   schedule and send buttons, with a distinct visual state for idle vs.
   listening vs. unavailable.
2. **Tap starts listening:** tapping the mic while idle requests permission
   (if not already granted) and begins listening; the button reflects the
   listening state.
3. **Live partial results appear:** while listening, recognized speech
   appears in the task text field as partial results arrive — verified
   on-device by speaking and watching text form incrementally.
4. **Tap stops listening:** tapping the mic again while listening stops
   recognition; the button returns to idle; the field retains the final
   recognized text.
5. **Result is editable and savable:** after stopping, the transcribed text
   can be edited by typing and is saved via the existing send button through
   the composer's existing validation — the saved task appears in the Open
   list exactly as a typed task would, including with a schedule/recurrence
   set alongside it.
6. **Permission denial doesn't block typing:** if permission is denied, the
   text input and send button remain fully usable for typing a task; the mic
   button reflects a clear disabled/unavailable state.
7. **No-speech / error recovers cleanly:** a no-speech timeout or recognition
   error ends the listening state without crashing and without discarding
   any text already present in the field.
8. **No interference with schedule/recurrence:** setting a schedule and/or
   recurrence, then using voice to fill or extend the text, leaves the
   pending schedule/recurrence unchanged (and vice versa).
9. **No new fields, screens, or dependencies:** grep-checkable — no new
   package in `package.json`, no transcript-review modal/screen, no change
   to `NoteComposer.tsx`, `useVoiceCapture.ts`, or `mergeVoiceTranscript.ts`.
10. **Test passes:** `npm test` passes, including new `TaskComposer` tests
    covering the mic toggle states, partial-result-into-field behavior, and
    permission-denied behavior (mirroring `NoteComposer.test.tsx`).
11. **Quality gates pass:** `npm run typecheck`, `npm run lint`, and
    `npm run format:check` all run clean.
12. **On-device verification:** on an Android device, tap the mic in the
    Tasks tab, speak a short task, watch it transcribe live, stop, edit a
    word by typing, optionally add a schedule, and send — the task appears
    in the Open task list with the edited text and survives a full app
    force-stop + relaunch.
