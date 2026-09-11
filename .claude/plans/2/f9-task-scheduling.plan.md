# Technical Plan: Task Scheduling (Phase 2 · F9)

## References
Spec: `.claude/specs/2-f9-task-scheduling.md` (approved).

## Data model
Add one nullable column to the existing `tasks` table — no new table.

```ts
// src/db/schema.ts
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  dueAt: integer('due_at'), // epoch ms; null = unscheduled
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
```

- `dueAt` is a plain nullable integer (epoch ms), matching `createdAt`/`updatedAt`'s
  existing style rather than Drizzle's `{ mode: 'timestamp' }` sugar — consistent
  with the rest of the schema, and keeps the value a plain `number` in JS (no
  `Date` boxing) so the same value flows straight into `formatTaskDueAt` and
  `pickDateTime` without conversion.
- No index needed at this scale/feature (F10 can add one later if day/week/month
  task queries need it).
- Migration: run `npm run db:generate` after the schema edit. Drizzle-kit emits
  an additive `ALTER TABLE tasks ADD COLUMN due_at integer;` — existing rows get
  `NULL` automatically, `notes` is untouched. No hand-written SQL, no manual
  migration file naming (drizzle-kit names it).

## Modules / components

**New:**
- `src/lib/pickDateTime.ts` — pure-ish helper (mocked in tests) wrapping the
  native picker as a promise:
  ```ts
  import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

  /** Opens the native date dialog, then the native time dialog. Resolves the
   *  combined Date, or null if either dialog is cancelled (leaves caller's
   *  existing value untouched — the caller only applies a non-null result). */
  export function pickDateTime(initial: Date): Promise<Date | null> {
    return new Promise((resolve) => {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        onChange: (dateEvent, date) => {
          if (dateEvent.type !== 'set' || !date) return resolve(null);
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            onChange: (timeEvent, time) => {
              if (timeEvent.type !== 'set' || !time) return resolve(null);
              const combined = new Date(date);
              combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
              resolve(combined);
            },
          });
        },
      });
    });
  }
  ```
  One function, one shared implementation for both entry points (composer and
  row) — satisfies the spec's "two entry points, one picker" rule directly.
- `src/lib/formatTaskDueAt.ts` — `formatTaskDueAt(dueAt: number, now: Date = new Date()): string`,
  mirroring `formatDay.ts`'s existing "Today, " prefix convention:
  `Today, 3:00 PM` if `dueAt`'s calendar day equals `now`'s (reuse `startOfDay`
  from `src/db/dayRange.ts` for the comparison), else `Sep 12, 3:00 PM`.
  `Intl.DateTimeFormat` for both the date and time parts, no new dependency.

