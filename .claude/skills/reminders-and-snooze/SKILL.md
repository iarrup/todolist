---
name: reminders-and-snooze
description: Add push-notification reminders that fire at a task's due time (including recurring occurrences) and let overdue tasks be snoozed to resurface later. Use for the Phase 2 reminders feature.
---

# Reminders & snooze

Scheduled and recurring tasks notify the user; overdue ones can be deferred.

## Requirements

- Scheduled and recurring tasks **trigger reminders (push notifications)** at
  their due time.
- **Overdue** tasks can be **snoozed** to resurface at a later time.

## Design notes

- **Notification permissions:** request gracefully; handle denial with a clear
  in-app fallback.
- **Scheduling engine:** use the platform's local notification scheduler
  (Phase 1/2 is local-first — no server push). Reschedule on device reboot and
  when a task is edited.
- **Recurrence:** schedule the next occurrence's notification when one fires or
  is completed (coordinate with `task-recurrence`).
- **Snooze:** offer sensible presets (e.g. 10 min, 1 hour, tonight, tomorrow) —
  confirm the set via `elicit-preferences`.

## Guardrails

- Local notifications only until Phase 3 introduces a backend.
- Keep notification content minimal — just the task text.
