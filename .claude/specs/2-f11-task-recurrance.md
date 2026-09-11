# Spec: Task Recurrence (Phase 2 · F11)

## Overview
F9 gave a task an optional one-off due date/time; F10 let those scheduled
tasks be browsed by day/week/month/year. F11 adds the six recurrence types
`ideas-refined.md` calls for — **Daily, Weekdays, Weekends, Specific days of
the week, Monthly, Annually** — so a task can repeat instead of firing once.
A recurring task is still a **single task row that moves forward in time**:
completing it computes and stores the next occurrence's due date/time (rolling
`dueAt` forward and staying open) rather than staying completed or spawning
new rows. This keeps F9's `dueAt`-per-task model and F10's Browse-by-range
queries completely untouched, at the cost of not keeping a browsable history
of past completed occurrences — a deliberate minimalism tradeoff confirmed
with the user. F11 does not add reminders or notifications (F12) — it only
makes a task's *next* due moment advance correctly when it repeats.

## Depends on
- **F9 — Task scheduling (DONE):** provides the nullable `dueAt` column and
  the `TaskComposer`/`TaskRow` schedule-picker flow (`pickDateTime`) that F11
  extends with a repeat step. A task must already have a `dueAt` before
  recurrence can be set on it — recurrence has no meaning without an anchor
  date/time.
- **F10 — Task time-based views (DONE):** Browse mode's `scheduledTasksFor*`
  queries (range-filtered on `dueAt`) work unchanged — a recurring task simply
  appears at whichever single `dueAt` it currently holds, exactly like a
  one-off scheduled task.
- No dependency on F12 (reminders & snooze) — out of scope for F11. F12 will
  read this feature's recurrence fields to fire reminders per occurrence, but
  no notification code is introduced here.

## Files to change
- `src/db/schema.ts` — add two nullable columns to `tasks`:
  - `recurrence` (text): one of `'daily' | 'weekdays' | 'weekends' |
    'specific-days' | 'monthly' | 'annually'`, or `null` (does not repeat —
    today's behavior, unchanged).
  - `recurrenceDays` (text): comma-separated day-of-week integers (`0`=Sunday
    … `6`=Saturday, matching `Date.getDay()` and `weekRange.ts`'s existing
    convention), populated only when `recurrence = 'specific-days'`; `null`
    otherwise.
- `src/db/tasks.ts`:
  - `insertTask` gains optional `recurrence`/`recurrenceDays` params (default
    `null`), mirroring how F9 added `dueAt`.
  - `setTaskCompleted` becomes recurrence-aware: completing a task whose
    `recurrence` is non-null does **not** set `completed = true` — instead it
    computes the next occurrence's `dueAt` (via the new `nextOccurrence`
    helper) and writes that, leaving `completed = false` and
    `recurrence`/`recurrenceDays` unchanged. Completing a task with
    `recurrence = null` is exactly F7/F8's existing behavior (unchanged).
  - `updateTaskSchedule` (F9) gains the rule that clearing a schedule
    (`dueAt → null`) also clears `recurrence`/`recurrenceDays` back to `null`
    — a recurrence without an anchor date is invalid state. Add
    `updateTaskRecurrence(id, recurrence, recurrenceDays)` to set/change/clear
    recurrence on an already-scheduled task independent of its `dueAt`.
- `src/components/TaskComposer.tsx` — after the existing F9 date/time picker
  step completes, offer the new Repeat selector (see Files to create) before
  sending; defaults to "None" with zero extra taps, so creating a one-off or
  unscheduled task remains exactly as fast as today.
- `src/components/TaskRow.tsx` — the F9 due-date/time subtitle gains a small
  repeat indicator (e.g. a "🔁" glyph plus a short label like "Repeats daily")
  when `recurrence` is set, shown next to the existing subtitle; tapping it
  reopens the same picker flow (date/time, pre-filled, then Repeat,
  pre-selected) so the schedule and/or recurrence can be changed or cleared
  together.
- `src/app/tasks.tsx` — thread the new recurrence read/write callbacks from
  `TaskRow`/`TaskList` down to `db/tasks.ts`, same wiring pattern as F9's
  schedule callbacks.
- `CLAUDE.md` — update the **Status** section once F11 lands (tracked as F11
  progresses, not part of the initial code diff).
- `PROGRESS.md` — advance F11 through the pipeline stages and record the gate
  approval in the decision log (tracked separately from the code diff).

## Files to create
- `drizzle/000X_<name>.sql` — generated migration (via `npm run db:generate`)
  adding the nullable `recurrence` and `recurrence_days` columns to `tasks`.
  Additive only: existing `notes`/`tasks` rows are unaffected, existing task
  rows get both new columns as `NULL` (non-recurring, matching today).
- `src/lib/nextOccurrence.ts` — pure function computing the next occurrence's
  `Date` given the current due `Date`, the `recurrence` type, and
  `recurrenceDays` (only used for `'specific-days'`). Handles all six types,
  including month-end/Feb-29 clamping (see Rules below). Unit-testable in
  isolation, mirroring `stepDate.ts`'s style.
