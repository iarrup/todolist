# Implementation Plan: F5 — Time-Based Browsing

## Context

Phase 1 ("Notes") has shipped F1–F4: local SQLite storage, typed note capture,
a Today view with a day heading, and inline long-press editing. The Today
screen has always hardcoded `today = new Date()` — F3's `DayHeading` was
built explicitly as "a concrete place to attach navigation" for a later
feature. F5 is that feature: it turns the single Today screen into a
day/week/month **browser** — prev/next navigation, jump-to-today, a
Day/Week/Month granularity switch, and (for week/month) a day-grouped list
instead of a flat one — while leaving capture and editing untouched.

Full requirements live in the approved spec:
`.claude/specs/1-f5-time-based-browsing.md`. This plan implements it exactly;
where the spec left a UX call open, the resolved decision is noted inline.

**Decisions confirmed with the user for this plan:**
- The nav-bar title (`_layout.tsx`, currently static `"Today"`) is **left
  unchanged** — the in-screen `BrowseHeader` always shows the correct label,
  and touching `_layout.tsx` isn't in the spec's file list.
- Week/month range labels **always repeat the month on both ends** (e.g.
  `"Sep 1 – Sep 7"`, `"Aug 30 – Sep 5"` for a week spanning two months) —
  matches the spec's literal example, no same-month collapsing logic.

No new dependencies. No calendar grid, no date picker — navigation is
arrows + tap-to-today + a segmented control, per the spec's minimalism rule.

## Approach

Bottom-up: pure date-math helpers first (independently unit-testable, no
rendering, no DB), then the DB query layer, then components, then wire
`index.tsx` last. This mirrors how F3/F4 were built and keeps every layer
testable in isolation before the next depends on it.

**Key design calls (from the technical design pass):**
- `src/db/notes.ts` gets one shared `notesForRangeQuery(start, end)` that
  `notesForDayQuery`/`notesForWeekQuery`/`notesForMonthQuery` all call, plus
  a `notesForGranularityQuery(granularity, date)` dispatcher — so
  `index.tsx` never contains a switch over query builders (keeps the spec's
  DoD 10/11 grep-checks clean).
- Long-press-edit state/logic (F4) is extracted **once** into a hook
  (`useNoteEditing`) and a row component (`NoteRow`), reused by both the
  existing flat `NoteList` (day view) and the new `GroupedNoteList`
  (week/month), so edit behavior cannot drift between views. `NoteList.tsx`'s
  refactor is a pure mechanical extraction — `NoteList.test.tsx` needs zero
  changes and must still pass unmodified.
- `GroupedNoteList`'s day sub-headings reuse `formatDayHeading` directly
  (the pure function F3 already built) — a day inside a browsed week/month
  that happens to be today shows "Today, Sep 3" for free.
- `DayHeading.tsx` is **replaced** by `BrowseHeader.tsx`, not wrapped — it's
  a single presentational `<Text>` with no `onPress` to bolt onto, is only
  imported by `index.tsx`, and has no dedicated test file, so removing it is
  a clean, regression-free swap. Its useful part (`formatDayHeading`) is kept
  and reused directly.
- Month-stepping (prev/next in month granularity) clamps the day-of-month to
  the target month's last valid day, instead of letting native `Date`
  arithmetic overflow (e.g. Jan 31 + 1 month must land in Feb, not roll into
  March) — the spec calls this out explicitly as a required edge case.
- New shared type `Granularity = 'day' | 'week' | 'month'` in
  `src/lib/granularity.ts`, imported by `db/notes.ts`, `lib/stepDate.ts`,
  `components/BrowseHeader.tsx`, `components/GroupedNoteList.tsx`, and
  `app/index.tsx`.
- `useNoteEditing` lives in a new `src/hooks/` directory (first hook in the
  app) — cleaner than mixing a stateful hook into `src/lib/`, which is
  otherwise pure functions only.
- No `listNotesForWeek`/`listNotesForMonth` async wrappers — nothing
  consumes them (`useLiveQuery` wants the un-executed query builder, not a
  `Promise`), and `listNotesForDay`'s only current consumer is its own test
  file's convention docs; adding unused symmetry violates the "don't add
  unless needed" rule.
- No dedicated `NoteRow.test.tsx` / `useNoteEditing.test.ts` — edit behavior
  is covered end-to-end via `NoteList.test.tsx` (unchanged) and
  `GroupedNoteList.test.tsx`'s edit-passthrough case, consistent with how F4
  tested edit behavior only at the list level, not the row level.
