---
name: ha-frontend-ux-readiness
description: Home Assistant frontend UI/UX readiness routing for new cards, badges, screens, and interaction patterns. Use it with `ha-frontend-review` to decide whether frontend review is enough or further UI/UX input is needed. Skip it for PRs already carrying Needs UX and for fixes or technical details that preserve an established experience.
---

# HA Frontend UI/UX Readiness

Use the design context and evidence gathered through `ha-frontend-review` to decide whether a change's UI/UX direction is settled and whether further UI/UX review should be recommended or is explicitly required. This skill routes the result; it does not repeat or replace implementation, accessibility, or frontend quality review.

## Early Exit

If the PR already carries the **Needs UX** label, reviewers have already decided to ask designers or UX reviewers for guidance. Do not use this skill to make that recommendation again.

## Triage

1. Apply `ha-frontend-review` and record its UI/UX evidence.
   - Include the applicable gallery specification, production or approved designs, shared `ha-*` components, task requirements, historical feedback, and direct instructions.
   - Keep the implementation review separate from this readiness decision.
2. Classify the user-facing decision.
   - Existing-feature fixes and technical details normally remain with frontend review when they preserve the established experience.
   - New cards, badges, screens, and interaction patterns normally need this readiness check.
3. Decide whether the evidence gathered during frontend review settles the direction.
   - An explicit approval, current guidance, established pattern, or sufficiently specific task can settle the direction.
   - Insufficient or conflicting evidence leaves the direction unresolved.
4. Select exactly one route below and state which frontend-review evidence supports it.

## Routes

| Route                          | Use when                                                                                                                                                                                                                                                     | Action                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Frontend review sufficient** | The change preserves the established experience, or explicit UI/UX approval, current guidance, an established pattern, or a sufficiently specific task settles the design direction.                                                                         | Cite the evidence that settles the direction and continue with `ha-frontend-review`.                                          |
| **UI/UX review recommended**   | The change introduces a new user experience with material design choices that are not settled by UI/UX approval, current guidance, or an established pattern. This also covers conflicting feedback and tasks that leave important UI/UX choices unresolved. | Recommend UI/UX review and identify the decision that needs input.                                                            |
| **UI/UX review required**      | A workflow rule or direct human instruction explicitly requires UI/UX review.                                                                                                                                                                                | Cite that evidence and treat UI/UX review as required. A new design, task link, or lack of evidence is not enough on its own. |

Explicit UI/UX approval, established patterns, task requirements, and conflicting or missing evidence inform the route; they are not separate results. Approval or an established direction can make frontend review sufficient. A task can settle requirements without approving the UI/UX. Recommend UI/UX review when important design choices remain unresolved.

## Reporting

Keep the result concise and use this structure:

- **Route:** Frontend review sufficient, UI/UX review recommended, or UI/UX review required
- **Established patterns:** relevant gallery specifications, production designs, and shared `ha-*` components for the next reviewer to compare
- **Supporting evidence:** approval, guidance, established patterns, task requirements, direct instructions, or the evidence gap or conflict
- **Next action:** the review action implied by the route

Separate whether the UI/UX direction is settled from whether the implementation is correct.
