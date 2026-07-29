---
name: write-technical-plan
description: Turn an APPROVED feature spec into a technical plan describing HOW it will be built — data model, modules/components, APIs, dependencies, and ordered implementation steps. Use only after the spec is approved and before implementation.
---

# Write a technical plan

Produce the *how* artifact for a feature whose spec is already approved. This is
the last planning step before execution; it is the input to `implement-feature`.

## Precondition

The feature's spec (`write-feature-spec`) is **approved** via `review-and-gate`.
If not, stop and get the spec approved first.

## Plan template

Write to `plans/<phase>/<feature>.plan.md`:

1. **References** — link the approved spec.
2. **Data model** — entities, fields, relationships, indexes; how it maps to the
   local on-device store (`local-storage`) in Phase 1.
3. **Modules / components** — UI screens, view models/state, services.
4. **APIs / interfaces** — internal contracts (and external only if Phase 3).
5. **Dependencies** — libraries to add, with justification; flag any that need a
   user preference decision (`elicit-preferences`).
6. **Implementation steps** — small, ordered, independently verifiable tasks.
7. **Testing approach** — what proves each acceptance criterion.
8. **Risks / tradeoffs** — and how they're mitigated.

## Steps

1. Confirm the tech stack is decided (`choose-tech-stack`); if not, that decision
   comes first.
2. Draft the plan against the approved spec.
3. Surface dependency/stack tradeoffs to the user for a preference call.
4. Submit for review via `review-and-gate`. **No implementation until approved.**

## Guardrails

- Every implementation step must trace back to an acceptance criterion in the spec.
- Do not expand scope beyond the approved spec.