- `stickySectionHeadersEnabled={false}` on the week/month `SectionList` — a
  plain, non-sticky scroll matches the minimal, chrome-free feel used
  elsewhere.

## Files to create

1. **`src/lib/granularity.ts`** — `export type Granularity = 'day' | 'week' | 'month';`

2. **`src/db/weekRange.ts`** — mirrors `dayRange.ts`. Sunday-start weeks
   (`Date.getDay() === 0`):
   ```ts
   export function startOfWeek(date: Date): number {
     const d = new Date(date);
     d.setDate(d.getDate() - d.getDay());
     d.setHours(0, 0, 0, 0);
     return d.getTime();
   }
   export function endOfWeek(date: Date): number {
     const d = new Date(date);
     d.setDate(d.getDate() - d.getDay() + 6);
     d.setHours(23, 59, 59, 999);
     return d.getTime();
   }
   ```

3. **`src/db/monthRange.ts`**:
   ```ts
   export function startOfMonth(date: Date): number {
     return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0).getTime();
   }
   export function endOfMonth(date: Date): number {
     return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
   }
   ```

4. **`src/lib/formatWeek.ts`** — mirrors `formatDay.ts`'s `(date, now = new Date())` shape:
   `"This Week"` when `startOfWeek(date) === startOfWeek(now)`, else
   `"<short start> – <short end>"` (always both months shown, per the
   confirmed decision), using `Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })`.

5. **`src/lib/formatMonth.ts`** — same shape: `"This Month"` when
   `startOfMonth(date) === startOfMonth(now)`, else
   `Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)`
   (e.g. `"September 2026"`).

6. **`src/lib/stepDate.ts`** — the prev/next stepper:
   ```ts
   import type { Granularity } from './granularity';

   export function stepDate(date: Date, granularity: Granularity, direction: -1 | 1): Date {
     if (granularity === 'day') {
       const d = new Date(date);
       d.setDate(d.getDate() + direction);
       return d;
     }
     if (granularity === 'week') {
       const d = new Date(date);
       d.setDate(d.getDate() + direction * 7);
       return d;
     }
     return stepMonth(date, direction);
   }

   function stepMonth(date: Date, direction: -1 | 1): Date {
     const targetMonth = date.getMonth() + direction;
     const lastDayOfTargetMonth = new Date(date.getFullYear(), targetMonth + 1, 0).getDate();
     const clampedDay = Math.min(date.getDate(), lastDayOfTargetMonth);
     return new Date(
       date.getFullYear(), targetMonth, clampedDay,
       date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds(),
     );
   }
   ```
   Worked edge case: `stepDate(new Date(2026,0,31), 'month', 1)` → Feb has 28
   days in 2026 → clamps to **Feb 28**, not rolling into March. `new
   Date(year, month, ...)` handles month <0 or ≥12 by rolling the year on its
   own, so no separate year-boundary branch is needed. (Known, accepted
   asymmetry: stepping back from Feb 28 lands on Jan 28, not Jan 31 — matches
   common calendar-app behavior, not a bug.)

7. **`src/lib/groupNotesByDay.ts`**:
   ```ts
   import { startOfDay } from '@/db/dayRange';
   import type { Note } from '@/db/schema';

   export interface NoteDayGroup {
     dayStart: number;
     notes: Note[];
   }

   export function groupNotesByDay(notes: Note[]): NoteDayGroup[] {
     const byDay = new Map<number, Note[]>();
     for (const note of notes) {
       const day = startOfDay(new Date(note.createdAt));
       const bucket = byDay.get(day);
       if (bucket) bucket.push(note);
       else byDay.set(day, [note]);
     }
     return Array.from(byDay, ([dayStart, dayNotes]) => ({
       dayStart,
       notes: [...dayNotes].sort((a, b) => b.createdAt - a.createdAt),
     })).sort((a, b) => b.dayStart - a.dayStart);
   }
   ```
   Groups and days are both explicitly sorted newest-first (not assumed
   pre-sorted from the query), so the function is independently correct and
   testable. A day with zero notes simply never produces a group.

