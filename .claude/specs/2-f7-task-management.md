# Spec: Task Management (Phase 2 · F7)

## Overview
F7 opens Phase 2 by giving the app a second kind of item — **tasks** —
alongside notes. It is the task equivalent of Phase 1's F2 (capture) and F4
(edit) combined into one foundation feature: a user can **add, edit, delete,
and mark complete** a task, with no title and no metadata (a task is just its
text plus a completed flag), consistent with the product's minimalism
principle. Tasks get their own tab (**Notes | Tasks**) so the two item types
stay visually and structurally separate, mirroring how `ideas-refined.md`
treats them as two distinct features with their own view rules. This feature
deliberately ships a **minimal, unfiltered** task list (all tasks, newest
first) — curating that into the real "default view: open tasks only"
experience is F8's job, exactly as F1's bare list was later refined by F3.
Scheduling (F9), recurrence (F11), and reminders/snooze (F12) are explicitly
out of scope here; F7 adds no due-date or recurrence columns.

## Depends on
- **F1 — App foundation & local storage (DONE):** provides the Expo app
  shell, the Drizzle/`expo-sqlite` DB wiring, and the migration pipeline
  (`npm run db:generate`) F7 reuses to add a `tasks` table.
- **F2/F4 — Note capture & edit (DONE):** F7 mirrors their proven UX
  patterns (pinned composer, trim/empty-guard on save, long-press → inline
  field → auto-save-on-blur) rather than inventing new ones for tasks.
- No dependency on F5/F6 (time browsing, voice) — out of scope for F7.
- F8 (task list view), F9 (scheduling), F10 (task time views), F11
  (recurrence), and F12 (reminders/snooze) all depend on F7, not the reverse.

