---
name: review-and-gate
description: Review a pipeline artifact (phase plan, spec, technical plan, or implementation) against its checklist and the product spec, then gate progression — nothing advances without explicit user approval. Use at every handoff between stages.
---

# Review and gate

Enforce the project's core rule: **a feature only advances once the current
artifact is reviewed and explicitly approved by the user.** This skill is the
checkpoint between every stage.

## When to use

- Before moving Feature list → Spec, Spec → Technical Plan, Technical Plan →
  Implementation, or Implementation → done.

## Steps

1. **Identify the artifact and target transition.**
2. **Check against its rubric:**
   - *Phase plan:* features are minimal, ordered, scoped; cut lines explicit.
   - *Spec:* scope, flows, acceptance criteria, edge cases all present; behavior
     only (no implementation); minimalism respected.
   - *Technical plan:* every step traces to an acceptance criterion; data model,
     deps, and testing covered; stack decided.
   - *Implementation:* meets every acceptance criterion; verified running; no
     scope creep.
3. **Summarize findings** — what's ready, what's missing, open questions.
4. **Ask the user to approve or request changes** (`elicit-preferences`). Do not
   self-approve.
5. On approval, **record the gate pass** via `track-progress` and hand off to the
   next skill. On changes requested, loop back.

## Guardrails

- Approval is the user's, always. Absence of objection is not approval.
- Block progression if the prerequisite artifact was never approved.
