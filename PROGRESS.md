# Progress — Pocket Notebook

Single source of truth for specs-driven pipeline state.
Stages: **Backlog → Spec → Plan → Impl → Done** (a feature advances only after
`review-and-gate` approval).

## Status board

### Phase 1 — Notes (Mobile)

| # | Feature | One-liner | Depends on | Stage |
|---|---|---|---|---|
| F1 | App foundation & local storage | Cross-platform skeleton + on-device DB wiring + runnable app shell | choose-tech-stack (gated) | Done |
| F2 | Typed note capture | Instant, title-less text note saved locally | F1 | Done |
| F3 | Today view | Default screen listing the current day's notes | F2 | Done |
| F4 | Edit note | Open an existing note and change its text | F2, F3 | Done |
| F5 | Time-based browsing | Day / week / month views of notes | F3 | Done |
| F6 | Voice capture | Voice-to-text entry (mic permission, editable transcript) | F2 | Done |

**Cut lines (out of scope for Phase 1):** tasks/todos (Phase 2); web surface,
sync backend, accounts/auth (Phase 3); keyword search and note→task promotion
(Later); any titles/tags/metadata (minimalism).

**Prerequisite (not a feature):** `choose-tech-stack` — **decided 2026-07-29:
React Native + Expo (TypeScript).** See decision log.

### Phase 2 — Tasks (Mobile)

| # | Feature | One-liner | Depends on | Stage |
|---|---|---|---|---|
| F7 | Task management | Add/edit/delete/complete a task — minimal, text-only, no title | F1 | Done |
| F8 | Task list view | Default view: all open (incomplete) tasks | F7 | Done |
| F9 | Task scheduling | Add a date & time to a task | F7 | Backlog |
| F10 | Task time-based views | Browse tasks by day / week / month / year | F9 | Backlog |
| F11 | Task recurrence | Daily, weekdays, weekends, specific weekdays, monthly, annually | F9 | Backlog |
| F12 | Reminders & snooze | Push notification at due time (incl. recurring instances) + snooze overdue tasks | F9, F11 | Backlog |

**Cut lines (out of scope for Phase 2):** web surface, sync backend,
accounts/auth (Phase 3); keyword search, note→task promotion (Later);
titles/tags/metadata on tasks (minimalism).

### Phase 3 — Web & Sync
Not yet planned (`plan-phase`). Open questions: accounts/auth, conflict handling.

## Decision log

- **2026-09-10** — **F8 (Task list view): implementation gate passed
  (review-and-gate) → F8 is Done.** All 9 spec DoD items verified against
  the diff (matches `.claude/plans/2/f8-tasklist-view.plan.md` exactly — only
  `src/db/tasks.ts` (new `openTasksQuery`), `src/app/tasks.tsx` (query swap),
  `TaskList.tsx` (empty-state copy), and their two test files touched, no
  scope creep). `npm test` (88/88, 1 new test), `tsc`, `expo lint`,
  `prettier --check .` all clean (only the pre-existing, unrelated
  `todolist.code-workspace` warning). Grep check confirmed no forbidden
  surface introduced. **On-device (Pixel_10_Pro emulator):** added tasks,
  confirmed only open tasks show (newest-first); completing a task removed
  it from the list immediately; confirmed directly via the on-device SQLite
  file that a completed task is still stored (`completed=1`), not deleted;
  force-stop + relaunch preserved both the hidden-completed and
  visible-open states; "All caught up!" empty state confirmed both on a
  fresh list and after completing the last remaining task. Long-press-edit
  and swipe-to-delete were also re-verified live on the filtered (open-task)
  list — closing a gap from the first verification pass, which had only
  covered "add" — confirming F7's edit/delete interactions are unaffected by
  F8's filtering (delete needed a retry on the second `adb` tap, matching
  the already-documented `adb`-synthetic-tap-vs-gesture-recognizer quirk
  from the F7 session, not an app defect). No changes requested. Approved
  by: user (arup.chowdhary@gmail.com).
- **2026-09-10** — **F8 (Task list view): technical plan approved
  (review-and-gate).** Plan: `.claude/plans/2/f8-tasklist-view.plan.md` — a
  new `openTasksQuery()` in `src/db/tasks.ts` (filters on `completed = false`,
  newest-first), `src/app/tasks.tsx` swapped to use it, and `TaskList.tsx`'s
  empty-state string changed to "All caught up!". No schema change, no new
  dependencies, no other component touched. One review finding — DoD 6's
  grep-checkable "no forbidden surface" check wasn't an explicit
  implementation step — **fixed** before approval (added as step 6, ahead of
  on-device verification). Approved by: user (arup.chowdhary@gmail.com).
  **Awaiting `implement-feature`.**
- **2026-09-10** — **F8 (Task list view): spec written and gate passed
  (elicited via AskUserQuestion before drafting).** Decisions confirmed with
  the user: completed tasks are **fully hidden** from the Tasks tab (no
  show-completed toggle or archive — completing a task removes it from view
  immediately, with no transient delay/animation); the empty state changes
  from F7's "No tasks yet" to **"All caught up!"** (covers both "no tasks
  exist" and "all tasks are completed"). F8 is filtering-only: a new
  open-only query in `src/db/tasks.ts` plus the empty-state copy change in
  `TaskList` — no schema change, no new UI, add/edit/delete/checkbox
  behavior unchanged from F7. Spec: `.claude/specs/2-f8-tasklist-view.md`.
  Built on branch `feature/tasklist-view`. Approved by: user
  (arup.chowdhary@gmail.com). **Awaiting `write-technical-plan` (no
  implementation yet, per explicit user instruction).**
