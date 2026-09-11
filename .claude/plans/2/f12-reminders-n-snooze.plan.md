# Technical Plan: F12 — Reminders & Snooze

## References
- Spec: `.claude/specs/2-f12-reminders-n-snooze.md` (approved).
- Depends on F9 (`dueAt`) and F11 (`recurrence`/`recurrenceDays`, roll-forward
  completion) — both Done, unchanged by this plan.

## Context
Phase 2's last feature. Scheduled/recurring tasks (F9/F11) currently have no
way to actually notify the user — a due date is just a label on the row. F12
closes that gap with local (on-device, no server) push notifications that
fire at a task's due time, plus a snooze action for overdue tasks. This is
the final piece before Phase 2 can be marked complete and Phase 3 (Web &
Sync) is approached.

Key design decision made in this plan (not fully specified at the spec
stage): **reminder scheduling is driven reactively off the existing
`openTasks` live query in `tasks.tsx`, not from bespoke logic inside each
mutation callback.** `openTasksQuery()` (all incomplete tasks, already
queried and already the exact right source-of-truth set: reminders are only
ever relevant for open tasks) re-fires on every DB write via
`useLiveQuery`. A single `useEffect` keyed on that list diffs the desired
reminder set (open tasks with a future `dueAt`) against whatever
`expo-notifications` currently has scheduled, and reconciles. This means
`onScheduleTask`, `onSetRecurrence`, `onToggleComplete`, `onDeleteTask`, and
the new `onSnoozeTask` **stay exactly as they are today** (plain DB calls) —
no per-action reminder wiring, no `src/db/tasks.ts` changes at all. It also
gives cold-launch reconciliation and permission-request-on-first-schedule
"for free," from one code path, rather than duplicating logic across
`TaskComposer`/`TaskRow`.

