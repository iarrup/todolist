---
name: web-view
description: Build the Phase 3 web surface for viewing notes and tasks across devices, reusing the cross-platform codebase where possible and reading from the synced backend. Use only when Phase 3 (Web & Sync) is approached.
---

# Web view (Phase 3)

A secondary, **view-oriented** web surface. **Deferred** — the phone is primary;
web is added later.

## Scope (Phase 3)

- View notes and tasks on the web, organized by the same time-based views
  (`time-views`).
- Reads from the synced backend (`sync-and-accounts`).
- Reuse the cross-platform codebase where the chosen stack allows
  (`choose-tech-stack`, `cross-platform-scaffold`).

## Design notes

- Start **read/view-first** per the spec; editing/capture parity is a later
  decision (`elicit-preferences`).
- Keep the web UI as minimal as the mobile app (`minimalism-guard`).

## Guardrails

- Blocked until Phase 3 is started and sync exists.
- Do not fork product behavior; the web mirrors the mobile model.
