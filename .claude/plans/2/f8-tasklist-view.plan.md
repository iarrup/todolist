# Technical Plan: Task List View (Phase 2 · F8)

## Context
F7 shipped the Tasks tab with a deliberately unfiltered list (all tasks,
open and completed, newest first). F8's spec
(`.claude/specs/2-f8-tasklist-view.md`, UX decisions confirmed with the
user) curates that into the real default view: **open (incomplete) tasks
only**, with completed tasks fully hidden (no toggle, no archive) and a new
"All caught up!" empty state. This is a small, surgical change — one new
query, one screen rewire, one string — and touches no schema, no
add/edit/delete/checkbox code, and no new UI.

## References
- Spec: `.claude/specs/2-f8-tasklist-view.md`.
- Builds on F7's `tasks` table, `src/db/tasks.ts`, `src/app/tasks.tsx`,
  `src/components/TaskList.tsx`/`TaskRow.tsx`/`TaskComposer.tsx`, and
  `src/hooks/useTaskEditing.ts` — none of these components change behavior,
  only the query feeding `tasks.tsx` and one string in `TaskList`.
- Mirrors the existing range-query pattern in `src/db/notes.ts`
  (`notesForRangeQuery` built with `and(...)` + `orderBy`) for how a second,
  filtered query sits alongside an existing unfiltered one — F8 only needs a
  single `eq` predicate, not a range, but the shape (a small Drizzle query
  function returned unexecuted for `useLiveQuery`) is the same.

## Data model
No schema change. `tasks.completed` (added in F7) is exactly the column F8
filters on. No migration is generated for this feature.

## Modules / components
- **`src/db/tasks.ts`** — add one new query function:

  ```ts
  import { and, desc, eq } from 'drizzle-orm'; // `and` only if combined later; eq/desc already imported

  /**
   * Open (incomplete) tasks, newest-created-first — the Tasks tab's default
   * view (F8). Returned unexecuted so screens can pass it to `useLiveQuery`.
   */
  export function openTasksQuery() {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.completed, false))
      .orderBy(desc(tasks.createdAt));
  }
  ```

  `tasksQuery` (F7's unfiltered query) is **kept, not deleted** — it has no
  other callers today, but removing a working, already-tested query isn't
  required by the spec and keeping it costs nothing; it also remains
  available for the spec's DoD item 2 (confirming completed tasks still
  exist in storage, just hidden from view).

- **`src/app/tasks.tsx`** — swap the live query source:

  ```ts
  const { data: tasks } = useLiveQuery(openTasksQuery(), []);
  ```

  (import `openTasksQuery` instead of/alongside `tasksQuery`). No other
  change to this file — composer wiring and the edit/complete/delete
  callbacks are untouched.

- **`src/components/TaskList.tsx`** — change the empty-state string from
  `'No tasks yet'` to `'All caught up!'`. No structural change to the
  component (still the same `View`/`Text`, same styles).

No new components, hooks, or screens.

## APIs / interfaces
None (local-only, Phase 1/2 scope — no network/backend).

## Dependencies
No new dependencies.

## Implementation steps
1. Add `openTasksQuery()` to `src/db/tasks.ts` (traces to DoD 1, 2).
2. Update `src/app/tasks.tsx` to use `openTasksQuery()` in place of
   `tasksQuery()` (traces to DoD 1, 3, 5).
3. Update `src/components/TaskList.tsx`'s empty-state text to "All caught
   up!" (traces to DoD 4).
4. Add/update tests (see Testing approach) (traces to DoD 7).
5. Run `npm test`, `npm run typecheck`, `npm run lint`,
   `npm run format:check` (traces to DoD 7, 8).
6. Grep-check the diff for any forbidden surface — no new field/toggle/
   screen, no date/time picker or recurrence UI, no notification code, no
   network/backend/auth/sync code (traces to DoD 6).
7. On-device verification on Android (traces to DoD 9).

## Testing approach
- **`src/db/__tests__/tasks.test.ts`** — add a test seeding a mix of
  completed and incomplete tasks and asserting `openTasksQuery`-equivalent
  filtering (querying with `eq(tasks.completed, false)` against the same
  in-memory DB helper already in this file) returns only the incomplete ones,
  newest-first, while a plain `listAll` still shows both — proving completed
  tasks are filtered from the view but not deleted from storage (DoD 1, 2).
- **`src/components/__tests__/TaskList.test.tsx`** — update/add a test
  asserting the empty state renders "All caught up!" (not "No tasks yet")
  when given an empty `tasks` array (DoD 4). Existing checkbox/edit/delete
  tests in this suite are unaffected since `TaskList` still just renders
  whatever list it's given — filtering happens upstream in the query, not in
  this component.
- **No new test file** — F8 has no new module large enough to warrant one;
  changes land in the two existing suites above.
- Existing `TaskComposer.test.tsx`/`TaskRow.test.tsx` need no changes (DoD 3
  — add/edit/delete/checkbox behavior is unaffected).

## Risks / tradeoffs
- **Keeping `tasksQuery` unused in production code** is a minor, deliberate
  duplication (two query functions, one currently only exercised by tests)
  rather than deleting a working function the spec doesn't ask to remove.
  If a future feature needs "all tasks" again (e.g. a completed-tasks view,
  explicitly out of scope for F8), it's already there.
- **`useLiveQuery`'s `deps` array stays `[]`** — F8 introduces no new
  variable the query depends on (unlike F5's day/week/month anchor), so no
  `deps` bug like F5's is possible here; flagging only because that F5 bug
  (undocumented `deps` requirement) is a known sharp edge in this codebase.
- **No confirmation UX for "task just vanished"** is intentional per the
  spec's explicit decision (disappears immediately, no delay/animation) —
  not re-litigating that here.