- **2026-09-09** — **F7 (Task management): implementation gate passed
  (review-and-gate) → F7 is Done.** All 11 spec DoD items verified against
  the diff (headless: 87/87 tests, `tsc`/`expo lint`/`prettier --check .`
  all clean; on-device: Pixel_10_Pro emulator, Notes tab regression-checked
  unaffected, add/edit/complete/delete all confirmed with two independent
  restart-persistence checks). One revision made during this gate (see the
  entry below): delete changed from swipe-alone-deletes to
  swipe-reveals-a-button-then-tap-to-delete, per the user's explicit
  request — re-verified after the change, both headlessly and on-device.
  No other changes requested. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-09** — **F7 (Task management): delete UX revised during
  implementation `review-and-gate` ("request changes") → re-verified,
  re-submitted for gate approval.** The user's requested change: swiping a
  task should **reveal a "Delete" button, not delete immediately** — the
  swipe itself no longer deletes; only an explicit tap on the revealed
  button does. Confirmed the exact interaction via `AskUserQuestion` (with
  ASCII-mockup previews) against a second plausible reading
  ("drag-to-confirm slider") before implementing, since it reverses the
  spec's original swipe-alone-deletes decision. `TaskRow.tsx`'s
  `renderRightActions` now renders a real `Pressable` "Delete" button
  (`testID="task-delete-button"`) instead of a plain colored background;
  `onSwipeableOpen`'s auto-delete is removed; the button calls
  `swipeableRef.current?.close()` then `onDeleteTask(id)`. Updated
  `.claude/specs/2-f7-task-management.md` (rules + DoD item 5) and
  `.claude/plans/2/f7-task-management.plan.md` (design/testing/risks
  sections) to match. `TaskRow.test.tsx` replaced its two
  `onSwipeableOpen`-driven tests with `fireEvent.press` on the real button
  (simpler and more robust — `Swipeable` renders `renderRightActions`'
  content in the tree regardless of swipe state, so no gesture simulation
  is needed at all). `npm test` (87/87), `tsc`, `expo lint`,
  `prettier --check .` all still clean. **Re-verified on-device**
  (Pixel_10_Pro emulator, fresh JS reload — no rebuild needed, JS-only
  change): swiping a task reveals the Delete button **without** deleting it
  (confirmed the task is still present and unchanged after the swipe);
  tapping the revealed button deletes it. Found and documented a
  `adb`-tap-vs-gesture-handler recognition quirk in this session (a `Swipeable`-revealed
  button's first `adb`-synthetic tap is often silently swallowed, needing a
  retry — confirmed via Jest's reliable `fireEvent.press` pass and clean
  logcat that this is a synthetic-input testing-tool artifact, not an app
  bug; full writeup saved to the `android-build-toolchain` memory for future
  sessions building swipeable UI). **Re-submitted for implementation
  `review-and-gate` approval.**
- **2026-09-09** — **F7 (Task management): implemented and verified
  on-device (Pixel_10_Pro emulator) → ready for implementation
  `review-and-gate`.** Built on `feature/task-management` per
  `.claude/plans/2/f7-task-management.plan.md`, step by step, no deviations
  from the plan.
  - **New:** `tasks` table + migration (`drizzle/0001_freezing_rhino.sql`,
    adds only `tasks`, `notes` untouched); `src/db/tasks.ts`
    (insert/list/updateText/setCompleted/delete); `src/hooks/useTaskEditing.ts`;
    `src/components/TaskComposer.tsx`, `TaskRow.tsx`, `TaskList.tsx`; the new
    `src/app/tasks.tsx` screen. `src/app/_layout.tsx` now renders a
    `GestureHandlerRootView` + `Tabs` (Notes | Tasks) instead of a single-screen
    `Stack`. `jest.config.js` gained `setupFiles:
    ['react-native-gesture-handler/jestSetup']`.
  - **Headless:** `npm test` (87/87, 18 suites — 5 new `tasks.test.ts`, 3 new
    `TaskComposer`/6 new `TaskRow`/9 new `TaskList` tests), `tsc`, `expo lint`,
    and `prettier --check .` all pass (one pre-existing, untouched
    `todolist.code-workspace` formatting warning, unrelated to this diff).
    Grep checks confirm no title/tag/due-date/recurrence field and no
    date-picker/notification/network/auth code anywhere in the new files.
  - **On-device (Pixel_10_Pro emulator):** required fixing this session's
    build environment first — `android/local.properties` was missing
    (`sdk.dir` unset) and the shell's default `java`/`javac` weren't the
    pinned JDK 17; both fixed per the `android-build-toolchain` memory notes
    (`sdk.dir=/home/couch-potato/Android/Sdk`,
    `JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64`), then `expo run:android`
    built and installed cleanly. Verified via `adb`/`uiautomator`: Notes tab
    unaffected (still shows the Today browse view, unchanged); Tasks tab
    shows the empty state, then a typed task appears immediately and the
    composer clears; checkbox toggles complete/incomplete immediately
    (glyph + `accessibilityState.checked` both flip); long-press opens
    inline edit pre-filled with the task's text, and blurring (tap another
    focusable element — Android doesn't blur on an empty-area tap) saves the
    edit; swiping a row left deletes it immediately. **Both an edited task
    and a completed task's state were independently confirmed to survive a
    full `am force-stop` + relaunch** (a completed task specifically was
    re-verified after the first pass only incidentally tested it pre-delete).
    No crashes or JS errors in `logcat` throughout the full session.
  - **Awaiting implementation `review-and-gate` approval.**
