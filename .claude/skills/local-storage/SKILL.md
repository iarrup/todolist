---
name: local-storage
description: Design and build the on-device database for Phase 1/2 — schema for notes and tasks, queries for time-based views, and a migration path that won't block the Phase 3 syncable backend. Use whenever persistence is involved before Phase 3.
---

# Local storage (on-device DB)

Phase 1 and 2 persist entirely on-device; no backend until Phase 3.

## Requirements

- Store **notes** (text + created timestamp) and **tasks** (text, completed,
  schedule, recurrence).
- Efficient queries for `time-views` (by day/week/month/year) and open tasks.
- A schema that can later extend to sync (`sync-and-accounts`) without a painful
  rewrite — e.g. stable IDs, `updated_at`, soft-delete considerations.

## Design decisions to settle (via elicit-preferences)

- **Engine:** the choice is stack-dependent — settle it with `choose-tech-stack`
  (e.g. an embedded relational store vs. a document store).
- **Migrations:** how schema changes are versioned and applied.
- **IDs:** use globally-unique IDs now to ease future sync.

## Guardrails

- Do not add cloud/network persistence before Phase 3.
- Keep the schema minimal — mirror the minimalism of the product
  (`minimalism-guard`).
