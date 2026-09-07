# Spec: Time-Based Browsing (Phase 1 · F5)

## Overview
F5 turns the Today screen into a full day/week/month **browser**. F3 gave the
screen a day heading explicitly so a later feature could attach navigation to
it — F5 is that feature. The screen gains **prev/next arrows** on the heading
to step through time, a **tap-to-jump-to-today** affordance on the heading
label itself, and a **segmented Day/Week/Month control** to change
granularity. Day view is unchanged in substance (still a flat, newest-first
list) but is now navigable instead of always showing today. Week and month
views render notes **grouped by day** (a sub-heading per day that has notes;
days with none are omitted) rather than as a flat list, since a week/month of
notes read better broken up by day. Editing (F4's long-press-to-edit) keeps
working identically in every view — F5 adds navigation and layout, not a new
editing model. No calendar grid, no date picker, no year view (year browsing
is task-only, per `ideas-refined.md`, and out of scope for notes).

## Depends on
- **F3 — Today view:** provides `DayHeading` (the attachment point for nav),
  `formatDayHeading`, the extracted `NoteList`, and `dayRange.ts`
  (`startOfDay`/`endOfDay`) that F5's week/month range helpers follow the same
  pattern as.
- **F4 — Edit note:** provides `NoteList`'s long-press-to-edit behavior and
  `updateNoteText`, which F5 reuses unchanged in every granularity — editing
  is not re-implemented for week/month.
- F5 does not depend on F6 (voice) — it is independent of, and unaffected by,
  this feature.

## Files to change
- `src/app/index.tsx` — replace the hardcoded `today = new Date()` with
  browsing state (current granularity + anchor date); compose the new
  header/nav component and switch between `NoteList` (day) and the new
  grouped view (week/month) based on granularity. Screen stays thin: it owns
  browsing state and query wiring, not rendering logic.
- `src/db/notes.ts` — generalize the day-only query into range-based queries
  reusable for day/week/month (e.g. a shared `notesForRangeQuery(start, end)`
  that `notesForDayQuery`, a new `notesForWeekQuery`, and a new
  `notesForMonthQuery` build on), so there is one query path, not three
  hand-duplicated ones.
- `src/components/DayHeading.tsx` — extend with prev/next arrows, tap-label-
  to-jump-to-today, and the Day/Week/Month segmented control; or split into a
  small composed header (exact shape settled in the technical plan) as long
  as F3's "label states which range is showing" intent is preserved for all
  three granularities.
- `CLAUDE.md` — update the **Status** section once F5 lands.
- `PROGRESS.md` — advance F5 through the pipeline stages and record the gate
  approval in the decision log as F5 progresses (tracked separately from the
  code diff).

## Files to create
Exact paths/names are settled in the technical plan; F5 should include:

- **Week and month range helpers** (e.g. `src/db/weekRange.ts`,
  `src/db/monthRange.ts`), mirroring `dayRange.ts`'s
  `startOf.../endOf...` shape — pure functions returning inclusive
  epoch-millisecond bounds for the calendar week/month containing a given
  `Date`. **Week starts on Sunday** (matches `Date.getDay()`'s `0`, keeping
  the helper dependency-free); flag this assumption for review since it's a
  UX call, not just an implementation detail.
- **Week and month heading formatters** (e.g. `src/lib/formatWeek.ts`,
  `src/lib/formatMonth.ts`), mirroring `formatDay.ts` — pure functions turning
  a `Date` (+ "now") into a label: `"This Week"` / `"This Month"` when the
  range contains today, otherwise a plain range/month label (e.g.
  `"Sep 1 – Sep 7"`, `"September 2026"`).
- **A day-grouping helper** (e.g. `src/lib/groupNotesByDay.ts`) — pure
  function taking a notes array (already fetched for a week/month range) and
  returning ordered per-day groups (day start timestamp + that day's notes,
  newest-first within the day), omitting days with zero notes. Unit-testable
  without rendering.
- **A grouped list component** (e.g. `src/components/GroupedNoteList.tsx`) —
  renders the day groups from `groupNotesByDay` as a sectioned list (a day
  sub-heading per group, e.g. via React Native's `SectionList`), reusing the
  same note-row rendering and long-press-to-edit behavior `NoteList` already
  has — factor that row logic into a shared piece rather than duplicating it,
  so edit behavior cannot drift between day and week/month views. Shows a
  "No notes this week/this month" empty state when every day in range is
  empty.
- **A header/nav component** (e.g. `src/components/BrowseHeader.tsx`) — the
  heading label (delegating to `formatDayHeading`/`formatWeek`/`formatMonth`
  per current granularity) plus prev/next arrows, tap-label-to-jump-to-today,
  and the Day/Week/Month segmented control. May replace or wrap
  `DayHeading.tsx`; the technical plan decides which.
- **Tests** for every pure helper above (`weekRange`, `monthRange`,
  `formatWeek`, `formatMonth`, `groupNotesByDay`) and for the new/extended
  components (`GroupedNoteList` empty/populated/grouping/edit-passthrough;
  the header's arrow-navigation, jump-to-today, and granularity-switch
  behavior).

## New dependencies
No new dependencies. Week/month bounds and labels use built-in `Date`/`Intl`
APIs, matching F3's approach; day-grouping for week/month uses React Native's
built-in `SectionList`.

## Rules for implementation
- **Minimalism (minimalism-guard):** no calendar grid, no date picker/modal,
  no "go to date" search, no year view for notes. The only new UI is: two
  small arrow tap targets, a tap-to-today label, and a three-way segmented
  control. Day sub-headings in week/month views are labels only (no per-day
  controls).
- **One query path per granularity, not three:** day/week/month queries share
  a single range-based implementation (see Files to change); do not
  hand-write three separate `db.select()...where(...)` blocks.
- **Reuse F4's edit behavior verbatim:** long-press-to-edit, auto-save-on-
  blur, revert-on-empty, and `updateNoteText` are not re-implemented for
  week/month — factor shared logic so day and grouped views call the same
  code path.
- **Granularity switch preserves the anchor date:** switching Day → Week →
  Month (in either direction) keeps browsing around the currently-viewed
  date — e.g. viewing Sep 12 in day view, then switching to Week, shows the
  week containing Sep 12, not the current real-world week. It does **not**
  reset to today.
- **Jump-to-today resets both the anchor date and (implicitly) the visible
  range**, but does **not** change the selected granularity.
- **No bounds on navigation:** prev/next may browse to dates with no notes
  (shown via the existing/new empty states); do not clamp navigation to a
  min/max range.
- **Local-first only:** no network/backend/auth/sync code.
- **Android is the target surface:** verify on Android; keep code
  cross-platform (no Android-only APIs) but do not build/verify web.
- **Keep `index.tsx` thin:** it owns browsing state (granularity + anchor
  date) and the live query for the current range; header and list
  rendering/logic live in their own components.

## Definition of done
Each item is verifiable by running the app or the test suite:

1. **Day view navigable:** on the default (day) view, tapping the prev/next
   arrows moves the shown date back/forward one day at a time; the heading
   and note list update to match (live query re-scoped to the new day).
2. **Today unchanged as the default:** opening the app still shows today's
   notes first, exactly as before F5.
3. **Jump to today:** tapping the heading label while viewing any other day
   (or any week/month not containing today) returns to today's date without
   changing the current granularity.
4. **Week view groups by day:** selecting "Week" shows every note created in
   the calendar week containing the current anchor date, grouped under a
   sub-heading per day that has at least one note (days with none are not
   shown), newest-first within each day; an entirely-empty week shows a
   "No notes this week" (or equivalent) empty state.
5. **Month view groups by day:** selecting "Month" behaves like week view but
   scoped to the calendar month containing the anchor date.
6. **Week/month navigable:** prev/next arrows in week view move by one
   calendar week; in month view, by one calendar month.
7. **Granularity switch preserves context:** switching granularity while
   browsing a non-today date keeps the same anchor date (per the rule above),
   verified for all six switch directions (day↔week, day↔month, week↔month).
8. **Editing works in every view:** long-pressing a note in day, week, or
   month view enters inline edit exactly as in F4 (pre-filled text, auto-save
   on blur, revert on empty), backed by the same `updateNoteText`.
9. **Pure helpers unit tested:** dedicated tests cover `weekRange`/
   `monthRange` bounds, `formatWeek`/`formatMonth` labels (in-range vs.
   out-of-range case each), and `groupNotesByDay` (grouping, ordering, empty
   days omitted).
10. **`index.tsx` stays thin:** the screen file contains browsing state, live
    query wiring, and composition of the header + list components — no
    inline range-computation or grouping logic (grep-checkable).
11. **No forbidden surface:** no calendar-grid component, no date-picker
    dependency, no network/backend/auth/sync code introduced
    (grep-checkable).
12. **Test suite passes:** `npm test` passes, including all new/updated test
    files.
13. **Quality gates pass:** `npm run typecheck`, `npm run lint`, and
    `npm run format:check` all run clean.
14. **On-device verification:** on an Android device/emulator — step forward
    and back through several days; switch to Week and Month and confirm
    grouping/navigation; switch granularity mid-browse and confirm the anchor
    date is preserved; tap the heading to jump back to today; long-press and
    edit a note in both a grouped (week/month) view and day view, confirming
    the change persists after an app force-stop + relaunch.