**Changed:**
- `src/db/tasks.ts`:
  - `insertTask(text: string, dueAt: number | null = null): Promise<Task>` —
    additive optional param, defaulted so the F7 call sites that don't pass it
    keep compiling and behaving identically (DoD 1's regression guarantee).
  - `updateTaskSchedule(id: string, dueAt: number | null): Promise<void>` — sets
    `dueAt` (or clears it with `null`) and bumps `updatedAt`, same shape as
    `updateTaskText`/`setTaskCompleted`.
  - `tasksQuery`/`openTasksQuery` unchanged — `select()` already returns every
    column, so `dueAt` flows through automatically.
- `src/components/TaskComposer.tsx`:
  - `onSubmit` prop becomes `(text: string, dueAt: number | null) => void`.
  - New local state `pendingDueAt: number | null` (default `null`).
  - New small pressable next to the input: unset → a `📅` icon button
    (`accessibilityLabel="Add schedule"`); set → a pill showing
    `formatTaskDueAt(pendingDueAt)` (tapping it reopens the picker seeded with
    `pendingDueAt`, to reschedule) plus an adjacent `×` (`accessibilityLabel="Clear schedule"`)
    that sets `pendingDueAt` back to `null` directly, no picker involved.
  - Opening the picker: `pickDateTime(pendingDueAt ? new Date(pendingDueAt) : new Date())`;
    a non-null result sets `pendingDueAt`, `null` (cancel) leaves it unchanged.
  - `handleSend` passes `pendingDueAt` to `onSubmit` and resets both `value`
    and `pendingDueAt` after a successful send (mirrors the existing
    field-clear-after-send behavior).
- `src/components/TaskRow.tsx`:
  - New prop `onScheduleTask: (id: string, dueAt: number | null) => void`.
  - In the non-editing render branch, below the task text: if `task.dueAt` is
    set, a `Pressable` subtitle (`testID="task-due-at"`) showing
    `formatTaskDueAt(task.dueAt)` that opens `pickDateTime` seeded with the
    current `dueAt` and calls `onScheduleTask(task.id, result.getTime())` on a
    non-null result; plus an adjacent small `×` `Pressable`
    (`testID="task-clear-schedule"`) that calls `onScheduleTask(task.id, null)`
    directly. If `task.dueAt` is unset, a small `📅` `Pressable`
    (`testID="task-add-schedule"`, `accessibilityLabel="Add schedule"`) that
    opens `pickDateTime` seeded with `new Date()` and calls
    `onScheduleTask(task.id, result.getTime())` on a non-null result.
  - Nothing renders for unscheduled tasks beyond this one small affordance —
    existing rows' layout is otherwise unchanged.
- `src/components/TaskList.tsx`: thread a new `onScheduleTask` prop straight
  through to `TaskRow`, same pattern as `onToggleComplete`/`onDeleteTask`.
- `src/app/tasks.tsx`:
  - `TaskComposer`'s `onSubmit` becomes
    `(text, dueAt) => { void insertTask(text, dueAt); }`.
  - `TaskList` gets `onScheduleTask={(id, dueAt) => { void updateTaskSchedule(id, dueAt); }}`.
  - Import `updateTaskSchedule` from `@/db/tasks`.

No changes to `useTaskEditing.ts`, `Swipeable`/delete wiring, or `TasksScreen`'s
keyboard-avoidance block — scheduling is orthogonal to editing/deleting.

## APIs / interfaces
Internal only (Phase 1/2, local-first):
- `insertTask(text: string, dueAt?: number | null): Promise<Task>`
- `updateTaskSchedule(id: string, dueAt: number | null): Promise<void>`
- `pickDateTime(initial: Date): Promise<Date | null>`
- `formatTaskDueAt(dueAt: number, now?: Date): string`

## Dependencies
- **`@react-native-community/datetimepicker`** — added via
  `npx expo install @react-native-community/datetimepicker`, which resolves
  the exact version range Expo SDK 57 expects (currently `9.x` upstream on
  npm; `expo install` pins the SDK-compatible version rather than hand-picking
  one). Provides `DateTimePickerAndroid.open(...)`, the imperative Android
  dialog API used above — no persistent `<DateTimePicker>` component needs to
  stay mounted, so no extra state machine for showing/hiding a modal.
  Requires a native rebuild (`expo prebuild` + `expo run:android`), same as
  F6's `expo-speech-recognition`. No `app.json` config-plugin entry is
  expected (this library autolinks; confirm during implementation and add one
  only if the build actually requires it).
- No other new dependencies.

## Implementation steps
Each step is independently verifiable (test or `tsc`/lint) before moving on.

1. **Add the dependency:** `npx expo install @react-native-community/datetimepicker`;
   confirm `expo prebuild` + `expo run:android` still builds (no plugin config
   needed unless the build fails without one).
2. **Schema + migration:** add `dueAt` to `src/db/schema.ts`; run
   `npm run db:generate`; confirm the generated SQL only adds `due_at` to
   `tasks` and touches nothing else.
3. **`src/lib/pickDateTime.ts`** + tests (mocking
   `DateTimePickerAndroid.open` to simulate: set+set → combined `Date`;
   cancel-at-date → `null`; set-then-cancel-at-time → `null`).
4. **`src/lib/formatTaskDueAt.ts`** + tests (today vs. another day, matching
   `formatDay.test.ts`'s existing style of fixed-`now` deterministic cases).
5. **`src/db/tasks.ts`:** extend `insertTask`, add `updateTaskSchedule` + tests
   (insert with/without `dueAt`; update sets it; update with `null` clears it;
   `updatedAt` bumps).
6. **`TaskRow.tsx`:** add the schedule subtitle/clear/add affordances and
   `onScheduleTask` prop + tests (renders subtitle when `dueAt` set, omits it
   when not; tapping the `×` calls `onScheduleTask(id, null)`; tapping the
   subtitle/add-icon calls `pickDateTime` and forwards a non-null result;
   a `null` (cancelled) result calls nothing).
7. **`TaskList.tsx`:** thread `onScheduleTask` through + a test confirming it
   reaches `TaskRow`.
8. **`TaskComposer.tsx`:** add the pending-schedule control + tests (send with
   no schedule touched passes `null`, matching today's behavior exactly; set →
   send passes the chosen `dueAt` and resets state after; clear after setting
   returns to `null`).
9. **`tasks.tsx`:** wire `insertTask`/`updateTaskSchedule` calls through the
   new props.
10. **Full headless pass:** `npm test`, `npm run typecheck`, `npm run lint`,
    `npm run format:check`.
11. **On-device verification** against every relevant spec DoD item (native
    dialogs appear/function; row shows/edits/clears schedule; composer
    schedule flow; cancel-leaves-unchanged at both entry points; force-stop +
    relaunch persistence).

## Testing approach
- **DoD 1 (create unscheduled, regression):** existing `TaskComposer.test.tsx`
  send-flow tests continue to pass unmodified with `insertTask`'s new param
  defaulted; add one explicit assertion that `onSubmit` is called with
  `(text, null)` when the schedule control was never touched.
- **DoD 2/3 (schedule at/after creation):** new `TaskComposer` and `TaskRow`
  tests drive the schedule-set path with `pickDateTime` mocked to resolve a
  fixed `Date`.
- **DoD 4 (change existing schedule):** `TaskRow` test taps the due-at
  subtitle on a task that already has `dueAt` set, asserts `pickDateTime` is
  invoked with that existing value as `initial`.
- **DoD 5 (clear):** `TaskRow`/`TaskComposer` tests tap the `×` and assert
  `onScheduleTask(id, null)` / `pendingDueAt` reset, with no picker call.
- **DoD 6 (cancel leaves unchanged):** `pickDateTime` tests cover both cancel
  points directly; `TaskRow`/`TaskComposer` tests mock a `null` resolution and
  assert no callback fires and no state changes.
- **DoD 7 (past-due allowed):** `updateTaskSchedule`/`insertTask` tests pass a
  past timestamp and assert it's stored as-is, no validation/rejection.
- **DoD 8 (list/complete/delete/edit unaffected):** existing F7/F8 test suites
  for `TaskList`/`TaskRow`/`useTaskEditing` run unmodified and must still pass
  — no rewrite of those tests, only additive ones for scheduling.
- **DoD 9 (persistence):** covered on-device (force-stop + relaunch), same
  method as F7/F8's persistence checks; not separately unit-testable beyond
  what `updateTaskSchedule`'s DB round-trip test already covers.
- **DoD 10 (no forbidden surface):** grep for recurrence/notification/
  network/view-by-day keywords across the diff before submitting for gate.
- **DoD 11/12:** `npm test`, `npm run typecheck`, `npm run lint`,
  `npm run format:check`.
- **DoD 13:** on-device pass on the Pixel_10_Pro emulator (or a physical
  device if audio/picker interaction needs it — pickers are visual, not
  audio, so the emulator should suffice, unlike F6's mic limitation).

## Risks / tradeoffs
- **`DateTimePickerAndroid` is Android-only** (the plan's imperative API has
  no iOS equivalent — iOS uses a rendered `<DateTimePicker>` component
  instead). Acceptable per the spec's own scope ("Android is the target
  surface... do not build/verify web") and this project's Android-first
  precedent; if iOS/web ever becomes a real target, `pickDateTime` would need
  a platform branch — flagged, not solved here.
- **Two small, deliberate duplications** (the add/change/clear affordance
  logic appears once in `TaskComposer` for the pending/pre-save case and once
  in `TaskRow` for the already-persisted case) rather than one shared
  component — the two cases differ enough (pending local state with no `id`
  yet, vs. an existing row with an `id` and an immediate DB write) that a
  shared component would need a branching prop contract for little gain at
  this size. Revisit only if a third entry point appears.
- **No index on `due_at`:** fine at F9's scale (no querying by date yet); F10
  (time-based task views) is expected to add one if profiling shows it's
  needed — not pre-built speculatively here (YAGNI, matches the project's
  general no-premature-abstraction stance).
- **Config-plugin uncertainty:** unlike `expo-speech-recognition` (which
  needed an explicit `app.json` plugin block), recent
  `@react-native-community/datetimepicker` versions typically autolink
  without one. Flagged as a build-time unknown to confirm in implementation
  step 1, not assumed either way here.
