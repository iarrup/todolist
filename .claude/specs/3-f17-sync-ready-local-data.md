# F17 — Sync-ready local data

**Phase:** 3 (Web & Sync) · **Depends on:** none · **Stage:** Spec — **approved 2026-10-01**

## 1. Summary

Make the on-device data safe to sync later, without changing anything the user
sees. Today a deleted note or task is hard-deleted (the row is gone), so a sync
engine could never tell "deleted on this phone" apart from "never existed here"
and would resurrect it from the cloud. F17 changes deletion so that a deletion
is a recorded, syncable fact, and confirms the other prerequisite for
last-write-wins sync (a trustworthy per-item "last changed" time) already holds.
F17 ships **no sync, no network, no UI change** — it only prepares the local
data for F18.

## 2. What already holds (verified against the code, not new work)

- Every note and task already has a globally-unique string `id` (UUID).
- Every note and task already has `createdAt` / `updatedAt` (epoch ms), and
  every existing write path in `src/db/notes.ts` and `src/db/tasks.ts` bumps
  `updatedAt` (text edit, complete, reschedule, recurrence change, roll-forward).

F17 must preserve both. It does not add or rename them.

## 3. Scope

**In scope**
- Deleting a note or task becomes a **soft delete**: the item is marked deleted
  with the time of deletion instead of being removed.
- Every user-facing read (Today/Week/Month notes; Open and Browse tasks;
  reminder scheduling; snooze) **excludes** deleted items, so behavior is
  identical to today.
- A soft delete counts as a change: it carries a deletion time that last-write-
  wins can compare against later edits.
- A migration that adds the needed column(s) to the existing tables and leaves
  every existing row intact and **not deleted**.
- Deleting a task still cancels its scheduled reminder (F12 behavior unchanged).

**Out of scope**
- Any network, backend, account, or sync logic (F15, F16, F18).
- Purging/compacting old deletion markers (see Open question 2).
- Any visible UI change, "trash", restore, or undo. Delete stays a swipe-reveal
  then tap, with no confirmation, exactly as F7/F14.
- Syncing notification/snooze state (see Open question 3).

## 4. User flows

There are no new user flows. The user-visible flows are unchanged:

1. Swipe a note/task left → tap **Delete** → it disappears immediately.
2. Relaunch the app → it is still gone.

## 5. Behavior & rules

- **Deleted items are invisible everywhere** the app lists, counts, schedules, or
  notifies on notes/tasks. There is no way for the user to see a deleted item.
- **Deleting is idempotent**: deleting an already-deleted item changes nothing.
- **Deletion is a change**: it sets the item's last-changed time (`updatedAt`) to
  the deletion time, so "edited after deleted" and "deleted after edited" are
  both decidable by timestamp.
- **Editing a deleted item** is not possible from the UI (it is invisible); data-
  access functions that mutate by id must not silently resurrect a deleted item.
- **New items** are created not-deleted, as now.
- **Existing data**: after migration every pre-existing note/task is not-deleted
  and keeps its text, schedule, recurrence, completion, `createdAt`, `updatedAt`.
- **Minimalism**: no user-visible field is added. Any new column is internal
  sync bookkeeping only.

## 6. Acceptance criteria

1. **Given** a note, **when** the user deletes it, **then** it disappears from
   Day, Week, and Month views at once, and is still gone after a force-stop and
   relaunch.
2. **Given** a task (open, completed, scheduled, recurring), **when** the user
   deletes it, **then** it disappears from Open and every Browse granularity,
   and its pending reminder is cancelled.
3. **Given** a deleted note/task, **when** the underlying data is inspected,
   **then** the row still exists, is marked deleted, and its `updatedAt` equals
   the deletion time.
4. **Given** an app upgraded from the F14 schema with existing notes and tasks,
   **when** the migration runs, **then** all rows are present, none are marked
   deleted, and every field value is unchanged.
5. **Given** a deleted item, **when** a mutation by its id is attempted
   (edit text, complete, reschedule, recurrence), **then** the item stays
   deleted.
6. **Given** a deleted item, **when** the delete is invoked again, **then** no
   error occurs and `updatedAt` is not advanced.
7. **Given** overdue/scheduled tasks, **when** one is deleted, **then** it no
   longer appears in overdue/snooze logic or fires a notification.
8. All existing tests still pass; new tests cover criteria 1–7.

## 7. Edge cases

- **Delete while editing** (F14): deleting the item being edited still removes it
  cleanly, no ghost row, no crash.
- **Delete a recurring task**: the single row is soft-deleted; it does not roll
  forward or fire again.
- **Delete and a pending reminder/snooze**: the notification is cancelled; a
  snooze on a deleted task is not honored.
- **Migration on a large DB**: must complete on app start without a visible
  delay beyond today's, and be safe to re-run/interrupt (versioned drizzle
  migration).
- **Clock skew**: `updatedAt` comes from the device clock; a phone with a wrong
  clock can make last-write-wins pick the wrong winner. Known limitation, handled
  (or accepted) in F18, not here.
- **Downgrade** is not supported (no reverse migration), consistent with F1–F14.

## 8. Resolved decisions (approved 2026-10-01)

1. **Deletion marker:** a nullable `deletedAt` timestamp on both tables
   (`null` = not deleted), rather than a boolean flag.
2. **Purging:** deletion markers are kept forever in F17; revisit in F18.
3. **Snooze/reminder state:** stays device-local and is not synced.
