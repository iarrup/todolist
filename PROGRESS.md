# Progress — Pocket Notebook

Single source of truth for specs-driven pipeline state.
Stages: **Backlog → Spec → Plan → Impl → Done** (a feature advances only after
`review-and-gate` approval).

## Status board

### Phase 1 — Notes (Mobile)

| # | Feature | One-liner | Depends on | Stage |
|---|---|---|---|---|
| F1 | App foundation & local storage | Cross-platform skeleton + on-device DB wiring + runnable app shell | choose-tech-stack (gated) | Backlog |
| F2 | Typed note capture | Instant, title-less text note saved locally | F1 | Backlog |
| F3 | Today view | Default screen listing the current day's notes | F2 | Backlog |
| F4 | Edit note | Open an existing note and change its text | F2, F3 | Backlog |
| F5 | Time-based browsing | Day / week / month views of notes | F3 | Backlog |
| F6 | Voice capture | Voice-to-text entry (mic permission, editable transcript) | F2 | Backlog |

**Cut lines (out of scope for Phase 1):** tasks/todos (Phase 2); web surface,
sync backend, accounts/auth (Phase 3); keyword search and note→task promotion
(Later); any titles/tags/metadata (minimalism).

**Prerequisite (not a feature):** `choose-tech-stack` — **decided 2026-07-29:
React Native + Expo (TypeScript).** See decision log.

### Phase 2 — Tasks (Mobile)
Not yet planned (`plan-phase`).

### Phase 3 — Web & Sync
Not yet planned (`plan-phase`). Open questions: accounts/auth, conflict handling.

## Decision log

- **2026-07-29** — Phase 1 decomposed into 6 ordered features (F1–F6).
  - F1 (foundation) kept as a **separate** feature, spec'd/gated on its own.
  - Today view kept as a **separate** feature (F3), not bundled into F2.
  - Voice capture ordered **last** (F6) — highest complexity, deferred until the
    typed-note loop is solid.
  - Approved by: user (arup.chowdhary@gmail.com).
- **2026-07-29** — **Gate passed (review-and-gate):** Phase 1 feature plan
  (F1–F6) reviewed against the phase-plan rubric and **approved** by the user
  to advance out of Backlog. Approved by: user (arup.chowdhary@gmail.com).
- **2026-07-29** — **Tech stack chosen (choose-tech-stack):**
  **React Native + Expo (TypeScript)** — one codebase for Android (primary,
  ~90%) with a real-DOM web path for Phase 3, first-class voice + notifications,
  and Expo/EAS cloud builds and Play submission. Chosen over Flutter
  (canvas-rendered web, Dart-only backend) and Kotlin Multiplatform (immature
  Compose web). User is unfamiliar with all three, so build/distribution ease
  and the web path drove the choice.
  - Distribution: Android via signed `.aab` to Google Play (EAS Build + Submit);
    web (Phase 3) via `expo export` to static hosting.
  - **Proposed companion libs — NOT yet locked, confirm at F1 spec/plan:** local
    DB `expo-sqlite` + Drizzle ORM; voice `expo-speech-recognition`;
    notifications (Phase 2) `expo-notifications`.
  - Approved by: user (arup.chowdhary@gmail.com).

## Now / Next

- **Now:** Phase 1 feature plan approved (gate passed) and tech stack chosen
  (React Native + Expo). Features remain in Backlog until each is picked up for
  spec.
- **Next:** Write the **F1 spec** (`write-feature-spec`) for App foundation &
  local storage.
- **Workflow:** Each feature is built on its **own branch in a separate Claude
  Code session**; planning/decisions are tracked here on
  `feature/create-features`.