- `src/lib/formatRecurrence.ts` — pure formatter producing the short label
  shown on `TaskRow` (e.g. "Repeats daily", "Repeats weekly on Mon, Wed, Fri",
  "Repeats monthly", "Repeats annually").
- A new Repeat-selector component (name TBD in the technical plan, e.g.
  `src/components/RepeatPicker.tsx`) presenting the six named options plus
  "None"; selecting "Specific days of the week" reveals a weekday multi-select
  (Sun–Sat) before confirming. Reused by both `TaskComposer` and `TaskRow`,
  mirroring F9's "two entry points, one picker" precedent.
- **Tests** covering: `nextOccurrence` for all six types, including the
  month-end/Feb-29 clamping edge cases; `formatRecurrence`'s output per type;
  `insertTask`/`setTaskCompleted`/`updateTaskRecurrence` with recurrence
  fields; `TaskComposer`'s repeat-selection flow; `TaskRow`'s repeat-indicator
  display and edit/clear flow.

## New dependencies
No new dependencies expected — the Repeat selector and weekday multi-select
are plain React Native primitives (`Modal`/`View`/`Pressable`), the same
approach `pickDateTime.ts` already wraps for the native date/time dialogs.
If the technical plan finds a compelling reason to add one, it must be
raised with the user first, per this project's dependency-addition
precedent (F6, F9).

## Rules for implementation
- **Minimalism (minimalism-guard):** recurrence is the *only* new capability.
  No per-occurrence notes, no "skip this one" action, no end-date/occurrence-
  count field (confirmed with the user — a recurring task repeats forever
  until manually turned off), no priority/category beyond the six named
  types.
- **Single-row model (decided with user):** a recurring task is **one task
  row whose `dueAt` advances on completion** — not materialized instances.
  There is no history of past completed occurrences and no per-occurrence
  delete; deleting a recurring task deletes the whole series, since there is
  only ever one row.
- **Recurrence requires an existing schedule (decided with user):** the
  Repeat selector is only reachable once a date/time has been chosen (at
  creation in `TaskComposer`, or already present on the row in `TaskRow`).
  Clearing a task's schedule back to unscheduled also clears its recurrence.
- **Completing a recurring occurrence (decided with user):** never sets
  `completed = true` for a recurring task — it rolls `dueAt` to the next
  occurrence and stays open. This is a real behavioral difference from a
  one-off task's checkbox, which the implementation must not blur (e.g. the
  checkbox still visually ticks/unticks briefly is fine, but the stored state
  after the write is `completed = false`, new `dueAt`).
- **Recurring tasks never leave Open (decided with user):** because Open
  mode (F8) is unfiltered by date, a recurring task stays visible in Open
  after every completion — only its due date/time subtitle changes to the
  next occurrence. This is unlike a one-off task, which disappears from Open
  the moment it's completed. Implementers must not add date-based filtering
  to Open to "clear" a just-completed recurring task from view — that would
  contradict F8's existing unfiltered design.
- **Next occurrence always starts after the current due day (decided with
  user):** for weekdays/weekends/specific-days recurrence, the search for
  the next matching day starts the day *after* the current `dueAt`'s date,
  never the same day — e.g. if today's occurrence is a Monday and Monday is
  itself one of the selected specific-days, completing it rolls to *next*
  Monday, not today again.
