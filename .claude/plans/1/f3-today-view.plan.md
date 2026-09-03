# Technical Plan: Today View (Phase 1 · F3)

## References
- Spec: `.claude/specs/1-f3-today-view.md` (approved, gated 2026-09-03).
- Builds on F1 (`src/db/schema.ts`, `src/db/dayRange.ts`, `src/db/client.ts`) and
  F2 (`src/app/index.tsx` current inline list/empty-state, `src/db/notes.ts`).

## Data model
No schema or migration changes. Reuses:
- `Note` type from `src/db/schema.ts` (`id`, `text`, `createdAt`, `updatedAt`).
- `notesForDayQuery(date)` / `useLiveQuery` from `src/db/notes.ts` — unchanged,
  still the sole read path.
- `startOfDay(date)` from `src/db/dayRange.ts` — reused (not reimplemented) as
  the "same calendar day" equality check inside the new date-formatting helper,
  per the spec's "do not duplicate day-boundary logic" rule.

## Modules / components

| File | Type | Responsibility |
|---|---|---|
| `src/lib/formatDay.ts` | pure fn | `formatDayHeading(date, now?)` → heading string. |
| `src/lib/__tests__/formatDay.test.ts` | test | today vs. non-today cases. |
| `src/components/DayHeading.tsx` | presentational component | renders the heading label for a `Date`. |
| `src/components/NoteList.tsx` | presentational component | empty-state vs. `FlatList`, given a `notes` array. |
| `src/components/__tests__/NoteList.test.tsx` | test | empty / populated / order-preserved. |
| `src/app/index.tsx` | screen | composes `DayHeading` + `NoteList` + existing `NoteComposer`; owns the live query and `today` value. |

`index.tsx` computes `const today = new Date()` once per render and passes the
same value to both `notesForDayQuery(today)` and `<DayHeading date={today} />`,
so the heading and the list are always in sync within a render. No new state,
no navigation — `today` is always "now" in this feature (F5 will replace this
with a selected date).

## APIs / interfaces (internal only — no Phase 3 surface)

```ts
// src/lib/formatDay.ts
export function formatDayHeading(date: Date, now?: Date): string;
// now defaults to `new Date()` at call time. Callers that need determinism
// (tests, and any future F5 reuse comparing a browsed date) pass `now` explicitly.

// src/components/DayHeading.tsx
interface DayHeadingProps { date: Date }
export function DayHeading({ date }: DayHeadingProps): JSX.Element;

// src/components/NoteList.tsx
interface NoteListProps { notes: Note[] }
export function NoteList({ notes }: NoteListProps): JSX.Element;
// Renders in the order given — does not sort. Ordering is the caller's
// responsibility (notesForDayQuery already orders newest-first).
```

`formatDayHeading` logic: `isToday = startOfDay(date) === startOfDay(now)`;
format `date` with `Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })`
(device locale/timezone, no hardcoded locale); return `` `Today, ${formatted}` ``
when `isToday`, else the plain `formatted` string.

## Dependencies
None. Confirms the spec's "No new dependencies" — built entirely on RN core
(`Text`, `View`, `FlatList`) and the JS `Intl` API already used implicitly by
the Hermes runtime.

## Implementation steps
Each step is small and independently verifiable; the DoD item(s) it satisfies
are noted.

1. **Add `formatDayHeading`** in `src/lib/formatDay.ts`, importing `startOfDay`
   from `@/db/dayRange` for the same-day check. *(DoD 1, 2)*
2. **Test it** — `src/lib/__tests__/formatDay.test.ts`: fixed `now`, same-day
   `date` at a different time → `"Today, …"`; a `date` on a different calendar
   day → plain formatted date (no `"Today"` prefix). *(DoD 5)*
3. **Add `DayHeading`** component rendering `formatDayHeading(date)` in a
   `Text`, with light padding — no other chrome. *(DoD 1)*
