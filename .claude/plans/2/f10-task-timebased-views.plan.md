# Technical Plan: Task Time-Based Views (Phase 2 · F10)

## References
Spec: `.claude/specs/2-f10-task-timebased-views.md` (approved).

## Data model
**No schema change.** `tasks.dueAt` already exists (F9, nullable epoch ms).
Browse mode is a new *read* path over the existing column — no migration.

## Modules / components

### New — pure helpers (no React, dependency-free, mirror F5's style)
- **`src/db/yearRange.ts`** — `startOfYear(date)` / `endOfYear(date)`, inclusive
  epoch-ms bounds for the local calendar year containing `date`. Same shape as
  `weekRange.ts`/`monthRange.ts`.
- **`src/lib/formatYear.ts`** — `formatYearHeading(date, now = new Date())`:
  `"This Year"` when `startOfYear(date) === startOfYear(now)`, else the plain
  year (`Intl.DateTimeFormat(undefined, { year: 'numeric' })`, e.g. `"2026"`).
- **`src/lib/taskGranularity.ts`** — `export type TaskGranularity = 'day' |
  'week' | 'month' | 'year';`. A separate type from `src/lib/granularity.ts`'s
  `Granularity` (day/week/month only) rather than widening the existing type,
  so notes' `BrowseHeader`/`stepDate`/`notesForGranularityQuery` call sites
  keep their current 3-way exhaustiveness checks unchanged (adding `'year'`
  to the shared type would make every existing `switch` need a `year` case
  or a lint failure, for a value notes never uses).
