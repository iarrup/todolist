# Technical Plan: Task Recurrence (Phase 2 · F11)

## References
- Spec: `.claude/specs/2-f11-task-recurrance.md` (approved, 20 DoD items).
- Builds on F9's schedule model (`dueAt`, `pickDateTime.ts`,
  `TaskComposer`/`TaskRow` schedule affordances) and F10's Browse queries
  (`scheduledTasksFor*Query`), both left structurally unchanged.

## Data model

Two new nullable columns on `tasks` (`src/db/schema.ts`), additive migration
only:

```ts
export const RECURRENCE_TYPES = [
  'daily',
  'weekdays',
  'weekends',
  'specific-days',
  'monthly',
  'annually',
] as const; // defined in src/lib/recurrence.ts, imported here

export const tasks = sqliteTable('tasks', {
  // ...existing columns unchanged...
  recurrence: text('recurrence', { enum: RECURRENCE_TYPES }),
  recurrenceDays: text('recurrence_days'),
  // ...
});
```

- `recurrence`: Drizzle `text(..., { enum: [...] })` gives a strict
  `'daily' | 'weekdays' | 'weekends' | 'specific-days' | 'monthly' |
  'annually' | null` TypeScript type on `Task['recurrence']` for free — no
  separate cast needed at read sites. `null` = does not repeat (today's
  behavior, unchanged).
- `recurrenceDays`: plain nullable `text` column storing comma-separated
  day-of-week integers (`"1,3,5"`), exactly as the spec's Files-to-change
  section specifies. Only ever non-null when `recurrence = 'specific-days'`.
  Parsed/serialized at the `db/tasks.ts` boundary via
  `parseRecurrenceDays`/`serializeRecurrenceDays` (new, in
  `src/lib/recurrence.ts`) so every other layer (UI, `nextOccurrence`,
  `formatRecurrence`) works with a plain `number[] | null`, never the raw
  string.
- Migration: generated via `npm run db:generate` →
  `drizzle/0003_<random-name>.sql`, adding both columns as `NULL`-able with
  no default, matching F9's `due_at` migration's shape. Existing `tasks` and
  `notes` rows are untouched.

## Modules / components

**New:**
- `src/lib/recurrence.ts` — not explicitly named in the spec's Files to
  create, but needed to avoid duplicating the six-type list and weekday
  labels across `schema.ts`, `nextOccurrence.ts`, `formatRecurrence.ts`, and
  `RepeatPicker.tsx` — same decomposition-level addition as F10's
  `taskGranularity.ts` within its own approved scope, not a new capability.
  Exports: `Recurrence` type, `RECURRENCE_TYPES` (ordered tuple, used for
  both the schema enum and the Repeat selector's option list),
  `RECURRENCE_LABELS` (`Record<Recurrence, string>` for the selector's row
  text), `WEEKDAY_LABELS` (`['Sun','Mon',...,'Sat']`, index = `Date.getDay()`
  convention, matching `weekRange.ts`), `parseRecurrenceDays(text: string |
  null): number[] | null`, `serializeRecurrenceDays(days: number[] | null):
  string | null`.
- `src/lib/nextOccurrence.ts` — `nextOccurrence(current: Date, recurrence:
  Recurrence, recurrenceDays: number[] | null): Date`. Pure, no DB/React
  import. Mirrors `stepDate.ts`'s `stepMonth` clamping approach exactly
  (`new Date(year, targetMonth + 1, 0).getDate()` for the target month's
  last day) rather than importing it — `stepDate.ts`'s `Granularity` is
  notes' 3-way type, outside F11's file list, same "parallel, don't modify"
  precedent F10 already established for `TaskBrowseHeader`/`stepTaskDate`
  vs. `BrowseHeader`/`stepDate`.
  - `daily` → `+1 day`, same time-of-day.
  - `weekdays`/`weekends`/`specific-days` → walks forward one day at a time
    **starting the day after `current`**, until `getDay()` matches (Mon–Fri /
    Sat–Sun / `recurrenceDays.includes(day)`), same time-of-day. Throws if
    `recurrence === 'specific-days'` and `recurrenceDays` is empty/null (an
    invariant the UI must never allow — see `RepeatPicker` below — kept as a
    defensive check, not a new user-facing error path).
  - `monthly` → `+1 month`, clamped to the target month's last valid day.
  - `annually` → `+12 months` via the same clamp helper (correctly handles
    Feb 29 → Feb 28 in a non-leap target year).
- `src/lib/formatRecurrence.ts` — `formatRecurrence(recurrence: Recurrence |
  null, recurrenceDays: number[] | null): string | null`. Returns `null` for
  `recurrence === null` (so call sites render nothing); otherwise "Repeats
  daily" / "Repeats on weekdays" / "Repeats on weekends" / "Repeats weekly on
  Mon, Wed, Fri" (specific-days, using `WEEKDAY_LABELS` in day-of-week
  order) / "Repeats monthly" / "Repeats annually".
