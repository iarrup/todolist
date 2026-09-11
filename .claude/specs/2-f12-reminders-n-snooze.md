# Spec: Reminders & Snooze

## Overview
F12 is the last feature of Phase 2. It makes scheduled and recurring tasks
(F9/F11) actively notify the user at their due time via a local push
notification, and lets an **overdue** task (past due, still open) be
**snoozed** to resurface later. This stays local-first — no server/backend
is introduced — using the platform's own notification scheduler, the same
local-only approach the `reminders-and-snooze` skill and `ideas-refined.md`
call for. It is the final piece needed to close out Phase 2 (Tasks/Mobile)
before Phase 3 (Web & Sync).

## Depends on
- **F9 (Task scheduling)** — `dueAt` (nullable epoch ms) on `tasks`, and
  `updateTaskSchedule` as the one path that sets/changes/clears it.
- **F11 (Task recurrence)** — `recurrence`/`recurrenceDays` on `tasks`, and
  `setTaskCompleted`'s roll-forward behavior (completing a recurring task
  advances `dueAt` to the next occurrence and leaves it open, rather than
  marking it completed).

Both are Done.

## Files to change
- `package.json` / `package-lock.json` — add `expo-notifications`.
- `app.json` — add the `expo-notifications` config plugin block (permission
  strings, notification icon/color), mirroring the existing
  `expo-speech-recognition`/`@react-native-community/datetimepicker` plugin
  entries.
- `src/app/_layout.tsx` — set the app-wide notification handler (how a
  reminder displays while the app is in the foreground), register the
  listener that handles a tap on a fired notification or one of its action
  buttons (10 min / 1 hour / Tomorrow snooze, or a plain tap to open the
  app), and run the launch-time reminder reconciliation pass.
- `src/app/tasks.tsx` — wire a new `onSnoozeTask` callback down through
  `TaskList`, alongside the existing `onScheduleTask`/`onSetRecurrence`/
  `onCompleteTask`/`onDeleteTask` wiring; trigger reminder
  schedule/reschedule/cancel as a side effect of those same existing
  actions (a task becoming scheduled, rescheduled, unscheduled, completed,
  or deleted).
- `src/components/TaskList.tsx`, `src/components/GroupedTaskList.tsx`,
  `src/components/YearGroupedTaskList.tsx` — thread the new `onSnoozeTask`
  prop down to `TaskRow` from all three (mirrors the precedent already set
  for `onScheduleTask`/`onSetRecurrence`, which are threaded through all
  three so a task can be edited from both Open and Browse). `TaskRow` is
  shared by all three, so the snooze affordance is not confined to Open —
  see Rules for implementation.
- `src/components/TaskRow.tsx` — show a snooze affordance (10 min / 1 hour /
  Tomorrow) on a row only when that task is overdue (`dueAt` in the past and
  `completed === false`); tapping a preset calls `onSnoozeTask`.

No changes to `src/db/tasks.ts`'s function signatures or to the schema —
see Rules for implementation.

## Files to create
- `src/lib/reminders.ts` — thin wrapper around `expo-notifications`:
  requesting permission, scheduling/cancelling a single task's reminder
  (keyed by the task's own `id` as the notification identifier, so no new
  DB column is needed to track a notification ID), and the launch-time
  reconciliation pass that re-derives all pending reminders from the DB's
  current open, scheduled tasks.
- `src/lib/snooze.ts` — pure helpers: the `SNOOZE_PRESETS` tuple/labels and
  a `computeSnoozeTime(preset, now, originalDueAt)` function (see Rules for
  implementation for exactly how each preset is computed). Mirrors the
  existing `recurrence.ts`/`nextOccurrence.ts` pure-helper pattern so the
  date math is unit-testable without touching native code.
- `src/lib/__tests__/snooze.test.ts`
- `src/lib/__tests__/reminders.test.ts` (to whatever extent
  `expo-notifications` calls are mockable — mirrors how `pickDateTime.ts`'s
  native-dialog calls are tested today).

## New dependencies
- **`expo-notifications`** (local/scheduled notifications; no server push).
  Native module — requires `expo prebuild` + a native rebuild, the same
  pattern already used for `expo-speech-recognition` (F6) and
  `@react-native-community/datetimepicker` (F9).

## Rules for implementation
- **Minimal by default.** No new task fields and no schema migration for
  this feature. Snooze reuses `dueAt` directly via the existing
  `updateTaskSchedule` path — it does **not** add a `snoozedUntil` (or any
  other) column. A reminder's identity is the task's own `id`, not a
  separately persisted notification ID.
