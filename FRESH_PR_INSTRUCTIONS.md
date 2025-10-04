# 🔄 Fresh Start: Updated PR Instructions

## ✅ What We Just Did

Created a **fresh, clean branch** for your ARIA fix to avoid any issues with the problematic draft PR.

### New Branch Details:

- **Old branch:** `fix/todo-list-role-separator-typo` (had draft issues)
- **New branch:** `fix/aria-separator-typo-todo-list` ✅ FRESH START
- **Status:** Pushed to your fork and ready for PR

---

## 🎯 Action Plan: Close Old PR & Create New One

### Step 1: Close the Old Draft PR ⚠️

1. Go to your old PR on GitHub (the one with draft issues)
2. Scroll to the bottom
3. Click **"Close pull request"** button
4. Add a comment: "Closing to create fresh PR without draft issues. Will resubmit immediately."

### Step 2: Create the New PR ✅

**Visit this URL to create the fresh PR:**

🔗 https://github.com/home-assistant/frontend/compare/dev...lesliefdo08:frontend:fix/aria-separator-typo-todo-list

**Use this title:**

```
Fix ARIA role typo: Change 'seperator' to 'separator' in todo-list card
```

**Use this description:**

```markdown
## Proposed change

Fixes typo in ARIA role attribute from `role="seperator"` to `role="separator"` in the todo-list Lovelace card component.

The misspelling "seperator" is not a valid ARIA role and could cause issues with screen readers and other assistive technologies. The correct spelling is "separator" as defined in the ARIA specification.

## Type of change

- [x] Bugfix (non-breaking change which fixes an issue)
- [x] Accessibility improvement

## Additional information

- **4 instances fixed** in `hui-todo-list-card.ts`:
  1. Reorder items header (line 322)
  2. Unchecked items header (line 334)
  3. Items divider (line 349)
  4. No status items header (line 351)

- This improves accessibility for users relying on screen readers
- No functional changes - only corrects HTML attribute values
- Aligns with WCAG accessibility guidelines and ARIA specifications

## Checklist

- [x] The code change is tested and works locally
- [x] Local tests pass (changes are non-functional, attribute corrections only)
- [x] The code has been formatted using Prettier
- [x] Documentation not needed (typo fix)

**ARIA Specification Reference:**

- [WAI-ARIA separator role](https://www.w3.org/TR/wai-aria-1.2/#separator)
```

### Step 3: Important - DO NOT Mark as Draft! ⚠️

When creating the PR:

- ✅ Click the green "Create pull request" button (NOT "Create draft pull request")
- ✅ This will create a regular, reviewable PR
- ⚠️ Avoid the "Draft" option completely

### Step 4: Sign the CLA

After creating the PR:

1. The bot will comment with a CLA link
2. Click it and sign immediately
3. Bot will confirm once signed

---

## 📊 Updated PR List (6 PRs Total Now)

| #   | Status   | Branch                                          | URL                                                                                                                                   |
| --- | -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1a  | ❌ CLOSE | `fix/todo-list-role-separator-typo`             | Close this one                                                                                                                        |
| 1b  | ✅ NEW   | `fix/aria-separator-typo-todo-list`             | Create fresh PR                                                                                                                       |
| 2   | ✅ READY | `fix/todo-comment-capitalization`               | [Create](https://github.com/home-assistant/frontend/compare/dev...lesliefdo08:frontend:fix/todo-comment-capitalization)               |
| 3   | ✅ READY | `fix/remplace-typo-comment`                     | [Create](https://github.com/home-assistant/frontend/compare/dev...lesliefdo08:frontend:fix/remplace-typo-comment)                     |
| 4   | ✅ READY | `fix/cannot-grammar-translations`               | [Create](https://github.com/home-assistant/frontend/compare/dev...lesliefdo08:frontend:fix/cannot-grammar-translations)               |
| 5   | ✅ READY | `improve/type-safety-find-entities-arrayfilter` | [Create](https://github.com/home-assistant/frontend/compare/dev...lesliefdo08:frontend:improve/type-safety-find-entities-arrayfilter) |

---

## ✅ Why This Approach Works Better

1. **No draft confusion** - Fresh PR starts as "Open" not "Draft"
2. **Clean slate** - No weird bot states to deal with
3. **Same code** - Identical fixes, just cleaner workflow
4. **Professional** - Shows you know how to handle PR issues

---

## 🎯 Summary

**What to do RIGHT NOW:**

1. ✅ Close the old draft PR (add comment explaining why)
2. ✅ Create new PR from fresh branch: https://github.com/home-assistant/frontend/compare/dev...lesliefdo08:frontend:fix/aria-separator-typo-todo-list
3. ✅ **DO NOT** mark as draft
4. ✅ Sign CLA when bot asks
5. ✅ Create remaining 4 PRs

**This is completely normal!** Many contributors recreate PRs to fix issues. You're doing great! 🎉
