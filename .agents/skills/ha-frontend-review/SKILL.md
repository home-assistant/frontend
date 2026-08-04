---
name: ha-frontend-review
description: Home Assistant frontend PR and review guidance. Use when reviewing frontend changes, preparing a PR, checking recurring review issues, or applying the PR template.
---

# HA Frontend Review

Use this skill when reviewing Home Assistant frontend changes or preparing a pull request.

## Pull Request Body

When creating a pull request, use `.github/PULL_REQUEST_TEMPLATE.md` as the body.

- Do not omit, reorder, or rewrite template sections.
- Check the appropriate "Type of change" box based on the actual change.
- Do not check checklist items on behalf of the user.
- If the PR includes UI changes, remind the user to add screenshots or a short video.
- Explain what the change does for users, not only implementation details.
- Use Markdown.

## Pre-Submission Checklist

- `yarn lint` passes when practical for the scope.
- `yarn test` or focused relevant tests are green when practical for the scope.
- Tests are added or updated for new data processing and utilities where applicable.
- User-facing text is localized and follows `ha-frontend-user-facing-text` guidance.
- Components handle loading, error, unavailable, and missing-entity states.
- Entity existence is checked before property access.
- Event listeners and subscriptions are cleaned up.
- UI is accessible to screen readers and keyboard users.

## Recurring Review Issues

Scope and public surface:

- Keep changes independently reviewable and limited to the requested area.
- Prefer existing Home Assistant helpers, Lit primitives, and component seams over parallel implementations.
- Challenge new public properties and optional feature surface when transient options or existing seams meet the requirement with less lifecycle and consistency cost.

Stateful and asynchronous UI:

- Review transitions in both directions, not only individual rendered states.
- When controls reappear, restore valid defaults instead of retaining state that was only valid while they were hidden.
- Establish immutable dirty-state baselines before asynchronous work, guard against stale responses, and preserve unsaved state in mounted editors.
- Determine an action's current meaning before applying dirty-state checks, especially when an action can change between Save and Close.

Readiness and invalidation:

- Treat readiness as the first displayable terminal result, including stable empty and error states.
- Register child readiness before resolving the parent, do not treat fallback work as terminal, and replay readiness correctly for cached or reused panels.
- Ensure every value read by memoized output participates in its invalidation.

Repository-owned contracts:

- Consult the public [frontend developer documentation](https://developers.home-assistant.io/docs/frontend/) for documented architecture, data flow, design, and development workflows.
- For new leaf components, cross-load `ha-frontend-contexts` and verify they consume narrow contexts instead of introducing a broad `hass` property; containers and external APIs may still require `hass`.
- Verify backend assumptions against the owning Core, Supervisor, or WebSocket implementation, and component assumptions against the exported component contract.
- Prefer canonical repository helpers and test setup over duplicate local implementations.
- Promote AI-review concerns into durable guidance only when supported by code evidence, reproduced behavior, an accepted corrective commit, or human-maintainer validation.

User experience and accessibility:

- Forms need proper labels, helper text, and validation feedback.
- Form markup should not cause password managers to identify fields incorrectly.
- Clickable areas should be large enough for touch interaction.
- Hover, active, disabled, loading, and focus states should be clear.

Dialog and modal patterns:

- Multi-step operations should show progress.
- Dialog state should survive background operations correctly.
- Cancel and close buttons should behave consistently.
- Defaults should be helpful without blocking user override.

Component design patterns:

- Terminology should be consistent. Use words like "Join" or "Apply" instead of "Group" when that better matches the user action.
- Visual hierarchy should use appropriate font sizes, weights, and spacing ratios.
- Components should align to the design grid.
- Badges and indicators should be placed consistently.

Code quality:

- Null and undefined paths should be handled explicitly.
- Potentially undefined array and object access should be guarded.
- Event handlers, timers, observers, and subscriptions should be cleaned up.

Configuration and props:

- Make configuration fields optional when sensible.
- Provide reasonable defaults.
- Keep APIs extensible without adding speculative abstractions.
- Validate configuration before applying changes.

## Review Flow

- Identify behavioral regressions, bugs, accessibility issues, and missing tests first.
- Keep style-only comments secondary unless they affect maintainability or user experience.
- Prefer small, direct fixes over large refactors during review follow-up.
- Cross-load `ha-frontend-contexts`, `ha-frontend-components`, `ha-frontend-events`, `ha-frontend-lit`, `ha-frontend-styling`, `ha-frontend-testing`, `ha-frontend-types`, or `ha-frontend-user-facing-text` when a finding falls in that area.
