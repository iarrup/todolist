---
name: note-capture
description: Design and build the minimal typed note-capture experience — instant, title-less text notes that are editable, with the current day as the default view. Use for Phase 1 note features.
---

# Note capture

The lightweight capture surface for anything that isn't a task (Phase 1).

## Requirements (from ideas-refined.md)

- Add a note by **typing**; no title or metadata — just the text.
- Notes are **editable** after creation.
- **Default view = all notes for the current day.**
- Capture must be **fast**: minimal taps, input focused and ready.

## Design notes

- Open-to-capture: the add flow should require the fewest possible taps.
- Store creation timestamp (drives time-based views) but never surface it as a
  required field.
- Pair with `voice-capture` for hands-free entry and `time-views` for browsing.
- Persist via `local-storage` in Phase 1.

## Guardrails

- Enforce `minimalism-guard`: resist adding titles, tags, categories, or
  mandatory fields.
- Follow the specs-driven pipeline — spec and technical plan approved before build.
