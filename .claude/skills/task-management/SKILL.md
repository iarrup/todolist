---
name: task-management
description: Build core task CRUD — add, edit, delete, and mark complete — for minimal, title-less tasks that are just text. Use as the foundation of the Phase 2 tasks experience, before scheduling/recurrence/reminders.
---

# Task management (CRUD + complete)

The actionable list, kept as minimal as notes (Phase 2 foundation).

## Requirements

- **Add, edit, delete** a task.
- **Mark complete** (and toggle back).
- **No title** — a task is just its text.

## Design notes

- Model: `text`, `completed`, timestamps; scheduling/recurrence fields added by
  `task-scheduling` and `task-recurrence` (design the model to extend cleanly).
- Completion should be a single, fast gesture.
- Deleting should be safe (confirm or undo) but not heavy.
- Feeds `time-views` (open tasks + by period) and persists via `local-storage`.

## Guardrails

- Enforce `minimalism-guard` — no titles, priorities, tags, or projects unless a
  spec explicitly requires them.
- Build only after the feature's spec + technical plan are approved.