- `src/components/RepeatPicker.tsx` — a controlled component, not an
  imperative promise (unlike `pickDateTime.ts`, which wraps native OS
  dialogs by necessity; this is a plain in-tree React Native `Modal`, so a
  declarative controlled component is the natural fit and needs no new
  dependency). Props:
  ```ts
  interface RepeatPickerProps {
    visible: boolean;
    recurrence: Recurrence | null;
    recurrenceDays: number[] | null;
    onConfirm: (recurrence: Recurrence | null, recurrenceDays: number[] | null) => void;
    onCancel: () => void;
  }
  ```
  Internal draft state (`draftRecurrence`, `draftDays`) initialized from
  props whenever `visible` flips to `true` (`useEffect` keyed on `visible`),
  so re-opening always starts from the task's actual current state, never a
  stale draft. Renders "None" + the six `RECURRENCE_TYPES` as a plain
  single-select list (`Pressable` rows); selecting `'specific-days'` reveals
  a row of 7 toggle chips (`WEEKDAY_LABELS`). A "Confirm" button calls
  `onConfirm(draftRecurrence, draftRecurrence === 'specific-days' ?
  draftDays : null)` and is **disabled** whenever `draftRecurrence ===
  'specific-days'` and `draftDays.length === 0` (DoD 8). A "Cancel" button
  calls `onCancel()` without touching the caller's state (DoD 7).

**Changed:**
- `src/db/tasks.ts`:
  - `insertTask` gains two more optional trailing params, `recurrence:
    Recurrence | null = null` and `recurrenceDays: number[] | null = null`,
    serialized via `serializeRecurrenceDays` before the insert — mirrors how
    F9 added `dueAt` as an optional trailing param.
  - `setTaskCompleted(id, completed)` becomes recurrence-aware **only on the
    `completed === true` path**: it first reads the task's current
    `recurrence`/`dueAt`. The recurring branch is taken **only when both
    `recurrence != null` AND `dueAt != null`** — the spec's "recurrence
    requires a schedule" invariant is enforced by the UI (`RepeatPicker` is
    only reachable once a task is scheduled), not by `insertTask`'s own
    signature (which accepts `recurrence`/`dueAt` as fully independent
    optional params), so `setTaskCompleted` must not simply trust that
    `recurrence != null` implies `dueAt != null`. When both hold, it
    computes `nextOccurrence(new Date(task.dueAt), task.recurrence,
    parseRecurrenceDays(task.recurrenceDays))` and writes `{ dueAt: next,
    updatedAt }` — **not** `completed: true`. In every other case
    (non-recurring task, `completed === false` i.e. unchecking, **or** the
    invariant-violation case of `recurrence` set with `dueAt` null) it falls
    through to F7/F8's original single-statement `{ completed, updatedAt }`
    update, unchanged — never calls `nextOccurrence` with a null `dueAt`.
    This adds one extra `select` before the `update` on the
    recurring-completion path only — negligible on an on-device SQLite call,
    flagged in Risks below.
  - `updateTaskSchedule(id, dueAt)` — when `dueAt === null`, the `update`
    also sets `recurrence: null, recurrenceDays: null` in the same
    statement (one write, no extra read needed here since we're
    unconditionally nulling, not reading first).
  - New `updateTaskRecurrence(id, recurrence: Recurrence | null,
    recurrenceDays: number[] | null): Promise<void>` — sets
    `recurrence`/`recurrenceDays` (serialized) + bumps `updatedAt`. Does not
    touch `dueAt` or validate its presence (that invariant is a UI-level
    gate — the Repeat affordance is only rendered once `dueAt` is set —
    consistent with F9's precedent of UI-level rather than DB-level
    invariants, e.g. "date and time required together").
