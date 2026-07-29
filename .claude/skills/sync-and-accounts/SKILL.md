---
name: sync-and-accounts
description: Design the Phase 3 syncable backend — accounts/auth, a separate cloud database, and conflict handling when the same note/task is edited on phone and web. Use only when Phase 3 (Web & Sync) is approached; it is deferred and not blocking earlier phases.
---

# Sync & accounts (Phase 3)

Introduces cross-device data. **Deferred** — do not build during Phase 1/2; the
phone stays primary (~90%).

## Scope (Phase 3)

- A **separate, syncable backend database** alongside the on-device store.
- **Accounts & auth** — an identity model for sync.
- **Conflict handling** for concurrent edits on phone and web.

## Open questions to resolve first (via elicit-preferences)

- **Auth model:** Google account, email/password, magic link, etc.?
- **Conflict resolution:** last-write-wins vs. field-level merge vs. manual?
- **Sync model:** push/pull cadence, offline queue, and how it reconciles with
  the local IDs/`updated_at` established in `local-storage`.

## Guardrails

- Blocked until Phase 1 and 2 are delivered and Phase 3 is explicitly started.
- Design so the phone remains fully functional offline.
