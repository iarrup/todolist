---
name: track-progress
description: Record and report where each feature sits in the specs-driven pipeline (feature → spec → technical plan → implementation), plus decisions made and gate approvals. Use after any stage transition or when the user asks for status.
---

# Track progress

Maintain a lightweight, single source of truth for pipeline state so any session
can pick up where the last left off.

## When to use

- After a stage transition or gate approval (`review-and-gate`).
- After a decision is made (`elicit-preferences`).
- When the user asks "where are we?".

## Where

Maintain `PROGRESS.md` at the repo root with:

- **Status board** — a table of features × pipeline stage (Backlog / Spec /
  Plan / Impl / Done) with the current state of each.
- **Decision log** — dated entries: decision, rationale, who approved.
- **Now / Next** — the feature currently in flight and the agreed next step.

## Steps

1. Update the relevant row when a feature changes stage.
2. Append a decision-log entry for every confirmed preference or gate approval,
   with the date (use absolute dates).
3. Keep it terse — it's a map, not a narrative.

## Guardrails

- Do not record anything the artifacts (specs/plans) already capture in detail;
  link to them instead.
