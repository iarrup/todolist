---
name: cross-platform-scaffold
description: Set up the initial cross-platform app skeleton once the tech stack is chosen — project structure, tooling, local DB wiring, and a runnable app shell. Use only after choose-tech-stack is approved and the first technical plan calls for it.
---

# Cross-platform scaffold

Stand up the app skeleton so features have somewhere to land. This is a one-time
foundation step, run through the normal specs-driven pipeline.

## Precondition

`choose-tech-stack` is approved. Do not scaffold before the stack is decided.

## Steps

1. Initialize the project in the chosen stack; set up the standard directory
   layout and formatting/lint config.
2. Wire the **local database** (`local-storage`) with an initial schema/migration.
3. Add a minimal runnable **app shell** (navigation to a day view) to prove the
   toolchain end-to-end on Android.
4. Document how to **build, run, and test** the app — and update `CLAUDE.md`'s
   Status section (which currently says "no code yet") accordingly.
5. Verify it runs on Android before handing off (`review-and-gate`).

## Guardrails

- Keep the shell minimal (`minimalism-guard`) — structure, not features.
- Android is the first target; keep the codebase web-ready but don't build web
  until Phase 3.
