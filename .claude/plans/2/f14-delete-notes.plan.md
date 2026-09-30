# Technical Plan: Delete Note (Phase 2 follow-up · F14)

## Context
Notes can be created, viewed, edited, and dictated, but never removed. F14
adds delete using the exact interaction F7 already shipped for tasks:
**swipe a row left to reveal a "Delete" button; only tapping the button
deletes.** It is a hard delete (no confirmation, undo, or schema change).
Because Day, Week, and Month all render through the shared `NoteRow`, the
feature is built once in `NoteRow` and threaded through `NoteList` /
`GroupedNoteList` / `index.tsx` as a single callback. No migration, no new
dependency (`react-native-gesture-handler`, `GestureHandlerRootView`, and the
Jest setup already exist from F7).

## References
- Spec: `.claude/specs/2-f14-delete-notes.md`.
- Pattern to mirror: `src/components/TaskRow.tsx` (`Swipeable`,
  `renderRightActions`, `swipeableRef.current?.close()`, `deleteButton`
  styles) and `src/db/tasks.ts` `deleteTask`.
- Edit behavior to preserve: `src/hooks/useNoteEditing.ts`, F4.

## Data model
No change. `notes` table and migrations untouched.

## Modules / components

| File | Change | Responsibility |
|---|---|---|
| `src/db/notes.ts` | extend | add `deleteNote(id)`. |
| `src/db/__tests__/notes.test.ts` | extend | `deleteNote` behavior tests. |
| `src/components/NoteRow.tsx` | extend | swipeable wrapper + Delete button; new `onDeleteNote` prop. |
| `src/components/NoteList.tsx` | extend | accept/pass `onDeleteNote`. |
| `src/components/GroupedNoteList.tsx` | extend | accept/pass `onDeleteNote`. |
| `src/app/index.tsx` | extend | wire `onDeleteNote` → `deleteNote` for both lists. |
| `src/components/__tests__/NoteList.test.tsx` | extend | add required prop to existing renders; new delete tests. |
| `src/components/__tests__/GroupedNoteList.test.tsx` | extend | same. |
| `src/components/__tests__/NoteRow.test.tsx` | **new (optional)** | focused swipe/Delete/edit-coexistence tests; only if `NoteList`'s tests get crowded. |
| `CLAUDE.md`, `PROGRESS.md` | extend | Status paragraph + F14 board row / decision log (done at the end, not part of the code diff). |

`useNoteEditing.ts` is expected to need **no change** (see step 4 / Risks).

### `src/db/notes.ts`
```ts
/** Delete a note. A non-existent id is a no-op. */
export async function deleteNote(id: string): Promise<void> {
  await db.delete(notes).where(eq(notes.id, id));
}
```
`eq` and `notes` are already imported; nothing else needed.

### `src/components/NoteRow.tsx`
Add `onDeleteNote: (id: string) => void` to `NoteRowProps`. Structure:

- The **editing branch** (`note.id === editingId`) is returned unchanged —
  a row mid-edit is *not* swipeable (spec rule), so there is no way to delete
  the note currently being edited and no risk of saving to a deleted row.
- The **static branch** is wrapped:

```tsx
const swipeableRef = useRef<Swipeable>(null);
...
<Swipeable
  ref={swipeableRef}
  renderRightActions={() => (
    <Pressable
      testID="note-delete-button"
      accessibilityRole="button"
      accessibilityLabel="Delete note"
      onPress={() => {
        swipeableRef.current?.close();
        onDeleteNote(note.id);
      }}
      style={styles.deleteButton}
    >
      <Text style={styles.deleteButtonText}>Delete</Text>
    </Pressable>
  )}
>
  <Pressable testID={`note-row-${note.id}`} onLongPress={...} style={styles.note}>
    <Text testID="note-text" ...>{note.text}</Text>
  </Pressable>
</Swipeable>
```

- `useRef` must be called before the early `return` for the editing branch
  (Rules of Hooks): declare `swipeableRef` at the top of the component, above
  the `if (note.id === editingId)` return.
- `deleteButton` / `deleteButtonText` styles copied from `TaskRow` (red
  `#EF4444`, `borderRadius: 12`, white semibold text, `paddingHorizontal: 20`).
  The `note` style keeps its `borderRadius: 12` and background, so the button
  height matches the row. Duplicating ~10 lines of style is preferred over
  extracting a shared component for two call sites (Risks).
- Update the component's doc comment to mention swipe-to-reveal delete.

### `NoteList.tsx` / `GroupedNoteList.tsx`
Add `onDeleteNote: (id: string) => void` to props and pass it to each
`<NoteRow note={item} editing={editing} onDeleteNote={onDeleteNote} />`.
Update the doc comments. No other logic changes.

### `src/app/index.tsx`
Import `deleteNote` and pass
`onDeleteNote={(id) => { void deleteNote(id); }}` to both `NoteList` and
`GroupedNoteList`. The existing `useLiveQuery` drops the row; no manual
state. The screen file stays thin.

## APIs / interfaces
- `deleteNote(id: string): Promise<void>` — new.
- `NoteRow`, `NoteList`, `GroupedNoteList`: new **required** prop
  `onDeleteNote: (id: string) => void`. Required (not optional) so a caller
  can't silently ship a view without delete; all in-repo call sites are
  updated in this change.

## Dependencies
None. `Swipeable` from `react-native-gesture-handler` is already installed
and Jest already loads `react-native-gesture-handler/jestSetup`.
`GestureHandlerRootView` already wraps the app in `_layout.tsx`, covering the
Notes tab as well.

## Implementation steps
Small, ordered, each independently verifiable. DoD numbers refer to the spec.

