# Spec: App Foundation & Local Storage (Phase 1 · F1)

## Overview
F1 stands up the **cross-platform app skeleton** for Pocket Notebook: an
Expo-managed React Native (TypeScript) project that builds and runs on Android,
with the **on-device database wired end-to-end** and a **minimal runnable app
shell** (a Today view) that proves the toolchain from source to a running screen.
It is the foundation every later Phase 1 feature (typed note capture, Today view,
edit, time-based browsing, voice) lands on. It exists first because the tech
stack is now decided (React Native + Expo, 2026-07-29) and no feature can be
built until there is a project to build it in, a persistence layer to save into,
and a proven build/run loop on the primary Android surface. F1 delivers
**structure, not features** — it ships no note-capture UX of its own beyond an
empty shell that reads from the database.

## Depends on
- **`choose-tech-stack` — DONE (gated, approved 2026-07-29):** React Native +
  Expo (TypeScript). This is the sole prerequisite.
- Companion libraries were **proposed but explicitly not locked** in the tech
  decision (see PROGRESS.md decision log) and are to be **confirmed in this
  spec/plan** — see *New dependencies* and *Open questions*.
- No dependency on any other F-feature; F1 is the root of the Phase 1 chain.

## Files to change
- `CLAUDE.md` — update the **Status** section (currently "no application code
  exists yet") to reflect that the scaffold exists, and add the build / run /
  test commands once they work.
- `PROGRESS.md` — advance F1 through the pipeline stages and record the
  companion-library confirmations in the decision log (done as F1 progresses,
  not part of the code diff).
- `.gitignore` — extend with the Expo / React Native / Node ignores
  (`node_modules/`, `.expo/`, build artefacts, `*.log`, native build folders) if
  not already covered.
- `README.md` — replace the placeholder with a short "how to run" pointer.

## Files to create
Exact paths are settled in the technical plan; the foundation must include:

- **Project manifests & tooling** — `package.json`, `app.json` / `app.config.ts`,
  `tsconfig.json`, `babel.config.js`, `metro.config.js`, and lint/format config
  (ESLint + Prettier).
- **App entry & shell** — the Expo entry point and a root component that renders
  a single **Today view** screen (empty state + list bound to the DB).
- **Navigation scaffold** — a minimal navigation container ready to grow into
  day/week/month views (one route registered: Today).
- **Local storage layer** —
  - a database bootstrap/connection module,
  - an **initial schema + migration** for the `notes` table (the minimum needed
    to prove persistence; task fields are Phase 2),
  - a small data-access module exposing `insertNote` / `listNotesForDay` (or
    equivalent) used by the shell to demonstrate a real read/write round-trip.
- **A smoke test** — one automated test that opens the DB, writes a row, reads it
  back, and asserts equality, proving the persistence layer works headlessly.

## New dependencies
This project is **npm/Expo**, not pip. Proposed set, **to be confirmed before
implementation** (from the tech-stack decision log, marked "not yet locked"):

| Purpose | Proposed | Status |
|---|---|---|
| App framework | `expo`, `react`, `react-native` | Locked (stack decision) |
| Language/types | `typescript`, `@types/*` | Locked |
| Local DB engine | `expo-sqlite` | **Confirm** |
| ORM / query + migrations | `drizzle-orm` (+ `drizzle-kit` dev) | **Confirm** |
| Navigation | `expo-router` **or** `@react-navigation/*` | **Confirm** |
| Lint/format | `eslint`, `prettier`, Expo lint config | Confirm |
| Test runner | `jest` + `jest-expo` (+ RN testing library) | Confirm |

Voice (`expo-speech-recognition`) and notifications (`expo-notifications`) are
**out of scope for F1** — added in F6 and Phase 2 respectively.

## Rules for implementation
- **Stack is fixed:** Expo-managed React Native + TypeScript. Do not eject to
  bare workflow, and do not introduce a different framework.
- **No feature creep (minimalism-guard):** F1 ships an app *shell*, not note
  capture. The Today screen shows an empty state and (if any rows exist) a plain
  list of note text — no titles, no metadata, no add-UX beyond what a smoke
  test/dev seed needs. Resist adding fields, settings, or chrome.
- **Local-first only:** on-device database exclusively. **No network, backend,
  auth, or sync code** — that is Phase 3.
- **Sync-ready schema:** even though sync is Phase 3, the `notes` schema must use
  a **globally-unique stable ID** (e.g. UUID/text PK), a `created_at`, and an
  `updated_at`, so the Phase 3 syncable backend does not force a painful rewrite
  (per `local-storage`). Keep the schema otherwise minimal.
- **Migrations from day one:** schema is created via a versioned migration, not
  ad-hoc `CREATE TABLE` at startup, so later schema changes have a path.
- **Android is the target surface:** the runnable-on-Android check is the
  definition of "it works." Keep the code web-ready (avoid Android-only APIs
  where a cross-platform one exists) but **do not build or verify web** — that is
  Phase 3.
- **Confirm the unlocked libraries** (DB, ORM, navigation) with the user before
  installing, since the tech decision left them open.
- **Prove the toolchain end-to-end:** a real DB write→read must surface in the
  running app and be covered by the smoke test; a shell that renders but never
  touches the DB does not satisfy F1.

## Definition of done
Each item is verifiable by running the app or the test suite:

1. **Installs clean:** `npm install` completes with no errors on a fresh
   checkout.
2. **Runs on Android:** `npx expo run:android` (or `expo start` → Android via
   Expo Go / dev build) launches the app to the **Today** screen without a
   crash.
3. **Empty state renders:** with an empty database, the Today screen shows a
   clear empty state (no error, no crash).
4. **Persistence round-trips in-app:** inserting a note (via a dev seed / smoke
   path) and reloading shows that note's text in the Today list, and it
   **survives an app restart** (data is on-device, not in memory).
5. **Schema is sync-ready:** the `notes` table has a globally-unique text/UUID
   primary key plus `created_at` and `updated_at` columns, created via a
   versioned migration (inspectable in the migration file).
6. **Smoke test passes:** `npm test` runs and the storage smoke test
   (open → write → read → assert) passes.
7. **Lint/format pass:** the configured lint/format command runs clean on the
   scaffold.
8. **Docs updated:** `CLAUDE.md` Status section and `README.md` describe how to
   install, run (Android), and test the app, and the commands work as written.
9. **No forbidden surface:** no network/backend/auth/sync code, and no
   note-capture feature UI beyond the shell (grep-checkable: no HTTP client, no
   auth SDK).
