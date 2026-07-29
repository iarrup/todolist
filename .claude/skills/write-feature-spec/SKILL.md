---
name: write-feature-spec
description: Author a feature specification describing WHAT a feature does — scope, behavior, user flows, acceptance criteria, and edge cases. Use after a feature is selected from a phase plan and before any technical planning.
---

# Write a feature spec

Produce the *what* artifact for a single feature. A spec is prose + criteria,
not code and not implementation detail. It is the input to `write-technical-plan`.

## When to use

- A feature has been chosen from the phase backlog (`plan-phase`) and its
  preferences confirmed (`elicit-preferences`).

## Spec template

Write to `specs/<phase>/<feature>.spec.md`:

1. **Summary** — one paragraph: what this feature is and why.
2. **Scope** — in scope / out of scope (explicit).
3. **User flows** — step-by-step for each primary flow (e.g. add note by voice).
4. **Behavior & rules** — how it behaves, including empty/default states and the
   time-oriented default views.
5. **Acceptance criteria** — testable, checkable statements ("Given/When/Then").
6. **Edge cases** — errors, offline, permissions (mic), long input, timezones,
   overdue, etc.
7. **Open questions** — anything needing a user decision.

## Steps

1. Draft the spec from `ideas-refined.md` and the confirmed preferences.
2. Resolve open questions with the user (`elicit-preferences`).
3. Submit for review via `review-and-gate`. **Do not proceed to a technical plan
   until the spec is approved.**

## Guardrails

- Keep it minimal (`minimalism-guard`): no titles/fields the spec doesn't require.
- Describe behavior, not implementation. Leave data model and components to the
  technical plan.
