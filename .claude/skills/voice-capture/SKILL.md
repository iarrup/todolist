---
name: voice-capture
description: Design and build voice-to-text capture for hands-free note/task entry, including microphone permissions, transcription, and an editable result. Use for the voice-input feature in Phase 1 (notes) and later reuse for tasks.
---

# Voice capture

Hands-free capture: speak, get text, edit if needed, save.

## Requirements

- Add a note (later, a task) by **voice input**, transcribed to text.
- Result is **editable** before/after saving (transcription isn't perfect).
- Stays minimal — the transcript is just the content, no extra fields.

## Design notes

- **Permissions:** request microphone access gracefully; handle denial with a
  clear fallback to typing.
- **Transcription engine:** on-device vs. platform speech API vs. cloud is a
  preference + privacy decision — raise via `elicit-preferences`. Phase 1 is
  local-first, so prefer on-device/offline-capable options.
- **States:** listening, transcribing, error/no-speech, editable result.
- Feeds the same store as `note-capture` via `local-storage`.

## Guardrails

- Local-first in Phase 1 — avoid a cloud dependency unless the user opts in.
- Enforce `minimalism-guard`.
