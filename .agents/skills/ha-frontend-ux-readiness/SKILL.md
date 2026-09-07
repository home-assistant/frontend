---
name: ha-frontend-ux-readiness
description: Home Assistant frontend UI/UX readiness guidance for new cards, badges, screens, and interaction patterns. Use it to decide whether frontend review is enough or UI/UX input is needed. Skip it for PRs already carrying Needs UX and for fixes or technical details that preserve an established experience.
---

# HA Frontend UI/UX Readiness

Assess whether a change's UI/UX direction is settled and whether UI/UX review should be recommended or is explicitly required. This complements `ha-frontend-review`; it does not replace implementation, accessibility, or frontend quality review.

## Early Exit

If the PR already carries the **Needs UX** label, reviewers have already decided to ask designers or UX reviewers for guidance. Do not use this skill to make that recommendation again.

## Triage

1. Classify the user-facing decision.
   - Existing-feature fixes and technical details normally remain with frontend review when they preserve the established experience.
   - New cards, badges, screens, and interaction patterns normally need this readiness check.
2. Check how comparable changes were reviewed.
   - Search frontend pull requests that carry or previously carried **Needs UX**, then inspect their label history, comments, and reviews for relevant UI/UX feedback.
   - Identify relevant UI/UX feedback by its content and surrounding discussion, including comments or reviews that explain design intent, usability concerns, or established patterns. When GitHub provides `author_association`, prioritise feedback marked `MEMBER`.
   - Read the substantive feedback and later label events. Label removal can confirm that the workflow gate moved on, but it is not proof of approval without the surrounding discussion.
   - Prefer recent reviews of similar interactions or components. Summarise the guidance from the feedback instead of keeping a reviewer list or treating one old decision as a permanent rule.
3. Gather the evidence that settles the direction.
   - Prefer explicit UI/UX approval, current repository guidance, and direct maintainer or workflow instructions over inference.
   - Treat linked tasks as strong evidence of the problem and stated requirements, but not as automatic UI/UX approval.
   - An established pattern can settle the direction when the change follows it. Examples include using the same input layout as an existing screen or reusing an appropriate `ha-*` component instead of introducing a raw input or an ad hoc control.
   - Treat insufficient or conflicting evidence as unresolved, not as approval or a requirement.
4. Select exactly one route below and state the evidence supporting it.

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
- **Established patterns:** relevant gallery guidance, production designs, and shared `ha-*` components for the next reviewer to compare
- **Supporting evidence:** approval, guidance, established patterns, task requirements, direct instructions, or the evidence gap or conflict
- **Next action:** the review action implied by the route

Separate whether the UI/UX direction is settled from whether the implementation is correct.
