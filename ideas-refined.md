# Pocket Notebook — Product Concept

## Vision

A digital equivalent of a pocket notebook: a minimal, friction-free app for
jotting down whatever comes to mind, on the go. The guiding principle is
**minimalism** — capture should be instant, with as few taps and fields as
possible.

The app captures two distinct kinds of things:

1. **Notes** — any idea, thought, or reminder that is *not* an actionable task.
2. **Tasks (Todos)** — things the user intends to do.

---

## Core Principles

- **Minimal by default.** No titles, no mandatory fields — just the content.
- **Fast capture.** Adding a note or task should take seconds.
- **Time-oriented.** Both notes and tasks are organized primarily around time
  (day / week / month / year).
- **Mobile-first.** The phone is the primary surface — expected to be ~90% of
  usage. Web is a secondary, view-oriented surface added later.

---

## Feature: Notes

The lightweight capture surface for anything that isn't a task.

| Capability | Description |
|---|---|
| Add by typing | Standard text input. |
| Add by voice | Voice-to-text input for hands-free capture. |
| Edit | Notes are editable after creation. |
| Minimal content | No title or metadata — just the note text. |
| Default view | All notes for the **current day**. |
| Time-based views | Browse notes by **day**, **week**, and **month**. |

---

## Feature: Tasks (Todos)

The actionable list, kept just as minimal as notes.

### Basic operations
- Add, edit, and delete a task.
- Mark a task as complete.
- No title required — a task is just its text.

### Scheduling
- Schedule a task with a **date and time**.
- Set up **recurring** tasks:
  - Daily
  - Weekdays
  - Weekends
  - Specific days of the week
  - Monthly
  - Annually (e.g. birthdays, anniversaries)

### Reminders
- Scheduled and recurring tasks **trigger reminders** (push notifications) at
  their due time.
- **Overdue** tasks can be **snoozed** to resurface at a later time.

### Views
- All **open** (incomplete) tasks.
- Tasks by **day**, **week**, **month**, and **year**.

---

## Platform & Deployment

- **Primary platform:** Android (phone), distributed via Google Play. This is
  the dominant surface (~90% of usage).
- **Secondary platform:** Web, for viewing notes and tasks (added later).
- **Tech approach:** Start **cross-platform** (single codebase serving mobile
  first, easing the eventual web build) and reassess as the app matures.
- **Storage:** Phase 1 is a **local, on-device database**. A separate,
  syncable database is introduced only when web support is built.

---

## Development Methodology

The application is **not built straightaway**. Development follows a
**specs-driven** approach, working top-down from phases to shippable code:

1. **Phase** — a broad milestone (see Delivery Plan below).
2. **Feature** — each phase is split into discrete features.
3. **Spec** — for each feature, write a specification describing *what* it does:
   scope, behavior, user flows, acceptance criteria, and edge cases.
4. **Technical plan** — from the approved spec, produce a technical plan
   describing *how* it will be built: data model, components/modules, APIs,
   dependencies, and implementation steps.
5. **Implementation** — build the feature by executing the technical plan.

A feature only moves to the next step once the current artifact is reviewed and
agreed. No implementation begins without an approved spec and technical plan.

```
Phase → Feature → Spec → Technical Plan → Implementation
```

---

## Delivery Plan

The product is delivered in phases to keep scope focused. Early phases stay
lean and local; later phases add cross-device reach and convenience features.
Each phase below is split into features; every feature is developed through the
specs-driven flow above (spec → technical plan → implementation).

### Phase 1 — Notes (Mobile)
- Build the **note-taking** experience (typing + voice, editable notes).
- Cross-platform app, running on Android first.
- Local on-device database.

### Phase 2 — Tasks (Mobile)
- Add the **task/todo** experience: create/edit/delete, complete, schedule,
  and recurrence.
- **Reminders** (notifications) for scheduled/recurring tasks.
- **Snooze** for overdue tasks.

### Phase 3 — Web & Sync
- Build the web surface for viewing notes and tasks.
- Introduce a **separate, syncable backend database** so data is available
  across phone and web.

### Later Enhancements (unscheduled)
- **Keyword search** across both notes and tasks.
- **Promote a note into a task** (convert an existing note without retyping it).

---

## Resolved Decisions

For traceability, the previously open questions and their resolutions:

| # | Question | Decision |
|---|---|---|
| 1 | Sync & backend | Local-only for now; introduce a separate syncable database in the **web phase (Phase 3)**. Phone remains primary (~90%). |
| 2 | Reminders | **Yes** — scheduled and recurring tasks trigger reminders. |
| 3 | Overdue tasks | Support a **snooze** to resurface them later. |
| 4 | Note → task promotion | **Yes**, but deferred to a **later phase**. |
| 5 | Editing notes | **Yes** — notes are editable. |
| 6 | Search | **Keyword search** for both notes and tasks, in a **later phase**. |
| 7 | Tech stack | Start **cross-platform**; reassess as it evolves. |

---

## Open Questions (for the Web & Sync phase)

To be resolved when Phase 3 is approached — not blocking earlier phases:

1. **Accounts & auth.** Sync implies some identity model. What does sign-in look
   like (Google account, email, etc.)?
2. **Conflict handling.** When the same note or task is edited on both phone and
   web, how is the conflict resolved (last-write-wins vs. merge)?
