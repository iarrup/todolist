# Spec: Task Scheduling (Phase 2 · F9)

## Overview
F7/F8 shipped tasks as pure text with a completed flag — no notion of *when*
a task is due. F9 adds a **due date and time** to a task, the foundation
`ideas-refined.md` calls for before time-based task views (F10), recurrence
(F11), and reminders (F12) can exist. A task's schedule is optional: an
unscheduled task remains exactly as valid and visible as it is today. This
feature is scheduling only — it does not add day/week/month/year browsing of
tasks (F10), recurring rules (F11), or notifications/snooze (F12); those
build on the due-moment this feature introduces.

## Depends on
- **F7 — Task management (DONE):** provides the `tasks` table, `src/db/tasks.ts`
  data-access, and the `TaskComposer`/`TaskRow`/`TaskList`/`tasks.tsx` screen
  F9 extends.
- **F8 — Task list view (DONE):** the open-tasks-only Tasks tab F9's scheduled
  and unscheduled tasks both continue to appear in, unfiltered by schedule.
- No dependency on F10/F11/F12 (time-based views, recurrence, reminders) —
  out of scope for F9. F11 (recurrence) will need to coordinate with this
  feature's data model per the `task-scheduling` skill's guardrails, but no
  recurrence code or fields are introduced here.

## Files to change
- `src/db/schema.ts` — add a nullable `dueAt` column (epoch milliseconds) to
  the `tasks` table. `null` means unscheduled (today's default, unchanged
  behavior). No separate "has schedule" boolean — presence of `dueAt` is the
  signal.
- `src/db/tasks.ts` — `insertTask` accepts an optional `dueAt`; add
  `updateTaskSchedule(id, dueAt: number | null)` to set or clear a task's due
  moment (`null` clears it) and bump `updatedAt`. Existing queries
  (`tasksQuery`, `openTasksQuery`) are unaffected in shape — they keep
  returning full rows, now including `dueAt`.
- `src/components/TaskComposer.tsx` — add an optional schedule control (opens
  the native date picker, then the native time picker) so a task can be
  created already-scheduled. Composer stays usable with zero taps on this
  control (creating an unscheduled task, today's behavior, must remain
  exactly as fast as before).
- `src/components/TaskRow.tsx` — show the scheduled date/time as a small
  subtitle under the task text when `dueAt` is set (nothing shown when
  unscheduled, so existing unscheduled tasks render unchanged); tapping this
  subtitle (or a small icon when unscheduled) opens the same date/time picker
  to set, change, or clear the schedule on an existing task.
- `src/app/tasks.tsx` — thread the new schedule-setting callback from
  `TaskRow`/`TaskList` down to `db/tasks.ts`'s new update function, same
  wiring pattern as the existing complete/delete callbacks.
- `CLAUDE.md` — update the **Status** section once F9 lands (tracked as F9
  progresses, not part of the initial code diff).
- `PROGRESS.md` — advance F9 through the pipeline stages and record the gate
  approval in the decision log (tracked separately from the code diff).

## Files to create
- `drizzle/000X_<name>.sql` — generated migration (via `npm run db:generate`)
  adding the nullable `due_at` column to `tasks`. Additive only: existing
  `notes` and `tasks` rows are unaffected, existing rows get `due_at = NULL`.
- A new date/time picker component (name TBD in the technical plan, e.g.
  `src/components/TaskSchedulePicker.tsx`) wrapping
  `@react-native-community/datetimepicker`'s Android dialog flow (date dialog
  → time dialog in sequence), reused by both `TaskComposer` and `TaskRow` so
  the two entry points share one implementation.
- **Tests** covering: `insertTask` with and without `dueAt`;
  `updateTaskSchedule` setting and clearing a schedule; `TaskComposer`
  creating a task with a schedule attached; `TaskRow` rendering the due
  date/time subtitle when set and omitting it when not; the schedule picker's
  set/change/clear interactions.

## New dependencies
- `@react-native-community/datetimepicker` — the standard Expo-compatible
  native date/time picker (config-plugin support, no bare-workflow ejection
  needed). Decided with the user over a hand-built picker for native feel;
  mirrors the F6 precedent of adding one focused native dependency when it
  clearly earns its place. Requires a native rebuild (`expo prebuild` +
  `expo run:android`), same as F6's `expo-speech-recognition`.

