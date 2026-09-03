# Spec: Today View (Phase 1 · F3)

## Overview
F3 gives the Today screen an explicit **day identity** and makes its note list
a proper, tested unit of its own. F1 built the shell and F2 filled it with the
real capture flow — as a side effect, F2 already renders today's notes as a
live, newest-first list with an empty state. What F3 adds on top of that is:
a **visible day heading** (e.g. "Today, Sep 3") so the screen states which day
it is showing, and an **extracted, dedicated `NoteList` component** with its
own tests for empty/populated/ordering behavior (currently only covered
incidentally by the composer flow). The heading exists specifically to give
F5 (day/week/month browsing) a concrete place to swap in a different date
later — F3 does **not** add navigation itself, just the identity the next
feature will attach controls to. No new interactions, no editing, no voice.

## Depends on
- **F1 — App foundation & local storage (Impl, pending on-device gate):**
  provides the Expo Router app, the `notes` schema/migration, `db/client.ts`,
  and `dayRange.ts` (`startOfDay`/`endOfDay` bounds).
- **F2 — Typed note capture (Impl, pending on-device gate):** provides the
  pinned `NoteComposer`, `insertNote`, `notesForDayQuery`, and the Today
  screen's current list + empty-state rendering that F3 extracts and extends.
- F3 does not depend on F4 (edit), F5 (time-based browsing), or F6 (voice) —
  they depend on F3, not the reverse. F5 in particular will reuse F3's day
  heading as the place to attach day/week/month navigation.

## Files to change
- `src/app/index.tsx` — replace the inline empty-state/`FlatList` block with
  the new `DayHeading` + extracted `NoteList` components; screen stays thin
  (owns the live query + composer wiring, not list rendering).
- `CLAUDE.md` — update the **Status** section once F3 lands.
- `PROGRESS.md` — advance F3 through the pipeline stages and record the gate
  approval in the decision log (tracked as F3 progresses, not part of the code
  diff).

## Files to create
Exact paths are settled in the technical plan; F3 should include:

- **A day-heading component** (e.g. `src/components/DayHeading.tsx`) — renders
  a formatted label for a given `Date` (e.g. "Today, Sep 3"; a non-today date
  falls back to a plain formatted date, in prep for F5 reusing it). Pure
  presentational component, takes a `Date` prop.
- **A date-formatting helper** (e.g. `src/lib/formatDay.ts`) — pure function
  turning a `Date` (+ "now") into the heading string ("Today" vs. formatted
  date), unit-testable without rendering.
- **A note-list component** (e.g. `src/components/NoteList.tsx`) — owns the
  empty-state vs. `FlatList` branching currently inline in `index.tsx`; takes
  the notes array as a prop so it is renderable/testable in isolation from the
  live query.
- **Tests** — `src/lib/__tests__/formatDay.test.ts` (today vs. other dates) and
  `src/components/__tests__/NoteList.test.tsx` (empty state renders, populated
  state renders each note's text, newest-first order is preserved as given).

## New dependencies
No new dependencies. Date formatting uses built-in `Date`/`Intl` APIs already
available in the Hermes/Expo runtime; list/empty-state rendering reuses
existing React Native primitives (`FlatList`, `View`, `Text`).

## Rules for implementation
- **Minimalism (minimalism-guard):** the heading is a **label only** — no tap
  target, no icon, no settings. Do not add sorting controls, filters, counts,
  or any chrome beyond the date label and the existing list/composer.
- **Reuse F1/F2 seams:** read via the existing `notesForDayQuery` +
  `useLiveQuery`; do not introduce a second query path or duplicate the day
  boundary logic already in `dayRange.ts`.
- **No navigation:** the heading always reflects "today" (`new Date()`) in
  this feature — no prev/next day controls, no date picker. That is F5.
- **No editing, delete, or voice:** notes remain read-only display + capture
  only; F4/F6 are out of scope.
- **Local-first only:** no network/backend/auth/sync code.
- **Android is the target surface:** verify on Android; keep code
  cross-platform (no Android-only APIs) but do not build/verify web.
- **Keep `index.tsx` thin:** it wires the live query and composer; list and
  heading rendering/logic live in their own components so they're unit
  testable without a live DB.

## Definition of done
Each item is verifiable by running the app or the test suite:

1. **Day heading renders:** the Today screen shows a visible heading stating
   the current day (e.g. "Today, Sep 3") above the note list.
2. **Heading is correct per device date:** the displayed date matches the
   device's current local date (verified by the `formatDay` unit test and a
   manual on-device check).
3. **List behavior unchanged for the user:** today's notes still render
   newest-first, live-updating on capture, with the existing empty state when
   there are none — behavior is identical to pre-F3, now via `NoteList`.
4. **NoteList is a standalone, tested component:** `NoteList` takes a notes
   array prop and is covered by tests for empty state, populated state (each
   note's text renders), and that it preserves the order it is given (does not
   re-sort).
5. **formatDay is unit tested:** a dedicated test covers "today" producing a
   "Today, …" label and a non-today date producing a plain formatted date.
6. **`index.tsx` stays thin:** the screen file contains the live query,
   composer wiring, and composition of `DayHeading` + `NoteList` — no inline
   empty-state/list-rendering JSX remains there (grep-checkable).
7. **No new interactions:** no date-navigation control, no edit/delete
   affordance, no voice button anywhere in the diff (grep-checkable).
8. **Test suite passes:** `npm test` passes, including the two new test files.
9. **Quality gates pass:** `npm run typecheck`, `npm run lint`, and
   `npm run format:check` all run clean.
10. **No forbidden surface:** no network/backend/auth/sync code introduced
    (grep-checkable: no HTTP client, no auth SDK).
