# Technical Plan: Sync-ready local data (Phase 3 · F17)

**Status:** approved 2026-10-01.

## Context
Notes and tasks already have UUID `id`s and `createdAt`/`updatedAt`, and every
write path bumps `updatedAt`. The one gap for sync is deletion: `deleteNote` /
`deleteTask` hard-delete the row. F17 replaces that with a **soft delete**
(nullable `deletedAt`), hides deleted rows from every read, and stops mutations
from resurrecting them. No UI change, no new dependency, no network.

## References
- Spec (approved 2026-10-01): `.claude/specs/3-f17-sync-ready-local-data.md`
- Code touched: `src/db/schema.ts`, `src/db/notes.ts`, `src/db/tasks.ts`,
  `drizzle/`, existing tests under `src/db/__tests__/`.
- Verified by grep: the only code that reads `notes`/`tasks` rows is in
  `src/db/notes.ts` and `src/db/tasks.ts`. Reminders (`reconcileTaskReminders`)
  and snooze receive their task lists from `openTasksQuery`, so filtering at the
  query layer covers them with no change to `src/lib/*`.

## Data model
Add one nullable column to **both** tables:

| Column | Type | Meaning |
|---|---|---|
| `deleted_at` (`deletedAt`) | `integer`, nullable, no default | epoch ms of deletion; `null` = not deleted |

- Existing rows get `NULL` automatically → all pre-existing data is "not deleted"
  (AC4). A plain `ALTER TABLE ... ADD` — no table rebuild, no data copy.
- Soft delete sets `deletedAt = updatedAt = now` (same value, AC3).
- No index: tables are small (text-only, single user) and `deleted_at IS NULL` is
  evaluated alongside existing range/`completed` predicates.
- Migration is generated with `npm run db:generate` (drizzle-kit), producing
  `0004_*.sql`, its snapshot, a journal entry, and an updated
  `drizzle/migrations.js`. Never hand-edit.

## Modules / components

| File | Change |
|---|---|
| `src/db/schema.ts` | add `deletedAt` to `notes` and `tasks`; update doc comments. |
| `drizzle/0004_*.sql`, `meta/*`, `migrations.js` | generated. |
| `src/db/liveFilter.ts` | **new**: `isLive(table)` → `isNull(table.deletedAt)`. Imports only `drizzle-orm` + `./schema` (no native deps) so tests can import the *real* helper. |
| `src/db/notes.ts` | `insertNote` sets `deletedAt: null`; all reads filter `isLive`; `updateNoteText` guarded; `deleteNote` becomes soft delete. |
| `src/db/tasks.ts` | same for `insertTask`, `tasksQuery`, `openTasksQuery`, `scheduledTasksForRangeQuery`, the select inside `setTaskCompleted`, every update, and `deleteTask`. |
| tests (see Testing) | update Note/Task literals; add soft-delete tests. |

No component, hook, route, or `src/lib` changes.

## APIs / interfaces
Public function signatures are **unchanged** (`deleteNote(id)`, `deleteTask(id)`,
`updateTaskSchedule`, …). Only the `Note`/`Task` row types gain
`deletedAt: number | null`.

```ts
// src/db/liveFilter.ts
import { isNull } from 'drizzle-orm';
export const isLive = (t: { deletedAt: AnySQLiteColumn }) => isNull(t.deletedAt);
```
Behavioral contract:
- Reads: `WHERE <existing predicates> AND deleted_at IS NULL`.
- Mutations by id: `WHERE id = ? AND deleted_at IS NULL` → a deleted item stays
  deleted (AC5); on an unknown/already-deleted id they are no-ops.
- `deleteX(id)`: `UPDATE ... SET deleted_at = :now, updated_at = :now
  WHERE id = ? AND deleted_at IS NULL` → idempotent, second call does not advance
  `updatedAt` (AC6).

## Dependencies
None added.

## Implementation steps
Each step is independently verifiable (`npm test`, `npm run typecheck`).

