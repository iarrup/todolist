# Spec: Delete Note (Phase 2 follow-up · F14)

## Overview
Notes can be captured (F2), viewed (F3, F5), edited (F4), and dictated (F6),
but there is no way to remove one — F4 explicitly left delete out of scope,
and clearing a note to empty only reverts it. F14 adds deletion so a
mistaken or obsolete note can be removed permanently. To stay consistent with
the app's one existing delete interaction (F7 tasks, as revised on
2026-09-09), delete is **swipe-to-reveal**: swiping a note row left reveals a
"Delete" button; the swipe itself never deletes, only tapping the revealed
button does. Deletion is a hard delete of the row (no trash, no undo, no
confirmation dialog), matching task delete and the minimalism principle. The
behavior is identical in every notes view (day, week, month) because all of
them render through the shared `NoteRow`.

## Depends on
- **F2 — Typed note capture:** the `notes` table and `src/db/notes.ts`.
- **F3 / F5 — Today view & time-based browsing:** `NoteList`,
  `GroupedNoteList`, and the live queries that will drop a deleted note
  automatically.
- **F4 — Edit note:** `NoteRow` / `useNoteEditing`; delete must coexist with
  long-press-to-edit.
- **F7 — Task management:** the swipe-to-reveal Delete pattern
  (`TaskRow`, `GestureHandlerRootView` in `_layout.tsx`) to be mirrored, not
  reinvented.

## Files to change
- `src/db/notes.ts` — add `deleteNote(id)`, mirroring `deleteTask`.
- `src/components/NoteRow.tsx` — wrap the static row in the same swipeable
  container `TaskRow` uses, with a right-action "Delete" `Pressable`
  (`testID="note-delete-button"`, `accessibilityLabel="Delete note"`) that
  closes the swipeable then calls `onDeleteNote(id)`. The row being edited is
  not swipeable.
- `src/components/NoteList.tsx` and `src/components/GroupedNoteList.tsx` —
  accept and pass through an `onDeleteNote` callback to each `NoteRow`.
- `src/app/index.tsx` — wire `onDeleteNote` to `deleteNote`; the existing live
  query re-renders the list, no manual refresh.
- `src/hooks/useNoteEditing.ts` — only if needed so that deleting a note
  while another is mid-edit resolves that edit cleanly (see Rules).
- `CLAUDE.md` — update the Status section once F14 lands.
- `PROGRESS.md` — add F14 to the status board and record gate approvals in
  the decision log.

## Files to create
- Tests (exact paths settled in the technical plan):
  - `deleteNote` in `src/db/__tests__/notes.test.ts`: removes only the target
    row; deleting a non-existent id is a no-op.
  - `NoteRow` / `NoteList` / `GroupedNoteList` tests: the Delete button
    exists, tapping it calls `onDeleteNote` with the note's id; the swipe
    alone does not call it; long-press-to-edit still works.

## New dependencies
No new dependencies. `react-native-gesture-handler` (already used by
`TaskRow`) provides the swipeable.

## Rules for implementation
- **Minimalism (minimalism-guard):** no confirmation dialog, no undo/trash,
  no multi-select or bulk delete, no delete icon persistently visible on
  rows. The only new UI is the swipe-revealed "Delete" button.
- **Mirror F7:** swipe reveals the button; the swipe itself must not delete.
  Reuse the same visual style/wording as the task Delete button; extract a
  shared component only if it clearly reduces duplication, otherwise keep
  `NoteRow` self-contained.
- **Hard delete, no schema change:** `db.delete(notes).where(eq(id))`. No new
  columns, no migration.
- **Coexist with edit (F4):** long-press-to-edit and its auto-save-on-blur /
  revert-on-empty behavior are unchanged. Clearing a note to empty still
  reverts, never deletes.
- **Deleting during an edit:** if another note is mid-edit when a row's Delete
  is tapped, the edit must not be lost or crash; deleting the note that is
  itself being edited must not attempt to save it afterwards (no write to a
  deleted row).
- **Same in every view:** day, week, and month behave identically via the
  shared `NoteRow`; no per-view delete logic.
- **Keep `index.tsx` thin:** it only wires the callback.
- **Out of scope:** undo, restore, soft delete, tasks changes, sync,
  note→task promotion.
- **Local-first only; Android is the target surface.**

## Definition of done
1. **Swipe reveals, does not delete:** swiping a note row left on the Notes
   tab reveals a "Delete" button and the note remains in the list.
2. **Tap deletes:** tapping the revealed "Delete" removes the note from the
   list immediately (live query, no manual refresh).
3. **Persists:** the deleted note is still gone after a full app force-stop +
   relaunch (on-device check).
4. **All views:** delete works from the Day, Week, and Month views, including
   for a note in a multi-note day group where the others remain.
5. **Edit unaffected:** long-press still enters inline edit; blur saves;
   clearing to empty reverts and does not delete.
6. **Delete while editing:** with note A mid-edit, deleting note B leaves A's
   edit intact; deleting A itself removes it with no error or ghost row.
7. **`deleteNote` is tested:** removes only the target row; unknown id is a
   no-op.
8. **Component tests pass:** Delete button calls `onDeleteNote` with the
   correct id in `NoteList` and `GroupedNoteList`; swipe alone does not.
9. **Task delete unaffected:** swipe-to-delete on the Tasks tab still works.
10. **Test suite passes:** `npm test` passes.
11. **Quality gates pass:** `npm run typecheck`, `npm run lint`, and
    `npm run format:check` run clean.
12. **No forbidden surface:** no confirmation dialog, undo, schema/migration
    change, or network/backend code in the diff (grep-checkable).