**Exact-alarm permission:** per user decision, this plan does **not**
request `SCHEDULE_EXACT_ALARM`. Reminders use `expo-notifications`' default
local scheduling; delivery may be a few minutes late on some devices under
Android's Doze/battery-optimization behavior. Disclosed limitation, not
solved here — consistent with this project's existing disclosed-gap
precedent (F6's emulator-audio limitation).

## Data model
**No schema change, no new migration.** Confirmed safe: `updateTaskSchedule`
only clears `recurrence`/`recurrenceDays` when `dueAt` is set to `null`
(`src/db/tasks.ts:109-116`) — snooze always sets a non-null `dueAt`, so
reusing it for snooze never touches recurrence. A reminder's identity is
the task's own `id`, passed as `expo-notifications`' `identifier` — no new
column needed to track a notification ID.

## Modules / components

### New: `src/lib/snooze.ts` (pure, no native calls — unit-testable like `nextOccurrence.ts`)
```ts
export const SNOOZE_PRESETS = ['10min', '1hour', 'tomorrow'] as const;
export type SnoozePreset = (typeof SNOOZE_PRESETS)[number];
export const SNOOZE_PRESET_LABELS: Record<SnoozePreset, string> = {
  '10min': '10 min', '1hour': '1 hour', tomorrow: 'Tomorrow',
};

// now + 10min / now + 1hr / next calendar day at originalDueAt's time-of-day.
// "Tomorrow" uses setDate/setHours (like dayRange.ts), not +24*60*60*1000,
// so it's DST-safe.
export function computeSnoozeTime(preset: SnoozePreset, now: Date, originalDueAt: number): Date;

// dueAt is in the past and the task is still open.
export function isTaskOverdue(task: Pick<Task, 'dueAt' | 'completed'>, now: Date): boolean;
```

### New: `src/lib/reminders.ts` (thin `expo-notifications` wrapper — mirrors `pickDateTime.ts`'s "wrap the imperative native API in a clean async function" shape)
```ts
export const TASK_REMINDER_CATEGORY = 'task_reminder';
export const SNOOZE_ACTION_TO_PRESET: Record<string, SnoozePreset> = {
  snooze_10min: '10min', snooze_1hour: '1hour', snooze_tomorrow: 'tomorrow',
};

// Called once at app startup: foreground display handler + action-button category.
export async function configureNotifications(): Promise<void>;

// getPermissionsAsync() first; only calls requestPermissionsAsync() when
// status is 'undetermined' — never re-prompts a prior denial.
export async function requestNotificationPermission(): Promise<boolean>;

// The one reconciliation entry point. Given the current open-tasks list:
// - checks/requests permission once; if denied, cancels nothing further
//   and returns false (caller shows the in-app "reminders are off" notice)
// - computes the target set: open tasks with dueAt in the future
// - diffs against Notifications.getAllScheduledNotificationsAsync() and
//   cancels anything scheduled that's no longer in the target set
//   (covers completed/deleted/unscheduled/rolled-past-due tasks)
// - cancels-then-reschedules every task in the target set (never assumes
//   scheduling with a reused identifier silently overwrites — verified
//   ambiguous in expo-notifications docs, so explicit cancel first)
// Content is task.text only (no title); data carries {taskId, dueAt} so
// the notification-response listener doesn't need a DB read to snooze.
export async function reconcileTaskReminders(openTasks: Task[]): Promise<boolean>;
```

### Changed: `src/app/_layout.tsx`
Two new effects after `useMigrations`, both before the existing `error`/
`!success` early returns (hooks run unconditionally; each effect guards
internally):
1. **Startup config + listener** (deps `[]`): `configureNotifications()`;
   `Notifications.addNotificationResponseReceivedListener` — a plain tap
   (`DEFAULT_ACTION_IDENTIFIER`) does
   `router.push({ pathname: '/tasks', params: { mode: 'open' } })`; a
   snooze action looks up the preset via `SNOOZE_ACTION_TO_PRESET`, computes
   the new time via `computeSnoozeTime`, and calls
   `updateTaskSchedule(taskId, newDueAt.getTime())` directly (same DB call
   the in-app snooze path uses — see below). Cleanup removes the listener.
2. **Cold-launch reconciliation** (deps `[success]`): `if (!success) return;`
   then `const tasks = await openTasksQuery(); void reconcileTaskReminders(tasks);`
   — reuses the existing exported `openTasksQuery()` from `db/tasks.ts`
   unchanged (it's a Drizzle query builder, directly awaitable for a one-off
   read, not just usable via `useLiveQuery`).

This is the cold-launch safety net independent of which tab is active —
important since React Navigation's bottom-tabs lazily mount inactive
screens by default, so `tasks.tsx`'s own reconciliation effect (below)
would not run until the user visits the Tasks tab.

### Changed: `src/app/tasks.tsx`
One new effect, placed right after the existing
`const { data: openTasks } = useLiveQuery(openTasksQuery(), []);`:
```ts
const [remindersOff, setRemindersOff] = useState(false);
useEffect(() => {
  if (!openTasks) return;
  void reconcileTaskReminders(openTasks).then((granted) => setRemindersOff(!granted));
}, [openTasks]);
```
Plus a small conditional text notice (rendered once, above the list —
mirrors how `BrowseHeader`/mode-toggle already sit above the list) reading
something like "Reminders are off — enable notifications in system
settings to get them" when `remindersOff` is true. This is the "clear,
non-blocking, in-app fallback" the spec requires for permission denial —
implemented centrally here rather than duplicated inside
`TaskComposer`/`TaskRow`, since every schedule action (composer or row)
flows through the same `openTasks` live query that triggers this effect.

New `onSnoozeTask` closure, sibling to the existing five (`onEditTask`,
`onToggleComplete`, `onDeleteTask`, `onScheduleTask`, `onSetRecurrence`),
same unmemoized plain-function style:
```ts
const onSnoozeTask = (id: string, dueAt: number) => { void updateTaskSchedule(id, dueAt); };
```
Passed to all 4 existing JSX call sites (Open-mode `TaskList`, and every
Browse-mode list variant), exactly like the other five.

Also reads `useLocalSearchParams` for a `mode` param; when present and
equal to `'open'`, forces `mode` state to `'open'` (satisfies "notification
tap always opens into Open mode" regardless of whatever mode was last
active before the tab was backgrounded).

### Changed: `src/components/TaskList.tsx`, `GroupedTaskList.tsx`, `YearGroupedTaskList.tsx`
Add `onSnoozeTask: (id: string, dueAt: number) => void` to each props
interface, thread it to `<TaskRow>` unchanged — identical mechanical change
in 3 places, same shape as every existing action prop.

### Changed: `src/components/TaskRow.tsx`
Add `onSnoozeTask` to props. Render three small `Pressable`s ("10 min",
"1 hour", "Tomorrow") only when `isTaskOverdue(task, new Date())` — placed
in the row's existing schedule/recurrence icon-cluster area (not a second
`Swipeable` action; `Swipeable` already has exactly one meaning, delete,
per F7's explicit decision). Each preset button calls
`onSnoozeTask(task.id, computeSnoozeTime(preset, new Date(), task.dueAt).getTime())`
— the exact same pure function the notification-listener path uses, so
both paths produce identical results by construction (spec DoD 11).

### `app.json`
Add the `expo-notifications` plugin block, reusing the existing
`android-icon-monochrome.png` asset as the notification icon (already the
right shape — a white/transparent silhouette — for this exact purpose, no
new asset needed):
```json
[
  "expo-notifications",
  {
    "icon": "./assets/images/android-icon-monochrome.png",
    "color": "#208AEF",
    "sounds": []
  }
]
```
No `android.permissions` addition (exact-alarm permission deliberately not
requested — see Context).

### `package.json` / `package-lock.json`
Add `expo-notifications`, pinned to the `~57.x` range matching this
project's other Expo-SDK-57 dependencies (`npx expo install
expo-notifications` picks the correct pinned version automatically, same
as F6/F9's dependency additions).

## APIs / interfaces
All internal — no external/network API (local-first, per spec). The one
external-facing "interface" is `expo-notifications` itself:
`scheduleNotificationAsync`/`cancelScheduledNotificationAsync`/
`getAllScheduledNotificationsAsync` (with a caller-chosen `identifier`),
`setNotificationCategoryAsync` (action buttons), `setNotificationHandler`
(foreground display — SDK 57 suppresses foreground alerts unless this is
explicitly set, confirmed against the v57-versioned docs, not "latest"),
`addNotificationResponseReceivedListener` (tap/action handling).

## Dependencies
- **`expo-notifications`** (new, native — requires `expo prebuild` +
  `expo run:android`, same rebuild pattern as F6/F9). No other new
  dependencies. Confirmed: `expo(nent)?`/`@expo(nent)?/.*` are already in
  `jest.config.js`'s `transformIgnorePatterns` allowlist, so this module
  should be covered without a jest.config.js edit — verified during
  implementation (step 9 below), fixed if wrong.

## Implementation steps
1. `npx expo install expo-notifications`; add the `app.json` plugin block
   (icon/color/sounds, no exact-alarm permission); run
   `npx expo prebuild --platform android` to confirm it compiles/links, no
   behavior yet.
2. `src/lib/snooze.ts` — `SNOOZE_PRESETS`/labels, `computeSnoozeTime`,
   `isTaskOverdue`, fully unit-tested (mirrors `nextOccurrence.test.ts`'s
   shape: fixed "now" per test, assert exact resulting `Date`, plus a
   month/DST-adjacent case for "tomorrow").
3. `src/lib/reminders.ts` — `configureNotifications`,
   `requestNotificationPermission`, `reconcileTaskReminders` (internal
   `scheduleTaskReminder` helper). Unit test with `jest.mock('expo-notifications', ...)`
   following the `expo-speech-recognition` mock precedent exactly (all
   `jest.fn()` stubs) — assert: permission-denied short-circuits with no
   scheduling calls; reconciliation cancels notifications outside the
   target set; every target task gets cancel-then-schedule with the
   correct `identifier`/`trigger`/`content.data`.
4. `src/app/_layout.tsx` — the two new effects (config+listener,
   cold-launch reconciliation) and the `router.push` snooze-action
   handling. No dedicated `_layout.test.tsx` exists today (none needed per
   F7-era precedent of no layout tests) — covered by on-device
   verification instead.
5. `src/app/tasks.tsx` — the reconciliation effect, `remindersOff` state +
   notice text, `onSnoozeTask` closure wired to all 4 JSX call sites, and
   the `mode` search-param handling.
6. `src/components/TaskList.tsx` / `GroupedTaskList.tsx` /
   `YearGroupedTaskList.tsx` — add and thread `onSnoozeTask`. Update each
   existing test file's prop-passing assertions minimally (same mechanical
   diff as when `onSetRecurrence` was added in F11).
7. `src/components/TaskRow.tsx` — the three snooze buttons, gated on
   `isTaskOverdue`; update `TaskRow.test.tsx` with new cases (buttons
   absent when not overdue, present and calling `onSnoozeTask` correctly
   when overdue, using each preset).
8. Grep/build check: `npm test`, `tsc`, `expo lint`, `prettier --check .`;
   confirm no schema/migration diff, no `src/db/tasks.ts` diff.
9. `expo run:android` on the Pixel_10_Pro emulator/physical device; verify
   the full DoD list (spec section, 19 items) on-device — see Testing
   approach.

## Testing approach
- **Headless/unit:** `snooze.ts` (pure math — every preset, a DST/month
  boundary case for "tomorrow", `isTaskOverdue` true/false/edge-at-exactly-now);
  `reminders.ts` against a mocked `expo-notifications` (permission
  short-circuit, diff-and-cancel logic, cancel-then-schedule ordering,
  correct `content`/`trigger`/`identifier` shape); `TaskRow`/`TaskList`/
  `GroupedTaskList`/`YearGroupedTaskList` component tests for the new prop
  threading and the overdue-gated button rendering.
- **On-device, traced to spec DoD:** every one of the 19 DoD items is
  independently checkable via `adb`/`uiautomator` plus real elapsed-time
  waits for short-interval reminders (e.g. schedule a task 1-2 minutes out
  to observe an actual fire, rather than only trusting the mocked unit
  tests) — matches this project's established on-device verification
  discipline for every prior F-series feature. Reboot-survival (DoD 13)
  specifically: force-stop + relaunch is fully verifiable; a true device
  reboot is verified if a physical device is available in-session (mirrors
  F6's physical-device escalation), otherwise disclosed as an unverified
  (not "failing") gap, consistent with the F6/F10/F11 disclosed-gap
  precedent.

## Risks / tradeoffs
- **Approximate delivery timing** (no `SCHEDULE_EXACT_ALARM`) — accepted
  per user decision; disclose in the implementation's `PROGRESS.md` entry,
  same as any other disclosed gap.
- **`expo-notifications`' behavior on re-scheduling with a reused
  `identifier` is not documented** (overwrite vs. duplicate) — mitigated
  by always cancelling before scheduling, never relying on implicit
  overwrite.
- **Reboot-survival reliability is inconsistently reported in the wild**
  despite `expo-notifications` auto-adding a `RECEIVE_BOOT_COMPLETED`
  receiver — mitigated by the `_layout.tsx` cold-launch reconciliation
  pass, which re-derives correct state from SQLite (the real source of
  truth) regardless of what the OS/library preserved.
- **Play Console policy note (future, not this feature):** since no
  exact-alarm permission is requested, no new policy-declaration burden is
  added by F12. `POST_NOTIFICATIONS` itself needs no separate declaration.
- **In-app "reminders are off" notice can go stale within a session** — if
  the user grants permission via system settings while the app stays
  running, the notice only clears on the next reconciliation (any task
  mutation, or relaunch), not immediately via an `AppState` listener.
  Accepted as a minor, disclosed gap to avoid scope creep.

## Verification
1. `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`
   — all clean.
2. `git diff` / `drizzle/` — confirm zero schema/migration changes, zero
   `src/db/tasks.ts` changes.
3. On-device (`expo run:android`): work through all 19 spec DoD items,
   including a real short-interval notification fire (not just mocked
   tests) for at least one non-recurring and one recurring task, both
   snooze paths (notification action + in-app row button) on an actual
   overdue task, and a force-stop + relaunch reconciliation check.
4. Regression-check Notes tab and existing Tasks-tab behavior (F7–F11)
   unaffected.