1. **Schema + migration** (AC4). Add `deletedAt` to both tables; run
   `npm run db:generate`; confirm `0004_*.sql` contains exactly two
   `ALTER TABLE ... ADD \`deleted_at\` integer` statements and `migrations.js`
   lists `m0004`. `typecheck` will now flag every `Note`/`Task` literal.
2. **Fix literals** (build green). Add `deletedAt: null` in `insertNote`,
   `insertTask`, and the test/fixture literals (the 13 files that contain
   `updatedAt:`).
3. **`liveFilter.ts`** and apply `isLive` to every read: `notesForRangeQuery`
   (covers day/week/month/`listNotesForDay`), `tasksQuery`, `openTasksQuery`,
   `scheduledTasksForRangeQuery` (covers all four granularities), and the
   `select` inside `setTaskCompleted` (AC1, AC2, AC7).
4. **Soft delete** (AC3, AC6). Rewrite `deleteNote`/`deleteTask` as the guarded
   `UPDATE` above; update their doc comments (no longer "delete the row").
5. **Guard mutations** (AC5). Add `isLive` to the `WHERE` of `updateNoteText`,
   `updateTaskText`, both branches of `setTaskCompleted`, `updateTaskSchedule`,
   `updateTaskRecurrence`.
6. **Tests** (AC1–7, AC8) — see below.
7. **Reminder/snooze check** (AC2, AC7). No code change expected:
   `reconcileTaskReminders` already cancels any scheduled notification not in
   the open-tasks list, and deleted tasks no longer appear in it. Verified
   on-device in step 8.
8. **On-device verification** (all ACs, incl. the real upgrade path). Install the
   new build **over** the current F14 install on both phones (don't wipe data)
   so the migration runs on real existing rows; then walk the spec's criteria:
   delete from Day/Week/Month and Open/Browse, recurring + scheduled task, force-
   stop/relaunch, delete-while-editing, and that a deleted task's reminder no
   longer fires (`adb shell dumpsys alarm`, per the toolchain memory).
9. **Docs.** `CLAUDE.md` status paragraph, `PROGRESS.md` (F17 → Impl/Done after
   the implementation gate).

## Testing approach
Existing DB tests (`notes.test.ts`, `tasks.test.ts`) can't import
`src/db/notes.ts`/`tasks.ts` (they pull in native `expo-sqlite`), so they
re-state the queries over in-memory `better-sqlite3` using the shipped
migrations. F17 keeps that convention but shares the real `isLive` helper so the
filter itself isn't re-invented in tests.

| AC | Proof |
|---|---|
| 1 | test: seeded note soft-deleted → absent from day/week/month queries; on-device relaunch check |
| 2 | test: open/completed/scheduled/recurring task soft-deleted → absent from `tasksQuery`, `openTasksQuery`, all four scheduled ranges; on-device reminder check |
| 3 | test: after delete, row exists, `deletedAt` non-null and `=== updatedAt` |
| 4 | test: apply migrations 0000–0003, insert rows, then apply 0004 → rows intact, `deletedAt IS NULL`, all fields equal; on-device upgrade-over-install |
| 5 | test: after soft delete, text/complete/schedule/recurrence updates leave `deletedAt` set and fields unchanged |
| 6 | test: second delete is a no-op (`updatedAt` unchanged, no throw) |
| 7 | covered by 2 + on-device alarm/notification check |
| 8 | `npm test`, `typecheck`, `lint`, `format:check` all clean |

## Risks / tradeoffs
- **Tests mirror SQL rather than call the real functions** (existing project
  limitation). Mitigation: shared `isLive` helper + mandatory on-device walk
  (step 8), as F14 did. Making the data layer injectable is out of scope.
- **A missed read path would show deleted items.** Mitigation: grep confirmed
  reads exist only in `notes.ts`/`tasks.ts`; step 3 enumerates every query, and
  Phase 3 sync code must reuse these queries or `isLive`.
- **Migration touches real data.** Mitigation: additive nullable column only
  (no rebuild); AC4 test and upgrade-over-install on both phones; no down-migration
  (consistent with F1–F14).
- **Unbounded tombstones** (decided in spec): accepted; revisit in F18.
- **Clock skew** affecting last-write-wins: out of scope, F18.
