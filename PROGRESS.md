# Progress — Pocket Notebook

Single source of truth for specs-driven pipeline state.
Stages: **Backlog → Spec → Plan → Impl → Done** (a feature advances only after
`review-and-gate` approval).

## Status board

### Phase 1 — Notes (Mobile)

| # | Feature | One-liner | Depends on | Stage |
|---|---|---|---|---|
| F1 | App foundation & local storage | Cross-platform skeleton + on-device DB wiring + runnable app shell | choose-tech-stack (gated) | Done |
| F2 | Typed note capture | Instant, title-less text note saved locally | F1 | Done |
| F3 | Today view | Default screen listing the current day's notes | F2 | Done |
| F4 | Edit note | Open an existing note and change its text | F2, F3 | Done |
| F5 | Time-based browsing | Day / week / month views of notes | F3 | Done |
| F6 | Voice capture | Voice-to-text entry (mic permission, editable transcript) | F2 | Done |

**Cut lines (out of scope for Phase 1):** tasks/todos (Phase 2); web surface,
sync backend, accounts/auth (Phase 3); keyword search and note→task promotion
(Later); any titles/tags/metadata (minimalism).

**Prerequisite (not a feature):** `choose-tech-stack` — **decided 2026-07-29:
React Native + Expo (TypeScript).** See decision log.

### Phase 2 — Tasks (Mobile)

| # | Feature | One-liner | Depends on | Stage |
|---|---|---|---|---|
| F7 | Task management | Add/edit/delete/complete a task — minimal, text-only, no title | F1 | Done |
| F8 | Task list view | Default view: all open (incomplete) tasks | F7 | Done |
| F9 | Task scheduling | Add a date & time to a task | F7 | Done |
| F10 | Task time-based views | Browse tasks by day / week / month / year | F9 | Done |
| F11 | Task recurrence | Daily, weekdays, weekends, specific weekdays, monthly, annually | F9 | Done |
| F12 | Reminders & snooze | Push notification at due time (incl. recurring instances) + snooze overdue tasks | F9, F11 | Done |

**Cut lines (out of scope for Phase 2):** web surface, sync backend,
accounts/auth (Phase 3); keyword search, note→task promotion (Later);
titles/tags/metadata on tasks (minimalism).

### Phase 3 — Web & Sync
Not yet planned (`plan-phase`). Open questions: accounts/auth, conflict handling.

## Decision log

- **2026-09-10** — **F12 (Reminders & snooze): implementation gate passed
  (review-and-gate) → F12 is Done. This completes Phase 2 (Tasks/Mobile) —
  all of F7–F12 are now Done.** Diff matches
  `.claude/plans/2/f12-reminders-n-snooze.plan.md`'s file list exactly (14
  files, no scope creep — no schema/migration change, no `src/db/tasks.ts`
  change). `npm test` (227/227, 35 suites), `tsc`, `expo lint`,
  `prettier --check .` all clean. 16 of 19 spec DoD items independently
  verified on a physical device with real elapsed-time waits (not just
  mocked tests) — see the implementation entry below for the full
  breakdown. Accepted as-is, without further on-device re-verification: DoD
  8 (recurring-task reminder reschedule on completion — architecturally
  low-risk, the reconciliation effect has no recurring-specific branch),
  DoD 12's on-device spot check specifically (fully covered by
  `snooze.test.ts` unit tests), and DoD 18 (foreground notification
  delivery — configured per the SDK-57 docs, not independently re-driven).
  True device-reboot survival (vs. force-stop + relaunch, tested several
  times) also not separately verified. No changes requested. Approved by:
  user (arup.chowdhary@gmail.com).