- **Notification content is minimal** — just the task's text, no title, no
  extra chrome (per the skill's guardrail).
- **One reminder fires exactly at `dueAt`** — no lead-time/advance-notice
  option, no repeated re-firing.
- **Permission is requested lazily**, the first time the user sets a due
  date/time on a task (in `TaskComposer` at creation, or `TaskRow` on an
  existing task) — mirrors F6's on-demand microphone-permission pattern
  rather than an upfront prompt. If denied: the task's schedule is still
  saved and fully functional (Browse, editing, completion, recurrence all
  unaffected) — only the reminder itself doesn't fire. Show a clear,
  non-blocking, one-time in-app indication that reminders are off; do not
  re-prompt automatically on every later scheduling action (same
  don't-nag rule F6 already established).
- **Every write path that changes a task's `dueAt`/`completed`, or deletes
  the task, must reconcile that task's single reminder** (cancel and/or
  reschedule, keyed by the task's `id`):
  - a task is scheduled for the first time → schedule its reminder;
  - its due date/time changes (including via snooze) → cancel the old
    reminder, schedule the new one;
  - its schedule is cleared → cancel its reminder;
  - it is deleted → cancel its reminder;
  - a non-recurring task is completed → cancel its reminder;
  - a recurring task is completed (F11's roll-forward: `dueAt` advances,
    task stays open) → cancel the reminder for the occurrence just
    completed and schedule a new one for the newly-computed `dueAt`. A
    task must never have more than one active reminder at a time.
  - This feature does not change F11's roll-forward semantics itself —
    only adds the reminder side effect around it.
- **Overdue** = `dueAt` is in the past **and** `completed === false` — same
  definition for one-off and recurring tasks. The snooze affordance is
  shown only for overdue tasks, and appears **wherever that task's row
  renders** — Open or Browse (`TaskRow` is a shared component; Browse
  already includes overdue-but-open tasks since it shows both open and
  completed scheduled tasks). There is no Open-only restriction.
- **A due date/time set to a moment already in the past** (the task is
  overdue from the moment it's scheduled) does **not** get a native
  trigger scheduled for it — no backdated/immediate-firing notification.
  It simply starts out overdue, with the snooze affordance available
  immediately instead of a pending reminder.
- **Tapping a fired notification** (not one of its snooze action buttons)
  opens the app to the **Tasks tab, Open mode** — where the task that
  triggered it lives — regardless of whichever screen/tab was last active.
- **A reminder is still surfaced while the app is already open** in the
  foreground, not only when backgrounded/closed (the notification handler
  set in `_layout.tsx` must not suppress foreground delivery).
- **Snooze presets: 10 min / 1 hour / Tomorrow**, each computed relative to
  the moment of snoozing (`now`), not the task's original due time:
  - "10 min" = `now + 10 minutes`
  - "1 hour" = `now + 1 hour`
  - "Tomorrow" = the next calendar day, at the same time-of-day the task
    was originally due (not a fixed hour).
  - Snoozing calls the same reschedule path as any other schedule change
    (`updateTaskSchedule`) — it moves `dueAt` itself; there is no separate
    snoozed state.
- **Snooze is reachable from two places, both producing the identical
  result:** (a) up to three action buttons on the fired notification
  itself; (b) the in-app snooze affordance on an overdue task's row (for
  when the notification was already dismissed or missed).
- **Reminders survive a normal app relaunch.** On cold launch, reconcile
  all reminders against the DB's current open, scheduled tasks (cancel
  anything stale, schedule anything missing) so a reminder is correct even
  if the OS didn't independently preserve it. If any gap remains around a
  full device **reboot** specifically (not just relaunch) that can't be
  closed within this feature's scope, it must be disclosed on-device during
  verification rather than silently assumed — mirrors this project's
  existing disclosed-gap precedent (F6's emulator-audio limitation).
- **No cloud/server push** — `expo-notifications`' local scheduling API
  only, consistent with Phase 1/2's local-first constraint.
- **No other scope creep**: no titles/tags, no new screens, no changes to
  F9/F10/F11's existing behavior, components, or schema beyond what's
  listed above.

## Definition of done
1. Setting a due date/time on a task for the first time (composer or row)
   triggers the native Android notification-permission dialog exactly
   once; granting it enables reminders going forward.
2. Denying permission still saves the task's due date/time normally and
   shows a clear, non-blocking in-app indication that reminders are off,
   without re-prompting on later scheduling actions.
3. A scheduled, non-recurring task fires exactly one local notification at
   its due time, containing only the task's text.
4. Changing a task's due date/time reschedules its reminder to the new
   time; the old reminder no longer fires.
5. Clearing a task's schedule cancels its pending reminder.
6. Deleting a task cancels its pending reminder.
7. Completing a non-recurring, scheduled task cancels its pending
   reminder.
8. Completing a recurring, scheduled task cancels the just-completed
   occurrence's reminder and schedules exactly one new reminder for the
   newly-computed `dueAt` — never more than one active reminder for that
   task.
9. An overdue task's row shows the snooze affordance (10 min / 1 hour /
   Tomorrow) wherever it's rendered — in the Open list and in Browse mode
   (day/week/month/year); a scheduled-but-not-yet-due task does not show
   it anywhere.
10. Tapping a fired notification's snooze action reschedules that task's
    `dueAt` per the tapped preset and re-arms its reminder, without
    requiring the app to be reopened first.
11. Tapping the in-app snooze affordance on an overdue task row produces
    the identical reschedule result as the notification-action path.
12. The "Tomorrow" preset (from either path) lands on the next calendar
    day at the same time-of-day the task was originally due.
13. Reminders reconcile correctly after a full force-stop + relaunch — a
    previously scheduled task's reminder still fires or is correctly
    re-armed by the launch-time reconciliation pass. Reboot behavior
    specifically is verified on-device and any gap explicitly disclosed.
14. No new database migration or columns were added for this feature
    (confirmed via `git diff` / `drizzle/`) — snooze reuses `dueAt` via the
    existing `updateTaskSchedule` path.
15. `npm test`, `npm run typecheck`, `npm run lint`, and
    `npm run format:check` all pass; grep checks confirm no
    titles/tags/new task fields and no network/backend/auth code were
    introduced, and the only new dependency is `expo-notifications`.
16. Scheduling a task with a due date/time already in the past does not
    fire an immediate/backdated notification — it simply shows as overdue
    (with the snooze affordance) right away.
17. Tapping a fired notification itself (not a snooze action button) opens
    the app to the Tasks tab in Open mode, regardless of which tab/screen
    was last active.
18. A reminder is still delivered/visible when the app is already open in
    the foreground at the moment it fires, not only when backgrounded.
19. Notes tab and existing Tasks-tab behavior (F7–F11: add/edit/delete/
    complete/schedule/recurrence/browse) are regression-checked unaffected
    on-device.
