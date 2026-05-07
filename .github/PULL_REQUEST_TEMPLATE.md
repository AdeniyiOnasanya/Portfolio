<!-- Use commas, periods, semicolons, parentheses, or colons. Do not use em-dash or emoji. -->

## Target branch check

- [ ] Feature/fix/content/chore/docs PR opens against `develop`.
- [ ] Promotion `develop -> staging` PR titled `release: develop -> staging YYYY-MM-DD`.
- [ ] Promotion `staging -> main` PR titled `release: staging -> main YYYY-MM-DD`.

## Summary

<!-- One or two sentences. What changed and why. -->

<!-- Implements: one sentence on what this slice ships. -->
<!-- Cut from: branch this PR was cut from, e.g. `develop` or `feature/25_sitemap-robots`. -->
<!-- Blocked by: comma-separated PR numbers that must merge first. Delete this line if there are none. -->

## Linked issues

Closes #
<!-- Add more "Closes #N" lines for multi-issue PRs (rare; prefer one issue per PR). Use "Refs #N" for related but not closing. -->

## Test plan

<!-- Vitest unit, RTL, Playwright, manual checklist. Reference the layer from implementation-plan.md. -->

- [ ]
- [ ]

## Manual checklist (per phase)

<!-- Pull the relevant Verify row from implementation-plan.md for this PR's phase. -->

- [ ] If the diff touches a UI surface, validated parity against `design_handoff_portfolio/design/` and cited the file paths plus line ranges this PR mirrors in the Summary block (e.g. `styles.css#L68-L101 (.cursor-dot/.cursor-ring), shared.jsx#L5-L49 (CustomCursor)`). Drift discovered after merge is a regression, not a follow-up.
- [ ] If the diff touches a UI surface, enabled DevTools, Rendering pane, "Emulate CSS prefers-reduced-motion: reduce" and confirmed every animation, transition, and view transition is stilled. The contract is in `app/globals.css`: timing comes from `var(--duration-*)` tokens; never hardcode durations.
- [ ]

## Risk

<!-- What could regress. What is reversible. What needs a follow-up. -->

## Notes

<!-- Optional: screenshots, preview URL, decisions deferred. -->