## Rules for implementation
- **Minimalism (minimalism-guard):** scheduling is the *only* new capability.
  No priority, category, location, notes-on-task, or any other new field
  beyond the one due-moment. No settings/preferences UI for default times or
  reminder lead time (that's F12's concern, if ever).
- **Optional by default:** creating a task with zero interaction with the
  schedule control must produce the exact same unscheduled task F7/F8 already
  produce — no forced date/time step inserted into the fast-capture path.
- **Both date and time required together (decided with user):** the picker
  flow only writes a `dueAt` once both a date and a time have been chosen;
  there is no date-only/no-time schedule state. Cancelling either step of the
  picker leaves the task's existing schedule (or lack of one) unchanged.
- **Two entry points, one picker (decided with user):** the same picker
  component/flow is used from `TaskComposer` (at creation) and from
  `TaskRow` (on an existing task) — do not build two different UIs for
  setting a schedule.
- **Clearable (decided with user):** the picker flow (from `TaskRow`, on an
  already-scheduled task) offers an explicit way to remove the schedule,
  setting `dueAt` back to `null` rather than only allowing it to be changed
  to another moment.
- **Storage as an unambiguous instant:** `dueAt` is stored as epoch
  milliseconds (UTC instant), consistent with `createdAt`/`updatedAt`, and
  rendered in the device's local time zone — no separate stored time zone or
  "floating time" representation. DST/travel edge cases are not specifically
  handled beyond this (device-local rendering of a fixed instant), per the
  `task-scheduling` skill's guidance to decide this now rather than defer it.
- **Past-due dates are allowed:** the picker does not block picking a
  date/time in the past — an already-overdue schedule is valid input (needed
  groundwork for F12's overdue/snooze concept), it just is not surfaced as
  "overdue" anywhere in this feature (no visual treatment, no filtering by
  overdue — that's F10/F12's job).
- **No time-based views, no recurrence, no reminders:** unchanged from F7/F8
  scope boundaries — no day/week/month/year task browsing, no recurrence rule
  UI or fields, no notification/snooze code.
- **Local-first only:** on-device DB exclusively; no network, backend, auth,
  or sync code (Phase 3).
- **Android is the target surface:** verify on Android; keep code
  cross-platform but do not build/verify web.

## Definition of done
Each item is verifiable by running the app or the test suite:

1. **Create unscheduled (regression):** adding a task via `TaskComposer`
   without touching the schedule control creates a task with `dueAt = null`,
   exactly as before F9 — no extra taps, no forced picker step.
2. **Schedule at creation:** using the composer's schedule control to pick a
   date and time before sending creates a task that is immediately shown
   with that due date/time.
3. **Schedule after creation:** tapping an existing unscheduled task's
   schedule affordance opens the picker; completing date + time saves the
   schedule and the row updates to show it.
4. **Change an existing schedule:** tapping an already-scheduled task's due
   date/time subtitle reopens the picker pre-populated with the current
   value; picking a new date/time updates the stored `dueAt` and the
   displayed subtitle.
5. **Clear a schedule:** from an already-scheduled task's picker flow,
   clearing the schedule sets `dueAt` back to `null` and the row reverts to
   showing no due date/time subtitle.
6. **Cancel leaves schedule untouched:** cancelling the date or time dialog
   partway through (from either entry point) leaves the task's prior
   schedule state (scheduled or unscheduled) unchanged.
7. **Past-due allowed:** picking a date/time in the past is accepted and
   stored without error or special handling.
8. **List/complete/delete/edit unaffected:** F7/F8 behaviors (add, long-press
   text edit, swipe-to-delete, complete checkbox, open-only filtering) all
   continue to work unchanged on both scheduled and unscheduled tasks.
9. **Persistence survives restart:** a task's scheduled `dueAt` (or its
   absence) is correctly reflected after a full app force-stop and relaunch.
10. **No forbidden surface (grep-checkable):** no recurrence field/UI, no
    notification/snooze code, no day/week/month/year task-browsing UI, no
    network/backend/auth/sync code introduced.
11. **Test suite passes:** `npm test` passes, including new/updated tests for
    `insertTask`/`updateTaskSchedule`, the composer's schedule flow, and the
    row's schedule display/edit flow.
12. **Quality gates pass:** `npm run typecheck`, `npm run lint`, and
    `npm run format:check` all run clean.
13. **On-device verification:** on an Android device/emulator, confirm the
    native date and time dialogs appear and function correctly, a scheduled
    due date/time is visible on the task row, changing and clearing a
    schedule both work, and all of the above survives a force-stop + relaunch.