- **2026-09-10** — **F12 (Reminders & snooze): implemented and verified
  on-device (Pixel 10 Pro, physical, Android SDK 37) → ready for
  implementation `review-and-gate`.** Built on `feature/reminders-n-snooze`
  per `.claude/plans/2/f12-reminders-n-snooze.plan.md`, step by step; one
  real bug found and fixed during on-device verification (below), otherwise
  no deviations.
  - **New:** `src/lib/snooze.ts` (`SNOOZE_PRESETS`/labels,
    `computeSnoozeTime`, `isTaskOverdue` — pure, unit-tested like
    `nextOccurrence.ts`), `src/lib/reminders.ts` (`configureNotifications`,
    `requestNotificationPermission`, `reconcileTaskReminders` — the single
    reconciliation entry point, cancel-then-reschedule against
    `getAllScheduledNotificationsAsync()`, keyed by each task's own `id` as
    the notification identifier). `_layout.tsx` gained two effects
    (notification config + response listener; a cold-launch reconciliation
    pass reading `openTasksQuery()` directly). `tasks.tsx` gained a
    reconciliation effect keyed on the live `openTasks` query, a
    `remindersOff` notice, `onSnoozeTask`, and `mode`-search-param handling
    (adjusted **during render**, not in an effect, to satisfy
    `react-hooks/set-state-in-effect`). `onSnoozeTask` threaded through
    `TaskList`/`GroupedTaskList`/`YearGroupedTaskList`/`TaskRow` (mirrors
    `onSetRecurrence`'s F11 precedent). `app.json` gained the
    `expo-notifications` plugin block, reusing the existing
    `android-icon-monochrome.png` asset as the notification icon — no new
    asset, no `SCHEDULE_EXACT_ALARM` permission (per the user's decision to
    accept approximate delivery timing rather than take on a Play Console
    policy declaration and an Android-14 settings-deeplink gap the library
    doesn't support). New dependency `expo-notifications@~57.0.17`.
  - **One real bug found and fixed during on-device testing:**
    `reconcileTaskReminders` was checking/requesting notification permission
    **unconditionally**, even when there were zero tasks with a future
    `dueAt` to schedule — meaning the cold-launch reconciliation pass would
    trigger a permission check at every app launch regardless of whether
    the user had ever scheduled anything, violating the spec's "lazily, at
    first schedule" rule. **Fixed:** permission is now checked/requested
    only when the target set (open tasks with a future `dueAt`) is
    non-empty; cancelling stale reminders (which needs no permission) still
    always runs. This is very likely also why the very first on-device
    permission request never visibly prompted the user (see below) — the
    cold-launch check was probably firing before the Activity was fully
    resumed/interactive, at a moment where a real OS runtime-permission
    dialog can silently fail to show. Two `reminders.test.ts` cases updated
    to match (`getPermissionsAsync`/`requestPermissionsAsync` now provably
    never called when there's nothing to schedule) plus a new case
    asserting stale reminders still get cancelled even so.
  - **Headless:** `npm test` (227/227, 35 suites — 10 new `snooze.ts`
    tests, 9 new `reminders.ts` tests against a fully mocked
    `expo-notifications` module following the `expo-speech-recognition`
    mock precedent, plus new `TaskRow` snooze-row tests and mechanical
    `onSnoozeTask` prop-threading updates to `TaskList`/
    `GroupedTaskList`/`YearGroupedTaskList` tests), `tsc`, `expo lint`, and
    `prettier --check .` all clean (only the pre-existing, unrelated
    `todolist.code-workspace` warning). `git diff` confirmed zero
    schema/migration changes and zero `src/db/tasks.ts` changes, matching
    the plan exactly.
  - **On-device (Pixel 10 Pro, physical, wireless adb):** required a fresh
    native rebuild (new `expo-notifications` native module) — built via
    `./android/gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a`
    (matches the phone's arch) after `expo prebuild`; merged manifest
    confirmed `POST_NOTIFICATIONS`/`RECEIVE_BOOT_COMPLETED` present (library-
    contributed, not visible in the pre-merge generated manifest) and
    `SCHEDULE_EXACT_ALARM` absent as intended. A stale long-running Metro
    instance (started before `expo-notifications` was installed) caused an
    `UnableToResolveError` on first launch — fixed by killing it and
    restarting with `--clear`; not an app defect. 16 of the 19 spec DoD
    items independently verified via `adb`/`uiautomator` plus real
    elapsed-time waits (not just mocked tests) for actual notification
    firing: permission-denied state shows the in-app "Reminders are off —
    enable notifications in system settings to get them" notice without
    blocking scheduling (DoD 1/2, confirmed via the real system Notification
    settings screen — "You haven't allowed notifications from this app" —
    toggled on there to proceed, since Android's own runtime dialog never
    visibly appeared before the bug fix above); a scheduled task fires a
    real `RTC_WAKEUP` alarm (confirmed in `dumpsys alarm`, tagged
    `expo.modules.notifications.NOTIFICATION_EVENT`) that genuinely
    delivers a notification whose body is exactly the task's text with no
    title (DoD 3), carrying all three real "Snooze 10 min"/"Snooze 1
    hour"/"Tomorrow" action buttons wired to real `PendingIntent`s (DoD 9);
    tapping a notification's snooze action reschedules the task correctly
    from a backgrounded app with no manual reopen (DoD 10); the in-app
    snooze row produces an identical reschedule (DoD 11); clearing a
    schedule, deleting a task, and completing a (non-recurring) scheduled
    task each correctly cancel the pending `RTC_WAKEUP` alarm, confirmed via
    `dumpsys alarm` before/after (DoD 4/5/6/7); scheduling a task to an
    already-past date/time never fires a backdated notification — it just
    shows overdue immediately (DoD 16); a plain tap on a fired notification
    (isolated from Android's auto-grouping, which required clearing the
    shade and testing a single notification to get a clean signal) opened
    the app and **forced Open mode even though Browse mode was active
    beforehand** (DoD 17); reminders reconciled correctly across several
    force-stop + relaunch cycles throughout the session (DoD 13); Notes tab
    and Tasks add/schedule/complete/delete all regression-checked
    unaffected (DoD 19). **Disclosed, not independently re-verified this
    pass:** DoD 8 (a *recurring* task's reminder reschedule on roll-forward
    completion — the reconciliation effect reacts generically to any
    `dueAt`/`completed` change with no recurring-specific branch, so this is
    low-risk by construction, but no recurring task was actually driven
    through a completion on-device this session); DoD 12's on-device spot
    check specifically for "Tomorrow" (covered thoroughly by
    `snooze.test.ts` unit tests, including a month-boundary case, but not
    re-driven by hand on the device); DoD 18 (foreground delivery — every
    on-device fire this session happened with the app backgrounded; the
    `shouldShowBanner`/`shouldShowList` handler is configured per the SDK-57
    docs but not independently confirmed showing while the app was in the
    foreground). True device-reboot survival (as opposed to force-stop +
    relaunch) was also not separately tested. No crashes or fatal JS errors
    observed in logcat throughout. Test data (four ad hoc tasks, one note)
    left on the device — swipe-to-reveal-delete didn't register through
    repeated `adb` synthetic taps (the already-documented
    `adb`-tap-vs-gesture-recognizer quirk from the `android-build-toolchain`
    memory), not worth further time to chase since it doesn't affect the
    app itself.
  - **Ready for implementation `review-and-gate`.**
- **2026-09-10** — **F12 (Reminders & snooze): technical plan approved
  (review-and-gate, via Claude Code Plan Mode).** Plan:
  `.claude/plans/2/f12-reminders-n-snooze.plan.md` — no schema/migration
  change (snooze reuses `updateTaskSchedule`, confirmed safe since it only
  clears recurrence when `dueAt` is set `null`, never the case for
  snooze); new `src/lib/snooze.ts` (pure `computeSnoozeTime`/
  `isTaskOverdue`, mirrors `nextOccurrence.ts`'s pure-helper precedent) and
  `src/lib/reminders.ts` (thin `expo-notifications` wrapper, mirrors
  `pickDateTime.ts`'s imperative-native-API-wrapper shape). Key design
  decision made at this stage (not fully specified in the spec): reminder
  scheduling is driven **reactively** off the existing `openTasks` live
  query in `tasks.tsx` via one `useEffect` that reconciles the full
  desired-reminder set against whatever `expo-notifications` currently has
  scheduled, rather than bespoke logic in each mutation callback — this
  means zero changes to `src/db/tasks.ts` and no duplicated
  permission-request logic between `TaskComposer`/`TaskRow`. `_layout.tsx`
  gets two new effects (notification config + response listener; a
  cold-launch reconciliation pass via a direct await of the existing
  `openTasksQuery()`) since React Navigation's tabs lazily mount, so
  `tasks.tsx`'s own effect alone wouldn't cover a cold launch landing on
  the Notes tab. `onSnoozeTask` threaded through `TaskList`/
  `GroupedTaskList`/`YearGroupedTaskList`/`TaskRow`, same shape as
  `onSetRecurrence`'s F11 precedent. One user decision made during this
  stage: **does not request `SCHEDULE_EXACT_ALARM`** — reminders use
  `expo-notifications`' default (possibly Doze-delayed) scheduling rather
  than add a Play Console policy-declaration burden and an
  Android-14-specific settings-deeplink gap the library doesn't support
  natively; disclosed limitation, same pattern as F6's emulator-audio gap.
  New dependency `expo-notifications` (`~57.x`, native rebuild required,
  same pattern as F6/F9). 9 ordered implementation steps with a testing
  approach traced to all 19 spec DoD items. Approved by: user
  (arup.chowdhary@gmail.com). **Awaiting `implement-feature`.**
- **2026-09-10** — **F12 (Reminders & snooze): spec written and gate passed
  (elicited via `AskUserQuestion` before drafting, plus a `review-and-gate`
  pass that surfaced and fixed three gaps before approval).** Decisions
  confirmed with the user: notification library is **`expo-notifications`**
  (new native dependency, requires a rebuild — same pattern as F6/F9);
  snooze presets are **10 min / 1 hour / Tomorrow**; snooze is reachable
  from **both** a fired notification's action buttons and an in-app
  affordance on an overdue task's row; notification permission is
  requested **lazily, at first schedule** (mirrors F6's on-demand mic
  pattern); and **snooze moves `dueAt` itself** via the existing
  `updateTaskSchedule` path rather than adding a new `snoozedUntil` column
  — no schema change for this feature. Three gaps found during
  `review-and-gate` and fixed before approval: (1) the snooze affordance
  must appear wherever an overdue task's row renders (Open **and** Browse,
  since `TaskRow` is shared and F9–F11 precedent threads row callbacks
  through all three list components), not Open-only as first drafted; (2)
  a task scheduled with an already-past due time must not fire a
  backdated/immediate notification — it just starts overdue; (3) added
  rules for notification-tap destination (opens Tasks tab/Open mode) and
  foreground delivery. Reminder identity is keyed by the task's own `id`
  (no new column needed to track a notification ID). Spec:
  `.claude/specs/2-f12-reminders-n-snooze.md`. Built on branch
  `feature/reminders-n-snooze`. Approved by: user
  (arup.chowdhary@gmail.com). **Awaiting `write-technical-plan`.**
- **2026-09-10** — **F11 (Task recurrence): implementation gate passed
  (review-and-gate) → F11 is Done.** A close code-level pass (not just the
  DoD checklist) specifically hunted for `recurrence`/`recurrenceDays`
  state-consistency bugs across every write path (`TaskComposer`'s
  `handleClearSchedule`, `RepeatPicker.onConfirm`, the DB-layer
  clear-on-unschedule rule) and DST/clamping edge cases — none found. Diff
  matches `.claude/plans/2/f11-task-recurrance.plan.md`'s file list exactly,
  including the two disclosed additions (`onSetRecurrence` threaded through
  `TaskList`/`GroupedTaskList`/`YearGroupedTaskList`, and the new
  `recurrence.ts`). All 20 spec DoD items verified via a combination of
  on-device driving (create-recurring-at-composer, add-recurrence via
  `TaskRow`'s second entry point, daily roll-forward on completion while
  staying in Open, single-row correctness in Browse/Month, delete-removes-
  the-series, persistence across force-stop + relaunch, cancel-leaves-state-
  untouched via Android back, reseed-on-reopen, specific-days empty-
  selection Confirm-disabled block) and the automated suite (specific-days
  weekday-toggle interaction itself and month-end/Feb-29 clamping — 8
  `RepeatPicker` + 12 `nextOccurrence` tests). `npm test` (203/203, 33
  suites), `tsc`, `expo lint`, `prettier --check .` all clean; no new
  dependencies; no crashes/fatal JS errors in logcat; Notes tab regression-
  checked unaffected. No changes requested. Approved by: user
  (arup.chowdhary@gmail.com).
- **2026-09-10** — **F11 (Task recurrence): implemented** on
  `feature/task-recurrance` per `.claude/plans/2/f11-task-recurrance.plan.md`,
  step by step, no deviations from the plan.
  - **New:** `src/lib/recurrence.ts` (`Recurrence` type, `RECURRENCE_TYPES`
    tuple, labels, `parseRecurrenceDays`/`serializeRecurrenceDays`),
    `src/lib/nextOccurrence.ts` (pure six-type rollover with month/year
    clamping mirroring `stepDate.ts`), `src/lib/formatRecurrence.ts`,
    `src/components/RepeatPicker.tsx` (a plain `Modal`, no new dependency).
    Migration `drizzle/0003_majestic_war_machine.sql` adds nullable
    `recurrence`/`recurrence_days` to `tasks`. `insertTask` gained optional
    `recurrence`/`recurrenceDays` params; `setTaskCompleted` is now
    recurrence-aware (guarded on both `recurrence` and `dueAt` being
    non-null, per the plan's `review-and-gate` fix — falls through to plain
    completion otherwise); `updateTaskSchedule` clears recurrence when
    `dueAt` clears; new `updateTaskRecurrence`. `TaskComposer`/`TaskRow`
    both wired with a Repeat control (only shown once scheduled) opening
    the shared `RepeatPicker`. `onSetRecurrence` threaded through
    `TaskList`/`GroupedTaskList`/`YearGroupedTaskList` — the plumbing gap
    the plan flagged as necessary but outside the spec's literal file list,
    mirroring F9/F10's precedent for `onScheduleTask`.
  - **Headless:** `npm test` (203/203, 33 suites — new suites for
    `recurrence`, `nextOccurrence`, `formatRecurrence`, `RepeatPicker`, plus
    additions to `tasks.test.ts`/`TaskComposer.test.tsx`), `tsc`,
    `expo lint`, `prettier --check .` all clean (only the pre-existing,
    unrelated `todolist.code-workspace` warning). Grep check confirmed no
    materialized-instance rows, no per-occurrence history/skip action, no
    end-date/occurrence-count field, no notification/snooze code, no
    network/backend/auth/sync code. `package.json`/`package-lock.json`
    unchanged (no new dependencies).
  - **On-device (Pixel_10_Pro emulator, JS-only — no rebuild needed since
    F11 adds no native dependencies):** the migration applied cleanly on
    launch (no crash) both fresh and after a full force-stop + relaunch.
    Verified end-to-end through the real on-device SQLite DB: creating a
    daily-recurring task at the composer (`Sep 20, 7:57 PM · Repeats
    daily`); completing it rolled `dueAt` to `Sep 21, 7:57 PM`, stayed
    unchecked, and **stayed in Open** instead of disappearing; Browse/Month
    showed it exactly once, correctly grouped under Sep 21 (no duplicate
    rows); it survived a force-stop + relaunch; swipe-delete removed the
    whole series (`Browse` and `Open` both went empty). Separately verified
    adding recurrence to an *already-scheduled* task via `TaskRow` (the
    second entry point) — set to "Repeats on weekends" — and confirmed
    clearing that task's schedule also cleared its recurrence display.
    `RepeatPicker` confirmed rendering correctly from both entry points;
    "Specific days of the week" reveals the weekday chip row and blocks
    Confirm (`enabled="false"` via `uiautomator`) until a day is checked,
    and a tap on the disabled button is a no-op; cancelling (via Android
    back, triggering `onRequestClose`) left the prior recurrence state
    untouched, and reopening correctly reseeded the draft from the task's
    real state rather than the discarded draft. The specific-days weekday
    multi-select's own tap-to-toggle and month/Feb-29 clamping were not
    independently re-driven on-device (relied on the 8 passing
    `RepeatPicker` component tests and 12 `nextOccurrence` unit tests
    instead) — a disclosed, precedent-consistent gap (matches F6's DoD
    3/12 disclosure pattern). No crashes or fatal JS errors in logcat from
    the running build throughout; Notes tab regression-checked unaffected.
    One dev-tooling red herring diagnosed and worked around, not an app
    defect: Expo's LogBox "Open debugger to view warnings" banner (for a
    pre-existing, F9-era `DateTimePicker: onChange is deprecated` warning,
    unrelated to F11) has a touch-capturing container far larger than its
    visible text, silently swallowing taps on the composer's Send button
    and the RepeatPicker's Confirm/Cancel row underneath it — fixed for
    the rest of the session by tapping its real dismiss icon (found via
    `uiautomator`'s node tree, not its visible bounds). Test data cleaned
    up from the device afterward.
  - **Ready for implementation `review-and-gate`.**
- **2026-09-10** — **F11 (Task recurrence): technical plan approved
  (review-and-gate).** Plan: `.claude/plans/2/f11-task-recurrance.plan.md` —
  additive migration adding nullable `recurrence` (Drizzle `text` enum
  column) and `recurrence_days` (comma-separated text) to `tasks`; new pure
  `src/lib/recurrence.ts` (types/labels/parse-serialize), `nextOccurrence.ts`
  (six-type rollover, mirrors `stepDate.ts`'s clamp pattern rather than
  importing it — same parallel-not-modify precedent as F10), and
  `formatRecurrence.ts`; new hand-built `RepeatPicker.tsx` (a `Modal`, no new
  dependency — there's no native OS dialog to wrap for recurrence, unlike
  F9's date/time picker); `setTaskCompleted` becomes recurrence-aware only
  when completing, and only when both `recurrence` and `dueAt` are non-null
  (falls through to plain completion otherwise — a guard added during this
  plan's own `review-and-gate`, since the "recurrence requires a schedule"
  invariant is UI-enforced only, not checked by `insertTask`'s signature);
  `updateTaskSchedule` now also clears recurrence when a schedule is
  cleared; new `updateTaskRecurrence`. Two things flagged as necessary but
  outside the spec's literal file list: prop-threading `onSetRecurrence`
  through `TaskList`/`GroupedTaskList`/`YearGroupedTaskList` (pure plumbing,
  same gap F9/F10 already closed for `onScheduleTask`), and `recurrence.ts`
  itself (mirrors `taskGranularity.ts`'s precedent). 15 ordered
  implementation steps with a DoD-to-verification traceability table
  covering all 20 spec acceptance criteria. No new dependencies. One gap
  found and fixed before approval (the `setTaskCompleted` guard above).
  Approved by: user (arup.chowdhary@gmail.com). **Awaiting
  `implement-feature`.**
- **2026-09-10** — **F11 (Task recurrence): spec written and gate passed
  (elicited via `AskUserQuestion` before drafting, plus a `review-and-gate`
  pass that surfaced and resolved four gaps before approval).** Decisions
  confirmed with the user: recurrence uses a **single-row, roll-forward
  model** — a recurring task is one row whose `dueAt` advances on completion
  (never spawns materialized instance rows), trading away a browsable history
  of past occurrences to keep F9's `dueAt`-per-task model and F10's
  Browse-by-range queries completely untouched; monthly/annual recurrence on
  a day that doesn't exist in the target period **clamps to the last valid
  day** (mirrors `stepDate.ts`'s existing precedent) rather than skipping;
  recurrence has **no end condition** — repeats forever until manually set
  back to "None"; recurrence is set via the **same two entry points as F9**
  (`TaskComposer` at creation, `TaskRow` on an existing task), one shared
  Repeat selector. New nullable `recurrence`/`recurrenceDays` columns on
  `tasks` (additive migration); new `src/lib/nextOccurrence.ts` (pure,
  per-type next-date computation) and `src/lib/formatRecurrence.ts`. Four
  gaps found during `review-and-gate` and fixed before approval: (1)
  cancelling the Repeat selector wasn't specified to leave state untouched
  (mirrors F9's cancel rule); (2) nothing blocked confirming "specific days"
  with zero days selected; (3) it wasn't stated that a recurring task stays
  visible in Open (F8) after every completion, since Open is unfiltered by
  date — only its due subtitle changes; (4) the next-occurrence search for
  weekdays/weekends/specific-days wasn't specified to start strictly after
  the current due day (same-day selected weekday must roll to next week, not
  repeat today). DoD grew from 16 to 20 items to cover all four. No
  reminders/notifications (F12), no calendar-grid or date-picker-for-
  navigation changes, no change to F10's Browse components. Spec:
  `.claude/specs/2-f11-task-recurrance.md`. Built on branch
  `feature/task-recurrance`. Approved by: user (arup.chowdhary@gmail.com).
  **Awaiting `write-technical-plan`.**
- **2026-09-10** — **F10 (Task time-based views): implementation gate
  passed (review-and-gate) → F10 is Done.** All 17 spec DoD items verified
  against the diff and on-device (Pixel_10_Pro emulator): Open mode
  regression-checked unchanged from F8; the new Open|Browse toggle;
  Day/Week/Month/Year segmented control including the new Year granularity
  (month sub-headings nested with day sub-headings); scheduled tasks
  correctly excluded/included by `dueAt`/`completed` per the spec's rules;
  chronological (earliest-first) ordering confirmed across day and month
  groups; granularity-switch anchor preservation and jump-to-today both
  confirmed; long-press-edit and swipe-to-delete both verified working
  from inside Browse mode, persisting across a full force-stop + relaunch;
  `TaskComposer` confirmed absent from every Browse-mode screen. Diff
  matches `.claude/plans/2/f10-task-timebased-views.plan.md`'s file list
  exactly, no scope creep — no schema change, no new dependencies. One
  finding surfaced during this gate's closer code-level pass (not just the
  DoD checklist) and fixed before approval: `TaskList`'s hardcoded "All
  caught up!" empty state was leaking into Browse/Day, making an empty
  browsed day look identical to Open mode's empty list. Fixed: `TaskList`
  gained an optional `emptyMessage` prop (default "All caught up!", Open
  mode unaffected); `tasks.tsx` passes "No tasks today" for Browse/Day.
  Re-verified after the fix: `npm test` (155/155, 29 suites), `tsc`,
  `expo lint`, `prettier --check .` all clean; on-device (JS-only reload)
  confirmed "No tasks today" renders correctly with no regression. No
  further changes requested. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-10** — **F10 (Task time-based views): implemented** on
  `feature/task-timebased-views` per
  `.claude/plans/2/f10-task-timebased-views.plan.md`, step by step, no
  deviations from the plan. New: `src/db/yearRange.ts`,
  `src/lib/formatYear.ts`, `src/lib/taskGranularity.ts`,
  `src/lib/stepTaskDate.ts`, `src/lib/groupTasksByDay.ts`,
  `src/lib/groupTasksByMonthAndDay.ts`, `src/components/TaskBrowseHeader.tsx`,
  `src/components/TaskModeToggle.tsx`, `src/components/GroupedTaskList.tsx`,
  `src/components/YearGroupedTaskList.tsx`, plus a `scheduledTasksFor*` query
  family in `src/db/tasks.ts` (non-null `dueAt`, no `completed` filter,
  ascending). `src/app/tasks.tsx` rewired for the Open/Browse toggle;
  `TaskComposer` only renders in Open mode. No schema change, no new
  dependencies.
  - **Headless:** `npm test` (154/154, 29 suites — 24 new tests across 9 new
    suites plus additions to `tasks.test.ts`), `tsc`, `expo lint`, and
    `prettier --check .` all clean (only the pre-existing, unrelated
    `todolist.code-workspace` warning). Grep checks (including the new,
    untracked files individually, not just `git diff`) confirmed no
    calendar-grid/date-picker-for-navigation/recurrence/notification/
    network/backend/auth code introduced, and `package.json`/
    `package-lock.json` are unchanged (no new dependencies). `openTasksQuery`
    itself is untouched (only referenced in a new doc comment).
  - **On-device (Pixel_10_Pro emulator, JS-only — no rebuild needed since F10
    adds no native dependencies; reused the F9 build already installed):**
    all 17 spec DoD items verified via `adb`/`uiautomator`, including a
    live-corrected bounds-parsing bug in the driving script itself (was
    reading the *preceding* sibling node's `bounds`, i.e. tapping "CANCEL"
    instead of "OK" on the native date/time dialogs — fixed by reading
    forward from each `resource-id` match instead of backward). Verified:
    Open mode unchanged from F8 (regression-checked both before and after
    completing a task); Open↔Browse toggle; Day/Week/Month/Year segmented
    control including the new Year heading and month+day nested
    sub-headings; a completed, scheduled task stays visible in Browse but
    disappears from Open; an unscheduled task never appears in any Browse
    granularity; ascending/chronological ordering confirmed across day and
    month groups; granularity switch (Day, anchored on Sep 25 → Week) showed
    "Sep 20 – Sep 26", not the real-world current week, confirming anchor
    preservation; jump-to-today; long-press-edit and swipe-to-delete both
    verified working from inside `GroupedTaskList` (Browse/Week), with the
    edit and delete both confirmed to persist after a full
    `am force-stop` + relaunch; `TaskComposer` confirmed absent from every
    Browse-mode screen dump. No crashes or JS errors in logcat throughout.
    Test data cleaned up from the device afterward.
  - **One change made during implementation `review-and-gate`:** a closer
    code-level pass (not just the DoD checklist) found that `TaskList`'s
    empty state was hardcoded to F8's "All caught up!", reused as-is for
    Browse/Day — so an empty browsed day looked identical to Open mode's
    empty list, when Browse/Week, /Month, and /Year each show a tailored
    "No tasks this ___" message. Not a DoD violation (the spec never
    mandated Day-specific empty copy) but a real inconsistency. **Fixed**:
    `TaskList` gained an optional `emptyMessage` prop (default "All caught
    up!", so Open mode is byte-for-byte unaffected); `tasks.tsx` passes "No
    tasks today" when rendering it for Browse/Day. One new test added
    (`TaskList.test.tsx`). Re-verified: `npm test` (155/155), `tsc`,
    `expo lint`, `prettier --check .` all clean; re-confirmed on-device
    (JS-only reload, no rebuild) that Browse/Day's empty state now reads
    "No tasks today" with no regression to Open mode's "All caught up!".
  - **Ready for implementation `review-and-gate`.**
- **2026-09-10** — **F10 (Task time-based views): technical plan approved
  (review-and-gate).** Plan: `.claude/plans/2/f10-task-timebased-views.plan.md`
  — no schema change (reuses F9's `dueAt`); new `TaskGranularity` type
  (`day|week|month|year`) kept separate from notes' 3-way `Granularity`;
  new `TaskBrowseHeader.tsx` and `stepTaskDate.ts` deliberately parallel
  (not modify) F5-gated `BrowseHeader.tsx`/`stepDate.ts`, mirroring F7's
  `useTaskEditing`-vs-`useNoteEditing` duplication precedent, since
  generalizing either would force touching `index.tsx` (out of F10's
  approved file list); new `yearRange.ts`/`formatYear.ts`,
  `groupTasksByDay.ts`/`groupTasksByMonthAndDay.ts` (both ascending/
  chronological, unlike notes' newest-first grouping), `scheduledTasksFor*`
  query family in `db/tasks.ts` (non-null `dueAt`, no `completed` filter),
  `GroupedTaskList.tsx` (week/month) and `YearGroupedTaskList.tsx` (one
  `SectionList` sectioned by month with day-groups as items, avoiding
  nested virtualized lists), and a `TaskModeToggle.tsx` for the Tasks tab's
  new Open/Browse switch. `tasks.tsx` rewired to add mode + browsing state;
  `TaskComposer` only renders in Open mode. No new dependencies. 16 ordered
  implementation steps with a DoD-to-verification traceability table
  covering all 17 spec acceptance criteria. Disclosed, precedent-consistent
  gap: no dedicated `tasks.tsx` screen test (matches F7/F8/F9). Approved by:
  user (arup.chowdhary@gmail.com). **Awaiting `implement-feature`.**
- **2026-09-10** — **F10 (Task time-based views): spec written and gate
  passed (elicited via `AskUserQuestion` before drafting, plus a
  `review-and-gate` pass that surfaced and resolved two gaps before
  approval).** Decisions confirmed with the user: the Tasks tab gains an
  **Open | Browse** mode toggle — Open mode stays exactly F8's existing
  open-only, unfiltered-by-date list (default on tab open); Browse mode
  reuses F5's `BrowseHeader` pattern (prev/next, tap-to-today, segmented
  control) extended with a fourth **Year** granularity, and shows **only
  scheduled tasks** (`dueAt` non-null) for the browsed range — unscheduled
  tasks are never shown in Browse, only reachable via Open. Unlike F8,
  Browse mode **includes completed tasks** (a browsed day is a
  calendar/history review, not a working list). Week/Month group by day;
  Year groups by month then day. Two gaps found during `review-and-gate` and
  resolved before approval: (1) **ordering** — Browse mode is chronological
  throughout (earliest day/time first), the opposite of Open mode's/notes'
  newest-first order; (2) **composer visibility** — `TaskComposer` is
  **hidden in Browse mode** (adding a task stays an Open-mode-only action;
  no auto-scheduling to the browsed anchor date). No recurrence/reminders
  (F11/F12), no calendar grid or date-picker-for-navigation. Spec:
  `.claude/specs/2-f10-task-timebased-views.md`. Built on branch
  `feature/task-timebased-views`. Approved by: user
  (arup.chowdhary@gmail.com). **Awaiting `write-technical-plan`.**
- **2026-09-10** — **F9 (Task scheduling): implementation gate passed
  (review-and-gate) → F9 is Done.** All 13 spec DoD items verified against
  the diff (matches `.claude/plans/2/f9-task-scheduling.plan.md` exactly —
  only the planned files touched, no scope creep): `dueAt` added to `tasks`
  (additive migration `drizzle/0002_oval_doorman.sql`); new
  `src/lib/pickDateTime.ts` (shared imperative date→time dialog flow) and
  `src/lib/formatTaskDueAt.ts`; `db/tasks.ts`'s `insertTask` gained a
  backward-compatible optional `dueAt` param, plus new
  `updateTaskSchedule`; `TaskComposer`/`TaskRow`/`TaskList`/`tasks.tsx` wired
  for set/change/clear at both entry points. `npm test` (112/112, 20
  suites), `tsc`, `expo lint`, `prettier --check .` all clean (only the
  pre-existing, unrelated `todolist.code-workspace` warning). Grep check
  confirmed no recurrence/notification/network/auth code introduced.
  **On-device (Pixel_10_Pro emulator):** native Android date and time
  dialogs both confirmed working; schedule set/change/clear verified at
  both the composer (pending-schedule pill) and row (due-at subtitle)
  entry points; the date dialog reopens correctly pre-seeded with a task's
  existing due date/time; cancelling a dialog leaves the prior schedule (or
  lack of one) untouched; long-press-edit and checkbox-complete (F7/F8)
  verified unaffected by a task's schedule; a scheduled task's `dueAt`
  survived a full force-stop + relaunch. No crashes or JS errors in logcat
  throughout. One disclosed, non-blocking finding: the already-documented
  `adb`-synthetic-tap-vs-gesture-recognizer quirk (from the F7 session)
  recurred on two `Pressable`s inside the `Swipeable`-wrapped `TaskRow`
  during manual on-device driving — confirmed a testing-tool artifact via
  Jest's reliably-passing `fireEvent.press`, not an app defect; resolved by
  retrying the tap. No changes requested. Approved by: user
  (arup.chowdhary@gmail.com).
- **2026-09-10** — **F9 (Task scheduling): technical plan approved
  (review-and-gate).** Plan: `.claude/plans/2/f9-task-scheduling.plan.md` —
  adds a nullable `due_at` column to `tasks`; new
  `src/lib/pickDateTime.ts` (shared imperative
  `DateTimePickerAndroid.open` date→time flow used by both entry points) and
  `src/lib/formatTaskDueAt.ts`; `db/tasks.ts` gains an optional `dueAt` param
  on `insertTask` plus a new `updateTaskSchedule`; `TaskComposer`/`TaskRow`/
  `TaskList`/`tasks.tsx` wired for set/change/clear at both entry points. New
  dependency `@react-native-community/datetimepicker` via `npx expo install`
  (native rebuild required, same pattern as F6). No changes to
  `useTaskEditing`/delete/complete code. Approved by: user
  (arup.chowdhary@gmail.com). **Awaiting `implement-feature`.**
- **2026-09-10** — **F9 (Task scheduling): spec written and gate passed
  (elicited via `AskUserQuestion` before drafting).** Decisions confirmed
  with the user: a schedule can be set **both at creation (in
  `TaskComposer`) and afterward (on an existing task via `TaskRow`)**, using
  one shared native picker flow (**`@react-native-community/datetimepicker`**,
  a new dependency — chosen over a custom-built picker, mirroring the F6
  precedent of adding one focused native dependency when it earns its
  place); **date and time are both required together** (no date-only
  schedule state); and a schedule is **clearable** back to unscheduled once
  set. New nullable `due_at` column on `tasks` (epoch ms, `null` = unscheduled,
  additive migration). No day/week/month/year views, no recurrence, no
  reminders/snooze — those remain F10/F11/F12. Spec:
  `.claude/specs/2-f9-task-scheduling.md`. Built on branch
  `feature/task-scheduling`. Approved by: user (arup.chowdhary@gmail.com).
  **Awaiting `write-technical-plan`.**
- **2026-09-10** — **F8 (Task list view): implementation gate passed
  (review-and-gate) → F8 is Done.** All 9 spec DoD items verified against
  the diff (matches `.claude/plans/2/f8-tasklist-view.plan.md` exactly — only
  `src/db/tasks.ts` (new `openTasksQuery`), `src/app/tasks.tsx` (query swap),
  `TaskList.tsx` (empty-state copy), and their two test files touched, no
  scope creep). `npm test` (88/88, 1 new test), `tsc`, `expo lint`,
  `prettier --check .` all clean (only the pre-existing, unrelated
  `todolist.code-workspace` warning). Grep check confirmed no forbidden
  surface introduced. **On-device (Pixel_10_Pro emulator):** added tasks,
  confirmed only open tasks show (newest-first); completing a task removed
  it from the list immediately; confirmed directly via the on-device SQLite
  file that a completed task is still stored (`completed=1`), not deleted;
  force-stop + relaunch preserved both the hidden-completed and
  visible-open states; "All caught up!" empty state confirmed both on a
  fresh list and after completing the last remaining task. Long-press-edit
  and swipe-to-delete were also re-verified live on the filtered (open-task)
  list — closing a gap from the first verification pass, which had only
  covered "add" — confirming F7's edit/delete interactions are unaffected by
  F8's filtering (delete needed a retry on the second `adb` tap, matching
  the already-documented `adb`-synthetic-tap-vs-gesture-recognizer quirk
  from the F7 session, not an app defect). No changes requested. Approved
  by: user (arup.chowdhary@gmail.com).
- **2026-09-10** — **F8 (Task list view): technical plan approved
  (review-and-gate).** Plan: `.claude/plans/2/f8-tasklist-view.plan.md` — a
  new `openTasksQuery()` in `src/db/tasks.ts` (filters on `completed = false`,
  newest-first), `src/app/tasks.tsx` swapped to use it, and `TaskList.tsx`'s
  empty-state string changed to "All caught up!". No schema change, no new
  dependencies, no other component touched. One review finding — DoD 6's
  grep-checkable "no forbidden surface" check wasn't an explicit
  implementation step — **fixed** before approval (added as step 6, ahead of
  on-device verification). Approved by: user (arup.chowdhary@gmail.com).
  **Awaiting `implement-feature`.**
- **2026-09-10** — **F8 (Task list view): spec written and gate passed
  (elicited via AskUserQuestion before drafting).** Decisions confirmed with
  the user: completed tasks are **fully hidden** from the Tasks tab (no
  show-completed toggle or archive — completing a task removes it from view
  immediately, with no transient delay/animation); the empty state changes
  from F7's "No tasks yet" to **"All caught up!"** (covers both "no tasks
  exist" and "all tasks are completed"). F8 is filtering-only: a new
  open-only query in `src/db/tasks.ts` plus the empty-state copy change in
  `TaskList` — no schema change, no new UI, add/edit/delete/checkbox
  behavior unchanged from F7. Spec: `.claude/specs/2-f8-tasklist-view.md`.
  Built on branch `feature/tasklist-view`. Approved by: user
  (arup.chowdhary@gmail.com). **Awaiting `write-technical-plan` (no
  implementation yet, per explicit user instruction).**
- **2026-09-09** — **F7 (Task management): implementation gate passed
  (review-and-gate) → F7 is Done.** All 11 spec DoD items verified against
  the diff (headless: 87/87 tests, `tsc`/`expo lint`/`prettier --check .`
  all clean; on-device: Pixel_10_Pro emulator, Notes tab regression-checked
  unaffected, add/edit/complete/delete all confirmed with two independent
  restart-persistence checks). One revision made during this gate (see the
  entry below): delete changed from swipe-alone-deletes to
  swipe-reveals-a-button-then-tap-to-delete, per the user's explicit
  request — re-verified after the change, both headlessly and on-device.
  No other changes requested. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-09** — **F7 (Task management): delete UX revised during
  implementation `review-and-gate` ("request changes") → re-verified,
  re-submitted for gate approval.** The user's requested change: swiping a
  task should **reveal a "Delete" button, not delete immediately** — the
  swipe itself no longer deletes; only an explicit tap on the revealed
  button does. Confirmed the exact interaction via `AskUserQuestion` (with
  ASCII-mockup previews) against a second plausible reading
  ("drag-to-confirm slider") before implementing, since it reverses the
  spec's original swipe-alone-deletes decision. `TaskRow.tsx`'s
  `renderRightActions` now renders a real `Pressable` "Delete" button
  (`testID="task-delete-button"`) instead of a plain colored background;
  `onSwipeableOpen`'s auto-delete is removed; the button calls
  `swipeableRef.current?.close()` then `onDeleteTask(id)`. Updated
  `.claude/specs/2-f7-task-management.md` (rules + DoD item 5) and
  `.claude/plans/2/f7-task-management.plan.md` (design/testing/risks
  sections) to match. `TaskRow.test.tsx` replaced its two
  `onSwipeableOpen`-driven tests with `fireEvent.press` on the real button
  (simpler and more robust — `Swipeable` renders `renderRightActions`'
  content in the tree regardless of swipe state, so no gesture simulation
  is needed at all). `npm test` (87/87), `tsc`, `expo lint`,
  `prettier --check .` all still clean. **Re-verified on-device**
  (Pixel_10_Pro emulator, fresh JS reload — no rebuild needed, JS-only
  change): swiping a task reveals the Delete button **without** deleting it
  (confirmed the task is still present and unchanged after the swipe);
  tapping the revealed button deletes it. Found and documented a
  `adb`-tap-vs-gesture-handler recognition quirk in this session (a `Swipeable`-revealed
  button's first `adb`-synthetic tap is often silently swallowed, needing a
  retry — confirmed via Jest's reliable `fireEvent.press` pass and clean
  logcat that this is a synthetic-input testing-tool artifact, not an app
  bug; full writeup saved to the `android-build-toolchain` memory for future
  sessions building swipeable UI). **Re-submitted for implementation
  `review-and-gate` approval.**
- **2026-09-09** — **F7 (Task management): implemented and verified
  on-device (Pixel_10_Pro emulator) → ready for implementation
  `review-and-gate`.** Built on `feature/task-management` per
  `.claude/plans/2/f7-task-management.plan.md`, step by step, no deviations
  from the plan.
  - **New:** `tasks` table + migration (`drizzle/0001_freezing_rhino.sql`,
    adds only `tasks`, `notes` untouched); `src/db/tasks.ts`
    (insert/list/updateText/setCompleted/delete); `src/hooks/useTaskEditing.ts`;
    `src/components/TaskComposer.tsx`, `TaskRow.tsx`, `TaskList.tsx`; the new
    `src/app/tasks.tsx` screen. `src/app/_layout.tsx` now renders a
    `GestureHandlerRootView` + `Tabs` (Notes | Tasks) instead of a single-screen
    `Stack`. `jest.config.js` gained `setupFiles:
    ['react-native-gesture-handler/jestSetup']`.
  - **Headless:** `npm test` (87/87, 18 suites — 5 new `tasks.test.ts`, 3 new
    `TaskComposer`/6 new `TaskRow`/9 new `TaskList` tests), `tsc`, `expo lint`,
    and `prettier --check .` all pass (one pre-existing, untouched
    `todolist.code-workspace` formatting warning, unrelated to this diff).
    Grep checks confirm no title/tag/due-date/recurrence field and no
    date-picker/notification/network/auth code anywhere in the new files.
  - **On-device (Pixel_10_Pro emulator):** required fixing this session's
    build environment first — `android/local.properties` was missing
    (`sdk.dir` unset) and the shell's default `java`/`javac` weren't the
    pinned JDK 17; both fixed per the `android-build-toolchain` memory notes
    (`sdk.dir=/home/couch-potato/Android/Sdk`,
    `JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64`), then `expo run:android`
    built and installed cleanly. Verified via `adb`/`uiautomator`: Notes tab
    unaffected (still shows the Today browse view, unchanged); Tasks tab
    shows the empty state, then a typed task appears immediately and the
    composer clears; checkbox toggles complete/incomplete immediately
    (glyph + `accessibilityState.checked` both flip); long-press opens
    inline edit pre-filled with the task's text, and blurring (tap another
    focusable element — Android doesn't blur on an empty-area tap) saves the
    edit; swiping a row left deletes it immediately. **Both an edited task
    and a completed task's state were independently confirmed to survive a
    full `am force-stop` + relaunch** (a completed task specifically was
    re-verified after the first pass only incidentally tested it pre-delete).
    No crashes or JS errors in `logcat` throughout the full session.
  - **Awaiting implementation `review-and-gate` approval.**
- **2026-09-09** — **F7 (Task management): spec gate passed → technical
  plan drafted (`write-technical-plan`).** The user directed work straight
  to the technical plan, which is treated as approval of
  `.claude/specs/2-f7-task-management.md` as written (no changes requested).
  Plan: `.claude/plans/2/f7-task-management.plan.md` — new `tasks` table
  (`id`/`text`/`completed`/`createdAt`/`updatedAt`, `completed` as a Drizzle
  boolean-mode integer column) + `src/db/tasks.ts`; a **new, separate**
  `useTaskEditing` hook and `TaskRow`/`TaskList`/`TaskComposer` components
  (deliberately not generalized from F4's `useNoteEditing`/`NoteRow`, since
  those files are outside this spec's change set); a new `tasks` tab screen;
  `_layout.tsx` switches from a single-screen `Stack` to a `Tabs` navigator
  (Notes | Tasks) wrapped in `GestureHandlerRootView` (not previously present
  anywhere in the app — required for the new `Swipeable`-based
  swipe-to-delete). No new dependencies — swipe-to-delete uses the
  already-installed `react-native-gesture-handler`; `jest.config.js` gains
  one `setupFiles` line for its jest mock. Flagged risks: two small,
  deliberate code duplications (`useTaskEditing` vs `useNoteEditing`, and the
  Android-IME-height listener copied into `tasks.tsx`) rather than touching
  F4/F5's already-shipped files or `index.tsx`, both outside this spec's
  file list; multiple swipe rows don't auto-close each other (cosmetic,
  deferred). **Awaiting `review-and-gate` approval before implementation.**
- **2026-09-09** — **F7 (Task management): spec drafted (`create-spec`),
  UX decisions elicited via `AskUserQuestion` before drafting.** Decided with
  the user: tasks get a **bottom tab bar** (Notes | Tasks), not a link/toggle
  on the existing screen; complete/incomplete is toggled via a **checkbox at
  the row start**; delete is **swipe-to-delete** (no persistent delete
  button); edit is **long-press → inline field → auto-save on blur**, the
  same pattern as F4. F7's list is deliberately unfiltered (all tasks,
  newest-first) — open-only filtering is F8's job. New `tasks` table
  (`id`/`text`/`completed`/`createdAt`/`updatedAt`, no schedule/recurrence
  columns yet). No new dependencies (swipe uses the already-installed
  `react-native-gesture-handler`). Spec: `.claude/specs/2-f7-task-management.md`.
  Built on branch `feature/task-management`. **Awaiting `review-and-gate`
  approval before any technical plan.**
- **2026-09-09** — **Phase 2 decomposed into 6 ordered features (F7–F12)
  (`plan-phase`), gate passed → advances out of Backlog planning.** Mirrors
  Phase 1's granularity precedent: task management (CRUD+complete) kept
  separate from its default list view (like F2/F3), scheduling and recurrence
  split into their own features before reminders, and reminders+snooze kept
  as one feature (per the `reminders-and-snooze` skill's own scope) rather
  than split per ideas-refined's two bullets. Two forks confirmed with the
  user (`AskUserQuestion`): (1) keep the 6-feature granularity as proposed,
  not coarser/finer; (2) **F12 (reminders & snooze) depends on both F9
  (scheduling) AND F11 (recurrence)** — reminders ship once, correct for both
  one-off and recurring tasks, rather than shipping early for one-off tasks
  only and retrofitting recurring-task reminders later. Cut lines: web/sync/
  accounts (Phase 3); search, note→task promotion (Later); titles/tags on
  tasks (minimalism). No specs written yet — next step is `write-feature-spec`
  for F7. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-08** — **F6 (Voice capture): verified on a second physical
  device (Pixel 10 Pro, the user's primary phone) and one cosmetic fix
  applied.** Installed the same `arm64-v8a` debug build (matched the Pixel
  6a's architecture, no separate build needed) via wireless `adb`, tunneled
  Metro the same way (`adb reverse tcp:8081 tcp:8081`). Native recognition
  engaged correctly on this device too (confirmed via live-tailed
  `adb logcat`), though its Android/Google-app version emits a different
  native event pattern (`onSegmentResults`/`onEndOfSegmentedSession`
  alongside `onPartialResults`) than the Pixel 6a's simpler
  partial/final-result flow — both are handled by the same `result`
  event/`isFinal` contract from `expo-speech-recognition`'s JS side, so no
  code change was needed for this device specifically. The user confirmed
  transcription itself was fine on both devices; the one real issue raised
  was cosmetic: the mic button showed the literal word "Mic"/"Stop" instead
  of an icon. Decided with the user: use emoji glyphs (🎤 idle/unavailable,
  ⏹ listening) rather than adding an icon library — this project had zero
  icon dependencies before F6, and the approved spec already named
  `expo-speech-recognition` as the one dependency exception, so a second
  dependency for a cosmetic icon wasn't taken without asking. Changed only
  `NoteComposer.tsx`'s `micButtonText` content and style (dropped the
  send-button-matching `color`/`fontWeight`, which have no effect on emoji
  glyphs, in favor of a larger `fontSize: 18` for legibility as an icon).
  No test needed updating (none asserted on the button's text content,
  only `accessibilityState`/`accessibilityLabel`). `npm test` (63/63),
  `tsc`, `expo lint`, Prettier all still pass. Verified visually via
  `adb screencap` on both devices — a real 🎤 renders (not a missing-glyph
  box) in both the idle (gray) and listening (red, ⏹) button states, pixel-
  identical between the Pixel 6a and Pixel 10 Pro. Approved by: user
  (arup.chowdhary@gmail.com).
- **2026-09-08** — **F6 (Voice capture): DoD 3/12 live-transcription gap
  closed for real on a physical device — a genuine bug was found and fixed
  in the process, superseding the "documented gap" entry below.** After the
  emulator-audio limitation was accepted as a documented gap, a physical
  Pixel 6a (Android 16) became available over wireless `adb` debugging mid-session.
  Installed the dev build on it (required a separate `arm64-v8a` Gradle build —
  the existing debug APK was `x86_64`-only from the emulator build) and
  reached Metro via `adb reverse tcp:8081 tcp:8081` (the phone couldn't reach
  the host's LAN IP directly). Live-tailed `adb logcat` while the user
  manually tapped the mic and spoke on real hardware.
  - **Bug found:** the user reported "only last few words are being
    transcribed, the initial message is getting lost." Logs confirmed why:
    with `continuous: true`, the real device's on-device SODA recognizer
    resets its transcript at each detected speech segment (a pause) rather
    than accumulating across the whole listening session — e.g. one segment
    produced "okay let us try the mic test," then the next segment's
    `result` events restarted from empty. `useVoiceCapture`'s merge only
    ever measured against `baseTextRef` frozen at listening-start, so every
    new segment's text silently replaced (instead of appending after) every
    prior segment's already-recognized words.
  - **Fix:** `src/hooks/useVoiceCapture.ts`'s `result` handler now commits
    the merged value into `baseTextRef.current` whenever `event.isFinal` is
    true, so the next segment's interim results build on top of the
    previous segment's committed text instead of the original
    listening-start snapshot. `mergeVoiceTranscript` itself needed no
    change — only how/when its result gets committed as the new base.
  - **New regression test:** `NoteComposer.test.tsx` gained "appends a
    second speech segment after the first instead of overwriting it" (a
    final result committing, followed by a second segment's partial result,
    asserting the field shows both). `npm test` (63/63, 14 suites), `tsc`,
    `expo lint`, Prettier all pass after the fix.
  - **Re-verified on the physical Pixel 6a** after reloading the fixed JS
    bundle (Metro serves fresh JS on relaunch — no APK reinstall needed for
    a JS-only change): user manually spoke a multi-segment sentence with a
    pause in it and confirmed **"Fixed — full text now shows correctly."**
    This closes DoD 3 and the remaining speaking-specific part of DoD 12 for
    real — not merely inferred from native engagement — completing all 12
    spec DoD items. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-08** — **F6 (Voice capture): implementation gate passed
  (review-and-gate) → F6 is Done, with one disclosed, user-approved
  limitation (superseded by the entry above — DoD 3/12 were later verified
  for real on a physical device, which also surfaced and fixed a genuine
  multi-segment transcript bug not caught by the emulator/headless testing
  in this entry).** Implemented on `feature/voice-capture` per
  `.claude/plans/1/f6-voice-capture.plan.md`: `src/lib/mergeVoiceTranscript.ts`
  (pure cumulative-transcript merge), `src/hooks/useVoiceCapture.ts`
  (wraps `expo-speech-recognition`'s start/stop + event stream around the
  composer's existing text state), and `NoteComposer.tsx`'s new mic button
  (testID `note-mic`, tap-to-toggle, idle/listening/unavailable states,
  typing disabled only while actively listening). New dependency
  `expo-speech-recognition@~57.0.0`; `app.json` gained its config plugin
  block (mirroring `expo-splash-screen`'s two-element form).
  - **Headless:** `npm test` (62 tests, 14 suites — 5 new
    `mergeVoiceTranscript` tests in a new suite, 5 new `NoteComposer` voice-flow
    tests using
    this repo's first explicit native-module `jest.mock` — `NoteComposer.test.tsx`
    needed a `beforeEach(() => jest.clearAllMocks())` added since mock call
    counts otherwise leaked across cases, unrelated to prior tests), `tsc`,
    `expo lint` (one `react-hooks/refs` violation fixed by moving the
    `value` ref sync into a `useEffect` instead of writing `.current` during
    render), and Prettier all pass. Grep checks confirm no new
    screens/fields/modals and no cloud/network speech code introduced.
  - **On-device (Android, Pixel 10 Pro emulator):** 11 of 12 spec DoD items
    verified via `expo prebuild` + `expo run:android`, driven headlessly via
    `adb`/`uiautomator`: `expo-speech-recognition` compiled and linked
    cleanly; `RECORD_AUDIO` + speech-recognition `<queries>` visibility
    landed in the generated manifest; tapping the mic triggers a real Android
    permission dialog, and granting it flips the button to its listening
    state (red "Stop", `selected=true`) while disabling the text input;
    tapping again stops listening and re-enables typing; denying the
    permission (including a hard `pm revoke` + fresh prompt) leaves the
    composer fully typeable with the mic showing a clear
    disabled "Voice input unavailable" state and does **not** re-prompt on a
    second tap; typing, sending, and persistence across a force-stop +
    relaunch all work unaffected by the new mic UI, with the native
    `SpeechRecognizer`/on-device SODA engine confirmed engaging correctly
    (verified via logcat: `onStartListening`, `onMicrophoneOpened`, and
    continuous mic-buffer delivery to the offline recognizer) and no crashes
    or JS errors throughout. **Not independently verified: DoD 3 (live
    partial-result streaming while actually speaking) and the speaking-specific
    part of DoD 12.** Root cause, diagnosed in-session: this sandboxed dev
    environment's headless emulator can inject synthesized speech as virtual
    mic input at the OS audio-routing level (confirmed working end-to-end via
    a PulseAudio null-sink + loopback carrying an `espeak-ng`-synthesized
    WAV, verified reaching the guest's `AudioRecord`/SODA pipeline as
    continuous buffers) but QEMU's own audio driver fails to initialize
    (`Could not init 'pa' audio driver`) even with the required client
    libraries (`libpulse0`, `pipewire-pulse`) present and working for every
    other process on the host — most likely a sandbox-level restriction on
    IPC/shared-memory syscalls specific to how the emulator process is
    launched in this session, not fixable via emulator flags, env vars, or
    alternate `-audio` backends (all attempted). This blocks *any* audio
    reaching this specific emulator instance, not just the WAV-injection
    technique — a genuine, disclosed infrastructure limitation, not a code
    defect, distinct from `expo-speech-recognition`'s own (separately
    verified) correct engagement of the platform recognizer. **Decision,
    made with the user after exhausting the fallback options in the
    approved plan's Risks section (WAV injection → troubleshoot further →
    accept as documented gap):** mark F6 Done with this one caveat rather
    than block on a physical-device test. Approved by: user
    (arup.chowdhary@gmail.com).
- **2026-09-07** — **F6 (Voice capture): technical plan approved (review-and-gate,
  via Claude Code Plan Mode).** Plan: `.claude/plans/1/f6-voice-capture.plan.md`
  — adds a mic button to `NoteComposer` wired through a new `useVoiceCapture`
  hook (`src/hooks/useVoiceCapture.ts`) around `expo-speech-recognition`, with
  the cumulative-transcript merge logic isolated in a pure
  `src/lib/mergeVoiceTranscript.ts` helper. Two open calls the spec left for
  this stage were resolved: typing is **disabled while actively listening**
  (avoids a silent data-loss race between live partial-result writes and
  concurrent keystrokes; DoD 5 only requires post-stop editability), and
  permission-denied state is **in-memory only** (not persisted — the OS
  remains the durable source of truth for the grant, so a fresh launch
  re-queries rather than duplicating that state). New dependency:
  `expo-speech-recognition@~57.0.0` (verified current on npm), requiring a
  native rebuild (`expo prebuild` + `expo run:android`) since it has no Expo
  Go support — the one dependency exception this project's Phase 1 specs
  allow, per the approved spec. **Verification method decided with the
  user:** since on-device checks in this project are driven headlessly via
  `adb`/`uiautomator` with no human microphone available, DoD 3/12's live
  speech-to-text checks will be done by injecting a pre-recorded WAV as the
  emulator's virtual mic input via host-audio-loopback routing — a new
  technique for this project, flagged in the plan's Risks section as
  environment-dependent and to be worked out during implementation, with a
  manual-verification fallback if it proves unworkable. Approved by: user
  (arup.chowdhary@gmail.com).
- **2026-09-07** — **F6 (Voice capture): spec written and gate passed
  (elicited via AskUserQuestion before drafting).** Decisions confirmed with
  the user: transcription engine is **`expo-speech-recognition`** (on-device/
  platform speech APIs, no cloud key — keeps Phase 1 local-first), the mic
  control is **tap-to-toggle** (not press-and-hold), and recognized text
  **streams live** into the existing composer field as partial results
  arrive, rather than only appearing after recognition stops. Spec:
  `.claude/specs/1-f6-voice-capture.md`. Built on branch
  `feature/voice-capture`.
- **2026-09-07** — **F5 (Time-based browsing): implementation gate passed
  (review-and-gate) → F5 is Done.** All 14 spec DoD items verified against
  the diff (matches `.claude/plans/1/f5-time-based-browsing.plan.md` exactly,
  no scope creep — `NoteList.test.tsx` required zero changes despite the
  underlying refactor, as the plan required). One disclosed deviation from
  the plan's literal code: `index.tsx`'s `useLiveQuery` call needed an
  explicit `deps` array (`[granularity, anchorDate.getTime()]`) the plan
  snippet omitted, without which the live query silently never re-subscribed
  on browsing-state changes — a real bug caught only by on-device testing,
  fixed within the same already-listed file, not a scope expansion. `npm
  test` (52/52, 13 suites), `tsc`, `expo lint`, `prettier --check src/` all
  clean; no new dependencies; on-device verification (Pixel 10 Pro emulator)
  passed in full, including edits surviving a force-stop + relaunch. No
  changes requested. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-07** — **F5 (Time-based browsing): implemented** on
  `feature/time-based-browsing` per `.claude/plans/1/f5-time-based-browsing.plan.md`.
  Built bottom-up: `db/weekRange.ts`/`monthRange.ts` (Sunday-start weeks),
  `lib/formatWeek.ts`/`formatMonth.ts`, `lib/stepDate.ts` (month-end clamping,
  e.g. Jan 31 → Feb 28 not March), `lib/groupNotesByDay.ts`, a generalized
  `db/notes.ts` (`notesForRangeQuery` + `notesForWeekQuery`/`notesForMonthQuery`
  + a `notesForGranularityQuery` dispatcher), `hooks/useNoteEditing.ts` +
  `components/NoteRow.tsx` (extracted from `NoteList` so day and week/month
  views share one edit code path), `components/GroupedNoteList.tsx`
  (`SectionList`, day sub-headings reuse `formatDayHeading`), and
  `components/BrowseHeader.tsx` (prev/next, tap-to-jump-to-today, Day/Week/
  Month segmented control), which replaces and deletes `DayHeading.tsx`.
  `index.tsx` now owns `granularity`/`anchorDate` browsing state.
  - **Bug found and fixed during implementation:** `drizzle-orm/expo-sqlite`'s
    `useLiveQuery(query, deps = [])` only re-subscribes when `deps` changes —
    called without a `deps` array (as F1–F4 always had it, harmlessly, since
    their query never changed after mount), the effect ran once and silently
    kept serving the initial "today" query forever, updating only on DB
    writes. This was invisible in the heading (pure local state) but meant
    the note list never actually re-scoped when navigating. Fixed by passing
    `[granularity, anchorDate.getTime()]` as `deps` in `index.tsx`. Caught
    only during on-device verification — headless tests and typecheck/lint
    all passed with the bug present, since the bug is in the live-query
    wiring, not any unit-testable pure function.
  - **Headless:** `npm test` (52 tests, 13 suites — 21 new tests across 8 new
    suites; `NoteList.test.tsx` required zero changes despite the underlying
    refactor), `tsc`, `expo lint`, and Prettier (on `src/`) all pass. Grep
    checks confirm `index.tsx` has no inline range/grouping logic and no
    calendar-grid/date-picker/network/auth code was introduced. No new
    dependencies (`package.json` diff is empty).
  - **On-device (Pixel 10 Pro emulator):** built and installed via
    `expo run:android`; driven via `adb`/`uiautomator`. Verified against real
    seed data spanning Sep 2–7, 2026 (multiple days/weeks): day prev/next
    navigation scopes correctly (confirmed against known per-day note counts
    for Sep 2/3/4/5/6/7); tap-heading jumps to today; Week view groups by day
    with correct sub-headings and newest-first ordering, "This Week" label,
    and an "Aug 30 – Sep 5" range label when browsing the prior week (month
    repeated on both ends, per the confirmed decision); Month view likewise
    ("This Month", "August 2026", "No notes this month" empty state);
    switching granularity mid-browse (week→day and month→day) preserved the
    anchor date instead of resetting to today, in both directions tested;
    long-press-edit verified in both the flat day view and the grouped
    week view (editing a note already visible in a grouped section), with
    both edits persisting across a full `am force-stop` + relaunch. No JS
    errors in logcat throughout (only a benign "Cannot connect to Expo CLI"
    dev-tooling banner from a transient Metro reconnect, unrelated to app
    correctness).
  - Ready for **implementation review-and-gate**.
- **2026-09-07** — **F5 (Time-based browsing): technical plan approved
  (review-and-gate, via Claude Code Plan Mode).** Plan:
  `.claude/plans/1/f5-time-based-browsing.plan.md` — adds week/month range
  helpers (`db/weekRange.ts`, `db/monthRange.ts`, Sunday-start weeks),
  heading formatters (`lib/formatWeek.ts`, `lib/formatMonth.ts`), a
  date-stepper with month-end clamping (`lib/stepDate.ts`), a day-grouping
  helper (`lib/groupNotesByDay.ts`), a shared edit hook + row component
  (`hooks/useNoteEditing.ts`, `components/NoteRow.tsx`) factored out of
  `NoteList` so day and week/month views can't drift in edit behavior, a new
  `GroupedNoteList` (`SectionList`-based) for week/month, and a new
  `BrowseHeader` (prev/next arrows, tap-to-jump-to-today,
  Day/Week/Month segmented control) that replaces `DayHeading`. `db/notes.ts`
  gains one shared range query plus a granularity dispatcher so `index.tsx`
  stays free of range/grouping logic. No new dependencies. Two UX calls
  confirmed with the user before finalizing: the nav-bar's static "Today"
  title (`_layout.tsx`) is left unchanged (the in-screen `BrowseHeader`
  always shows the correct label), and week/month range labels always repeat
  the month on both ends (e.g. "Sep 1 – Sep 7"), not collapsed for
  same-month ranges. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-07** — **F5 (Time-based browsing): spec written and gate passed
  (elicited via AskUserQuestion before drafting).** Scope decided with the
  user: this feature covers **all three granularities** (day, week, month)
  in one pass, not split into a day-nav-only feature. UX decided: **prev/next
  arrows** flanking the heading (not swipe gestures) for navigation, tapping
  the heading label **jumps to today**, week/month notes render as a
  **grouped list by day** (day sub-heading per day with notes, empty days
  omitted — not a calendar grid), and granularity is switched via a
  **segmented Day/Week/Month control** near the heading (not separate
  routes). Editing (F4) keeps working identically in every view. Spec:
  `.claude/specs/1-f5-time-based-browsing.md`. Built on branch
  `feature/time-based-browsing`.
- **2026-09-06** — **F4 (Edit note): implementation gate passed
  (review-and-gate) → F4 is Done.** All 11 spec DoD items verified against
  the diff (matches `.claude/plans/1/f4-edit-note.plan.md` exactly, no scope
  creep): long-press-to-edit, blur-to-save, revert-on-empty, single-editable-
  at-a-time, list order unaffected, `updateNoteText` tested, no delete/nav/
  voice/network code added, `npm test` (20/20), typecheck/lint/format clean,
  on-device verified on the Pixel 10 Pro emulator (immediate update, restart
  survival, revert-on-empty, no crashes in logcat). No changes requested.
  Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-06** — **F4 (Edit note): implemented** on `feature/edit-note` per
  `.claude/plans/1/f4-edit-note.plan.md`. Long-press a note to edit it inline;
  the edit auto-saves on blur (via new `updateNoteText`) unless cleared to
  empty/whitespace, in which case it reverts to the original text — no
  Save/Cancel buttons, no delete, no separate edit screen. Only one note is
  editable at a time (long-pressing another commits/reverts the open one
  first). All 11 spec DoD items covered:
  - **Headless:** `npm test` (20 tests, 5 suites — 4 new `NoteList` edit-flow
    tests and 1 new `updateNoteText` test added to the existing suites),
    `tsc`, `expo lint`, and Prettier all pass. Grep check confirms no delete
    affordance, date-nav control, voice button, or network/auth code in the
    diff.
  - **On-device (DoD 2, 3, 5, 11): verified**, on a headlessly-launched
    Pixel 10 Pro emulator (`expo run:android` → build succeeded, APK
    installed, JS bundle loaded). Driven via `adb`/`uiautomator` (long-press
    simulated as a same-point `input swipe` with a hold duration): captured a
    note, long-pressed it into edit mode (pre-filled with its text), edited
    it and blurred by shifting focus to the composer — the list updated
    immediately with the new text. Force-stopped and relaunched the app —
    the edit survived. Long-pressed again, cleared the text to
    whitespace-only, blurred — the row reverted to the last saved text (not
    deleted, not blank). No crashes or JS errors in `logcat` throughout.
    Single-note case only; multi-note ordering-unaffected-by-edit and
    only-one-editable-at-a-time are covered by the `NoteList` unit tests, not
    re-driven on-device.
  - Ready for **implementation review-and-gate**.
- **2026-09-06** — **F4 (Edit note): technical plan approved (review-and-gate,
  via Claude Code Plan Mode).** Plan: `.claude/plans/1/f4-edit-note.plan.md` —
  adds `updateNoteText` to `src/db/notes.ts`, extends `NoteList` with
  long-press-to-edit/blur-to-commit/revert-on-empty state, wires `index.tsx`.
  No schema/dependency changes. Every implementation step traces to a spec DoD
  item. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-06** — **F4 (Edit note): spec written and gate passed
  (elicited via AskUserQuestion before drafting).** UX decided with the user:
  **long-press** to enter edit (tap reserved, avoids accidental edits),
  **inline** editing in the existing list row (no separate screen/modal),
  **auto-save on blur** (no explicit Save/Cancel), and clearing a note to
  empty/whitespace **reverts** to the original text rather than deleting it
  (delete stays out of scope for F4). Spec: `.claude/specs/1-f4-edit-note.md`.
  Built on branch `feature/edit-note`.
- **2026-09-03** — **F2 (Typed note capture): implementation gate passed
  (review-and-gate) → F2 is Done.** All 9 spec DoD items verified, including
  DoD 1 after the keyboard-avoidance fix below. Approved by: user
  (arup.chowdhary@gmail.com).
- **2026-09-03** — **F2 (Typed note capture): Android keyboard-avoidance
  defect found and fixed during implementation gate review.** DoD item 1
  ("composer stays visible above the on-screen keyboard") failed on Android:
  the keyboard fully covered the composer instead of the layout resizing.
  Root cause: this Expo/RN version (SDK 57 / RN 0.86) uses edge-to-edge
  display on Android by default, so the window never actually resizes for the
  keyboard — neither `android:windowSoftInputMode="adjustResize"` (tried via
  `app.json`'s `android.softwareKeyboardLayoutMode: "resize"`, confirmed
  present in the generated manifest) nor `KeyboardAvoidingView`'s built-in
  `"height"` behavior had any effect, since both rely on a window resize that
  edge-to-edge suppresses.
  - **Options presented to the user:** (a) a manual `Keyboard` event listener
    (no new dependency), (b) add `react-native-keyboard-controller` (new prod
    dependency, a spec deviation), (c) track as a known issue and defer.
    **Chose (a).** Approved by: user (arup.chowdhary@gmail.com).
  - **Fix:** `src/app/index.tsx` now listens for `Keyboard`
    `keyboardDidShow`/`keyboardDidHide` on Android and pads the screen by the
    real IME height (`event.endCoordinates.height`) instead of relying on
    native resize. The `adjustResize` manifest setting was kept (harmless,
    technically correct) but the working fix is the manual listener.
  - **Re-verified on-device** after the fix: composer + Send button stay fully
    visible above the keyboard; typed and sent a note without needing to
    dismiss the keyboard first; note saved and appeared at the top, field
    cleared and stayed focused. Headless gates re-run clean (`npm test` 15/15,
    `tsc`, `expo lint`, `format:check`, after a Prettier auto-format on the
    edited file).
- **2026-09-03** — **F1 (App foundation & local storage): implementation gate
  passed (review-and-gate) → F1 is Done.** All 9 spec DoD items verified: Android
  launch, empty state, persistence round-trip + restart survival, and the
  storage smoke test were confirmed on-device during F3's verification pass
  (item 1, `npm install`, wasn't independently re-run this session but inferred
  clean from passing tests/build). One finding — `README.md` was stale (described
  a dev-seed button F2 had already removed, understated progress) — **fixed**
  before approval (Status section + dev-seed mention updated). Approved by: user
  (arup.chowdhary@gmail.com).
- **2026-09-03** — **F3 (Today view): implementation gate passed
  (review-and-gate) → F3 is Done.** All 10 spec DoD items verified against
  the diff (matches `.claude/plans/1/f3-today-view.plan.md` exactly, no scope creep);
  no changes requested. Approved by: user (arup.chowdhary@gmail.com).
- **2026-09-03** — **F3 (Today view): implemented** on `feature/today-view`
  per `.claude/plans/1/f3-today-view.plan.md` — `formatDayHeading`, `DayHeading`,
  `NoteList` (+ tests) added; `index.tsx` rewired and stays thin. All 10 spec
  DoD items verified:
  - Headless: `npm test` (20 tests, 7 suites, including the 5 new), `tsc`,
    `expo lint`, Prettier all pass. Grep checks confirm no nav/edit/delete/voice
    affordance and no network/auth code introduced.
  - **On-device (Android emulator, Pixel_10_Pro, first on-device run for this
    project):** heading renders correctly ("Today, Sep 3", matching device
    date); empty state renders; a captured note appears live at the top; a
    second note confirms newest-first ordering end-to-end; both notes survive
    a full app force-stop + relaunch (on-device SQLite persistence). This
    incidentally exercises F1's and F2's still-pending on-device DoD items
    too (persistence round-trip, capture flow, live list) — evidence for their
    own gates, but **does not itself constitute their gate approval**; F1/F2
    remain `Impl` until reviewed on their own.
  - **Note:** on Android, the pinned composer is not kept clear of the on-screen
    keyboard while typing (`KeyboardAvoidingView`'s `behavior` is `undefined` on
    Android — iOS-only `padding`); this is pre-existing F2 behavior, untouched
    by F3, not fixed here. Flagging for a possible follow-up against F2's DoD
    item 1 ("stays visible above the keyboard").
  - Awaiting **implementation review-and-gate**.
- **2026-09-03** — **F3 (Today view): technical plan approved (review-and-gate).**
  Plan: `.claude/plans/1/f3-today-view.plan.md` — adds `formatDayHeading`, `DayHeading`,
  `NoteList` (+ tests), rewires `index.tsx`; no schema/dependency changes. Every
  step traces to a spec DoD item; no gaps found on review. Approved by: user
  (arup.chowdhary@gmail.com). Proceeding to implementation.
- **2026-09-03** — **F3 (Today view): spec written and gate passed
  (review-and-gate).** Scope decided with the user: since F2 already renders
  today's notes as a live, newest-first list with an empty state, F3 adds only
  a **visible day heading** (e.g. "Today, Sep 3") plus an **extracted, tested
  `NoteList` component** — no date navigation (F5), no editing (F4), no voice
  (F6). The heading exists to give F5 a concrete place to attach day/week/month
  navigation later. Spec: `.claude/specs/1-f3-today-view.md`. Gate note: F1/F2
  implementations are still pending their on-device gate; the user accepted
  that risk (scope is stable, only on-device verification is outstanding) and
  approved proceeding to the F3 technical plan regardless. Approved by: user
  (arup.chowdhary@gmail.com). Built on branch `feature/today-view`.
- **2026-08-04** — **F2 (Typed note capture): spec approved → technical plan
  approved → in implementation.** Capture UX decided with the user:
  - **Surface:** an inline `NoteComposer` **pinned at the bottom** of the Today
    screen (above the keyboard), not a modal/FAB.
  - **Input:** **multiline**; **Return inserts a newline**; an explicit **send**
    button commits the note. Empty/whitespace-only input is not saveable; the
    field clears (keeping focus) after a save. Saves reuse F1's `insertNote`; the
    existing `useLiveQuery` refreshes the list.
  - **Approved deviation from the F2 spec's "No new dependencies":** added
    component-test tooling — `@testing-library/react-native` (v13) +
    `react-test-renderer` (pinned to React 19.2.3) + `@types/react-test-renderer`,
    **dev-only** — so the composer's type→send→clear/disabled behavior is covered
    by an automated render test (Option B). This departs from F1's headless-only
    test style; the pure trim/empty rule (`src/lib/noteInput.ts`) is still tested
    headlessly too. Approved by: user (arup.chowdhary@gmail.com).
  - Verified headlessly: `jest` (10 tests), `tsc`, `expo lint`, Prettier, and
    `expo export` (Android bundle) all pass. On-device Android run pending (no SDK
    in the build environment).
- **2026-08-03** — **F1 spec approved → technical plan approved → in
  implementation.** Companion libraries (left "not locked" in the 2026-07-29
  stack decision) **confirmed** at F1 spec/plan:
  - **Navigation:** Expo Router (file-based; strongest Phase 3 web path).
  - **Local DB:** `expo-sqlite` + `drizzle-orm`, migrations via `drizzle-kit`.
  - **IDs:** `expo-crypto` `randomUUID()` (globally-unique, sync-ready).
  - **Android build flow:** `expo prebuild` + dev client (`expo run:android`);
    generated `android/` is gitignored.
  - **Testing:** Jest via `jest-expo`; storage smoke test runs headlessly on
    `better-sqlite3` against the same Drizzle schema/migration.
  - Approved by: user (arup.chowdhary@gmail.com).
  - Scaffold built on `feature/foundation` (SDK 57, TypeScript). Verified
    headlessly: `tsc`, `jest`, `expo lint`, Prettier, and `expo export`
    (Android bundle) all pass. On-device Android launch pending (no SDK in the
    build environment).
- **2026-07-29** — Phase 1 decomposed into 6 ordered features (F1–F6).
  - F1 (foundation) kept as a **separate** feature, spec'd/gated on its own.
  - Today view kept as a **separate** feature (F3), not bundled into F2.
  - Voice capture ordered **last** (F6) — highest complexity, deferred until the
    typed-note loop is solid.
  - Approved by: user (arup.chowdhary@gmail.com).
- **2026-07-29** — **Gate passed (review-and-gate):** Phase 1 feature plan
  (F1–F6) reviewed against the phase-plan rubric and **approved** by the user
  to advance out of Backlog. Approved by: user (arup.chowdhary@gmail.com).
- **2026-07-29** — **Tech stack chosen (choose-tech-stack):**
  **React Native + Expo (TypeScript)** — one codebase for Android (primary,
  ~90%) with a real-DOM web path for Phase 3, first-class voice + notifications,
  and Expo/EAS cloud builds and Play submission. Chosen over Flutter
  (canvas-rendered web, Dart-only backend) and Kotlin Multiplatform (immature
  Compose web). User is unfamiliar with all three, so build/distribution ease
  and the web path drove the choice.
  - Distribution: Android via signed `.aab` to Google Play (EAS Build + Submit);
    web (Phase 3) via `expo export` to static hosting.
  - **Proposed companion libs — NOT yet locked, confirm at F1 spec/plan:** local
    DB `expo-sqlite` + Drizzle ORM; voice `expo-speech-recognition`;
    notifications (Phase 2) `expo-notifications`.
  - Approved by: user (arup.chowdhary@gmail.com).

- **Now:** F7–F11 are Done. F7–F10 are merged to `master` (F10's PR #14
  merged 2026-09-10). **F11 (Task recurrence) is Done** but not yet
  committed/merged — still on branch `feature/task-recurrance`. F12
  (reminders & snooze) remains in Backlog, the last Phase 2 feature.
- **Next:** Commit F11's changes and open a PR to `master`.
- **Workflow:** Each feature is built on its **own branch in a separate Claude
  Code session**; planning/decisions are tracked here on
  `feature/create-features`.