- **Monthly/annual clamping (decided with user):** if the exact day doesn't
  exist in the target month/year (e.g. the 31st in a 30-day month, Feb 29 in
  a non-leap year), clamp to that period's last valid day (e.g. the 30th, or
  Feb 28) rather than skipping the occurrence. Mirrors `stepDate.ts`'s
  existing month-end-clamping precedent. Time-of-day always carries forward
  unchanged — only the date advances. As with F9's `dueAt`, DST/travel edge
  cases are not specifically handled beyond this date-level clamping (the
  same disclosed, accepted gap F9's spec already carries).
- **Specific days requires at least one day selected:** the weekday
  multi-select cannot be confirmed with zero days checked — `nextOccurrence`
  has no valid day to roll to otherwise. The Repeat selector must block
  confirming "Specific days of the week" until at least one day is chosen.
- **No end condition (decided with user):** no "repeat until" field of any
  kind — recurrence continues indefinitely until the user sets it back to
  "None".
- **Two entry points, one picker (decided with user):** the same Repeat
  selector is used from both `TaskComposer` (at creation, right after
  picking date/time) and `TaskRow` (on an existing scheduled task) — do not
  build two different UIs for setting recurrence.
- **Cancel leaves recurrence untouched (decided with user):** backing out of
  the Repeat selector (or its weekday multi-select) without confirming
  leaves the task's prior recurrence state (set or none) exactly as it was —
  mirrors F9's "cancelling the date/time dialog leaves the schedule
  untouched" rule.
- **Storage stays plain columns:** `recurrence`/`recurrenceDays` are simple
  nullable text columns on `tasks`, consistent with `dueAt`'s plain-integer
  style — no separate recurrence-rule table.
- **No reminders, no time-based-view changes:** F12 (reminders & snooze) and
  any change to F10's Browse queries/components are out of scope — a
  recurring task's *next* `dueAt` simply flows through F10's existing
  range queries unchanged.
- **Local-first only:** on-device DB exclusively; no network, backend, auth,
  or sync code (Phase 3).
- **Android is the target surface:** verify on Android; keep code
  cross-platform but do not build/verify web.

## Definition of done
Each item is verifiable by running the app or the test suite:

1. **Create recurring at composer:** scheduling a new task (date + time) and
   selecting a repeat type before sending creates a task with `dueAt` and the
   chosen `recurrence` (and `recurrenceDays` for "specific days") set.
2. **Create scheduled, non-recurring (regression):** scheduling a new task
   without touching the Repeat selector creates a task with `recurrence =
   null`, exactly F9's existing scheduling behavior — no forced repeat step.
3. **Add recurrence to an existing scheduled task:** on an already-scheduled
   task, opening the schedule/repeat flow via `TaskRow` and selecting a
   repeat type sets its recurrence without needing to recreate the task.
4. **Complete rolls forward — daily/weekdays/weekends/monthly/annually:**
   completing a recurring task of each type advances `dueAt` to the correct
   next occurrence (verified against known dates spanning a weekend and a
   month boundary), preserving the original time-of-day, starting the search
   strictly after the current due day, and the task remains open
   (`completed = false`), not completed.
5. **Complete rolls forward — specific days, including same-day selection:**
   for a task recurring on a chosen subset of weekdays (e.g. Mon/Wed/Fri),
   completing it advances `dueAt` to the next matching weekday, correctly
   wrapping across a week boundary — including the case where the current
   due day's weekday is itself one of the selected days (rolls to the next
   week's occurrence of that day, not today again).
6. **Month-end/Feb-29 clamping:** a task recurring monthly anchored on the
   31st rolls to the last day of a 30-day (and 28/29-day) month instead of
   skipping or erroring; a task recurring annually anchored on Feb 29 rolls
   to Feb 28 in a non-leap year.
7. **Cancel leaves recurrence untouched:** backing out of the Repeat
   selector, or its weekday multi-select, without confirming leaves the
   task's prior recurrence state (set or none) unchanged.
8. **Specific-days requires at least one day:** attempting to confirm
   "Specific days of the week" with no weekday checked is blocked — no task
   can end up with `recurrence = 'specific-days'` and empty/null
   `recurrenceDays`.
9. **Non-recurring unaffected (regression):** completing a task with no
   recurrence set still sets `completed = true` and it disappears from Open
   (F8) exactly as before F11.
10. **Turn recurrence off:** setting an existing recurring task's repeat back
    to "None" stops future roll-forward — completing it thereafter behaves
    like a normal one-off task (sets `completed = true`, stays completed).
11. **Clearing the whole schedule clears recurrence:** clearing a recurring
    task's `dueAt` back to unscheduled (F9's existing clear action) also
    resets its `recurrence`/`recurrenceDays` to `null`.
12. **Repeat indicator on the row:** a recurring task's row shows a repeat
    indicator/label (e.g. "Repeats daily") alongside its due date/time; a
    non-recurring scheduled task's row is unchanged from F9 (no indicator).
13. **Recurring task stays in Open after completing:** completing a
    recurring task does **not** remove it from the Open list (F8) — it
    remains visible there with its subtitle updated to the next occurrence's
    date/time, unlike a one-off task which disappears from Open on
    completion.
14. **Delete removes the whole series:** swipe-deleting a recurring task
    removes it entirely — no leftover row, no orphaned future occurrence.
15. **Open and Browse stay single-row (regression):** a recurring task never
    appears more than once in Open (F8) or in any Browse granularity (F10) —
    only at its current single `dueAt`.
16. **Persistence survives restart:** a recurring task's `recurrence`/
    `recurrenceDays` and its rolled-forward `dueAt` are correctly reflected
    after a full app force-stop and relaunch.
17. **No forbidden surface (grep-checkable):** no materialized-instance
    table/rows, no per-occurrence history or "skip" action, no end-date/
    occurrence-count field, no notification/snooze code (F12), no
    network/backend/auth/sync code introduced.
18. **Test suite passes:** `npm test` passes, including new/updated tests for
    `nextOccurrence`, `formatRecurrence`, the recurrence-aware `db/tasks.ts`
    functions, and the composer/row repeat-flow components.
19. **Quality gates pass:** `npm run typecheck`, `npm run lint`, and
    `npm run format:check` all run clean.
20. **On-device verification:** on an Android device/emulator, confirm the
    Repeat selector (including the specific-days weekday multi-select and
    its empty-selection block) appears and functions from both
    `TaskComposer` and `TaskRow`; completing a recurring task visibly rolls
    it to its next due date/time while staying in Open instead of
    disappearing; the repeat indicator renders correctly; cancelling the
    selector leaves state untouched; all of the above survives a force-stop
    + relaunch.