- `src/components/TaskComposer.tsx` — new local state
  `pendingRecurrence`/`pendingRecurrenceDays` (mirrors `pendingDueAt`) and
  `repeatPickerVisible`. When `pendingDueAt != null`, the existing schedule
  row gains a third small control showing `formatRecurrence(pendingRecurrence,
  pendingRecurrenceDays) ?? 'Repeat'`, tappable to open `RepeatPicker`.
  Clearing the schedule (existing "×" button) also resets the two pending
  recurrence fields to `null`. `onSubmit`'s signature grows to `(text, dueAt,
  recurrence, recurrenceDays)`; `handleSend` resets all four pending fields
  after calling it. **No recurrence UI renders at all while `pendingDueAt`
  is `null`** — creating an unscheduled or scheduled-but-non-recurring task
  remains zero extra taps (DoD 1, 2).
- `src/components/TaskRow.tsx` — new prop `onSetRecurrence: (id: string,
  recurrence: Recurrence | null, recurrenceDays: number[] | null) => void`
  and local `repeatPickerVisible` state. When `task.dueAt != null`, the
  existing schedule row gains a Repeat control (same
  `formatRecurrence(...) ?? 'Repeat'` label) opening `RepeatPicker` seeded
  from `task.recurrence`/`parseRecurrenceDays(task.recurrenceDays)`;
  confirming calls `onSetRecurrence(task.id, recurrence, recurrenceDays)`.
  No Repeat control when `task.dueAt == null` (matches the "reachable only
  once scheduled" rule). The existing "clear schedule" button is unchanged —
  clearing already goes through `onScheduleTask(id, null)`, and the DB-layer
  change above makes that call clear recurrence server-side, so `TaskRow`
  needs no extra wiring for DoD 11.
- `src/components/TaskList.tsx`, `src/components/GroupedTaskList.tsx`,
  `src/components/YearGroupedTaskList.tsx` — **not listed in the spec's
  Files to change**, but each already threads `onScheduleTask` straight
  through to `TaskRow` with no other logic; they need the identical
  one-line addition for the new `onSetRecurrence` prop. This is pure
  plumbing for an already-approved capability (`TaskRow` needs it in every
  place it's rendered — Open, and Browse's Day/Week/Month/Year), the same
  kind of gap F9 and F10's own implementations quietly closed for
  `onScheduleTask` without it being called out as scope creep.
- `src/app/tasks.tsx` — new `onSetRecurrence` handler calling
  `updateTaskRecurrence`, passed to every `TaskList`/`GroupedTaskList`/
  `YearGroupedTaskList` render site (Open mode + all four Browse
  granularities) alongside the existing `onScheduleTask`. `insertTask` call
  in `TaskComposer`'s `onSubmit` grows to pass through `recurrence`/
  `recurrenceDays`. No other change — Open/Browse mode structure, the
  toggle, and the browse header are all untouched.
- `src/db/__tests__/tasks.test.ts` — **not listed in the spec's Files to
  create**, but required: this suite can't import the real `src/db/tasks.ts`
  (it pulls in `expo-sqlite`, unusable in the headless Jest/`better-sqlite3`
  environment), so it keeps its own small local reimplementations of
  `insertTask`/`setTaskCompleted`/`updateTaskSchedule` run against an
  in-memory DB built from the real generated migrations (already the
  existing pattern for `dueAt` — see its local `updateTaskSchedule` at line
  81 today). These local helpers must be updated to mirror the new
  recurrence-aware behavior described above, importing the real
  `nextOccurrence`/`parseRecurrenceDays`/`serializeRecurrenceDays` (which
  *are* headless-safe, pure functions) rather than reimplementing that logic
  a third time.

## APIs / interfaces (internal contracts only — no network/Phase 3 surface)

```ts
// src/lib/recurrence.ts
export type Recurrence = 'daily' | 'weekdays' | 'weekends' | 'specific-days' | 'monthly' | 'annually';
export const RECURRENCE_TYPES: readonly Recurrence[];
export const RECURRENCE_LABELS: Record<Recurrence, string>;
export const WEEKDAY_LABELS: readonly [string, string, string, string, string, string, string]; // Sun..Sat
export function parseRecurrenceDays(raw: string | null): number[] | null;
export function serializeRecurrenceDays(days: number[] | null): string | null;

// src/lib/nextOccurrence.ts
export function nextOccurrence(current: Date, recurrence: Recurrence, recurrenceDays: number[] | null): Date;

// src/lib/formatRecurrence.ts
export function formatRecurrence(recurrence: Recurrence | null, recurrenceDays: number[] | null): string | null;

