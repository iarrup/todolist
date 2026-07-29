---
name: implement-feature
description: Execute an APPROVED technical plan to build a feature, step by step, verifying against the spec's acceptance criteria. Use only after both the spec and technical plan are approved.
---

# Implement a feature

The execution track. Build strictly from the approved technical plan; verify
against the approved spec.

## Precondition

Both the **spec** (`write-feature-spec`) and **technical plan**
(`write-technical-plan`) are approved via `review-and-gate`. If either is not,
stop and complete planning first.

## Steps

1. **Confirm start** with the user and restate what will be built this pass.
2. **Work the plan's steps in order.** Keep each change small and match existing
   code conventions.
3. **Verify each acceptance criterion** as you go — run the app/tests, don't just
   assume. Report failures with real output.
4. **Stay in scope** — if reality diverges from the plan, stop and raise it
   (`elicit-preferences`) rather than improvising a scope change.
5. **Hand off to `review-and-gate`** for final approval; record via
   `track-progress`.

## Guardrails

- No new features or fields beyond the approved spec (`minimalism-guard`).
- Commit/push only when the user asks; branch first if on the default branch.
- Report outcomes faithfully: if a criterion isn't met, say so.
