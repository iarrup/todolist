---
name: task-scheduling
description: Add date-and-time scheduling to tasks so they have a due moment that drives time views and reminders. Use after core task CRUD exists and before/with recurrence and reminders.
---

# Task scheduling

Give a task a specific **date and time** it is due.

## Requirements

- Schedule a task with a **date and time**.
- Scheduled tasks appear in the correct day/week/month/year views (`time-views`).
- The due moment is what `reminders-and-snooze` fires on.

## Design notes

- **Optional by default:** an unscheduled task is still valid (stays in "open").
- **Timezone handling:** store an unambiguous instant; render in device local
  time. Decide DST/travel behavior with `elicit-preferences`.
- Fast picker UX — minimal taps, sensible defaults (e.g. today / this hour).
- Extend the `task-management` model rather than forking it.

## Guardrails

- Keep the picker minimal (`minimalism-guard`).
- Coordinate the model with `task-recurrence` so a task can be both scheduled and
  recurring.