8. **`src/hooks/useNoteEditing.ts`** — F4's edit state/logic, extracted
   verbatim (unchanged behavior) from today's `NoteList.tsx`:
   ```ts
   import { useState } from 'react';
   import type { Note } from '@/db/schema';
   import { normalizeNoteInput } from '@/lib/noteInput';

   export interface NoteEditingController {
     editingId: string | null;
     draftText: string;
     setDraftText: (text: string) => void;
     handleLongPress: (item: Note) => void;
     commitEdit: (id: string, text: string) => void;
   }

   export function useNoteEditing(onEditNote: (id: string, text: string) => void): NoteEditingController {
     const [editingId, setEditingId] = useState<string | null>(null);
     const [draftText, setDraftText] = useState('');

     function commitEdit(id: string, text: string) {
       const normalized = normalizeNoteInput(text);
       if (normalized !== null) onEditNote(id, normalized);
       setEditingId(null);
       setDraftText('');
     }

     function handleLongPress(item: Note) {
       if (editingId !== null && editingId !== item.id) commitEdit(editingId, draftText);
       setEditingId(item.id);
       setDraftText(item.text);
     }

     return { editingId, draftText, setDraftText, handleLongPress, commitEdit };
   }
   ```
   One hook instance per mounted list component enforces "only one note
   editable at a time" within that list, exactly as before (day and
   week/month views are mutually exclusive per screen, so this still holds
   app-wide).

9. **`src/components/NoteRow.tsx`** — the row markup extracted verbatim from
   `NoteList.tsx`'s current `renderItem`, same testIDs (`note-row-{id}`,
   `note-edit-input`, `note-text`), same styles, now parameterized by
   `note` + a `NoteEditingController`.

10. **`src/components/GroupedNoteList.tsx`** — `SectionList` over
    `groupNotesByDay(notes)`, `renderSectionHeader` using `formatDayHeading`
    on `section.dayStart`, `renderItem` using the shared `NoteRow`, one
    `useNoteEditing` instance, `stickySectionHeadersEnabled={false}`, an
    `emptyMessage` prop rendered when `notes.length === 0`.

11. **`src/components/BrowseHeader.tsx`** — presentational only (never
    computes dates itself, just invokes callbacks): prev/next arrows,
    tap-the-label-to-jump-to-today, a 3-way Day/Week/Month segmented
    control built from `Pressable`/`View`/`Text` (no new dependency).
    Heading text delegates to `formatDayHeading`/`formatWeekHeading`/
    `formatMonthHeading` based on the `granularity` prop. TestIDs:
    `browse-prev`, `browse-next`, `browse-heading`,
    `browse-granularity-day`, `browse-granularity-week`,
    `browse-granularity-month`.

12. **Tests** (all new):
    - `src/db/__tests__/weekRange.test.ts` — bounds for a mid-week date, a
      Sunday, and a Saturday.
    - `src/db/__tests__/monthRange.test.ts` — bounds for a mid-month date, a
      31-day month, and February in a leap vs. non-leap year.
    - `src/lib/__tests__/formatWeek.test.ts` — "This Week" case and an
      out-of-range case, asserting the always-repeat-month label format.
    - `src/lib/__tests__/formatMonth.test.ts` — "This Month" and an
      out-of-range `"September 2026"`-style case.
    - `src/lib/__tests__/stepDate.test.ts` — day ±1, week ±7 (including a
      month-boundary crossing), and month edge cases: Jan 31 → Feb (clamped),
      Mar 31 → Feb 28 backward, a leap-year Feb 29 case, and one unclamped
      mid-month step.
    - `src/lib/__tests__/groupNotesByDay.test.ts` — multiple notes across 3
      days → 3 groups, both groups and within-group notes newest-first even
      given shuffled input, a day with zero notes produces no group.
    - `src/components/__tests__/GroupedNoteList.test.tsx` — empty state
      renders `emptyMessage`; populated case renders one section header per
      day (day with no notes absent) with notes newest-first; edit-passthrough
      (long-press → edit → blur-commit) works identically to `NoteList`,
      same testIDs; only one row editable at a time across sections.
    - `src/components/__tests__/BrowseHeader.test.tsx` — correct heading
      label per granularity (fixed `anchorDate`/`now`, asserting real
      formatter output); tapping prev/next/heading/each segmented option
      invokes the right callback.

## Files to change

- **`src/db/notes.ts`** — add private `notesForRangeQuery(start, end)`;
  rewrite `notesForDayQuery` to call it with `startOfDay`/`endOfDay`; add
  `notesForWeekQuery`/`notesForMonthQuery` calling it with the new range
  helpers; add `notesForGranularityQuery(granularity, date)` dispatching to
  the three. `insertNote`, `listNotesForDay`, `updateNoteText` unchanged.

