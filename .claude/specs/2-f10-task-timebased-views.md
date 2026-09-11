# Spec: Task Time-Based Views (Phase 2 · F10)

## Overview
F9 gave tasks an optional due moment (`dueAt`); F8's Tasks tab only ever shows
one flat list of open tasks. F10 adds the second task-viewing capability
`ideas-refined.md` calls for: browsing tasks by **day, week, month, and year**
— year is new (notes stop at month, per F5). The Tasks tab gains an
**Open | Browse** mode toggle. **Open** mode is F8's existing flat,
open-only, unfiltered-by-date list, untouched. **Browse** mode reuses F5's
navigation pattern (prev/next, tap-to-jump-to-today, a segmented granularity
control extended with a fourth **Year** option) and shows only **scheduled**
tasks (`dueAt` non-null) for the browsed range, grouped by day (week/month) or
by month-then-day (year) — unlike F8, browse mode shows completed tasks too,
since browsing a past day is a calendar/history review, not a working list.
Unscheduled tasks never appear in Browse mode; they remain visible only in
Open mode. Browse mode is chronological throughout (earliest due date/time
first — a calendar view, not a journal), unlike Open mode's newest-created-
first order. This feature is strictly view-only: `TaskComposer` is hidden in
Browse mode (adding a task remains an Open-mode-only action, unchanged from
F7/F9), and there are no other changes to how tasks are created, edited,
completed, deleted, or scheduled, and no recurrence or reminders (F11/F12).

## Depends on
- **F5 — Time-based browsing (DONE):** provides the pattern this feature
  mirrors for tasks — `BrowseHeader` (arrows, tap-to-today, segmented
  control), the day-grouping approach (`groupNotesByDay`), and
  `GroupedNoteList`'s `SectionList` structure. F10 generalizes/parallels
  these for tasks rather than modifying the notes-specific versions.
- **F9 — Task scheduling (DONE):** provides `dueAt` on `tasks`, which Browse
  mode groups and ranges by, and `formatTaskDueAt`'s per-row time display.
- **F8 — Task list view (DONE):** Open mode is exactly F8's existing
  `openTasksQuery`-backed list; F10 does not change it, only adds Browse as a
  second mode alongside it.
- No dependency on F11/F12 (recurrence, reminders) — out of scope.

