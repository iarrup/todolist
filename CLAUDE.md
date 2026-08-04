# CLAUDE.md

Guidance for Claude Code when working in this repository. Read this first, then
read `ideas-refined.md` (the product source of truth) before doing anything.

## What this is

**Pocket Notebook** — a minimal, friction-free mobile app for capturing two
kinds of things on the go:

- **Notes** — any idea/thought/reminder that is *not* actionable.
- **Tasks (Todos)** — things the user intends to do (schedulable, recurring,
  with reminders).

The guiding principle is **minimalism**: capture should be instant, with no
titles or mandatory fields — just the content. See `ideas-refined.md` for full
scope, resolved decisions, and delivery phases. `ideas.md` is the original raw
brief, kept for history.

## Status

Phase 1 implementation underway. The **F1 foundation** is built: an
Expo-managed React Native (TypeScript) app skeleton with the on-device SQLite
database wired end-to-end (Drizzle ORM + versioned migrations) and a minimal
Today shell. F2–F6 remain in Backlog. See `PROGRESS.md` for pipeline state.

**Tech stack (decided 2026-07-29, libs confirmed at F1):** React Native + Expo,
Expo Router (navigation), `expo-sqlite` + `drizzle-orm`/`drizzle-kit`
(local DB + migrations), `expo-crypto` (UUIDs), Jest via `jest-expo` (tests).

### Build / run / test

Requires Node + the Android SDK for on-device runs. From the repo root:

```bash
npm install                       # install dependencies
npx expo prebuild --platform android   # generate the native android/ project (gitignored)
npx expo run:android              # build + launch on an Android device/emulator
npm test                          # Jest (headless storage smoke test)
npm run typecheck                 # tsc --noEmit
npm run lint                      # expo lint (ESLint)
npm run format:check              # Prettier (app code only; docs excluded)
npm run db:generate               # regenerate a migration after editing src/db/schema.ts
```

App code lives in `src/` (`src/app/` = Expo Router routes; `src/db/` = storage
layer). Generated migrations are in `drizzle/`.

## How we work: build in stages, plan then execute

This project is **not built straightaway**. Every piece of work flows top-down
through a specs-driven pipeline, split into a **planning track** and an
**execution track**:

```
                 ── PLANNING ──              ── EXECUTION ──
Phase  →  Feature  →  Spec  →  Technical Plan  →  Implementation
```

- **Planning track** — decide *what* and *how*: decompose a phase into features,
  write a **spec** (what a feature does) and a **technical plan** (how it will be
  built).
- **Execution track** — build it: implement strictly from the approved technical
  plan, then verify.

**Gating rule:** a feature only advances to the next step once the current
artifact has been **reviewed and explicitly approved** by the user. No technical
plan without an approved spec. **No implementation without an approved technical
plan.** When asked to "work on" a feature, default to producing or refining the
*next artifact in the pipeline* — do not skip ahead to code.

## Operating rule: ask preferences at every stage

At the start of **every stage** (and before any irreversible or outward-facing
step), **elicit the user's preferences and confirm direction** rather than
assuming. This includes: which phase/feature to work on next, scope boundaries,
UX choices, tech-stack and dependency decisions, and data-model tradeoffs. Offer
a recommendation, but let the user decide. Do not infer a task from context
(e.g. a branch name or an "obvious" next step) — wait for an explicit request.
Use the `elicit-preferences` skill to structure this.

## Delivery phases

- **Phase 1 — Notes (Mobile):** note-taking (typing + voice, editable),
  cross-platform app on Android first, local on-device database.
- **Phase 2 — Tasks (Mobile):** create/edit/delete/complete, scheduling,
  recurrence, reminders (notifications), snooze for overdue.
- **Phase 3 — Web & Sync:** web view surface plus a separate, syncable backend
  database (introduces accounts/auth and conflict handling).
- **Later (unscheduled):** keyword search across notes and tasks; promote a note
  into a task.

## Constraints to respect

- **Minimal by default** — no titles or metadata; resist adding fields. Enforce
  with the `minimalism-guard` skill.
- **Mobile-first** — Android phone is ~90% of usage and the primary surface; web
  is secondary and later.
- **Time-oriented** — notes and tasks are organized around time
  (day / week / month / year).
- **Local-first in Phase 1** — on-device database only; no backend/sync until
  Phase 3.
- **Cross-platform, stack undecided** — single codebase to ease the eventual web
  build; confirm the stack with the user before scaffolding anything.

## Skills library

Skills live in `.claude/skills/<name>/SKILL.md`. Invoke the one that matches the
task; each encodes the standard for that step. Prefer a skill over improvising.

### Workflow skills (the specs-driven engine)

| Skill | Use when |
|---|---|
| `plan-phase` | Decomposing a phase into an ordered set of features. |
| `elicit-preferences` | Starting any stage — gather and record the user's choices before proceeding. |
| `write-feature-spec` | Authoring a feature spec (the *what*). |
| `write-technical-plan` | Turning an approved spec into a technical plan (the *how*). |
| `review-and-gate` | Reviewing a spec/plan/implementation and gating progression. |
| `implement-feature` | Executing an approved technical plan. |
| `track-progress` | Recording/reporting where each feature sits in the pipeline. |

### Domain / capability skills (from the product spec)

| Skill | Use when |
|---|---|
| `note-capture` | Designing/building minimal typed note capture. |
| `voice-capture` | Designing/building voice-to-text capture. |
| `time-views` | Building day/week/month/year browsing of notes or tasks. |
| `task-management` | Building task add/edit/delete/complete. |
| `task-scheduling` | Adding date & time scheduling to tasks. |
| `task-recurrence` | Adding recurring rules (daily, weekdays, weekly, monthly, annually). |
| `reminders-and-snooze` | Adding push notifications and snoozing overdue tasks. |
| `local-storage` | Designing the on-device database (Phase 1). |
| `sync-and-accounts` | Designing the syncable backend, accounts, and conflict handling (Phase 3). |
| `web-view` | Building the web viewing surface (Phase 3). |

### Engineering / cross-cutting skills

| Skill | Use when |
|---|---|
| `choose-tech-stack` | Making the gated decision on the cross-platform stack. |
| `cross-platform-scaffold` | Setting up the app skeleton once the stack is chosen. |
| `minimalism-guard` | Sanity-checking any feature/UI against the minimalism principle. |

## Open questions (deferred to Phase 3, not blocking earlier work)

- Accounts & auth model for sync.
- Conflict handling when the same item is edited on phone and web.
