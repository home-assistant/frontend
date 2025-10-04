# Pull Request Template for Home Assistant Frontend

## Copy this when creating your PR:

---

## Proposed change

Fixes typo in ARIA role attribute from `role="seperator"` to `role="separator"` in the todo-list Lovelace card component (`hui-todo-list-card.ts`).

The misspelling "seperator" is not a valid ARIA role and could cause issues with screen readers and other assistive technologies. The correct spelling is "separator" as defined in the ARIA specification.

## Type of change

- [x] Bugfix (non-breaking change which fixes an issue)
- [x] Accessibility improvement

## Additional information

- **4 instances fixed** in the same file:
  1. Reorder items header (line ~322)
  2. Unchecked items header (line ~334)
  3. No status items divider (line ~349)
  4. No status items header (line ~351)

- This improves accessibility for users relying on screen readers
- No functional changes - only corrects HTML attribute values
- Aligns with WCAG accessibility guidelines and ARIA specifications

## Related issue (if applicable)

N/A - Found during code review

## Checklist

- [x] The code change is tested and works locally
- [x] Local tests pass (changes are non-functional, attribute corrections only)
- [x] The code has been formatted using Prettier
- [x] Documentation added/updated (not needed - typo fix)
- [x] Link added to documentation (not applicable)
- [x] Translation(s) added/updated (not applicable)

---

## Additional Notes for Reviewers

This is a straightforward typo correction that improves accessibility compliance. The change is minimal and low-risk, affecting only ARIA role attributes used for semantic HTML structure.

**Before:**

```typescript
<div class="header" role="seperator">  // Typo: "seperator"
```

**After:**

```typescript
<div class="header" role="separator">  // Correct: "separator"
```

**ARIA Specification Reference:**

- [WAI-ARIA separator role](https://www.w3.org/TR/wai-aria-1.2/#separator)

---

**Contribution made as part of Hacktoberfest 2025** 🎃
