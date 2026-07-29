---
name: plan-phase
description: Decompose a delivery phase (from ideas-refined.md) into an ordered, minimal set of features to develop through the specs-driven pipeline. Use at the very start of a phase, before any spec is written.
---

# Plan a phase

Turn a broad delivery phase into a concrete, ordered feature list. This is the
first planning step of a phase — it produces the backlog that later feeds
`write-feature-spec`.

## When to use

- Starting Phase 1, 2, or 3 (see `ideas-refined.md` → Delivery Plan).
- Re-planning a phase after scope changes.

## Steps

1. **Confirm the phase and its goal** with the user (use `elicit-preferences`).
   Restate the phase's intent and boundaries from `ideas-refined.md`.
2. **List candidate features** — the smallest shippable slices that deliver the
   phase. Keep each feature independently spec-able.
3. **Order them** by dependency and value; call out what must come first.
4. **Mark cut lines** — what is explicitly out of scope for this phase.
5. **Get the user's preferences** on ordering and scope, and their approval.
6. **Record** the agreed feature list via `track-progress`.

## Output

An ordered feature list for the phase, each item a one-line description plus a
note on dependencies and scope boundary. No specs yet — that's the next step
(`write-feature-spec`), and only after the list is approved (`review-and-gate`).

## Guardrails

- Respect the minimalism principle (`minimalism-guard`) — do not invent features
  beyond the spec.
- Do not pick a tech stack here; that is the `choose-tech-stack` decision.
