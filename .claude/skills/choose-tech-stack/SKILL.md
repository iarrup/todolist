---
name: choose-tech-stack
description: Facilitate the gated decision to select the cross-platform tech stack (framework, language, local DB, and key libraries), presenting options and tradeoffs for the user to choose. Use before any scaffolding or technical plan that assumes a stack.
---

# Choose the tech stack

The spec deliberately leaves the stack open: "start cross-platform and reassess."
This skill runs that decision as an explicit, user-owned choice — it is a
prerequisite for `cross-platform-scaffold` and most technical plans.

## When to use

- Before scaffolding the app or writing a technical plan that assumes a stack.

## Decision inputs (from ideas-refined.md)

- **Mobile-first, Android primary** (~90% of usage); distribute via Google Play.
- **Cross-platform single codebase** to ease the eventual **web** build (Phase 3).
- **Local on-device database** in Phase 1; **voice-to-text** and **local
  notifications** needed.

## Steps

1. Present 2–4 stack options with tradeoffs against the criteria above (e.g.
   Android+web reach, native voice/notification support, local DB options, team
   familiarity, path to web). Give a recommendation, but do not decide for the
   user — use `elicit-preferences`.
2. Capture the choice, including the **local DB engine** and any pivotal
   libraries (speech, notifications).
3. Record the decision in the `track-progress` decision log and note it in
   `ideas-refined.md` (Tech stack was an intentionally open decision).

## Guardrails

- Do not scaffold or assume a stack before this decision is approved.
- Favor stacks with strong Android + web stories and good offline/local support.