## Files to change
- `src/db/schema.ts` — add a `tasks` table: `id` (text UUID PK), `text`
  (text, not null), `completed` (integer/boolean, not null, default false),
  `createdAt`, `updatedAt` (integer epoch ms). No schedule/recurrence columns
  yet (those land with F9/F11's own migrations).
- `src/app/_layout.tsx` — replace the single-screen `Stack` root with a
  bottom **tab bar** (`Tabs` from `expo-router`) with two tabs: **Notes**
  (the existing `index` screen, unchanged behavior) and **Tasks** (new).
- `CLAUDE.md` — update the **Status** section once F7 lands (tracked as F7
  progresses, not part of the initial code diff).
- `PROGRESS.md` — advance F7 through the pipeline stages and record the gate
  approval in the decision log (tracked separately from the code diff).

## Files to create
Exact paths/module boundaries are settled in the technical plan; F7 should
include:

- **A Drizzle migration** for the new `tasks` table, generated via
  `npm run db:generate` — never hand-written.
- **`src/db/tasks.ts`** — data-access mirroring `src/db/notes.ts`'s shape:
  `insertTask(text)`, `updateTaskText(id, text)`, `setTaskCompleted(id,
  completed)` (or equivalent toggle), `deleteTask(id)`, and a query listing
  all tasks newest-first (unfiltered — no day/open-only scoping in F7).
- **A task composer component** (e.g. `src/components/TaskComposer.tsx`) —
  pinned, multiline, explicit-send capture control, structurally the same as
  `NoteComposer` (no voice button; F6's voice capture was note-specific and
  is not part of F7's scope).
- **A task list/row component** (e.g. `src/components/TaskList.tsx` and/or a
  `TaskRow.tsx`) rendering: a **checkbox** at the row start to toggle
  complete (completed tasks show visibly struck-through/checked), **swipe to
  reveal a Delete button** (tap it to delete; using the already-installed
  `react-native-gesture-handler`), and **long-press → inline editable field
  → auto-save-on-blur** for text edits (empty/whitespace-only reverts,
  reusing `src/lib/noteInput.ts`'s trim/empty rule or an equivalent shared
  helper — do not duplicate that logic). Reusing/generalizing F4's
  `useNoteEditing` hook for tasks is an option if it keeps the two features
  from drifting, but is not required.
- **`src/app/tasks.tsx`** — the new Tasks tab screen: composer + list, wired
  to the new `src/db/tasks.ts` functions via `useLiveQuery`, following
  `index.tsx`'s existing shape (thin screen, logic in components/hooks).
- **Tests** covering: the trim/empty save guard and complete/delete/edit
  data-access functions in `src/db/tasks.ts`; the composer's
  type→send→clear/disabled behavior; and the list/row's checkbox-toggle,
  swipe-to-delete, and long-press-edit behaviors (mirroring the test
  patterns already used for `NoteComposer`/`NoteList`/`updateNoteText`).

## New dependencies
No new dependencies anticipated. `react-native-gesture-handler` (already a
dependency, required by Expo Router's navigation) provides the swipe-to-delete
gesture primitive; everything else reuses existing `expo-sqlite`/Drizzle,
`expo-crypto`, and React Native primitives already in the F1–F6 stack. If the
technical plan finds gesture-handler's swipeable-row API insufficient, that
tradeoff is decided there, not assumed here.

## Rules for implementation
- **Minimalism (minimalism-guard):** a task is only its text plus a
  completed flag. No title, tags, due date, priority, or any other field —
  those are explicitly later features (F9 scheduling, F11 recurrence) or out
  of scope entirely.
- **Navigation (decided with user):** tasks live behind a **bottom tab bar**
  (Notes | Tasks), not a link/button or a toggle on the existing screen.
- **Complete (decided with user):** a **checkbox at the start of the row**
  toggles complete/incomplete — not tap-anywhere-on-the-row.
- **Delete (decided with user; revised during implementation
  review-and-gate):** swiping a task **reveals a "Delete" button** — the
  swipe itself does not delete. Deletion only happens on an explicit tap of
  that revealed button (no separate confirm dialog beyond the reveal step
  itself; no undo). This supersedes this spec's original "swipe alone
  deletes, no button" call.
- **Edit (decided with user):** **long-press → inline field → auto-save on
  blur**, matching F4's note-editing pattern exactly. Clearing to
  empty/whitespace reverts (never deletes) — delete only happens via swipe.
- **Reuse F1–F4's seams:** persistence through dedicated `src/db/tasks.ts`
  functions (no raw SQL in components); list refresh via `useLiveQuery` (no
  manual re-fetch); the empty/whitespace guard reuses the existing trim rule
  rather than a second implementation.
- **F7's list is intentionally unfiltered:** show all tasks (open and
  completed), newest-created-first. Do **not** implement "open tasks only"
  filtering, an empty-state message beyond a basic placeholder, or any
  day/week/month/year grouping — that curation is F8's (and F10's) job.
- **No scheduling, no recurrence, no reminders:** no date/time picker, no
  recurrence rule UI, no notification code. The `tasks` schema has no
  schedule/recurrence columns.
- **Local-first only:** on-device DB exclusively; no network, backend,
  auth, or sync code (Phase 3).
- **Android is the target surface:** verify on Android; keep code
  cross-platform (no Android-only APIs where a portable one exists) but do
  not build/verify web.

## Definition of done
Each item is verifiable by running the app or the test suite:

1. **Tasks tab exists:** the app shows a bottom tab bar with **Notes** and
   **Tasks** tabs; the Notes tab behaves exactly as before (no regression).
2. **Add a task:** the Tasks tab shows a pinned composer; typing text and
   tapping send creates a task and it appears in the list immediately
   (newest first), and the field clears afterwards. Empty/whitespace-only
   input is rejected (no task created).
3. **Mark complete/incomplete:** tapping a task's checkbox toggles its
   completed state immediately and visibly (e.g. strike-through), and the
   state survives an app restart (on-device check).
4. **Edit a task:** long-pressing a task turns it into an editable field
   pre-filled with its current text; blurring with non-empty trimmed text
   saves the change (visible immediately, survives restart); blurring with
   empty/whitespace text reverts to the original text (no delete, no blank
   task).
5. **Delete a task:** swiping a task reveals a "Delete" button (the swipe
   alone does not delete it); tapping that button removes the task from the
   list and the database, and it does not reappear after an app restart.
6. **Persistence survives restart:** tasks created/edited/completed/deleted
   this session are correctly reflected after a full app force-stop and
   relaunch.
7. **No title/metadata anywhere (grep-checkable):** the task composer, row,
   and schema expose only text + completed (+ id/timestamps) — no title,
   tags, due date, or recurrence field exists.
8. **No forbidden surface (grep-checkable):** no date/time picker,
   recurrence UI, notification code, or network/backend/auth/sync code
   introduced.
9. **Test suite passes:** `npm test` passes, including new tests for
   `src/db/tasks.ts`'s functions and the composer/list components' behavior.
10. **Quality gates pass:** `npm run typecheck`, `npm run lint`, and
    `npm run format:check` all run clean.
11. **On-device verification:** on an Android device/emulator, add, edit,
    complete, and delete a task through the Tasks tab, confirming each
    change is visible immediately and survives a force-stop + relaunch.
