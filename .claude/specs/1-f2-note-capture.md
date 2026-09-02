# Spec: Typed Note Capture (Phase 1 · F2)

## Overview
F2 turns the F1 app *shell* into a usable capture surface: the user can **type a
note and save it locally**, with no title and no metadata — just the text. On the
Today screen, a text input is **pinned at the bottom** (sitting above the keyboard
when focused); typing a note and tapping **send** persists it via the existing
local database and it appears in the Today list immediately. This is the core of
the whole product — the "instant, friction-free capture" promise from
`ideas-refined.md` — and it is the first feature that a user actually *does*
something with. It builds directly on F1's persistence seam (`insertNote`) and the
Today shell, and it replaces F1's dev-only seed button with the real add flow.
Editing existing notes (F4), a richer Today view (F3), time browsing (F5), and
voice (F6) are deliberately out of scope.

## Depends on
- **F1 — App foundation & local storage (DONE):** provides the Expo Router app,
  the `notes` table + versioned migration, the `insertNote` data-access function,
  the `notesForDayQuery` live query, and the Today screen shell this feature
  extends. F2 adds no schema changes.
- No other feature dependency. F3/F4/F5/F6 depend on F2, not the reverse.

## Files to change
- `src/app/index.tsx` — Today screen: add the pinned bottom capture input + send
  button and wire it to `insertNote`; **remove the F1 `__DEV__` dev-seed button**
  (its job is now done by the real capture flow). The existing `useLiveQuery`
  list already refreshes automatically when a note is inserted.
- `CLAUDE.md` — update the **Status** section to note that F2 (typed note capture)
  is built (done as F2 lands, not part of the initial code diff).
- `PROGRESS.md` — advance F2 through the pipeline stages (Backlog → Spec → Plan →
  Impl → Done) and record gate approvals in the decision log (tracked as F2
  progresses; not part of the code diff).

## Files to create
Exact paths are settled in the technical plan; F2 should include:

- **A note-composer component** — a small, self-contained capture control
  (e.g. `src/components/NoteComposer.tsx`) holding the input's local text state and
  exposing an `onSubmit(text)` callback, so the Today screen stays thin and the
  capture logic is unit-testable in isolation.
- **A test** — an automated test (e.g. `src/components/__tests__/NoteComposer.test.tsx`
  and/or an extension of the storage test) covering the capture rules: text is
  trimmed, empty/whitespace-only input does **not** produce a note, a valid submit
  calls through to persistence, and the field clears afterwards.

## New dependencies
**No new dependencies.** Everything needed ships with the F1 stack: React Native's
`TextInput`, `Pressable`, and `KeyboardAvoidingView`; persistence via the existing
`insertNote`; live refresh via the existing `useLiveQuery`.

## Rules for implementation
- **Minimalism (minimalism-guard):** a note is *only* its text. Do **not** add a
  title, tags, categories, character counter, formatting toolbar, or any other
  field or chrome. One text input and one send affordance — nothing else.
- **Reuse F1's persistence:** save through the existing `insertNote(text)` — do
  **not** duplicate id/timestamp generation or write raw SQL in the UI. The Today
  list must refresh via the existing `notesForDayQuery` + `useLiveQuery`, not a
  manual re-fetch.
- **Capture UX (decided with user):** the input is **pinned at the bottom** of the
  Today screen and remains visible **above the keyboard** when focused
  (`KeyboardAvoidingView` or equivalent). No separate compose screen/modal.
- **Multiline + explicit save (decided with user):** the input is **multiline**;
  pressing **Return inserts a newline** (it does **not** submit). The note is
  committed only by tapping the **send/save button**. Stored newlines are rendered
  in the list.
- **Guard empty input:** trim leading/trailing whitespace; a note that is empty or
  whitespace-only must **not** be saved (send is disabled or a no-op). After a
  successful save, **clear the field** and keep it focused so the next note can be
  typed immediately (rapid capture).
- **Local-first only:** persist to the on-device DB exclusively. **No network,
  backend, auth, or sync** (Phase 3).
- **Android is the target surface:** verify on Android; keep code cross-platform
  (no Android-only APIs where a portable one exists) but do not build/verify web.
- **No scope creep into later features:** no edit-in-place of existing notes (F4),
  no delete, no date navigation (F5), no voice button (F6).

## Definition of done
Each item is verifiable by running the app or the test suite:

1. **Capture input is present:** the Today screen shows a text input pinned at the
   bottom with a send/save control; when focused, the input stays visible **above
   the on-screen keyboard** (not hidden behind it).
2. **Typed note saves and appears:** typing text and tapping send inserts the note
   and it appears in the Today list **immediately** (newest first) without an app
   restart, and the input clears afterwards.
3. **Persistence survives restart:** a note captured this way is still present in
   the Today list after fully closing and reopening the app (it is on-device).
4. **Empty input is rejected:** with an empty or whitespace-only field, send does
   nothing / is disabled — no blank note is created.
5. **Multiline works:** pressing Return inside the input adds a new line (does not
   save); a saved multi-line note is stored and rendered with its line breaks
   intact.
6. **F1 scaffolding removed:** the `__DEV__` dev-seed button is gone, and no title
   or metadata field exists anywhere in the capture flow (grep-checkable).
7. **Test passes:** `npm test` passes, including a test covering trim, the
   empty-input guard, and that a valid submit reaches persistence and clears the
   field.
8. **Quality gates pass:** `npm run typecheck`, `npm run lint`, and
   `npm run format:check` all run clean.
9. **No forbidden surface:** no network/backend/auth/sync code introduced
   (grep-checkable: no HTTP client, no auth SDK).