- **`src/db/__tests__/notes.test.ts`** — extend with local `listForWeek`/
  `listForMonth` reimplementations (same pattern as the existing
  `listForDay`, built on the real `weekRange`/`monthRange` pure helpers) and
  boundary-case tests: a note just inside vs. just outside a week boundary
  (Saturday vs. following Sunday), and a month boundary (last day of month
  vs. first of next).

- **`src/components/NoteList.tsx`** — refactor to use `useNoteEditing` +
  `NoteRow` instead of inline state/JSX; external props, behavior, and every
  testID stay identical. `NoteList.test.tsx` must pass with **no changes**.

- **`src/app/index.tsx`** — replace the hardcoded `today` with browsing
  state:
  ```tsx
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const { data: notes } = useLiveQuery(notesForGranularityQuery(granularity, anchorDate));

  function handlePrev() { setAnchorDate((d) => stepDate(d, granularity, -1)); }
  function handleNext() { setAnchorDate((d) => stepDate(d, granularity, 1)); }
  function handleJumpToToday() { setAnchorDate(new Date()); }
  function handleGranularityChange(g: Granularity) { setGranularity(g); } // anchorDate untouched
  ```
  Renders `BrowseHeader` (replacing `DayHeading`), then `NoteList` when
  `granularity === 'day'` else `GroupedNoteList` (with the right
  `emptyMessage`), then the unchanged `NoteComposer`. The Android
  keyboard-height tracking effect is untouched. `insertNote` keeps stamping
  `Date.now()` regardless of what's being browsed — capture is not scoped to
  the anchor date; that's existing, correct, out-of-scope behavior.

- **Delete `src/components/DayHeading.tsx`** — confirmed only imported by
  `index.tsx`, no dedicated test file; superseded by `BrowseHeader`.
  `formatDayHeading` (the pure function) is kept and reused directly.

- **`CLAUDE.md`** — update the Status section once F5 lands.
- **`PROGRESS.md`** — advance F5 through Plan → Impl → Done, with decision-
  log entries recording this plan's approval and later the implementation/
  gate outcomes, per the project's specs-driven pipeline.

## New dependencies

None. Confirmed no `SectionList` precedent existed before this (first use in
the app) but it's a built-in React Native component, not a new package. No
date/calendar library added — all week/month math is hand-rolled `Date`
arithmetic, consistent with `dayRange.ts`'s existing style.

## Ordered implementation steps

1. `src/lib/granularity.ts`.
2. `src/db/weekRange.ts` + test.
3. `src/db/monthRange.ts` + test.
4. `src/lib/formatWeek.ts` + test.
5. `src/lib/formatMonth.ts` + test.
6. `src/lib/stepDate.ts` + test.
7. `src/lib/groupNotesByDay.ts` + test.
8. Generalize `src/db/notes.ts`; extend `src/db/__tests__/notes.test.ts`.
9. Extract `src/hooks/useNoteEditing.ts` + `src/components/NoteRow.tsx`;
   refactor `NoteList.tsx`; confirm `NoteList.test.tsx` passes unmodified.
10. `src/components/GroupedNoteList.tsx` + test.
11. `src/components/BrowseHeader.tsx` + test; delete `DayHeading.tsx`.
12. Rewire `src/app/index.tsx`.
13. Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`;
    grep-check no range/grouping arithmetic remains in `index.tsx` and no
    calendar-grid/date-picker/network code was introduced (spec DoD 10, 11).
14. On-device verification (Android emulator/device) per spec DoD 14: step
    forward/back through several days; switch Day/Week/Month and confirm
    grouping + navigation; switch granularity mid-browse and confirm the
    anchor date is preserved; tap the heading to jump to today; long-press-
    edit a note in both a grouped view and day view; confirm edits survive a
    full app force-stop + relaunch.
15. Update `CLAUDE.md` and `PROGRESS.md`.

## Verification

- **Headless gates:** `npm test` (all new + existing suites green, including
  unmodified `NoteList.test.tsx`), `npm run typecheck`, `npm run lint`,
  `npm run format:check`.
- **Grep checks** (spec DoD 10/11): `index.tsx` contains no inline
  `startOf`/`endOf`/grouping logic; no new dependency, calendar-grid
  component, date-picker library, or network/auth code anywhere in the diff.
- **On-device (Android):** run through step 14 above manually — this is the
  only way to confirm the live-query re-scoping, segmented control, and
  edit-in-grouped-view behavior actually work end-to-end on-device, per this
  project's established F3/F4 verification pattern.