4. **Add `NoteList`** component: move the current `emptyState`/`FlatList`
   JSX and its styles out of `index.tsx` verbatim, parameterized on a `notes`
   prop instead of the live-query result directly. No behavior change. *(DoD 3)*
5. **Test it** — `src/components/__tests__/NoteList.test.tsx`:
   - empty array → empty-state text renders, no list.
   - populated array (2+ notes, deliberately passed **out of chronological
     order**) → both notes' text render **in the given order** (proves no
     re-sort). *(DoD 4)*
6. **Rewire `index.tsx`**: compute `today`, render `<DayHeading date={today} />`
   then `<NoteList notes={notes} />` inside the existing `listArea` wrapper,
   keep `NoteComposer` wiring unchanged, delete the now-unused inline
   empty-state/list styles. *(DoD 3, 6)*
7. **Grep check**: confirm no date-nav control, no edit/delete affordance, no
   voice button, no HTTP/auth client anywhere in the diff. *(DoD 7, 10)*
8. **Run quality gates**: `npm test`, `npm run typecheck`, `npm run lint`,
   `npm run format:check`. *(DoD 8, 9)*
9. **On-device Android check**: launch the app, confirm the heading shows the
   correct current date and the list/composer behave exactly as before (empty
   state, live insert, ordering). *(DoD 2, 3)*
10. **Docs**: update `CLAUDE.md` Status and flip F3's `PROGRESS.md` row to
    `Impl` once steps 1–9 are verified (not part of the code diff itself).

## Testing approach
- **Unit (headless, Jest):** `formatDay.test.ts` proves the today/non-today
  branching without rendering anything — deterministic via an explicit `now`.
- **Component (Jest + `@testing-library/react-native`, already a project
  dependency since F2):** `NoteList.test.tsx` proves empty state, populated
  rendering, and order-preservation without a live DB, following the same
  pattern already established by `NoteComposer.test.tsx`.
- **Static:** `tsc --noEmit`, `expo lint`, Prettier — unchanged commands, must
  stay clean.
- **Manual/grep (DoD 6, 7, 10):** no automated test enforces "`index.tsx` stays
  thin" or "no forbidden surface" — these are verified by inspection/grep at
  step 7, consistent with how F1/F2 verified their equivalent DoD items.
- **On-device:** one manual Android run to confirm the heading's real-device
  date/locale rendering and that the composer/list interaction is unchanged.

## Risks / tradeoffs
- **Locale-dependent heading format:** `Intl.DateTimeFormat(undefined, …)` uses
  the device's locale, so exact wording varies by device (e.g. "3 Sep" vs.
  "Sep 3"). Accepted — the spec only requires *a* clear day label, not a fixed
  format, and hardcoding a locale would be worse for a real device.
  Mitigation: none needed; if this ever needs to be pinned, an explicit
  `expo-localization` dependency would be a separate, later decision.
- **`formatDayHeading`'s default `now = new Date()`:** makes the function
  impure when called without `now`, which is intentional at the `DayHeading`
  call site (always "current time") but means the unit test must always pass
  `now` explicitly to stay deterministic — noted directly in the function's
  usage, not just the test.
- **Layout regression risk:** `KeyboardAvoidingView`'s flex chain currently
  relies on `listArea` (`flex: 1`) wrapping the list. Extracting `NoteList`
  must preserve that flex behavior (kept on the wrapper in `index.tsx`, not
  moved into `NoteList` itself) or the composer could stop pinning correctly.
  Mitigation: verified in the on-device check (step 9), not just headlessly.
- **Building on ungated F1/F2:** F1 and F2 implementations haven't passed their
  on-device gate yet. F3 only touches presentation (composing existing query/
  component surfaces), not schema or persistence logic, so the blast radius of
  any later F1/F2 gate findings on F3 is low — but this is a carried-over risk
  the user explicitly accepted at the F3 spec gate (2026-09-03), not one this
  plan resolves.
