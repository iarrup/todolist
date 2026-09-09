# Technical Plan: Task Management (Phase 2 · F7)

## Context
F7 gives the app a second item type — tasks — with the same "just text"
minimalism as notes, plus a completed flag. The spec
(`.claude/specs/2-f7-task-management.md`, UX decisions confirmed with the
user) calls for: a **Notes | Tasks bottom tab bar**, a **checkbox** to toggle
complete, **swipe-to-delete**, and **long-press → inline field →
auto-save-on-blur** to edit — the same edit pattern F4 already proved for
notes. This plan adds a new `tasks` table, a `src/db/tasks.ts` data-access
module mirroring `src/db/notes.ts`, and a parallel (not shared) set of task
UI components, wired into a new `Tasks` tab. It deliberately does **not**
touch any existing F1–F6 file beyond `src/db/schema.ts` and
`src/app/_layout.tsx` — exactly the spec's declared change set — so nothing
already shipped and gated (`NoteList`, `NoteRow`, `useNoteEditing`,
`index.tsx`) is put at risk.

## References
- Spec: `.claude/specs/2-f7-task-management.md`.
- Mirrors F2 (`src/lib/noteInput.ts`'s `normalizeNoteInput`, reused as-is —
  its trim/empty rule isn't note-specific despite the name) and F4
  (`src/hooks/useNoteEditing.ts` + `src/components/NoteRow.tsx`'s
  long-press/inline-edit/auto-save-on-blur pattern, re-implemented for tasks
  rather than generalized — see Risks/tradeoffs).
- Builds on F1's migration pipeline (`npm run db:generate`) and DB client
  (`src/db/client.ts`).

## Data model
New `tasks` table in `src/db/schema.ts`, alongside (not replacing) `notes`:

```ts
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
```

`completed` uses Drizzle's `{ mode: 'boolean' }` integer column (stores 0/1,
reads/writes as `true`/`false` in TS) rather than a raw `integer` the app has
to coerce by hand. No schedule/recurrence/due-date columns — those are F9's
and F11's own migrations, kept out per the spec.

A new migration is generated (not hand-written) via `npm run db:generate`
after the schema edit — this produces a second `drizzle/000X_*.sql` file and
updates `drizzle/meta/`, applied automatically by the existing
`useMigrations` call in `_layout.tsx`.

## Modules / components