- **`src/lib/stepTaskDate.ts`** — `stepTaskDate(date, granularity:
  TaskGranularity, direction: -1 | 1): Date`. Reimplements `stepDate`'s
  day/week/month cases (including `stepMonth`'s day-of-month clamping) plus a
  new year case (`setFullYear(date.getFullYear() + direction)`, clamping Feb
  29 → Feb 28 on a non-leap target year the same way `stepMonth` clamps day
  overflow). Deliberately duplicated rather than extending `stepDate.ts` —
  see Risks.
- **`src/lib/groupTasksByDay.ts`** — `groupTasksByDay(tasks: Task[]):
  TaskDayGroup[]` where `TaskDayGroup = { dayStart: number; tasks: Task[] }`.
  Buckets by the local calendar day of `dueAt` (not `createdAt`). Both the
  day groups and the tasks within each group are sorted **ascending** (by
  `dayStart`, then by `dueAt`) — the opposite direction from
  `groupNotesByDay`, per the spec's chronological-Browse-mode rule. Used for
  Week/Month granularities (and as a building block for Year).
- **`src/lib/groupTasksByMonthAndDay.ts`** — `groupTasksByMonthAndDay(tasks:
  Task[]): TaskMonthGroup[]` where `TaskMonthGroup = { monthStart: number;
  days: TaskDayGroup[] }`. Buckets by local calendar month of `dueAt`
  (ascending), then calls `groupTasksByDay` on each month's tasks to get its
  day groups (already ascending). Used for Year only.

### Changed — data access
- **`src/db/tasks.ts`** — add:
  - `scheduledTasksForRangeQuery(start: number, end: number)` — `db.select()
    .from(tasks).where(and(isNotNull(tasks.dueAt), gte(tasks.dueAt, start),
    lte(tasks.dueAt, end))).orderBy(asc(tasks.dueAt))`. Deliberately no
    `completed` filter (Browse mode shows completed tasks too, per spec).
    The one range-query path every Browse granularity builds on, mirroring
    `notesForRangeQuery`.
  - `scheduledTasksForDayQuery(date)` / `scheduledTasksForWeekQuery(date)` /
    `scheduledTasksForMonthQuery(date)` / `scheduledTasksForYearQuery(date)`
    — each calls `scheduledTasksForRangeQuery` with the matching
    `db/*Range.ts` bounds (day/week/month reuse the existing range helpers;
    year uses the new `yearRange.ts`).
  - `scheduledTasksForGranularityQuery(granularity: TaskGranularity, date:
    Date)` — dispatcher mirroring `notesForGranularityQuery`, used by
    `tasks.tsx` so it stays free of range logic.
  - `openTasksQuery` and every existing export are untouched (F8 regression
    guard).

### New — components
- **`src/components/TaskBrowseHeader.tsx`** — a task-specific sibling of
  `BrowseHeader` (not a modification of it — `BrowseHeader.tsx` is an
  F5-gated file outside this spec's file list; see Risks): same visual
  chrome (prev/next arrows, tap-label-to-jump-to-today, segmented control),
  but typed on `TaskGranularity` and rendering **four** segments
  (Day/Week/Month/Year), with heading text delegating to
  `formatDayHeading`/`formatWeekHeading`/`formatMonthHeading`/
  `formatYearHeading` by current granularity. Purely presentational, same
  prop shape as `BrowseHeader` (`granularity`, `anchorDate`, `now?`, `onPrev`,
  `onNext`, `onJumpToToday`, `onGranularityChange`), same `testID` scheme
  (`browse-prev`/`browse-next`/`browse-heading`/`browse-granularity-<key>`)
  since it renders in a different screen than `BrowseHeader`.
- **`src/components/TaskModeToggle.tsx`** — a two-option Open/Browse switch
  (`testID`s `task-mode-open` / `task-mode-browse`), presentational,
  `{ mode: 'open' | 'browse'; onModeChange: (mode) => void }`.
- **`src/components/GroupedTaskList.tsx`** — Week/Month Browse view. Takes
  `{ tasks: Task[]; onEditTask; onToggleComplete; onDeleteTask;
  onScheduleTask; emptyMessage: string }` (the same prop shape `TaskList`
  already takes, plus `emptyMessage`), builds `editing =
  useTaskEditing(onEditTask)` once, groups via `groupTasksByDay`, and
  renders a `SectionList` (`sections = dayGroups.map(g => ({ dayStart:
  g.dayStart, data: g.tasks }))`, `stickySectionHeadersEnabled={false}`),
  each section header showing `formatDayHeading(new Date(section.dayStart))`
  and each item rendered via the existing `TaskRow` — identical row props
  and behavior to `TaskList`. Empty state shows `emptyMessage` when
  `tasks.length === 0`. Mirrors `GroupedNoteList`'s structure exactly, one
  level.
- **`src/components/YearGroupedTaskList.tsx`** — Year Browse view. Takes the
  same task/callback props plus a static "No tasks this year" empty message.
  To avoid nesting a `SectionList`/`FlatList` inside another (React Native
  warns against nested same-orientation virtualized lists), this renders
  **one `SectionList`** whose sections are **months**
  (`groupTasksByMonthAndDay(tasks)`, section title = `formatMonthHeading`-
  style label for that month, e.g. via a small inline formatter using
  `Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })` — not
  `formatMonthHeading` itself, since that returns `"This Month"` for the
  current month and Year view's month sub-headings should always show the
  plain month name) and whose **items are day-groups**, not individual
  tasks: `data: month.days` (each a `TaskDayGroup`). `renderItem` renders one
  day sub-heading (`formatDayHeading`) followed by that day's tasks
  (a plain `.map`, not a nested list — a day realistically holds a handful
  of scheduled tasks, so no virtualization is needed at that level).

### Changed — screen
- **`src/app/tasks.tsx`** — add `mode: 'open' | 'browse'` state (default
  `'open'`) and, for Browse, `granularity: TaskGranularity` (default
  `'day'`) + `anchorDate: Date` (default `new Date()`) state, exactly
  mirroring `index.tsx`'s F5 shape. Renders `TaskModeToggle` above the list
  always. In `'open'` mode: unchanged F8 body — `openTasksQuery` +
  `TaskList` + `TaskComposer`, byte-for-byte the same JSX as today. In
  `'browse'` mode: `TaskBrowseHeader` + `useLiveQuery(
  scheduledTasksForGranularityQuery(granularity, anchorDate), [granularity,
  anchorDate.getTime()])`, then `granularity === 'day' ? <TaskList ...> :
  granularity === 'year' ? <YearGroupedTaskList ...> : <GroupedTaskList
  ...>`; **no `TaskComposer`** in this branch. `onEditTask`/
  `onToggleComplete`/`onDeleteTask`/`onScheduleTask` callbacks are the exact
  same three `db/tasks.ts` calls already wired in Open mode, passed to
  whichever list component is active — one set of callbacks, two render
  branches.

## APIs / interfaces
```ts
// src/db/yearRange.ts
export function startOfYear(date: Date): number;
export function endOfYear(date: Date): number;

// src/lib/formatYear.ts
export function formatYearHeading(date: Date, now?: Date): string;

// src/lib/taskGranularity.ts
export type TaskGranularity = 'day' | 'week' | 'month' | 'year';

// src/lib/stepTaskDate.ts
export function stepTaskDate(date: Date, granularity: TaskGranularity, direction: -1 | 1): Date;

// src/lib/groupTasksByDay.ts
export interface TaskDayGroup { dayStart: number; tasks: Task[] }
export function groupTasksByDay(tasks: Task[]): TaskDayGroup[]; // ascending

// src/lib/groupTasksByMonthAndDay.ts
export interface TaskMonthGroup { monthStart: number; days: TaskDayGroup[] }
export function groupTasksByMonthAndDay(tasks: Task[]): TaskMonthGroup[]; // ascending

// src/db/tasks.ts (additions)
export function scheduledTasksForRangeQuery(start: number, end: number);
export function scheduledTasksForDayQuery(date: Date);
export function scheduledTasksForWeekQuery(date: Date);
export function scheduledTasksForMonthQuery(date: Date);
export function scheduledTasksForYearQuery(date: Date);
export function scheduledTasksForGranularityQuery(granularity: TaskGranularity, date: Date);
```
`GroupedTaskList`/`YearGroupedTaskList` accept the same
`onEditTask`/`onToggleComplete`/`onDeleteTask`/`onScheduleTask` callback
shapes `TaskList` already uses (each internally builds its own
`useTaskEditing(onEditTask)`, same as `TaskList` does today — not shared
state across list components, matching how `TaskList` already owns its own
`editing` instance).

## Dependencies
No new dependencies. All new helpers use built-in `Date`/`Intl`; all new
components use React Native's built-in `SectionList`.

## Implementation steps
Each step is independently runnable/testable before moving to the next.

1. **`src/db/yearRange.ts`** + test (`src/db/__tests__/yearRange.test.ts`):
   bounds for a normal year and a leap year (Feb 29 falls inside).
2. **`src/lib/formatYear.ts`** + test
   (`src/lib/__tests__/formatYear.test.ts`): "This Year" vs. a past/future
   year label.
3. **`src/lib/taskGranularity.ts`** (type only, no test needed).
4. **`src/lib/stepTaskDate.ts`** + test (`src/lib/__tests__/stepTaskDate.test.ts`):
   day/week/month cases (can assert parity with `stepDate` for those three),
   plus year-forward, year-back, and Feb 29 → non-leap-year clamp.
5. **`src/lib/groupTasksByDay.ts`** + test
   (`src/lib/__tests__/groupTasksByDay.test.ts`): grouping by `dueAt`,
   ascending day order, ascending task order within a day, days with zero
   tasks never appear (nothing to omit — input is pre-filtered, but assert
   the function itself doesn't need "empty days" since it only sees tasks
   passed in).
6. **`src/lib/groupTasksByMonthAndDay.ts`** + test
   (`src/lib/__tests__/groupTasksByMonthAndDay.test.ts`): month grouping
   ascending, each month's `days` matches `groupTasksByDay` on that month's
   subset, ordering across a year boundary (Dec → Jan of two different
   years, if ever relevant — out of scope here since a single Year query is
   bounded to one calendar year, but confirm December is last, not wrapping).
7. **`src/db/tasks.ts` additions** + tests in
   `src/db/__tests__/tasks.test.ts`: `scheduledTasksForRangeQuery` returns
   only non-null `dueAt` rows in range, ascending, including a completed
   task; `scheduledTasksForDayQuery`/Week/Month/Year each scoped correctly;
   `scheduledTasksForGranularityQuery` dispatches correctly for all four
   keys. Regression-check `openTasksQuery` is byte-for-byte unchanged (diff
   review, not a new test).
8. **`src/components/TaskBrowseHeader.tsx`** + test
   (`src/components/__tests__/TaskBrowseHeader.test.tsx`, mirroring
   `BrowseHeader.test.tsx` plus a fourth "year" heading case and a
   `browse-granularity-year` press test).
9. **`src/components/TaskModeToggle.tsx`** + test
   (`src/components/__tests__/TaskModeToggle.test.tsx`): renders both
   options, calls `onModeChange` with the tapped mode, reflects the active
   `mode` prop visually/via `accessibilityState`.
10. **`src/components/GroupedTaskList.tsx`** + test
    (`src/components/__tests__/GroupedTaskList.test.tsx`): empty state,
    day-grouped rendering, ascending order, a completed task renders with
    `TaskRow`'s completed styling, long-press-edit/checkbox/delete/schedule
    all pass through to the given callbacks (reuse `TaskRow`'s existing
    `testID`s to assert this, same technique `GroupedNoteList.test.tsx`
    uses for `NoteRow`).
11. **`src/components/YearGroupedTaskList.tsx`** + test
    (`src/components/__tests__/YearGroupedTaskList.test.tsx`): empty state,
    month sub-headings render, day sub-headings render nested under the
    right month, ascending order at both levels, row behavior pass-through
    (same checks as step 10).
12. **`src/app/tasks.tsx` rewire**: add mode/browsing state, render
    `TaskModeToggle` always, branch Open (unchanged F8 JSX) vs. Browse
    (`TaskBrowseHeader` + granularity-dispatched list, no `TaskComposer`).
    No new test file for `tasks.tsx` itself (it has none today, per existing
    convention — F7/F8/F9 verified it via component tests further down the
    tree plus on-device checks); rely on the component-level tests above
    plus on-device verification for the wiring.
13. **Full headless gate:** `npm test`, `npm run typecheck`, `npm run lint`,
    `npm run format:check` — all clean.
14. **Grep check (spec DoD 14):** confirm no calendar-grid component, no new
    date-picker dependency, no recurrence/notification/network/backend/auth
    string or import introduced by this diff.
15. **On-device verification** (Android): seed scheduled tasks (including at
    least one completed one) across several days/months/years and one
    unscheduled task; drive the Open/Browse toggle, all four granularities,
    prev/next, jump-to-today, granularity-switch anchor-preservation,
    long-press-edit/checkbox/delete/schedule from within Browse mode, and a
    force-stop + relaunch — per spec DoD 17.
16. **Update `CLAUDE.md` Status and `PROGRESS.md`** once the above are
    verified, per the spec's Files-to-change list (tracked at gate time, not
    part of the code diff itself).

## Testing approach
Every spec DoD item maps to a concrete check:

| DoD | Verified by |
|---|---|
| 1 (Open unaffected) | Existing F8 tests untouched + pass; on-device regression check |
| 2 (Toggle to Browse) | `tasks.tsx` on-device check (no dedicated unit test file for the screen, matching existing convention) |
| 3 (Day browse) | `scheduledTasksForDayQuery` test + on-device |
| 4 (Week/Month group by day) | `GroupedTaskList` test + `groupTasksByDay`/`scheduledTasksForWeekQuery`/`MonthQuery` tests |
| 5 (Year groups by month/day) | `YearGroupedTaskList` test + `groupTasksByMonthAndDay`/`scheduledTasksForYearQuery` tests |
| 6 (Unscheduled excluded) | `scheduledTasksForRangeQuery` test (asserts `isNotNull` filter) + on-device |
| 7 (Completed included) | `scheduledTasksForRangeQuery`/`GroupedTaskList` tests seed a completed task and assert it's returned/rendered |
| 8 (Granularity switch preserves anchor) | on-device (state-only logic identical to F5's already-tested `index.tsx` pattern; no new pure-function risk since `tasks.tsx` reuses the same state shape) |
| 9 (Jump to today) | `TaskBrowseHeader` test (press `browse-heading` calls `onJumpToToday`) + on-device |
| 10 (Row behavior unaffected) | `GroupedTaskList`/`YearGroupedTaskList` tests assert `TaskRow`'s existing callbacks fire |
| 11 (Mode switch doesn't lose data) | on-device (toggling reads the same underlying rows; no write path exists in Browse mode to risk data loss) |
| 12 (Composer hidden in Browse) | on-device + a `tasks.tsx`-level assertion is impractical without a dedicated screen test; covered by manual on-device check per DoD 17 |
| 13 (Pure helpers unit tested) | Steps 1, 2, 4, 5, 6, 7 |
| 14 (No forbidden surface) | Step 14 grep check |
| 15 (Test suite passes) | Step 13 |
| 16 (Quality gates pass) | Step 13 |
| 17 (On-device verification) | Step 15 |

## Risks / tradeoffs
- **Duplication over modification, twice** (`TaskBrowseHeader` vs.
  `BrowseHeader`; `stepTaskDate` vs. `stepDate`): both `BrowseHeader.tsx` and
  `stepDate.ts` are F5-gated files not listed in F10's approved "Files to
  change." Generalizing either to support a fourth granularity would force
  touching `index.tsx` too (to pass the now-required extra props), which is
  out of scope. This mirrors F7's explicit precedent (`useTaskEditing`
  duplicated rather than generalizing `useNoteEditing`) — small, contained
  duplication in exchange for zero regression risk to already-shipped,
  gated notes code. Cost: a future granularity-list change must be applied
  in two places; acceptable at this scale (two ~15-line functions, one
  ~130-line presentational component).
- **`YearGroupedTaskList`'s two-level `SectionList`-with-day-group-items
  design** (rather than nesting two `SectionList`s) avoids React Native's
  nested-same-orientation-virtualized-list warning, at the cost of each
  "item" being a whole day (rendered as a plain, non-virtualized `.map` of
  that day's tasks) rather than a single task. This is fine at realistic
  data volumes (a day rarely has more than a handful of scheduled tasks) but
  would not scale to a day with hundreds of tasks — not a realistic case for
  this app's minimalism-first scope.
- **No dedicated `tasks.tsx` screen test**, matching the existing convention
  (F7/F8/F9 never added one either) — wiring correctness relies on
  component-level tests for each piece plus the on-device verification
  pass. Flagged so the gate reviewer knows this is consistent with prior
  features, not a gap specific to F10.
