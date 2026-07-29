---
name: task-recurrence
description: Add recurring tasks — daily, weekdays, weekends, specific weekdays, monthly, and annually (e.g. birthdays/anniversaries) — including how instances are generated and completed. Use as part of the Phase 2 tasks experience.
---

# Task recurrence

Let a task repeat on a schedule.

## Requirements (recurrence types)

- **Daily**
- **Weekdays** (Mon–Fri)
- **Weekends** (Sat–Sun)
- **Specific days of the week**
- **Monthly**
- **Annually** (e.g. birthdays, anniversaries)

## Design decisions to settle (via elicit-preferences)

- **Model:** store a recurrence rule on one task vs. materializing instances.
  A rule (RRULE-like) is compact; instances are simpler to query — pick with the
  user.
- **Completing one occurrence** vs. the series; how the next occurrence surfaces.
- **Edge cases:** monthly on the 31st in short months; annually on Feb 29; end
  conditions (does it ever stop?).
- Interaction with `task-scheduling` (time of day) and `reminders-and-snooze`
  (fire per occurrence).

## Guardrails

- Keep the recurrence picker minimal (`minimalism-guard`) — present the six
  named options plainly.
- Backed by `local-storage`; ensure queries stay efficient for `time-views`.