// src/db/tasks.ts (signatures changed/added)
export function insertTask(text: string, dueAt?: number | null, recurrence?: Recurrence | null, recurrenceDays?: number[] | null): Promise<Task>;
export function setTaskCompleted(id: string, completed: boolean): Promise<void>; // now recurrence-aware
export function updateTaskSchedule(id: string, dueAt: number | null): Promise<void>; // now clears recurrence when dueAt is null
export function updateTaskRecurrence(id: string, recurrence: Recurrence | null, recurrenceDays: number[] | null): Promise<void>; // new
```

## Dependencies
None. Confirms the spec's "No new dependencies expected" — `RepeatPicker`
is built from `Modal`/`View`/`Pressable`/`Text`, all already used elsewhere
in this codebase.

## Implementation steps

Each step is independently runnable/testable before moving to the next.

1. **`src/lib/recurrence.ts`** — types, constants, `parseRecurrenceDays`/
   `serializeRecurrenceDays`. Unit tests for the parse/serialize round-trip
   including `null`/empty-string edge cases.
2. **`src/lib/nextOccurrence.ts`** — all six recurrence types plus clamping.
   Unit tests: one case per type, a same-weekday-selected specific-days
   case, the 31st-into-a-30-day-month case, and the Feb-29-into-non-leap-year
   case (covers DoD 4, 5, 6).
3. **`src/lib/formatRecurrence.ts`** — unit tests, one assertion per type
   plus the `null` case (covers DoD 12).
4. **`src/db/schema.ts`** — add the two columns; run `npm run db:generate`
   to produce the migration. Sanity-check the generated SQL only adds
   columns (no data loss, no table rewrite of `notes`).
5. **`src/db/tasks.ts`** — extend `insertTask`, make `setTaskCompleted`
   recurrence-aware (guarded on both `recurrence != null` AND `dueAt !=
   null`, falling through to plain completion otherwise), extend
   `updateTaskSchedule`, add `updateTaskRecurrence`.
6. **`src/db/__tests__/tasks.test.ts`** — update local helper
   reimplementations to match step 5, importing the real
   `nextOccurrence`/`parseRecurrenceDays`/`serializeRecurrenceDays`. New
   tests: insert with recurrence; completing a recurring task rolls `dueAt`
   and leaves `completed = false`; completing a non-recurring task is
   unaffected (regression); a task with `recurrence` set but `dueAt = null`
   (the invariant-violation case) completes normally instead of throwing/
   corrupting `dueAt`; clearing a schedule clears recurrence;
   `updateTaskRecurrence` sets/changes/clears independent of `dueAt`
   (covers DoD 1, 4, 5, 9, 10, 11).
7. **`src/components/RepeatPicker.tsx`** + test — selection, the
   specific-days multi-select and its empty-selection Confirm-disabled
   state, Cancel leaving props-derived state untouched, re-opening reseeding
   from fresh props (covers DoD 7, 8).
8. **`src/components/TaskComposer.tsx`** — wire pending recurrence state +
   Repeat control + `RepeatPicker`; update `onSubmit` signature. Test:
   scheduling + picking a repeat type sends the right `insertTask` args;
   scheduling without touching Repeat sends `recurrence: null` (covers DoD
   1, 2).
9. **`src/components/TaskRow.tsx`** — wire `onSetRecurrence` + Repeat
   control + `RepeatPicker`; no control rendered while unscheduled. Test:
   repeat indicator renders/omits correctly, opening/confirming/cancelling
   the picker (covers DoD 3, 7, 12).
10. **`src/components/TaskList.tsx`, `GroupedTaskList.tsx`,
    `YearGroupedTaskList.tsx`** — thread `onSetRecurrence` through to
    `TaskRow`. `onSetRecurrence` is a required prop (matching
    `onScheduleTask`'s existing precedent on `TaskRow`), so every existing
    render call site across these three components' own test suites *and*
    `TaskRow.test.tsx`/`TaskList.test.tsx` (wherever they instantiate
    `TaskRow`/`TaskList`/`GroupedTaskList`/`YearGroupedTaskList` directly)
    needs a trivial `onSetRecurrence: jest.fn()` added or the suite won't
    typecheck. No test needs new assertions here — this is compile-level
    upkeep, not a behavior change.
11. **`src/app/tasks.tsx`** — wire `onSetRecurrence` to
    `updateTaskRecurrence` at every render site; thread `recurrence`/
    `recurrenceDays` through the `TaskComposer` `onSubmit` → `insertTask`
    call.
12. **Full regression pass**: `npm test` (all suites, including F7–F10's
    untouched ones), `npm run typecheck`, `npm run lint`,
    `npm run format:check`.
13. **Grep check** confirming no materialized-instance table, no
    per-occurrence history/"skip" UI, no end-date/occurrence-count field, no
    notification/snooze code, no network/backend/auth/sync code (DoD 17).
14. **On-device verification** (Pixel_10_Pro emulator, headless
    `adb`/`uiautomator` driving, this project's established method): no
    native rebuild is needed (no new native dependency) — the app does need
    a fresh `expo run:android` (or at minimum a full relaunch) so the new
    migration runs against the on-device DB. Walk DoD 20's full checklist:
    Repeat selector from both entry points, specific-days multi-select +
    empty-block, completing a recurring task rolling forward while staying
    in Open, the repeat indicator, cancel-leaves-untouched, force-stop +
    relaunch persistence.
15. **`CLAUDE.md`/`PROGRESS.md`** updates, tracked separately per the spec —
    only after the implementation `review-and-gate` passes, not part of the
    code diff itself.

## Testing approach — DoD traceability

| DoD | Covered by |
|---|---|
| 1, 2 | `TaskComposer.test.tsx` (step 8) |
| 3 | `TaskRow.test.tsx` (step 9) |
| 4, 5, 6 | `nextOccurrence.test.ts` (step 2) + `tasks.test.ts` (step 6, end-to-end through `setTaskCompleted`) |
| 7 | `RepeatPicker.test.tsx` (step 7) + `TaskRow.test.tsx`/`TaskComposer.test.tsx` (steps 8–9) |
| 8 | `RepeatPicker.test.tsx` (step 7) |
| 9 | `tasks.test.ts` (step 6, regression) |
| 10 | `tasks.test.ts` (step 6) |
| 11 | `tasks.test.ts` (step 6) |
| 12 | `formatRecurrence.test.ts` (step 3) + `TaskRow.test.tsx` (step 9) |
| 13 | On-device (step 14) — Open mode's live-query behavior isn't covered by any screen-level test (matches F7–F10's precedent of no `tasks.tsx` screen test) |
| 14 | On-device (step 14) |
| 15 | `tasks.test.ts` (step 6) + on-device (step 14) |
| 16 | On-device (step 14) — force-stop + relaunch |
| 17 | Grep check (step 13) |
| 18 | `npm test` (step 12) |
| 19 | `npm run typecheck` / `lint` / `format:check` (step 12) |
| 20 | On-device (step 14) |

## Risks / tradeoffs

- **`setTaskCompleted`'s recurring path needs a read before its write** —
  the only DB function in this codebase that isn't a single UPDATE
  statement. Accepted: negligible cost for an on-device SQLite call, and
  the alternative (passing the task's current `dueAt`/`recurrence` in from
  the caller) would leak DB-internal computation into every UI call site
  instead of keeping `setTaskCompleted`'s contract identical to F7/F8's
  (`(id, completed) => void`).
- **Three files not in the spec's "Files to change" list need touching**
  (`TaskList.tsx`, `GroupedTaskList.tsx`, `YearGroupedTaskList.tsx`) — pure
  prop-threading for `onSetRecurrence`, the same kind of gap F9/F10 already
  had to close silently for `onScheduleTask`. Called out explicitly here so
  it's not mistaken for undisclosed scope creep at the implementation gate.
- **`src/lib/recurrence.ts` is a new file not named in the spec** — needed
  to avoid a three-way duplication of the six-type list/weekday labels;
  mirrors `taskGranularity.ts`'s precedent from F10. Pure constants/types,
  no new capability.
- **Monthly/annual clamping is not reversible** — completing a 31st-anchored
  monthly task into a 30-day month permanently moves its anchor to the
  30th; it will not "snap back" to the 31st in a later 31-day month. This
  mirrors `stepDate.ts`'s already-documented, already-accepted behavior for
  notes/tasks browsing, so it's a consistent product behavior, not a new
  risk introduced here.
- **`RepeatPicker` is hand-built rather than a native dialog** — F9 used a
  native Android date/time dialog; recurrence has no OS-level equivalent to
  wrap, so a custom `Modal`-based picker is the only option that avoids a
  new dependency, per the spec's stated preference. Slightly more custom UI
  code than F9's picker, but consistent with this project's "ask before
  adding a dependency" precedent (F6, F9) — no dependency was found
  necessary here.
