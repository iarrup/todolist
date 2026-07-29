---
name: time-views
description: Build time-oriented browsing of notes and tasks — day/week/month (notes) and day/week/month/year (tasks), with the current day as the default. Use whenever adding or changing how items are grouped and viewed over time.
---

# Time-based views

Both notes and tasks are organized primarily around time.

## Requirements

- **Notes:** default view is the **current day**; also browse by **day / week /
  month**.
- **Tasks:** view **all open** tasks, plus by **day / week / month / year**.
- Grouping is by the item's relevant date (note creation date; task
  scheduled/ due date).

## Design notes

- **Timezone & day boundaries:** define "today" consistently (device local time);
  handle items crossing midnight and DST. Confirm edge behavior via
  `elicit-preferences`.
- **Empty states:** minimal, encouraging quick capture.
- Navigation between periods should be fast (swipe/next-prev).
- Reuse one grouping layer for both notes and tasks where practical.

## Guardrails

- Keep chrome minimal (`minimalism-guard`) — the content, not the calendar UI,
  is the point.
- Backed by queries against `local-storage` (Phase 1).
