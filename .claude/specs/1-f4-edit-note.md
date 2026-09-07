# Spec: Edit Note (Phase 1 · F4)

## Overview
F4 makes notes editable after creation, closing out the core note-taking loop
(capture → view → edit) that Phase 1 promises. Notes remain deliberately
plain — just text, no titles or metadata — so editing must not introduce any
new chrome beyond what's needed to change that text in place. Per the
decisions confirmed with the user for this feature: a note is entered for
editing with a **long-press** (tap is reserved, avoiding accidental edits from
stray taps), editing happens **inline** in the existing list row (no separate
screen/modal), and the change is **auto-saved when the field loses focus** —
no explicit Save/Cancel buttons, consistent with the "no friction" capture
principle already used for note creation. Clearing a note to empty/whitespace
is **not allowed to save**; the original text is kept. Delete is explicitly
out of scope for F4 (tracked separately, not part of this feature per
`PROGRESS.md`).

## Depends on
- **F2 — Typed note capture:** provides `insertNote`, the `notes` schema, and
  `normalizeNoteInput` (`src/lib/noteInput.ts`) — the trim/empty rule this
  feature reuses unchanged for the edit-save path (its own doc comment already
  anticipates this reuse).
- **F3 — Today view:** provides the extracted `NoteList` component that F4
  extends with inline edit behavior, and the live query (`notesForDayQuery` +
  `useLiveQuery`) that will pick up saved edits automatically.
- F4 does not depend on F5 (time-based browsing) or F6 (voice) — they are
  independent of, and unaffected by, this feature.

## Files to change
- `src/components/NoteList.tsx` — add long-press-to-edit: track which note
  (by `id`) is currently being edited; render that row as an editable,
  pre-filled multiline text field instead of static `Text`; on blur, commit
  the edit (if non-empty after trim) or revert to the original text (if
  empty/whitespace). Starting an edit on a different note while one is
  already open commits/reverts the open one first, then opens the new one —
  only one note is ever editable at a time.
- `src/db/notes.ts` — add a data-access function (e.g. `updateNoteText`) that
  updates a note's `text` and `updatedAt` by `id`, mirroring `insertNote`'s
  shape.
- `src/app/index.tsx` — wire the new edit-commit callback from `NoteList` to
  the new db update function; the existing live query re-renders the list
  automatically, no manual refresh needed.
- `CLAUDE.md` — update the **Status** section once F4 lands.
- `PROGRESS.md` — advance F4 through the pipeline stages and record the gate
  approval in the decision log as F4 progresses (tracked separately from the
  code diff).

## Files to create
Exact paths are settled in the technical plan; F4 should include:

- **Tests** covering:
  - `NoteList`'s new edit behavior — long-press enters edit mode pre-filled
    with the note's current text; blurring with non-empty trimmed text calls
    the edit-commit callback with the trimmed text; blurring with
    empty/whitespace text does **not** call the callback and the row reverts
    to displaying the original text; only one row is editable at a time.
  - The new `updateNoteText` data-access function — updates `text` and
    `updatedAt`, leaves `id` and `createdAt` unchanged.
  - These may extend the existing `src/components/__tests__/NoteList.test.tsx`
    and add a new `src/db/__tests__/notes.test.ts` (or equivalent), whichever
    the technical plan finds cleanest — a new standalone `NoteRow` component
    is also an option if it keeps `NoteList` simple and improves testability,
    but is not required.

## New dependencies
No new dependencies. Long-press uses React Native's built-in `Pressable`
`onLongPress`; inline editing reuses the existing `TextInput` primitive and
`normalizeNoteInput` for the trim/empty rule.

## Rules for implementation
- **Minimalism (minimalism-guard):** no edit icon, no toolbar, no Save/Cancel
  buttons, no separate edit screen. The only new affordance is the long-press
  itself; the only new UI is the row switching to an editable field in place.
- **Reuse F2's validation rule:** the empty/whitespace check on save must use
  `normalizeNoteInput`, not a re-implementation of trim/empty logic.
- **Reuse F3's seams:** edits go through the existing `notesForDayQuery` +
  `useLiveQuery`; do not introduce a second read path. `NoteList` keeps
  rendering the notes array it's given — editing does not re-sort or re-fetch
  the list itself (the note's list position stays by `createdAt`, unaffected
  by an edit's `updatedAt`).
- **No delete:** clearing a note to empty must revert to the original text,
  never delete the row. Delete is a separate, not-yet-planned feature.
- **No navigation, no recurrence/scheduling, no voice:** out of scope (F5,
  Phase 2, F6 respectively).
- **Local-first only:** no network/backend/auth/sync code.
- **Android is the target surface:** verify on Android; keep code
  cross-platform (no Android-only APIs) but do not build/verify web.
- **Keep `index.tsx` thin:** it still only wires the live query, composer,
  and now the edit-commit callback — editing UI/logic lives in `NoteList`
  (and any component it delegates to), not in the screen file.

## Definition of done
Each item is verifiable by running the app or the test suite:

1. **Long-press enters edit mode:** long-pressing a note in the list turns
   that row into an editable text field pre-filled with the note's current
   text.
2. **Blur with text saves:** editing the text and then blurring the field
   (tapping elsewhere or dismissing the keyboard) with non-empty trimmed text
   saves the change — the updated text appears in the list immediately (via
   the existing live query, no manual refresh) and survives an app restart
   (on-device check).
3. **Blur with empty text reverts:** clearing a note to empty or
   whitespace-only and blurring does **not** save — the row reverts to
   showing the original, unchanged text, and the database row is untouched.
4. **Only one note editable at a time:** long-pressing a second note while
   another is mid-edit resolves the first edit (save-or-revert per items 2/3)
   before opening the second note for editing.
5. **List order is unaffected by edits:** editing a note does not change its
   position in the list (order stays by `createdAt`, not `updatedAt`).
6. **`updateNoteText` is tested:** a dedicated test verifies it updates
   `text` and `updatedAt` while leaving `id` and `createdAt` unchanged.
7. **No new interactions beyond edit:** no delete affordance, no
   date/time-navigation control, and no voice button anywhere in the diff
   (grep-checkable).
8. **Test suite passes:** `npm test` passes, including the new/updated tests
   for `NoteList`'s edit behavior and `updateNoteText`.
9. **Quality gates pass:** `npm run typecheck`, `npm run lint`, and
   `npm run format:check` all run clean.
10. **No forbidden surface:** no network/backend/auth/sync code introduced
    (grep-checkable: no HTTP client, no auth SDK).
11. **On-device verification:** on an Android device/emulator, long-press a
    note, change its text, tap away — the updated text shows immediately and
    is still there after a full app force-stop + relaunch.