| File | Change | Responsibility |
|---|---|---|
| `src/db/schema.ts` | extend | add `tasks` table + `Task`/`NewTask` types. |
| `drizzle/000X_*.sql` (+ `meta/`) | generate | new-table migration, via `npm run db:generate`. |
| `src/db/tasks.ts` | **new** | task data-access: insert, list (unfiltered), update text, toggle complete, delete. |
| `src/db/__tests__/tasks.test.ts` | **new** | headless storage tests, same in-memory-`better-sqlite3` pattern as `notes.test.ts`. |
| `src/hooks/useTaskEditing.ts` | **new** | long-press/inline-edit/auto-save-on-blur state for tasks — a task-typed sibling of `useNoteEditing`, not a shared generic (see Risks/tradeoffs). |
| `src/components/TaskRow.tsx` | **new** | one task row: checkbox, static/editable text, swipe-to-delete. |
| `src/components/TaskList.tsx` | **new** | `FlatList` of `TaskRow`s + empty state ("No tasks yet"), unfiltered/unsorted-by-this-component (caller's `tasksQuery` already orders newest-first). |
| `src/components/__tests__/TaskRow.test.tsx` | **new** | checkbox toggle, swipe-to-delete, long-press-edit behaviors. |
| `src/components/__tests__/TaskList.test.tsx` | **new** | empty state + rendering N tasks, delegates edit/toggle/delete assertions to `TaskRow` tests (mirrors `NoteList.test.tsx`/`NoteRow` split). |
| `src/components/TaskComposer.tsx` | **new** | pinned multiline composer + send button, structurally `NoteComposer` minus the mic button. |
| `src/components/__tests__/TaskComposer.test.tsx` | **new** | type → send → clear/disabled, mirroring `NoteComposer.test.tsx`'s non-voice cases. |
| `src/app/tasks.tsx` | **new** | Tasks tab screen: composer + list wired to `src/db/tasks.ts` via `useLiveQuery`; thin, like `index.tsx`. |
| `src/app/_layout.tsx` | extend | wrap in `GestureHandlerRootView`; replace `<Stack>` with `<Tabs>` (`Notes` → `index`, `Tasks` → `tasks`). |
| `jest.config.js` | extend | add `setupFiles: ['react-native-gesture-handler/jestSetup']` so `Swipeable`/gesture-handler components render in tests without touching native modules. |

### `src/db/tasks.ts` design
Mirrors `src/db/notes.ts` exactly in shape:

```ts
export async function insertTask(text: string): Promise<Task> {
  const now = Date.now();
  const row: Task = { id: Crypto.randomUUID(), text, completed: false, createdAt: now, updatedAt: now };
  await db.insert(tasks).values(row);
  return row;
}

/** All tasks, newest-first, unfiltered (open + completed) — F7 scope only; F8 adds open-only filtering on top of this. */
export function tasksQuery() {
  return db.select().from(tasks).orderBy(desc(tasks.createdAt));
}

export async function updateTaskText(id: string, text: string): Promise<void> {
  await db.update(tasks).set({ text, updatedAt: Date.now() }).where(eq(tasks.id, id));
}

export async function setTaskCompleted(id: string, completed: boolean): Promise<void> {
  await db.update(tasks).set({ completed, updatedAt: Date.now() }).where(eq(tasks.id, id));
}

export async function deleteTask(id: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
}
```

### `useTaskEditing` design
Byte-for-byte the same state machine as `useNoteEditing` (`editingId`,
`draftText`, `handleLongPress`, `commitEdit`), typed against `Task` instead
of `Note`, reusing `normalizeNoteInput` for the trim/empty rule:

```ts
export function useTaskEditing(onEditTask: (id: string, text: string) => void): TaskEditingController {
  // identical body to useNoteEditing, s/Note/Task/, s/onEditNote/onEditTask/
}
```

### `TaskRow` design
```tsx
const swipeableRef = useRef<Swipeable>(null);

<Swipeable
  ref={swipeableRef}
  renderRightActions={() => (
    <Pressable
      testID="task-delete-button"
      accessibilityRole="button"
      accessibilityLabel="Delete task"
      onPress={() => {
        swipeableRef.current?.close();
        onDeleteTask(task.id);
      }}
      style={styles.deleteButton}
    >
      <Text style={styles.deleteButtonText}>Delete</Text>
    </Pressable>
  )}
>
  <View style={styles.row} testID={`task-row-${task.id}`}>
    <Pressable
      testID="task-checkbox"
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.completed }}
      onPress={() => onToggleComplete(task.id, !task.completed)}
      hitSlop={8}
    >
      <Text style={styles.checkboxGlyph}>{task.completed ? '☑' : '☐'}</Text>
    </Pressable>

    {task.id === editing.editingId ? (
      <TextInput
        testID="task-edit-input"
        style={styles.taskText}
        value={editing.draftText}
        onChangeText={editing.setDraftText}
        onBlur={() => editing.commitEdit(task.id, editing.draftText)}
        multiline
        submitBehavior="newline"
        autoFocus
      />
    ) : (
      <Pressable
        testID="task-text-pressable"
        onLongPress={() => editing.handleLongPress(task)}
        style={styles.textPressable}
      >
        <Text
          testID="task-text"
          style={[styles.taskText, task.completed && styles.taskTextCompleted]}
        >
          {task.text}
        </Text>
      </Pressable>
    )}
  </View>
</Swipeable>
```
`styles.taskTextCompleted` applies `textDecorationLine: 'line-through'` plus a
dimmed color — the only visual difference for completed tasks (no separate
"done" section; F7's list stays unfiltered per spec). Checkbox and edit
glyph/text use plain Unicode (`☐`/`☑`), matching F6's decision to use emoji
glyphs over adding an icon-library dependency.

Deleting fires only from an explicit tap on the revealed `Delete` button —
the swipe gesture itself (`onSwipeableOpen`) does **not** delete (revised
during implementation review-and-gate; the spec originally called for
swipe-alone deletion, no button). `renderRightActions` renders a real,
interactive `Pressable` rather than a plain colored background.

### `src/app/tasks.tsx` design
Structurally parallel to `index.tsx` but without any browsing/granularity
state (F7 has no time-based views):

```tsx
export default function TasksScreen() {
  const { data: tasks } = useLiveQuery(tasksQuery(), []);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  // ...same Keyboard.addListener('keyboardDidShow'/'keyboardDidHide') block
  // as index.tsx, duplicated locally rather than extracted into a shared
  // hook (see Risks/tradeoffs — extracting would require touching
  // index.tsx, which is outside this spec's file list).

  return (
    <KeyboardAvoidingView style={[...]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TaskList
        tasks={tasks}
        onEditTask={(id, text) => void updateTaskText(id, text)}
        onToggleComplete={(id, completed) => void setTaskCompleted(id, completed)}
        onDeleteTask={(id) => void deleteTask(id)}
      />
      <TaskComposer onSubmit={(text) => void insertTask(text)} />
    </KeyboardAvoidingView>
  );
}
```

### `src/app/_layout.tsx` change
```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Tabs } from 'expo-router';
// ...migration/error/loading states unchanged...
return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Notes' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
    </Tabs>
  </GestureHandlerRootView>
);
```
`GestureHandlerRootView` is required for `Swipeable` (a `react-native-gesture-handler`
component) to receive touch events at all — it isn't currently wrapped
anywhere in the app (verified: no existing usage), so this is a real,
necessary addition, not defensive boilerplate. The `Notes` tab's label
changes from the Stack header's previous "Today" to "Notes" (the tab-bar
label the user chose); the screen's own in-content `BrowseHeader` still shows
the live "Today, Sep 9" / week / month heading, unchanged.

## APIs / interfaces (internal only)

```ts
// src/db/tasks.ts
export async function insertTask(text: string): Promise<Task>;
export function tasksQuery(): /* unexecuted Drizzle query, for useLiveQuery */;
export async function updateTaskText(id: string, text: string): Promise<void>;
export async function setTaskCompleted(id: string, completed: boolean): Promise<void>;
export async function deleteTask(id: string): Promise<void>;

// src/components/TaskComposer.tsx
interface TaskComposerProps { onSubmit: (text: string) => void; }

// src/components/TaskList.tsx
interface TaskListProps {
  tasks: Task[];
  onEditTask: (id: string, text: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
}

// src/components/TaskRow.tsx
interface TaskRowProps {
  task: Task;
  editing: TaskEditingController;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
}
```

## Dependencies
No new packages. `react-native-gesture-handler` (`~2.32.0`, already a
dependency) supplies both `GestureHandlerRootView` and `Swipeable`.
`jest.config.js` gains one line (`setupFiles`) to load its bundled jest mock
— a test-infra change, not a new dependency.

## Implementation steps
1. **Schema:** add the `tasks` table to `src/db/schema.ts`. *(DoD 7)*
2. **Migration:** run `npm run db:generate`; confirm the new SQL file only
   adds `tasks` (no changes to `notes`). *(DoD 1–6, transitively)*
3. **`src/db/tasks.ts`:** implement `insertTask`, `tasksQuery`,
   `updateTaskText`, `setTaskCompleted`, `deleteTask`. *(DoD 2, 3, 4, 5)*
4. **`src/db/__tests__/tasks.test.ts`:** headless tests against the migrated
   in-memory DB (same `makeDb`-style helper as `notes.test.ts`, extended to
   include the `tasks` table): insert round-trips; `setTaskCompleted` flips
   `completed`/`updatedAt`, leaves `id`/`createdAt`/`text` untouched;
   `updateTaskText` mirrors `updateNoteText`'s existing test; `deleteTask`
   removes the row. *(DoD 3, 4, 5, 9)*
5. **`src/hooks/useTaskEditing.ts`:** task-typed copy of `useNoteEditing`.
   *(DoD 4)*
6. **`src/components/TaskComposer.tsx`** (+ test): copy `NoteComposer` minus
   the mic button/`useVoiceCapture` wiring; reuse `normalizeNoteInput`.
   *(DoD 2, 7, 9)*
7. **`src/components/TaskRow.tsx`** (+ test): checkbox, swipe-to-delete via
   `Swipeable`, long-press-edit via `useTaskEditing`, per the design above.
   *(DoD 3, 4, 5, 9)*
8. **`src/components/TaskList.tsx`** (+ test): `FlatList` + empty state,
   instantiates one `useTaskEditing` shared across rows (mirrors
   `NoteList`). *(DoD 2, 9)*
9. **`jest.config.js`:** add `setupFiles: ['react-native-gesture-handler/jestSetup']`.
   *(prerequisite for step 7's tests)*
10. **`src/app/tasks.tsx`:** wire composer + list to `src/db/tasks.ts` via
    `useLiveQuery`, with the local Android-IME-height listener (duplicated
    from `index.tsx`, not extracted). *(DoD 1, 2, 3, 4, 5, 6, 11)*
11. **`src/app/_layout.tsx`:** add `GestureHandlerRootView`, replace
    `<Stack>` with `<Tabs>` (`Notes`/`Tasks`). *(DoD 1)*
12. **Grep check:** confirm no title/tag/due-date/recurrence field in the
    diff, and no date/time-picker, notification, or network/auth/sync code.
    *(DoD 7, 8)*
13. **Run quality gates:** `npm test`, `npm run typecheck`, `npm run lint`,
    `npm run format:check`. *(DoD 9, 10)*
14. **On-device Android check:** launch the app, confirm the Notes tab is
    unaffected, switch to Tasks, add/edit/complete/delete a task, force-stop
    and relaunch to confirm persistence. *(DoD 1–6, 11)*
15. **Docs:** update `CLAUDE.md`'s Status section and `PROGRESS.md`'s F7
    row/decision log once steps 1–14 are verified (not part of the code
    diff).

## Testing approach
- **Unit (headless, Jest, `@jest-environment node`):** `tasks.test.ts`
  proves `src/db/tasks.ts`'s query/update/delete behavior against the real
  generated migration, in-memory, following `notes.test.ts`'s exact pattern
  (the live `db` singleton can't be imported headlessly since it pulls in
  `expo-sqlite`).
- **Component (Jest + `@testing-library/react-native`):**
  - `TaskComposer.test.tsx`: type → send → clear/disabled, empty-input
    guard — same style as `NoteComposer.test.tsx`'s non-voice cases.
  - `TaskRow.test.tsx`: `fireEvent.press` on the checkbox calls
    `onToggleComplete(id, !completed)`; `fireEvent(el, 'longPress')` on the
    text enters edit mode pre-filled with the task's text, blur commits/
    reverts exactly like `NoteRow`'s existing tests. Since delete fires from
    tapping a real `Pressable` (`task-delete-button`) rather than the swipe
    gesture itself, and `Swipeable` renders its `renderRightActions` content
    in the tree regardless of swipe state (revealed via animated transform,
    not conditional mount), the test can `fireEvent.press` that button
    directly — no need to simulate the underlying pan gesture at all.
  - `TaskList.test.tsx`: empty state, renders N task rows in the given
    order (no re-sorting).
- **Static:** `tsc --noEmit`, `expo lint`, Prettier — must stay clean.
- **Manual/grep (DoD 7, 8):** no automated test enforces "no forbidden
  field/surface" — verified by inspection/grep at step 12, as prior features
  did.
- **On-device:** one manual Android run covering add/edit/complete/delete
  and restart-survival, plus confirming the Notes tab still works unchanged.

## Risks / tradeoffs
- **`useTaskEditing` duplicates `useNoteEditing` instead of generalizing
  it.** The spec explicitly leaves generalizing as optional ("not
  required"), and `useNoteEditing.ts`/`NoteList.tsx`/`GroupedNoteList.tsx`
  are **not** in the spec's "Files to change" list — touching them to
  extract a shared generic hook would put already-shipped, gated F4/F5 code
  at risk for a cosmetic DRY win. ~20 lines of duplicated state-machine code
  is the accepted cost; revisiting this (e.g. a shared `useTextEditing<T>`)
  is a cheap follow-up if F8+ shows the two hooks drifting.
- **The Android IME-height listener is duplicated in `tasks.tsx` rather than
  extracted from `index.tsx`.** Same reasoning: `index.tsx` isn't in the
  spec's file list, so this plan doesn't touch it. The duplication is
  small (~15 lines) and already exists as a workaround for one known Android
  edge-to-edge quirk (documented in `index.tsx`'s comment).
- **No GestureHandlerRootView existed before this feature.** Confirmed via
  search — this is a real gap, not redundant boilerplate. Wrapping the whole
  app (inside `_layout.tsx`, around `<Tabs>`) is the standard fix and is
  low-risk (purely additive), but it is a root-level change that affects
  every screen, so the on-device check (step 14) explicitly re-verifies the
  Notes tab still works unchanged.
- **Multiple `Swipeable` rows don't auto-close each other.** Each `TaskRow`'s
  `Swipeable` is independent; swiping row B while row A is still open
  doesn't close A. `react-native-gesture-handler` supports a shared-ref
  pattern to fix this, but it adds meaningful complexity for a cosmetic
  polish item not required by any DoD item — left as a documented gap, not
  implemented in F7.
- **Deletion still has no undo once the revealed Delete button is tapped.**
  The swipe-then-tap sequence (rather than swipe-alone) already guards
  against a single accidental gesture deleting a task; a stray double-tap
  on an already-revealed button remains unguarded. Accepted tradeoff, not
  re-litigated here.
- **Tab bar changes the Notes screen's header title** from "Today" to
  "Notes" (the Stack `Stack.Screen options.title` is superseded by the Tab's
  `options.title`). This is a direct, intended consequence of the user's
  "Notes | Tasks" tab-bar decision, not an incidental regression — flagged
  here so it isn't mistaken for one during review.
