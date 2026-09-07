# Technical Plan: Edit Note (Phase 1 · F4)

## Context
F4 closes the capture → view → edit loop for notes. The spec
(`.claude/specs/1-f4-edit-note.md`, decisions confirmed with the user) calls
for: long-press to enter edit, inline editing in the existing list row,
auto-save on blur, and reverting (never deleting) on an empty/whitespace
result. This plan turns that into concrete changes to `NoteList`,
`db/notes.ts`, and `index.tsx`, reusing F2/F3's existing seams
(`normalizeNoteInput`, the live query, `NoteList`'s prop-driven rendering) with
no schema or dependency changes.

## References
- Spec: `.claude/specs/1-f4-edit-note.md`.
- Builds on F2 (`src/lib/noteInput.ts`'s `normalizeNoteInput`, `src/db/notes.ts`)
  and F3 (`src/components/NoteList.tsx`, `src/app/index.tsx`'s live-query wiring).

## Data model
No schema or migration changes. Reuses the existing `notes` table
(`src/db/schema.ts`) and `Note` type as-is. Adds one new data-access function
alongside `insertNote` in `src/db/notes.ts`:

```ts
export async function updateNoteText(id: string, text: string): Promise<void> {
  await db.update(notes).set({ text, updatedAt: Date.now() }).where(eq(notes.id, id));
}
```

`id` and `createdAt` are never touched; `updatedAt` is stamped with the current
time the same way `insertNote` stamps it. List order is unaffected because
`notesForDayQuery` orders by `createdAt`, not `updatedAt`.

## Modules / components

| File | Change | Responsibility |
|---|---|---|
| `src/db/notes.ts` | add `updateNoteText` | update a note's `text`/`updatedAt` by `id`. |
| `src/db/__tests__/notes.test.ts` | extend | hand-rolled update test against the same migrated in-memory DB (mirrors the existing `seed`/`listForDay` pattern — the real `db` singleton can't be imported headlessly since it pulls in `expo-sqlite`). |
| `src/components/NoteList.tsx` | extend | add long-press-to-edit, inline `TextInput` row, blur-to-commit/revert, single-editable-row state. |
| `src/components/__tests__/NoteList.test.tsx` | extend | update existing call sites for the new required prop; add edit-flow tests. |
| `src/app/index.tsx` | extend | pass an `onEditNote` callback to `NoteList` that calls `updateNoteText`. |

### `NoteList` design
New local state: `editingId: string | null`, `draftText: string`. New required
prop: `onEditNote: (id: string, text: string) => void`.

- **Display row** (unchanged look): wrapped in a `Pressable` with
  `onLongPress={() => handleLongPress(item)}` and a `testID={`note-row-${item.id}`}`;
  still renders `Text` with the existing `testID="note-text"` so the current
  order/content tests keep working unmodified.
- **Editing row** (only for `item.id === editingId`): same container style,
  swaps `Text` for a `TextInput` (`testID="note-edit-input"`, `multiline`,
  `submitBehavior="newline"` — same as `NoteComposer`, so Return inserts a
  newline rather than submitting), `value={draftText}`, `onChangeText={setDraftText}`,
  `autoFocus`, `onBlur={() => commitEdit(item.id, draftText)}`.

```ts
function commitEdit(id: string, text: string) {
  const normalized = normalizeNoteInput(text); // reused from F2, not re-implemented
  if (normalized !== null) onEditNote(id, normalized);
  setEditingId(null);
  setDraftText('');
}

function handleLongPress(item: Note) {
  if (editingId !== null && editingId !== item.id) {
    commitEdit(editingId, draftText); // resolve the open edit first
  }
  setEditingId(item.id);
  setDraftText(item.text);
}
```

Committing explicitly inside `handleLongPress` (rather than relying on the
previous `TextInput`'s native blur firing before the new row opens) is what
makes "only one note editable at a time" deterministic and unit-testable —
native focus-handoff timing between a `Pressable` long-press and a sibling
`TextInput`'s blur isn't guaranteed. React batches the two `setEditingId`/
`setDraftText` calls in `handleLongPress`, so the visible end state is always
"editing the newly long-pressed note," never a flash of both/neither.

Reverting on empty needs no extra state: when `normalized === null`,
`onEditNote` is simply never called, so the underlying `notes` array (and
therefore what the row displays once `editingId` clears) is untouched.

## APIs / interfaces (internal only)

```ts
// src/db/notes.ts
export async function updateNoteText(id: string, text: string): Promise<void>;

// src/components/NoteList.tsx
interface NoteListProps {
  notes: Note[];
  onEditNote: (id: string, text: string) => void; // new, required
}
```

## Dependencies
None. Reuses `Pressable`/`TextInput` (already imported elsewhere in the app)
and `normalizeNoteInput`.

## Implementation steps
1. **Add `updateNoteText`** to `src/db/notes.ts` (import `eq` from
   `drizzle-orm`). *(DoD 6)*
2. **Test it** in `src/db/__tests__/notes.test.ts`: seed a note, run a
   hand-rolled `update(db, id, text, updatedAt)` against the same in-memory
   migrated DB, assert `text`/`updatedAt` changed and `id`/`createdAt` did
   not. *(DoD 6)*
3. **Extend `NoteList`**: add `onEditNote` prop, `editingId`/`draftText`
   state, `handleLongPress`, `commitEdit`, and the display/edit row branch
   described above. *(DoD 1, 2, 3, 4, 5)*
4. **Update `NoteList.test.tsx`**: add `onEditNote={jest.fn()}` to existing
   render calls (new required prop); add tests:
   - long-press pre-fills the edit field with the note's current text.
   - blur with edited non-empty text calls `onEditNote(id, trimmedText)`.
   - blur with whitespace-only text does not call `onEditNote`, and the
     original text is shown again (no `note-edit-input` remains).
   - long-pressing note B while note A is mid-edit commits A (via
     `onEditNote`) before opening B for editing.
   *(DoD 1, 2, 3, 4)*
5. **Wire `index.tsx`**: `<NoteList notes={notes} onEditNote={(id, text) => { void updateNoteText(id, text); }} />`. *(DoD 2)*
6. **Grep check**: confirm no delete affordance, date-nav control, voice
   button, or network/auth code anywhere in the diff. *(DoD 7, 10)*
7. **Run quality gates**: `npm test`, `npm run typecheck`, `npm run lint`,
   `npm run format:check`. *(DoD 8, 9)*
8. **On-device Android check**: long-press a note, edit it, tap away —
   confirm the update shows immediately and survives a force-stop + relaunch;
   confirm its position in the list doesn't change. *(DoD 2, 5, 11)*
9. **Docs**: update `CLAUDE.md` Status and `PROGRESS.md`'s F4 row/decision
   log once steps 1–8 are verified (not part of the code diff).

## Testing approach
- **Unit (headless, Jest):** extended `notes.test.ts` proves `updateNoteText`'s
  underlying query behavior against the real migration, without the native
  `expo-sqlite` runtime — same pattern as the existing insert/list tests.
- **Component (Jest + `@testing-library/react-native`):** extended
  `NoteList.test.tsx` proves the full edit lifecycle (enter → save, enter →
  revert, single-editable-row) without a live DB, using `fireEvent(el,
  'longPress')` / `fireEvent.changeText` / `fireEvent(el, 'blur')`, following
  the same style as `NoteComposer.test.tsx`.
- **Static:** `tsc --noEmit`, `expo lint`, Prettier — unchanged commands, must
  stay clean.
- **Manual/grep (DoD 7, 10):** no automated test enforces "no forbidden
  surface" — verified by inspection/grep at step 6, as F1–F3 did.
- **On-device:** one manual Android run confirming the real long-press →
  edit → blur → persist flow, including surviving an app restart.

## Risks / tradeoffs
- **No explicit Cancel:** since save is blur-triggered, there's no way to
  discard an in-progress non-empty edit other than restoring the original
  text by hand before tapping away. This is the tradeoff the user explicitly
  accepted when choosing auto-save-on-blur over explicit Save/Cancel.
- **Keyboard may cover a row being edited near the bottom of the list:** F4
  does not add per-row keyboard-avoidance beyond what already exists for the
  composer (`index.tsx`'s Android IME padding). Accepted as out of scope
  unless it proves to be a real on-device problem, consistent with how F2/F3
  scoped keyboard handling to the composer only.
- **`updateNoteText` can't be imported directly in the headless test:** like
  `insertNote`/`notesForDayQuery` already are, it depends on `./client`
  (`expo-sqlite`), unavailable in the Jest `node` environment used for DB
  tests. The test hand-rolls the equivalent Drizzle `update(...)` call against
  the same schema/migrations — an existing, accepted pattern in this repo, not
  a new gap.
