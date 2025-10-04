# 🤖 GitHub Bot Requirements for Home Assistant PRs

## What the Bot is Checking

When the home-assistant[bot] says **"Requested changes must be addressed"**, it's typically checking for:

### 1. **CLA (Contributor License Agreement)** ⚠️ MOST COMMON

- ✅ **Action Required:** Sign the CLA at the link the bot provides
- The bot will comment with a link like: "Please sign our CLA"
- This is REQUIRED for ALL first-time contributors
- Only needs to be done ONCE for your GitHub account

### 2. **Draft Status** ✅ YOU MENTIONED THIS

- If your PR is in "Draft" mode, it cannot be merged
- **Action Required:** Click "Ready for review" button on the PR page
- Look for the green button that says "Ready for review" near the top

### 3. **CI/CD Checks** (Automatic Tests)

The bot runs automatic checks:

- ✅ Linting (ESLint, Prettier)
- ✅ TypeScript compilation
- ✅ Unit tests
- ✅ Build verification

If these fail, you'll see red X marks on your PR.

## 🔍 How to Check What the Bot Wants

Since I can't access your GitHub PR directly, here's what YOU need to check:

### Step 1: Look at the PR Page

Visit your PR: https://github.com/home-assistant/frontend/pull/[YOUR_PR_NUMBER]

### Step 2: Check for Bot Comments

Scroll down to the comments section. The bot will tell you exactly what's needed:

**Common Bot Messages:**

#### Message 1: CLA Not Signed

```
🤖 @lesliefdo08, thanks for your PR!

Before we can merge this, we need you to sign our Contributor License Agreement.

👉 Click here to sign: [LINK]
```

**Solution:** Click the link and sign the CLA

#### Message 2: Draft PR

```
This pull request is in draft mode and cannot be reviewed yet.
```

**Solution:** Click "Ready for review" button at the top of the PR

#### Message 3: CI/CD Failures

```
Some checks haven't completed yet
❌ Lint / ESLint
❌ TypeScript check
```

**Solution:** Check the logs and fix the errors

#### Message 4: Merge Conflicts

```
This branch has conflicts that must be resolved
```

**Solution:** Rebase your branch on latest dev

## 🎯 Most Likely Issue: Draft Mode + CLA

Based on what you said, you have TWO issues:

### Issue 1: PR is in Draft Mode ⚠️

**How to Fix:**

1. Go to your PR page
2. Look for a green button near the top that says **"Ready for review"**
3. Click it
4. The PR will move from Draft → Open

### Issue 2: CLA Not Signed (probably) ⚠️

**How to Fix:**

1. Look for a bot comment asking you to sign the CLA
2. Click the link in the comment
3. Sign the agreement with your GitHub account
4. The bot will automatically update the PR status

## 📋 Your ARIA PR Checklist

Let me verify your changes are correct:

### ✅ Changes Look Good!

Your diff shows:

```diff
- role="seperator"  ❌ Wrong spelling
+ role="separator"  ✅ Correct spelling
```

You fixed 4 instances - PERFECT! ✅

### Your Changes:

- Line 322: `role="separator"` ✅
- Line 334: `role="separator"` ✅
- Line 349: `role="separator"` ✅
- Line 351: `role="separator"` ✅

All 4 fixes are correct!

## 🚀 Action Plan for Your ARIA PR

### Step 1: Remove Draft Status

1. Visit: https://github.com/home-assistant/frontend/pull/[YOUR_PR_NUMBER]
2. Find the "Ready for review" button (it's green, near the top)
3. Click it

### Step 2: Sign CLA (if bot asks)

1. Look for bot comment
2. Click CLA link
3. Sign agreement
4. Wait for bot to confirm

### Step 3: Wait for CI/CD Checks

The bot will automatically run:

- ESLint ✓
- Prettier ✓
- TypeScript ✓
- Build ✓

These should all pass since you only changed 4 strings.

### Step 4: Wait for Review

After passing checks:

- A maintainer will review (1-7 days)
- They might request changes or approve
- Be responsive to feedback

## 💡 Tips

1. **Don't make changes while in Draft mode** - Move to "Ready for review" first
2. **Sign CLA immediately** - Don't wait, do it as soon as bot asks
3. **Be patient** - Reviews can take time
4. **Check your PR daily** - Respond to comments within 24 hours

## 🎯 What You Should See After Fixing

Once you:

- ✅ Mark as "Ready for review"
- ✅ Sign CLA

The bot status should change from:

- ❌ "Requested changes must be addressed"

To:

- ✅ "All checks have passed" or "Waiting for review"

## 📧 How to Tell Me What Happened

After you fix the Draft status and sign CLA, tell me:

1. What did the bot comment say?
2. Did you click "Ready for review"?
3. Did you sign the CLA?
4. Are the CI/CD checks passing (green checkmarks)?

I'll help you with any other issues!

---

## 🎉 Remember

Your code changes are CORRECT! ✅

The bot is just asking for administrative stuff:

- Remove draft status
- Sign legal agreement

These are standard for ALL first-time contributors. You're doing great! 💪
