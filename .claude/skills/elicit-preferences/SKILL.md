---
name: elicit-preferences
description: Gather and record the user's preferences and confirm direction at the start of every stage, before assuming scope, UX, tech, or data-model choices. Use whenever a new stage begins or a decision has more than one reasonable option.
---

# Elicit preferences

The project rule is to **ask the user's preferences at every stage** rather than
assume. This skill structures that conversation so decisions are explicit and
recorded.

## When to use

- At the start of every stage: choosing the next phase/feature, before a spec,
  before a technical plan, before implementation, before any dependency or
  stack decision.
- Any time a choice has multiple reasonable options or is hard to reverse.

## Steps

1. **Name the decision** and why it matters now.
2. **Offer 2–4 concrete options** with tradeoffs, and a clear recommendation
   (recommended option first). Keep options mutually exclusive where possible.
3. **Ask** — prefer a structured question over open prose so the user can pick
   quickly. Always leave room for a custom answer.
4. **Confirm** the choice back to the user in one line.
5. **Record** the decision (rationale + date) via `track-progress`, and reflect
   any lasting decision back into `ideas-refined.md`'s Resolved Decisions if it
   changes product scope.

## Guardrails

- Recommend, but let the user decide.
- Never infer a task from context (branch names, "obvious" next steps). Wait for
  an explicit request.
- Do not batch unrelated decisions into one overwhelming question; ask the few
  that unblock the current stage.