1. **Data layer.** Add `deleteNote` to `src/db/notes.ts`. Add tests to
   `src/db/__tests__/notes.test.ts` (same in-memory better-sqlite3 pattern;
   it re-implements queries against the real schema, so add a `deleteNote`
   equivalent the same way that file handles `updateNoteText`, or import the
   function if the file's pattern allows): removes only the target row; unknown
   id leaves rows intact. *Verify:* `npm test -- notes.test` (DoD 7).
2. **`NoteRow` swipe + Delete button.** Implement as above, including the
   hook ordering. *Verify:* `npm run typecheck` will now fail at
   `NoteList`/`GroupedNoteList` call sites — expected until step 3.
3. **Thread the callback.** Update `NoteList`, `GroupedNoteList`, and
   `index.tsx`. *Verify:* `npm run typecheck` clean.
4. **Confirm edit coexistence, no hook change.** Review
   `useNoteEditing`: `commitEdit` for the open note is already triggered by
   its `TextInput` `onBlur`, and a tap on another row's Delete button blurs
   the input (verified on-device in step 7). If on-device testing shows the
   blur does **not** fire before the delete and the edit is lost, add an
   explicit `if (editingId) commitEdit(editingId, draftText)` call in
   `NoteRow`'s delete handler (via the `editing` controller already passed in)
   — do not pre-add it without evidence. (DoD 6)
5. **Component tests.** Update existing `NoteList` / `GroupedNoteList` tests
   to pass `onDeleteNote={jest.fn()}` (required prop). Add:
   - Delete button is present per row and `fireEvent.press(getAllByTestId(
     'note-delete-button')[i])` calls `onDeleteNote` with that row's note id
     (list + grouped, incl. a multi-note day group). (DoD 8, 4)
   - Rendering alone / long-press / fling does not call `onDeleteNote`
     (swipe-alone-never-deletes). (DoD 1, 8)
   - Long-press still enters edit mode (existing tests, unchanged) and the
     editing row renders no `note-delete-button`. (DoD 5, 6)
   - Existing "clearing to empty reverts, `onEditNote` not called" test
     still passes and no delete is triggered. (DoD 5)
   Note: as in `TaskRow.test.tsx`, `Swipeable`'s right actions render in the
   test tree without a gesture, so the button is queryable directly; the
   "swipe reveals" behavior itself is covered on-device.
6. **Wire and run quality gates.** `npm test`, `npm run typecheck`,
   `npm run lint`, `npm run format:check`. (DoD 9, 10, 11)
7. **On-device verification** (Android; see the android-build-toolchain
   memory for emulator/physical-device setup): add 3+ notes today; swipe one
   left → Delete appears, note remains (DoD 1); tap Delete → gone
   immediately (DoD 2); force-stop + relaunch → still gone (DoD 3); repeat
   from Week and Month views incl. a multi-note day (DoD 4); long-press edit,
   blur-save, clear-to-empty-revert (DoD 5); with note A mid-edit, swipe/delete
   B, A's edit survives; blur A then delete A (DoD 6); Tasks tab
   swipe-delete still works (DoD 9). Note: swipe gestures via `adb` need
   `input swipe` with a long enough travel; F7's notes in `PROGRESS.md` record
   a retry being needed on the delete tap.
8. **Grep checks** (DoD 12): no `Alert`/confirm, no undo/trash, no
   `schema.ts`/`drizzle/` changes, no network code in the diff.
9. **Docs.** Update `CLAUDE.md` Status and `PROGRESS.md` (F14 row + decision
   log) after the implementation gate — separate from the code diff.

## Testing approach

| DoD | Proof |
|---|---|
| 1 Swipe reveals, no delete | On-device; unit: no `onDeleteNote` call without pressing the button |
| 2 Tap deletes, immediate | On-device (live query); unit: press → `onDeleteNote(id)` |
| 3 Persists | On-device force-stop + relaunch |
| 4 All views | Unit (`NoteList`, `GroupedNoteList`, multi-note group) + on-device |
| 5 Edit unaffected | Existing F4 tests remain green + on-device |
| 6 Delete while editing | On-device (editing row has no Delete button; B's delete leaves A's edit) |
| 7 `deleteNote` tested | `notes.test.ts` |
| 8 Component tests | `NoteList` / `GroupedNoteList` (/ `NoteRow`) tests |
| 9 Task delete unaffected | `TaskRow` tests unchanged + on-device |
| 10–11 Gates | `npm test`, typecheck, lint, format:check |
| 12 No forbidden surface | Grep of the diff |

## Risks / tradeoffs
- **Gesture vs. long-press conflict.** `NoteRow`'s `Pressable` long-press now
  sits inside a `Swipeable`. `TaskRow` already does the same with its text
  `Pressable`, so it's a proven combination; still verify on-device that a
  horizontal swipe doesn't trigger edit and a long-press doesn't reveal
  Delete.
- **Swiping while editing.** Editing rows are deliberately not wrapped, so a
  note being edited can't be deleted. Mitigation is by construction; user
  must blur first. This avoids saving to a deleted row without touching
  `useNoteEditing`.
- **Blur ordering for "delete B while A is editing."** Relies on the tap
  blurring A's input first. Covered on-device with a defined fallback
  (step 4) rather than speculative code.
- **Duplicate Delete-button styles vs. shared component.** Two ~10-line
  copies (notes, tasks) is cheaper and lower-risk than refactoring the
  already-gated `TaskRow`; revisit if a third consumer appears.
- **Required prop churn.** Making `onDeleteNote` required forces edits to
  existing tests; accepted deliberately (see APIs).
- **Irreversible delete with no confirm.** Accepted per spec/minimalism and
  consistency with task delete; the two-step swipe-then-tap is the guard
  against accidents. Undo is explicitly a possible later feature.