- **2026-09-09** — **F7 (Task management): spec gate passed → technical
  plan drafted (`write-technical-plan`).** The user directed work straight
  to the technical plan, which is treated as approval of
  `.claude/specs/2-f7-task-management.md` as written (no changes requested).
  Plan: `.claude/plans/2/f7-task-management.plan.md` — new `tasks` table
  (`id`/`text`/`completed`/`createdAt`/`updatedAt`, `completed` as a Drizzle
  boolean-mode integer column) + `src/db/tasks.ts`; a **new, separate**
  `useTaskEditing` hook and `TaskRow`/`TaskList`/`TaskComposer` components
  (deliberately not generalized from F4's `useNoteEditing`/`NoteRow`, since
  those files are outside this spec's change set); a new `tasks` tab screen;
  `_layout.tsx` switches from a single-screen `Stack` to a `Tabs` navigator
  (Notes | Tasks) wrapped in `GestureHandlerRootView` (not previously present
  anywhere in the app — required for the new `Swipeable`-based
  swipe-to-delete). No new dependencies — swipe-to-delete uses the
  already-installed `react-native-gesture-handler`; `jest.config.js` gains
  one `setupFiles` line for its jest mock. Flagged risks: two small,
  deliberate code duplications (`useTaskEditing` vs `useNoteEditing`, and the
  Android-IME-height listener copied into `tasks.tsx`) rather than touching
  F4/F5's already-shipped files or `index.tsx`, both outside this spec's
  file list; multiple swipe rows don't auto-close each other (cosmetic,
  deferred). **Awaiting `review-and-gate` approval before implementation.**
- **2026-09-09** — **F7 (Task management): spec drafted (`create-spec`),
  UX decisions elicited via `AskUserQuestion` before drafting.** Decided with
  the user: tasks get a **bottom tab bar** (Notes | Tasks), not a link/toggle
  on the existing screen; complete/incomplete is toggled via a **checkbox at
  the row start**; delete is **swipe-to-delete** (no persistent delete
  button); edit is **long-press → inline field → auto-save on blur**, the
  same pattern as F4. F7's list is deliberately unfiltered (all tasks,
  newest-first) — open-only filtering is F8's job. New `tasks` table
  (`id`/`text`/`completed`/`createdAt`/`updatedAt`, no schedule/recurrence
  columns yet). No new dependencies (swipe uses the already-installed
  `react-native-gesture-handler`). Spec: `.claude/specs/2-f7-task-management.md`.
  Built on branch `feature/task-management`. **Awaiting `review-and-gate`
  approval before any technical plan.**