## Files to change
- `src/app/tasks.tsx` — add Open/Browse mode state (default: Open, i.e. the
  screen's current F8 behavior is unchanged on first load); in Browse mode,
  own granularity + anchor-date browsing state (mirroring `index.tsx`'s F5
  state) and swap `TaskList`/`openTasksQuery` for the new browse query +
  grouped view. `TaskComposer` is only rendered in Open mode — Browse mode
  hides it (decided with the user: Browse is read-only, adding tasks stays
  an Open-mode action). Screen stays thin, per F5's precedent.
- `src/db/tasks.ts` — add range-based scheduled-task queries for day/week/
  month/year (e.g. a shared `scheduledTasksForRangeQuery(start, end)` that
  day/week/month/year query builders use), filtering on `dueAt` between the
  range bounds and non-null, **including completed tasks** (no `completed`
  filter, unlike `openTasksQuery`).
- `CLAUDE.md` — update the **Status** section once F10 lands.
- `PROGRESS.md` — advance F10 through the pipeline stages and record gate
  approvals in the decision log.

## Files to create
Exact paths/names are settled in the technical plan; F10 should include:

- **A year range helper** (e.g. `src/db/yearRange.ts`), mirroring
  `weekRange.ts`/`monthRange.ts` — pure function returning inclusive
  epoch-millisecond bounds for the calendar year containing a given `Date`.
- **A year heading formatter** (e.g. `src/lib/formatYear.ts`), mirroring
  `formatWeek.ts`/`formatMonth.ts` — `"This Year"` when the range contains
  today, otherwise a plain year label (e.g. `"2026"`).
- **A task day-grouping helper** (e.g. `src/lib/groupTasksByDay.ts`) — same
  shape as `groupNotesByDay` but grouping by `dueAt` instead of `createdAt`,
  used for Browse mode's day/week/month granularities. Unlike
  `groupNotesByDay`, both the day groups themselves and the tasks within each
  group are ordered **chronologically ascending** (earliest day first;
  within a day, earliest due time first) — decided with the user: Browse is
  a calendar view, not a journal, so it reads earliest-to-latest rather than
  newest-first.
- **A task month-then-day grouping helper** (e.g.
  `src/lib/groupTasksByMonthAndDay.ts`) — buckets tasks by calendar month
  (containing `dueAt`), and within each month by day (reusing
  `groupTasksByDay`'s per-day bucketing); months, days, and tasks within a
  day are all ordered chronologically ascending, same rule as above; used
  for the Year granularity only.
- **A grouped task list component** (e.g. `src/components/GroupedTaskList.tsx`)
  — renders day groups (week/month) as a `SectionList` with a day sub-heading
  per group (reusing `formatDayHeading`), showing each task via the existing
  `TaskRow` (checkbox, schedule display/edit, swipe-to-delete, long-press-
  edit all continue to work identically in Browse mode). Shows a "No tasks
  this week/month" empty state when the range has zero scheduled tasks.
- **A year-grouped task list component** (e.g.
  `src/components/YearGroupedTaskList.tsx`, or `GroupedTaskList` extended to
  take a two-level grouping — exact shape decided in the technical plan) —
  renders month sub-headings, each containing day sub-headings, each
  containing that day's tasks via `TaskRow`. Shows "No tasks this year" when
  empty.
- **A mode toggle** (e.g. `src/components/TaskModeToggle.tsx`, or folded into
  `tasks.tsx` directly — decided in the technical plan) — a small Open/Browse
  switch above the list.
- **Tests** for every new pure helper (`yearRange`, `formatYear`,
  `groupTasksByDay`, `groupTasksByMonthAndDay`) and new/extended components
  (`GroupedTaskList`/year variant: empty/populated/grouping/completed-shown/
  edit-and-delete-passthrough; mode toggle switching; `BrowseHeader` reused
  with a fourth Year segment).

## New dependencies
No new dependencies. Year bounds/labels use built-in `Date`/`Intl` APIs,
matching F5's approach; grouping reuses React Native's built-in `SectionList`
(nested sections for Year, via two-level section data or a sectioned-within-
sectioned render — settled in the technical plan).

## Rules for implementation
- **Minimalism (minimalism-guard):** no calendar grid, no date picker/modal
  for jumping to an arbitrary date, no "go to date" search. The only new UI
  is the Open/Browse toggle, a fourth Year segment on the existing segmented
  control, and month/day sub-headings in Year view.
- **Browse mode shows scheduled tasks only, by `dueAt`:** unscheduled tasks
  (`dueAt = null`) never appear in Browse mode at any granularity — they are
  only reachable via Open mode. Do not invent a placeholder date or an
  "Unscheduled" bucket inside Browse mode (decided with the user).
- **Browse mode shows completed tasks too:** unlike Open mode's F8 filtering,
  a task's `completed` state does not affect whether it appears in Browse
  mode — only whether `TaskRow`'s existing completed styling/checkbox state
  is shown (decided with the user; a browsed day is a history view, not a
  working list).
- **Open mode is unchanged from F8:** the toggle must not alter
  `openTasksQuery`, its filtering, its empty-state copy, or its default
  freshness (open, incomplete, newest-created-first). Regression-check this
  explicitly.
- **Default mode is Open:** opening the Tasks tab shows exactly what F8
  already shows, with no extra taps or a changed first screen; Browse is an
  additional mode the user opts into.
- **Browse is read-only (decided with the user):** `TaskComposer` is hidden
  whenever Browse mode is active. Adding a task is only possible from Open
  mode; F10 introduces no new task-creation entry point or default-schedule
  behavior.
- **Browse mode is chronological (decided with the user):** day/month groups
  and the tasks within each day are ordered earliest-first throughout Browse
  mode (all granularities) — the opposite direction from Open mode's
  newest-created-first order and from notes' newest-first grouping.
- **Reuse F7/F9's row behavior verbatim:** long-press-to-edit, swipe-to-
  delete, the checkbox, and the schedule set/change/clear affordance are not
  re-implemented for Browse mode — `TaskRow` (and its existing hooks/
  callbacks) is reused as-is in the grouped views.
- **One query path per granularity, not four:** day/week/month/year queries
  share a single range-based implementation (mirroring F5's `notes.ts`
  pattern), not four hand-duplicated `db.select()...where(...)` blocks.
- **Granularity switch preserves the anchor date** (same rule as F5): moving
  between Day/Week/Month/Year keeps browsing around the currently-viewed
  date, not resetting to today. Switching from Open to Browse (or back)
  likewise does not reset an already-chosen Browse anchor date/granularity
  within the same visit to the tab.
- **Jump-to-today** resets the anchor date (not the granularity), matching
  F5.
- **No bounds on navigation:** prev/next may browse to ranges with zero
  scheduled tasks (shown via the empty states); do not clamp navigation.
- **Local-first only:** no network/backend/auth/sync code.
- **Android is the target surface:** verify on Android; keep code
  cross-platform but do not build/verify web.
- **Keep `tasks.tsx` thin:** it owns mode + browsing state and the live query
  for the current mode/range; header, toggle, and list rendering/grouping
  logic live in their own components/helpers.

## Definition of done
Each item is verifiable by running the app or the test suite:

1. **Open mode unaffected:** opening the Tasks tab shows exactly F8's
   existing open-task list, unfiltered by date, with no behavior change from
   before F10.
2. **Toggle to Browse:** switching to Browse mode shows a `BrowseHeader`
   (day/week/month/year segmented control) defaulting to Day/Today, with
   scheduled tasks due today.
3. **Day browse:** in Browse/Day, prev/next arrows step one day at a time;
   the heading and list re-scope to show only tasks whose `dueAt` falls on
   the shown day (open or completed), ordered earliest-due-time-first.
4. **Week/Month browse group by day:** selecting Week or Month shows
   scheduled tasks for that range grouped under a day sub-heading per day
   that has at least one scheduled task, earliest day first; days with none
   are omitted; within each day, tasks are ordered earliest-due-time-first;
   an empty range shows a "No tasks this week/month" state.
5. **Year browse groups by month then day:** selecting Year shows scheduled
   tasks for the calendar year grouped by month (earliest month first), and
   within each month by day (earliest day first, tasks within a day
   earliest-first); an empty year shows a "No tasks this year" state.
6. **Unscheduled tasks excluded from Browse:** a task with no `dueAt` never
   appears in any Browse granularity, regardless of when it was created;
   confirmed by seeding one unscheduled and one scheduled task and checking
   Browse/Day, Week, Month, and Year all omit the unscheduled one.
7. **Completed tasks included in Browse:** a completed task with a `dueAt`
   in the browsed range still appears (with its existing completed
   checkbox/styling), unlike Open mode where completing a task removes it.
8. **Granularity switch preserves context:** switching Day↔Week↔Month↔Year
   while browsing a non-today date keeps the same anchor date, verified for
   at least Day↔Week, Week↔Month, and Month↔Year.
9. **Jump to today:** tapping the heading while browsing any other date
   returns to today without changing the selected granularity.
10. **Row behavior unaffected in Browse mode:** long-press-edit, the
    complete checkbox, swipe-to-delete, and tap-to-change/clear-schedule all
    work identically on a task shown in Browse mode as they do in Open mode.
11. **Mode switch does not lose data:** toggling Open→Browse→Open does not
    alter any task's `completed`/`dueAt`/`text` state — it only changes what
    is displayed.
12. **Composer hidden in Browse:** `TaskComposer` is not rendered while
    Browse mode is active in any granularity; it reappears when switching
    back to Open mode.
13. **Pure helpers unit tested:** dedicated tests cover `yearRange` bounds,
    `formatYear` labels (in-range vs. out-of-range), `groupTasksByDay`
    (grouping/ordering/empty days omitted, by `dueAt` not `createdAt`), and
    `groupTasksByMonthAndDay` (month grouping, nested day grouping,
    ordering).
14. **No forbidden surface (grep-checkable):** no calendar-grid component, no
    date-picker-for-navigation dependency, no recurrence field/UI, no
    notification/snooze code, no network/backend/auth/sync code introduced.
15. **Test suite passes:** `npm test` passes, including all new/updated test
    files.
16. **Quality gates pass:** `npm run typecheck`, `npm run lint`, and
    `npm run format:check` all run clean.
17. **On-device verification:** on an Android device/emulator — confirm the
    Open/Browse toggle, and that `TaskComposer` disappears in Browse mode
    and reappears in Open mode; step forward/back through days/weeks/
    months/years with scheduled tasks seeded across several dates and times,
    confirming earliest-first ordering within a day and across day/month
    groups; confirm completed tasks appear in Browse but not in Open;
    confirm an unscheduled task never appears in Browse; long-press-edit and
    swipe-delete a task from within Browse mode and confirm persistence
    after a force-stop + relaunch.
