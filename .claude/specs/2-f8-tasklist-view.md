# Spec: Task List View (Phase 2 · F8)

## Overview
F7 shipped a deliberately unfiltered task list (all tasks, open and
completed, newest first) as a foundation. F8 turns that into the app's real
default Tasks experience: the Tasks tab shows **only open (incomplete)
tasks** — the "default view" `ideas-refined.md` specifies for tasks,
mirroring how F3 curated F2's bare note list into the real Today view. This
is a filtering-only feature: no new fields, no new screens, no scheduling or
time-based grouping (that's F9/F10). Completing a task removes it from view
immediately; there is no way to browse completed tasks from this screen in
this feature — that remains fully out of scope here.

## Depends on
- **F7 — Task management (DONE):** provides the `tasks` table, `src/db/tasks.ts`
  data-access, and the `TaskComposer`/`TaskList`/`TaskRow`/`tasks.tsx` screen
  F8 filters. F8 changes only the query and, if needed, the empty-state copy —
  it does not touch add/edit/delete/complete behavior, which F7 already
  covers and verified.
- No dependency on F9/F10/F11/F12 (scheduling, time views, recurrence,
  reminders) — out of scope for F8.

## Files to change
- `src/db/tasks.ts` — replace (or add alongside) `tasksQuery` with a query
  that returns only tasks where `completed` is false, still newest-created-first.
  No schema change: filtering is a `WHERE` clause on the existing `completed`
  column, not a new field.
- `src/app/tasks.tsx` — use the new open-only query instead of the current
  unfiltered `tasksQuery`.
- `src/components/TaskList.tsx` — update the empty-state copy from "No tasks
  yet" to **"All caught up!"** (decided with the user: this view can be empty
  either because no tasks exist yet or because all existing tasks are
  completed, and the new copy fits both without being misleading).
- `CLAUDE.md` — update the **Status** section once F8 lands (tracked as F8
  progresses, not part of the initial code diff).
- `PROGRESS.md` — advance F8 through the pipeline stages and record the gate
  approval in the decision log (tracked separately from the code diff).

## Files to create
- **Tests** covering: the new open-only query in `src/db/tasks.ts` (returns
  only incomplete tasks, still newest-first, excludes completed ones); the
  updated empty-state copy in `TaskList`'s existing test suite; and a
  regression check that completing a task removes it from the list rendered
  by the Tasks screen's live query. No new component/module files are
  anticipated — F8 is a query + copy change, not new UI.

## New dependencies
No new dependencies.

## Rules for implementation
- **Minimalism (minimalism-guard):** no new fields, filters, toggles, or
  screens beyond the open/incomplete filter itself. Do not add a "show
  completed" toggle, a completed-tasks archive, or any settings/preferences
  UI — completed tasks are simply not shown from this screen in this feature
  (decided with the user).
- **Filter semantics:** the Tasks tab shows tasks where `completed = false`
  only, ordered newest-created-first (same ordering F7 already uses) — no
  day/week/month/year grouping (that's F10's job).
- **Complete transition (decided with user):** when a task is marked
  complete, it disappears from the list immediately (or on the next live-query
  refresh) — no confirmation delay, no animation, no transient "just
  completed" state to build.
- **Empty state (decided with user):** show **"All caught up!"** whenever the
  open-task list is empty, regardless of whether completed tasks exist
  underneath.
- **Reuse F7's seams exactly:** add/edit/delete/checkbox-toggle interactions,
  their components, and their tests are unchanged by F8 — only the query
  feeding the list (and the empty-state string) changes. Do not re-implement
  or restyle `TaskComposer`, `TaskRow`, or the edit/delete flows.
- **No scheduling, no recurrence, no reminders:** unchanged from F7 — no
  date/time picker, no recurrence rule UI, no notification code, and no
  schema changes.
- **Local-first only:** on-device DB exclusively; no network, backend, auth,
  or sync code (Phase 3).
- **Android is the target surface:** verify on Android; keep code
  cross-platform but do not build/verify web.

## Definition of done
Each item is verifiable by running the app or the test suite:

1. **Open tasks only:** the Tasks tab shows incomplete tasks, newest-created-
   first; a task marked complete no longer appears (verified via a fresh
   render after toggling, and after an app restart).
2. **Completed tasks stay hidden:** completing several tasks across a
   session leaves them permanently out of the Tasks tab's list (no toggle or
   control reveals them) while confirming (e.g. via direct DB inspection or a
   test) that they still exist in storage, not deleted.
3. **Add/edit/delete unaffected:** adding a new task still shows it
   immediately (since new tasks are incomplete by default); long-press-edit
   and swipe-to-delete still work exactly as in F7, on both currently-visible
   (open) tasks.
4. **Empty state:** when there are zero open tasks (either no tasks at all,
   or all existing tasks are completed), the Tasks tab shows **"All caught
   up!"** instead of F7's "No tasks yet".
5. **Persistence survives restart:** the open-only filtering (and the
   underlying completed state) is correctly reflected after a full app
   force-stop and relaunch — a completed task stays hidden, an open task
   stays visible.
6. **No forbidden surface (grep-checkable):** no new field, toggle, screen,
   date/time picker, recurrence UI, notification code, or network/backend/
   auth/sync code introduced.
7. **Test suite passes:** `npm test` passes, including new/updated tests for
   the open-only query and the updated empty-state copy.
8. **Quality gates pass:** `npm run typecheck`, `npm run lint`, and
   `npm run format:check` all run clean.
9. **On-device verification:** on an Android device/emulator, confirm a
   completed task disappears from the Tasks tab immediately, stays hidden
   after restart, and the "All caught up!" empty state appears once all tasks
   are completed (or none exist).