- **2026-09-09** — **Phase 2 decomposed into 6 ordered features (F7–F12)
  (`plan-phase`), gate passed → advances out of Backlog planning.** Mirrors
  Phase 1's granularity precedent: task management (CRUD+complete) kept
  separate from its default list view (like F2/F3), scheduling and recurrence
  split into their own features before reminders, and reminders+snooze kept
  as one feature (per the `reminders-and-snooze` skill's own scope) rather
  than split per ideas-refined's two bullets. Two forks confirmed with the
  user (`AskUserQuestion`): (1) keep the 6-feature granularity as proposed,
  not coarser/finer; (2) **F12 (reminders & snooze) depends on both F9
  (scheduling) AND F11 (recurrence)** — reminders ship once, correct for both
  one-off and recurring tasks, rather than shipping early for one-off tasks
  only and retrofitting recurring-task reminders later. Cut lines: web/sync/
  accounts (Phase 3); search, note→task promotion (Later); titles/tags on
  tasks (minimalism). No specs written yet — next step is `write-feature-spec`
  for F7. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-08** — **F6 (Voice capture): verified on a second physical
  device (Pixel 10 Pro, the user's primary phone) and one cosmetic fix
  applied.** Installed the same `arm64-v8a` debug build (matched the Pixel
  6a's architecture, no separate build needed) via wireless `adb`, tunneled
  Metro the same way (`adb reverse tcp:8081 tcp:8081`). Native recognition
  engaged correctly on this device too (confirmed via live-tailed
  `adb logcat`), though its Android/Google-app version emits a different
  native event pattern (`onSegmentResults`/`onEndOfSegmentedSession`
  alongside `onPartialResults`) than the Pixel 6a's simpler
  partial/final-result flow — both are handled by the same `result`
  event/`isFinal` contract from `expo-speech-recognition`'s JS side, so no
  code change was needed for this device specifically. The user confirmed
  transcription itself was fine on both devices; the one real issue raised
  was cosmetic: the mic button showed the literal word "Mic"/"Stop" instead
  of an icon. Decided with the user: use emoji glyphs (🎤 idle/unavailable,
  ⏹ listening) rather than adding an icon library — this project had zero
  icon dependencies before F6, and the approved spec already named
  `expo-speech-recognition` as the one dependency exception, so a second
  dependency for a cosmetic icon wasn't taken without asking. Changed only
  `NoteComposer.tsx`'s `micButtonText` content and style (dropped the
  send-button-matching `color`/`fontWeight`, which have no effect on emoji
  glyphs, in favor of a larger `fontSize: 18` for legibility as an icon).
  No test needed updating (none asserted on the button's text content,
  only `accessibilityState`/`accessibilityLabel`). `npm test` (63/63),
  `tsc`, `expo lint`, Prettier all still pass. Verified visually via
  `adb screencap` on both devices — a real 🎤 renders (not a missing-glyph
  box) in both the idle (gray) and listening (red, ⏹) button states, pixel-
  identical between the Pixel 6a and Pixel 10 Pro. Approved by: user
  (arup.chowdhary@gmail.com).
- **2026-09-08** — **F6 (Voice capture): DoD 3/12 live-transcription gap
  closed for real on a physical device — a genuine bug was found and fixed
  in the process, superseding the "documented gap" entry below.** After the
  emulator-audio limitation was accepted as a documented gap, a physical
  Pixel 6a (Android 16) became available over wireless `adb` debugging mid-session.
  Installed the dev build on it (required a separate `arm64-v8a` Gradle build —
  the existing debug APK was `x86_64`-only from the emulator build) and
  reached Metro via `adb reverse tcp:8081 tcp:8081` (the phone couldn't reach
  the host's LAN IP directly). Live-tailed `adb logcat` while the user
  manually tapped the mic and spoke on real hardware.
  - **Bug found:** the user reported "only last few words are being
    transcribed, the initial message is getting lost." Logs confirmed why:
    with `continuous: true`, the real device's on-device SODA recognizer
    resets its transcript at each detected speech segment (a pause) rather
    than accumulating across the whole listening session — e.g. one segment
    produced "okay let us try the mic test," then the next segment's
    `result` events restarted from empty. `useVoiceCapture`'s merge only
    ever measured against `baseTextRef` frozen at listening-start, so every
    new segment's text silently replaced (instead of appending after) every
    prior segment's already-recognized words.
  - **Fix:** `src/hooks/useVoiceCapture.ts`'s `result` handler now commits
    the merged value into `baseTextRef.current` whenever `event.isFinal` is
    true, so the next segment's interim results build on top of the
    previous segment's committed text instead of the original
    listening-start snapshot. `mergeVoiceTranscript` itself needed no
    change — only how/when its result gets committed as the new base.
  - **New regression test:** `NoteComposer.test.tsx` gained "appends a
    second speech segment after the first instead of overwriting it" (a
    final result committing, followed by a second segment's partial result,
    asserting the field shows both). `npm test` (63/63, 14 suites), `tsc`,
    `expo lint`, Prettier all pass after the fix.
  - **Re-verified on the physical Pixel 6a** after reloading the fixed JS
    bundle (Metro serves fresh JS on relaunch — no APK reinstall needed for
    a JS-only change): user manually spoke a multi-segment sentence with a
    pause in it and confirmed **"Fixed — full text now shows correctly."**
    This closes DoD 3 and the remaining speaking-specific part of DoD 12 for
    real — not merely inferred from native engagement — completing all 12
    spec DoD items. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-08** — **F6 (Voice capture): implementation gate passed
  (review-and-gate) → F6 is Done, with one disclosed, user-approved
  limitation (superseded by the entry above — DoD 3/12 were later verified
  for real on a physical device, which also surfaced and fixed a genuine
  multi-segment transcript bug not caught by the emulator/headless testing
  in this entry).** Implemented on `feature/voice-capture` per
  `.claude/plans/1/f6-voice-capture.plan.md`: `src/lib/mergeVoiceTranscript.ts`
  (pure cumulative-transcript merge), `src/hooks/useVoiceCapture.ts`
  (wraps `expo-speech-recognition`'s start/stop + event stream around the
  composer's existing text state), and `NoteComposer.tsx`'s new mic button
  (testID `note-mic`, tap-to-toggle, idle/listening/unavailable states,
  typing disabled only while actively listening). New dependency
  `expo-speech-recognition@~57.0.0`; `app.json` gained its config plugin
  block (mirroring `expo-splash-screen`'s two-element form).
  - **Headless:** `npm test` (62 tests, 14 suites — 5 new
    `mergeVoiceTranscript` tests in a new suite, 5 new `NoteComposer` voice-flow
    tests using
    this repo's first explicit native-module `jest.mock` — `NoteComposer.test.tsx`
    needed a `beforeEach(() => jest.clearAllMocks())` added since mock call
    counts otherwise leaked across cases, unrelated to prior tests), `tsc`,
    `expo lint` (one `react-hooks/refs` violation fixed by moving the
    `value` ref sync into a `useEffect` instead of writing `.current` during
    render), and Prettier all pass. Grep checks confirm no new
    screens/fields/modals and no cloud/network speech code introduced.
  - **On-device (Android, Pixel 10 Pro emulator):** 11 of 12 spec DoD items
    verified via `expo prebuild` + `expo run:android`, driven headlessly via
    `adb`/`uiautomator`: `expo-speech-recognition` compiled and linked
    cleanly; `RECORD_AUDIO` + speech-recognition `<queries>` visibility
    landed in the generated manifest; tapping the mic triggers a real Android
    permission dialog, and granting it flips the button to its listening
    state (red "Stop", `selected=true`) while disabling the text input;
    tapping again stops listening and re-enables typing; denying the
    permission (including a hard `pm revoke` + fresh prompt) leaves the
    composer fully typeable with the mic showing a clear
    disabled "Voice input unavailable" state and does **not** re-prompt on a
    second tap; typing, sending, and persistence across a force-stop +
    relaunch all work unaffected by the new mic UI, with the native
    `SpeechRecognizer`/on-device SODA engine confirmed engaging correctly
    (verified via logcat: `onStartListening`, `onMicrophoneOpened`, and
    continuous mic-buffer delivery to the offline recognizer) and no crashes
    or JS errors throughout. **Not independently verified: DoD 3 (live
    partial-result streaming while actually speaking) and the speaking-specific
    part of DoD 12.** Root cause, diagnosed in-session: this sandboxed dev
    environment's headless emulator can inject synthesized speech as virtual
    mic input at the OS audio-routing level (confirmed working end-to-end via
    a PulseAudio null-sink + loopback carrying an `espeak-ng`-synthesized
    WAV, verified reaching the guest's `AudioRecord`/SODA pipeline as
    continuous buffers) but QEMU's own audio driver fails to initialize
    (`Could not init 'pa' audio driver`) even with the required client
    libraries (`libpulse0`, `pipewire-pulse`) present and working for every
    other process on the host — most likely a sandbox-level restriction on
    IPC/shared-memory syscalls specific to how the emulator process is
    launched in this session, not fixable via emulator flags, env vars, or
    alternate `-audio` backends (all attempted). This blocks *any* audio
    reaching this specific emulator instance, not just the WAV-injection
    technique — a genuine, disclosed infrastructure limitation, not a code
    defect, distinct from `expo-speech-recognition`'s own (separately
    verified) correct engagement of the platform recognizer. **Decision,
    made with the user after exhausting the fallback options in the
    approved plan's Risks section (WAV injection → troubleshoot further →
    accept as documented gap):** mark F6 Done with this one caveat rather
    than block on a physical-device test. Approved by: user
    (arup.chowdhary@gmail.com).
- **2026-09-07** — **F6 (Voice capture): technical plan approved (review-and-gate,
  via Claude Code Plan Mode).** Plan: `.claude/plans/1/f6-voice-capture.plan.md`
  — adds a mic button to `NoteComposer` wired through a new `useVoiceCapture`
  hook (`src/hooks/useVoiceCapture.ts`) around `expo-speech-recognition`, with
  the cumulative-transcript merge logic isolated in a pure
  `src/lib/mergeVoiceTranscript.ts` helper. Two open calls the spec left for
  this stage were resolved: typing is **disabled while actively listening**
  (avoids a silent data-loss race between live partial-result writes and
  concurrent keystrokes; DoD 5 only requires post-stop editability), and
  permission-denied state is **in-memory only** (not persisted — the OS
  remains the durable source of truth for the grant, so a fresh launch
  re-queries rather than duplicating that state). New dependency:
  `expo-speech-recognition@~57.0.0` (verified current on npm), requiring a
  native rebuild (`expo prebuild` + `expo run:android`) since it has no Expo
  Go support — the one dependency exception this project's Phase 1 specs
  allow, per the approved spec. **Verification method decided with the
  user:** since on-device checks in this project are driven headlessly via
  `adb`/`uiautomator` with no human microphone available, DoD 3/12's live
  speech-to-text checks will be done by injecting a pre-recorded WAV as the
  emulator's virtual mic input via host-audio-loopback routing — a new
  technique for this project, flagged in the plan's Risks section as
  environment-dependent and to be worked out during implementation, with a
  manual-verification fallback if it proves unworkable. Approved by: user
  (arup.chowdhary@gmail.com).
- **2026-09-07** — **F6 (Voice capture): spec written and gate passed
  (elicited via AskUserQuestion before drafting).** Decisions confirmed with
  the user: transcription engine is **`expo-speech-recognition`** (on-device/
  platform speech APIs, no cloud key — keeps Phase 1 local-first), the mic
  control is **tap-to-toggle** (not press-and-hold), and recognized text
  **streams live** into the existing composer field as partial results
  arrive, rather than only appearing after recognition stops. Spec:
  `.claude/specs/1-f6-voice-capture.md`. Built on branch
  `feature/voice-capture`.
- **2026-09-07** — **F5 (Time-based browsing): implementation gate passed
  (review-and-gate) → F5 is Done.** All 14 spec DoD items verified against
  the diff (matches `.claude/plans/1/f5-time-based-browsing.plan.md` exactly,
  no scope creep — `NoteList.test.tsx` required zero changes despite the
  underlying refactor, as the plan required). One disclosed deviation from
  the plan's literal code: `index.tsx`'s `useLiveQuery` call needed an
  explicit `deps` array (`[granularity, anchorDate.getTime()]`) the plan
  snippet omitted, without which the live query silently never re-subscribed
  on browsing-state changes — a real bug caught only by on-device testing,
  fixed within the same already-listed file, not a scope expansion. `npm
  test` (52/52, 13 suites), `tsc`, `expo lint`, `prettier --check src/` all
  clean; no new dependencies; on-device verification (Pixel 10 Pro emulator)
  passed in full, including edits surviving a force-stop + relaunch. No
  changes requested. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-07** — **F5 (Time-based browsing): implemented** on
  `feature/time-based-browsing` per `.claude/plans/1/f5-time-based-browsing.plan.md`.
  Built bottom-up: `db/weekRange.ts`/`monthRange.ts` (Sunday-start weeks),
  `lib/formatWeek.ts`/`formatMonth.ts`, `lib/stepDate.ts` (month-end clamping,
  e.g. Jan 31 → Feb 28 not March), `lib/groupNotesByDay.ts`, a generalized
  `db/notes.ts` (`notesForRangeQuery` + `notesForWeekQuery`/`notesForMonthQuery`
  + a `notesForGranularityQuery` dispatcher), `hooks/useNoteEditing.ts` +
  `components/NoteRow.tsx` (extracted from `NoteList` so day and week/month
  views share one edit code path), `components/GroupedNoteList.tsx`
  (`SectionList`, day sub-headings reuse `formatDayHeading`), and
  `components/BrowseHeader.tsx` (prev/next, tap-to-jump-to-today, Day/Week/
  Month segmented control), which replaces and deletes `DayHeading.tsx`.
  `index.tsx` now owns `granularity`/`anchorDate` browsing state.
  - **Bug found and fixed during implementation:** `drizzle-orm/expo-sqlite`'s
    `useLiveQuery(query, deps = [])` only re-subscribes when `deps` changes —
    called without a `deps` array (as F1–F4 always had it, harmlessly, since
    their query never changed after mount), the effect ran once and silently
    kept serving the initial "today" query forever, updating only on DB
    writes. This was invisible in the heading (pure local state) but meant
    the note list never actually re-scoped when navigating. Fixed by passing
    `[granularity, anchorDate.getTime()]` as `deps` in `index.tsx`. Caught
    only during on-device verification — headless tests and typecheck/lint
    all passed with the bug present, since the bug is in the live-query
    wiring, not any unit-testable pure function.
  - **Headless:** `npm test` (52 tests, 13 suites — 21 new tests across 8 new
    suites; `NoteList.test.tsx` required zero changes despite the underlying
    refactor), `tsc`, `expo lint`, and Prettier (on `src/`) all pass. Grep
    checks confirm `index.tsx` has no inline range/grouping logic and no
    calendar-grid/date-picker/network/auth code was introduced. No new
    dependencies (`package.json` diff is empty).
  - **On-device (Pixel 10 Pro emulator):** built and installed via
    `expo run:android`; driven via `adb`/`uiautomator`. Verified against real
    seed data spanning Sep 2–7, 2026 (multiple days/weeks): day prev/next
    navigation scopes correctly (confirmed against known per-day note counts
    for Sep 2/3/4/5/6/7); tap-heading jumps to today; Week view groups by day
    with correct sub-headings and newest-first ordering, "This Week" label,
    and an "Aug 30 – Sep 5" range label when browsing the prior week (month
    repeated on both ends, per the confirmed decision); Month view likewise
    ("This Month", "August 2026", "No notes this month" empty state);
    switching granularity mid-browse (week→day and month→day) preserved the
    anchor date instead of resetting to today, in both directions tested;
    long-press-edit verified in both the flat day view and the grouped
    week view (editing a note already visible in a grouped section), with
    both edits persisting across a full `am force-stop` + relaunch. No JS
    errors in logcat throughout (only a benign "Cannot connect to Expo CLI"
    dev-tooling banner from a transient Metro reconnect, unrelated to app
    correctness).
  - Ready for **implementation review-and-gate**.
- **2026-09-07** — **F5 (Time-based browsing): technical plan approved
  (review-and-gate, via Claude Code Plan Mode).** Plan:
  `.claude/plans/1/f5-time-based-browsing.plan.md` — adds week/month range
  helpers (`db/weekRange.ts`, `db/monthRange.ts`, Sunday-start weeks),
  heading formatters (`lib/formatWeek.ts`, `lib/formatMonth.ts`), a
  date-stepper with month-end clamping (`lib/stepDate.ts`), a day-grouping
  helper (`lib/groupNotesByDay.ts`), a shared edit hook + row component
  (`hooks/useNoteEditing.ts`, `components/NoteRow.tsx`) factored out of
  `NoteList` so day and week/month views can't drift in edit behavior, a new
  `GroupedNoteList` (`SectionList`-based) for week/month, and a new
  `BrowseHeader` (prev/next arrows, tap-to-jump-to-today,
  Day/Week/Month segmented control) that replaces `DayHeading`. `db/notes.ts`
  gains one shared range query plus a granularity dispatcher so `index.tsx`
  stays free of range/grouping logic. No new dependencies. Two UX calls
  confirmed with the user before finalizing: the nav-bar's static "Today"
  title (`_layout.tsx`) is left unchanged (the in-screen `BrowseHeader`
  always shows the correct label), and week/month range labels always repeat
  the month on both ends (e.g. "Sep 1 – Sep 7"), not collapsed for
  same-month ranges. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-07** — **F5 (Time-based browsing): spec written and gate passed
  (elicited via AskUserQuestion before drafting).** Scope decided with the
  user: this feature covers **all three granularities** (day, week, month)
  in one pass, not split into a day-nav-only feature. UX decided: **prev/next
  arrows** flanking the heading (not swipe gestures) for navigation, tapping
  the heading label **jumps to today**, week/month notes render as a
  **grouped list by day** (day sub-heading per day with notes, empty days
  omitted — not a calendar grid), and granularity is switched via a
  **segmented Day/Week/Month control** near the heading (not separate
  routes). Editing (F4) keeps working identically in every view. Spec:
  `.claude/specs/1-f5-time-based-browsing.md`. Built on branch
  `feature/time-based-browsing`.
- **2026-09-06** — **F4 (Edit note): implementation gate passed
  (review-and-gate) → F4 is Done.** All 11 spec DoD items verified against
  the diff (matches `.claude/plans/1/f4-edit-note.plan.md` exactly, no scope
  creep): long-press-to-edit, blur-to-save, revert-on-empty, single-editable-
  at-a-time, list order unaffected, `updateNoteText` tested, no delete/nav/
  voice/network code added, `npm test` (20/20), typecheck/lint/format clean,
  on-device verified on the Pixel 10 Pro emulator (immediate update, restart
  survival, revert-on-empty, no crashes in logcat). No changes requested.
  Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-06** — **F4 (Edit note): implemented** on `feature/edit-note` per
  `.claude/plans/1/f4-edit-note.plan.md`. Long-press a note to edit it inline;
  the edit auto-saves on blur (via new `updateNoteText`) unless cleared to
  empty/whitespace, in which case it reverts to the original text — no
  Save/Cancel buttons, no delete, no separate edit screen. Only one note is
  editable at a time (long-pressing another commits/reverts the open one
  first). All 11 spec DoD items covered:
  - **Headless:** `npm test` (20 tests, 5 suites — 4 new `NoteList` edit-flow
    tests and 1 new `updateNoteText` test added to the existing suites),
    `tsc`, `expo lint`, and Prettier all pass. Grep check confirms no delete
    affordance, date-nav control, voice button, or network/auth code in the
    diff.
  - **On-device (DoD 2, 3, 5, 11): verified**, on a headlessly-launched
    Pixel 10 Pro emulator (`expo run:android` → build succeeded, APK
    installed, JS bundle loaded). Driven via `adb`/`uiautomator` (long-press
    simulated as a same-point `input swipe` with a hold duration): captured a
    note, long-pressed it into edit mode (pre-filled with its text), edited
    it and blurred by shifting focus to the composer — the list updated
    immediately with the new text. Force-stopped and relaunched the app —
    the edit survived. Long-pressed again, cleared the text to
    whitespace-only, blurred — the row reverted to the last saved text (not
    deleted, not blank). No crashes or JS errors in `logcat` throughout.
    Single-note case only; multi-note ordering-unaffected-by-edit and
    only-one-editable-at-a-time are covered by the `NoteList` unit tests, not
    re-driven on-device.
  - Ready for **implementation review-and-gate**.
- **2026-09-06** — **F4 (Edit note): technical plan approved (review-and-gate,
  via Claude Code Plan Mode).** Plan: `.claude/plans/1/f4-edit-note.plan.md` —
  adds `updateNoteText` to `src/db/notes.ts`, extends `NoteList` with
  long-press-to-edit/blur-to-commit/revert-on-empty state, wires `index.tsx`.
  No schema/dependency changes. Every implementation step traces to a spec DoD
  item. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-06** — **F4 (Edit note): spec written and gate passed
  (elicited via AskUserQuestion before drafting).** UX decided with the user:
  **long-press** to enter edit (tap reserved, avoids accidental edits),
  **inline** editing in the existing list row (no separate screen/modal),
  **auto-save on blur** (no explicit Save/Cancel), and clearing a note to
  empty/whitespace **reverts** to the original text rather than deleting it
  (delete stays out of scope for F4). Spec: `.claude/specs/1-f4-edit-note.md`.
  Built on branch `feature/edit-note`.
- **2026-09-03** — **F2 (Typed note capture): implementation gate passed
  (review-and-gate) → F2 is Done.** All 9 spec DoD items verified, including
  DoD 1 after the keyboard-avoidance fix below. Approved by: user
  (arup.chowdhary@gmail.com).
- **2026-09-03** — **F2 (Typed note capture): Android keyboard-avoidance
  defect found and fixed during implementation gate review.** DoD item 1
  ("composer stays visible above the on-screen keyboard") failed on Android:
  the keyboard fully covered the composer instead of the layout resizing.
  Root cause: this Expo/RN version (SDK 57 / RN 0.86) uses edge-to-edge
  display on Android by default, so the window never actually resizes for the
  keyboard — neither `android:windowSoftInputMode="adjustResize"` (tried via
  `app.json`'s `android.softwareKeyboardLayoutMode: "resize"`, confirmed
  present in the generated manifest) nor `KeyboardAvoidingView`'s built-in
  `"height"` behavior had any effect, since both rely on a window resize that
  edge-to-edge suppresses.
  - **Options presented to the user:** (a) a manual `Keyboard` event listener
    (no new dependency), (b) add `react-native-keyboard-controller` (new prod
    dependency, a spec deviation), (c) track as a known issue and defer.
    **Chose (a).** Approved by: user (arup.chowdhary@gmail.com).
  - **Fix:** `src/app/index.tsx` now listens for `Keyboard`
    `keyboardDidShow`/`keyboardDidHide` on Android and pads the screen by the
    real IME height (`event.endCoordinates.height`) instead of relying on
    native resize. The `adjustResize` manifest setting was kept (harmless,
    technically correct) but the working fix is the manual listener.
  - **Re-verified on-device** after the fix: composer + Send button stay fully
    visible above the keyboard; typed and sent a note without needing to
    dismiss the keyboard first; note saved and appeared at the top, field
    cleared and stayed focused. Headless gates re-run clean (`npm test` 15/15,
    `tsc`, `expo lint`, `format:check`, after a Prettier auto-format on the
    edited file).
- **2026-09-03** — **F1 (App foundation & local storage): implementation gate
  passed (review-and-gate) → F1 is Done.** All 9 spec DoD items verified: Android
  launch, empty state, persistence round-trip + restart survival, and the
  storage smoke test were confirmed on-device during F3's verification pass
  (item 1, `npm install`, wasn't independently re-run this session but inferred
  clean from passing tests/build). One finding — `README.md` was stale (described
  a dev-seed button F2 had already removed, understated progress) — **fixed**
  before approval (Status section + dev-seed mention updated). Approved by: user
  (arup.chowdhary@gmail.com).
- **2026-09-03** — **F3 (Today view): implementation gate passed
  (review-and-gate) → F3 is Done.** All 10 spec DoD items verified against
  the diff (matches `.claude/plans/1/f3-today-view.plan.md` exactly, no scope creep);
  no changes requested. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-03** — **F3 (Today view): implemented** on `feature/today-view`
  per `.claude/plans/1/f3-today-view.plan.md` — `formatDayHeading`, `DayHeading`,
  `NoteList` (+ tests) added; `index.tsx` rewired and stays thin. All 10 spec
  DoD items verified:
  - Headless: `npm test` (20 tests, 7 suites, including the 5 new), `tsc`,
    `expo lint`, Prettier all pass. Grep checks confirm no nav/edit/delete/voice
    affordance and no network/auth code introduced.
  - **On-device (Android emulator, Pixel_10_Pro, first on-device run for this
    project):** heading renders correctly ("Today, Sep 3", matching device
    date); empty state renders; a captured note appears live at the top; a
    second note confirms newest-first ordering end-to-end; both notes survive
    a full app force-stop + relaunch (on-device SQLite persistence). This
    incidentally exercises F1's and F2's still-pending on-device DoD items
    too (persistence round-trip, capture flow, live list) — evidence for their
    own gates, but **does not itself constitute their gate approval**; F1/F2
    remain `Impl` until reviewed on their own.
  - **Note:** on Android, the pinned composer is not kept clear of the on-screen
    keyboard while typing (`KeyboardAvoidingView`'s `behavior` is `undefined` on
    Android — iOS-only `padding`); this is pre-existing F2 behavior, untouched
    by F3, not fixed here. Flagging for a possible follow-up against F2's DoD
    item 1 ("stays visible above the keyboard").
  - Awaiting **implementation review-and-gate**.
- **2026-09-03** — **F3 (Today view): technical plan approved (review-and-gate).**
  Plan: `.claude/plans/1/f3-today-view.plan.md` — adds `formatDayHeading`, `DayHeading`,
  `NoteList` (+ tests), rewires `index.tsx`; no schema/dependency changes. Every
  step traces to a spec DoD item; no gaps found on review. Approved by: user
  (arup.chowdhary@gmail.com). Proceeding to implementation.
- **2026-09-03** — **F3 (Today view): spec written and gate passed
  (review-and-gate).** Scope decided with the user: since F2 already renders
  today's notes as a live, newest-first list with an empty state, F3 adds only
  a **visible day heading** (e.g. "Today, Sep 3") plus an **extracted, tested
  `NoteList` component** — no date navigation (F5), no editing (F4), no voice
  (F6). The heading exists to give F5 a concrete place to attach day/week/month
  navigation later. Spec: `.claude/specs/1-f3-today-view.md`. Gate note: F1/F2
  implementations are still pending their on-device gate; the user accepted
  that risk (scope is stable, only on-device verification is outstanding) and
  approved proceeding to the F3 technical plan regardless. Approved by: user
  (arup.chowdhary@gmail.com). Built on branch `feature/today-view`.
- **2026-08-04** — **F2 (Typed note capture): spec approved → technical plan
  approved → in implementation.** Capture UX decided with the user:
  - **Surface:** an inline `NoteComposer` **pinned at the bottom** of the Today
    screen (above the keyboard), not a modal/FAB.
  - **Input:** **multiline**; **Return inserts a newline**; an explicit **send**
    button commits the note. Empty/whitespace-only input is not saveable; the
    field clears (keeping focus) after a save. Saves reuse F1's `insertNote`; the
    existing `useLiveQuery` refreshes the list.
  - **Approved deviation from the F2 spec's "No new dependencies":** added
    component-test tooling — `@testing-library/react-native` (v13) +
    `react-test-renderer` (pinned to React 19.2.3) + `@types/react-test-renderer`,
    **dev-only** — so the composer's type→send→clear/disabled behavior is covered
    by an automated render test (Option B). This departs from F1's headless-only
    test style; the pure trim/empty rule (`src/lib/noteInput.ts`) is still tested
    headlessly too. Approved by: user (arup.chowdhary@gmail.com).
  - Verified headlessly: `jest` (10 tests), `tsc`, `expo lint`, Prettier, and
    `expo export` (Android bundle) all pass. On-device Android run pending (no SDK
    in the build environment).
- **2026-08-03** — **F1 spec approved → technical plan approved → in
  implementation.** Companion libraries (left "not locked" in the 2026-07-29
  stack decision) **confirmed** at F1 spec/plan:
  - **Navigation:** Expo Router (file-based; strongest Phase 3 web path).
  - **Local DB:** `expo-sqlite` + `drizzle-orm`, migrations via `drizzle-kit`.
  - **IDs:** `expo-crypto` `randomUUID()` (globally-unique, sync-ready).
  - **Android build flow:** `expo prebuild` + dev client (`expo run:android`);
    generated `android/` is gitignored.
  - **Testing:** Jest via `jest-expo`; storage smoke test runs headlessly on
    `better-sqlite3` against the same Drizzle schema/migration.
  - Approved by: user (arup.chowdhary@gmail.com).
  - Scaffold built on `feature/foundation` (SDK 57, TypeScript). Verified
    headlessly: `tsc`, `jest`, `expo lint`, Prettier, and `expo export`
    (Android bundle) all pass. On-device Android launch pending (no SDK in the
    build environment).
- **2026-07-29** — Phase 1 decomposed into 6 ordered features (F1–F6).
  - F1 (foundation) kept as a **separate** feature, spec'd/gated on its own.
  - Today view kept as a **separate** feature (F3), not bundled into F2.
  - Voice capture ordered **last** (F6) — highest complexity, deferred until the
    typed-note loop is solid.
  - Approved by: user (arup.chowdhary@gmail.com).
- **2026-07-29** — **Gate passed (review-and-gate):** Phase 1 feature plan
  (F1–F6) reviewed against the phase-plan rubric and **approved** by the user
  to advance out of Backlog. Approved by: user (arup.chowdhary@gmail.com).
- **2026-07-29** — **Tech stack chosen (choose-tech-stack):**
  **React Native + Expo (TypeScript)** — one codebase for Android (primary,
  ~90%) with a real-DOM web path for Phase 3, first-class voice + notifications,
  and Expo/EAS cloud builds and Play submission. Chosen over Flutter
  (canvas-rendered web, Dart-only backend) and Kotlin Multiplatform (immature
  Compose web). User is unfamiliar with all three, so build/distribution ease
  and the web path drove the choice.
  - Distribution: Android via signed `.aab` to Google Play (EAS Build + Submit);
    web (Phase 3) via `expo export` to static hosting.
  - **Proposed companion libs — NOT yet locked, confirm at F1 spec/plan:** local
    DB `expo-sqlite` + Drizzle ORM; voice `expo-speech-recognition`;
    notifications (Phase 2) `expo-notifications`.
  - Approved by: user (arup.chowdhary@gmail.com).

- **Now:** **F8 (Task list view) is Done**, on branch `feature/tasklist-view`
  (not yet merged to `master`).
- **Next:** Commit and open a PR for `feature/tasklist-view`, merge, then
  move to **F9 (Task scheduling)** — spec it via `write-feature-spec`.
- **Workflow:** Each feature is built on its **own branch in a separate Claude
  Code session**; planning/decisions are tracked here on
  `feature/create-features`.
