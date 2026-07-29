---
name: minimalism-guard
description: Sanity-check any proposed feature, field, screen, or UI against the product's core minimalism principle — instant, friction-free capture with no titles or mandatory fields. Use when specifying or building anything user-facing.
---

# Minimalism guard

The product's guiding principle is **minimalism**: capture should be instant,
with as few taps and fields as possible. This skill is a quick checklist to hold
the line.

## Checklist

- **No titles, no mandatory metadata** — an item is just its content (note text /
  task text). Reject added fields unless a spec explicitly requires them.
- **Fewest taps** — can this flow be shorter? Is the input focused and ready on
  open?
- **Sensible defaults** — default to the current day / now; don't ask the user
  for what you can assume.
- **Progressive, not upfront** — scheduling, recurrence, voice are opt-in, not
  gates in the basic capture path.
- **Quiet UI** — chrome serves the content; avoid decoration that slows capture.

## How to apply

When a spec, plan, or UI adds anything, ask: *does the minimalism principle
justify this?* If not, flag it and, if it's a real tradeoff, raise it via
`elicit-preferences` rather than deciding silently.

## Guardrails

- This guard advises; the user still owns scope decisions.
