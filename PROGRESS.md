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
| F5 | Time-based browsing | Day / week / month views of notes | F3 | Backlog |
| F6 | Voice capture | Voice-to-text entry (mic permission, editable transcript) | F2 | Backlog |

**Cut lines (out of scope for Phase 1):** tasks/todos (Phase 2); web surface,
sync backend, accounts/auth (Phase 3); keyword search and note→task promotion
(Later); any titles/tags/metadata (minimalism).

**Prerequisite (not a feature):** `choose-tech-stack` — **decided 2026-07-29:
React Native + Expo (TypeScript).** See decision log.

### Phase 2 — Tasks (Mobile)
Not yet planned (`plan-phase`).

### Phase 3 — Web & Sync
Not yet planned (`plan-phase`). Open questions: accounts/auth, conflict handling.

## Decision log

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

## Now / Next

- **Now:** **F1, F2, F3, and F4 are all Done and gated**, on `feature/edit-note`
  (not yet merged to `master`).
- **Next:** Commit and open a PR for `feature/edit-note`. Then pick up **F5
  (time-based browsing)** or **F6 (voice capture)**.
- **Workflow:** Each feature is built on its **own branch in a separate Claude
  Code session**; planning/decisions are tracked here on
  `feature/create-features`.
