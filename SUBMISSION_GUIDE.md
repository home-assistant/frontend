# Step-by-Step Guide to Submit Your Contribution

## Current Status ✅

- [x] Branch created: `fix/todo-list-role-separator-typo`
- [x] Code fixed: Changed `role="seperator"` to `role="separator"`
- [x] Changes committed with descriptive message
- [x] Local repository ready

## What You Need to Do Next

### Step 1: Create/Verify Your GitHub Fork

1. Go to: https://github.com/home-assistant/frontend
2. Click the "Fork" button in the top right
3. Wait for the fork to complete
4. Your fork will be at: `https://github.com/YOUR_USERNAME/frontend`

### Step 2: Add Your Fork as a Remote

Open PowerShell in this directory and run:

```powershell
# Replace YOUR_USERNAME with your actual GitHub username
git remote add myfork https://github.com/YOUR_USERNAME/frontend.git

# Verify the remote was added
git remote -v
```

You should see:

```
myfork  https://github.com/YOUR_USERNAME/frontend.git (fetch)
myfork  https://github.com/YOUR_USERNAME/frontend.git (push)
origin  https://github.com/home-assistant/frontend (fetch)
origin  https://github.com/home-assistant/frontend (push)
```

### Step 3: Push Your Branch to Your Fork

```powershell
git push myfork fix/todo-list-role-separator-typo
```

If this is your first time pushing, you might need to authenticate with GitHub.

### Step 4: Create the Pull Request

1. **Go to your fork**: `https://github.com/YOUR_USERNAME/frontend`

2. **You'll see a yellow banner** saying "fix/todo-list-role-separator-typo had recent pushes"
   - Click the green "Compare & pull request" button

   OR

3. **Manually create PR**:
   - Click "Pull requests" tab
   - Click "New pull request"
   - Click "compare across forks"
   - Set:
     - **Base repository**: `home-assistant/frontend`
     - **Base branch**: `dev`
     - **Head repository**: `YOUR_USERNAME/frontend`
     - **Compare branch**: `fix/todo-list-role-separator-typo`

4. **Fill in the PR form**:
   - **Title**: `Fix ARIA role typo in todo-list card (seperator → separator)`
   - **Description**: Copy from `PR_TEMPLATE_DRAFT.md` file I created
5. **Click "Create pull request"**

### Step 5: Sign the Contributor License Agreement (CLA)

1. After creating your PR, a bot will comment on it
2. The bot will ask you to sign the CLA
3. Click the link provided by the bot
4. Read and sign the agreement
5. Return to your PR - the bot will update the status

### Step 6: Wait for Review

- Maintainers will review your PR
- They might request changes or ask questions
- Be responsive to feedback
- Once approved, they'll merge it!

---

## Troubleshooting

### If you get "Permission denied" when pushing:

1. Make sure you've forked the repository
2. Check your remote URL is correct
3. You might need to authenticate via GitHub CLI or Personal Access Token

### If you need to update your PR:

```powershell
# Make changes to the file
git add src/panels/lovelace/cards/hui-todo-list-card.ts
git commit -m "Address review feedback"
git push myfork fix/todo-list-role-separator-typo
```

The PR will automatically update!

### If you want to sync with latest dev branch:

```powershell
git checkout dev
git pull origin dev
git checkout fix/todo-list-role-separator-typo
git rebase dev
git push myfork fix/todo-list-role-separator-typo --force
```

---

## Verification Commands

Before pushing, verify everything is correct:

```powershell
# Check current branch
git branch

# Should show: * fix/todo-list-role-separator-typo

# Check what changed
git show HEAD

# Check remote configuration
git remote -v

# View commit history
git log --oneline -3
```

---

## Quick Reference - All Commands in Order

```powershell
# 1. Add your fork (replace YOUR_USERNAME)
git remote add myfork https://github.com/YOUR_USERNAME/frontend.git

# 2. Push your branch
git push myfork fix/todo-list-role-separator-typo

# 3. Go to GitHub and create PR
# (Use web interface)

# 4. After PR is merged, clean up
git checkout dev
git pull origin dev
git branch -d fix/todo-list-role-separator-typo
```

---

## What This Contribution Demonstrates

✅ **Attention to detail** - Found and fixed subtle typo  
✅ **Accessibility awareness** - Understands importance of ARIA roles  
✅ **Git workflow knowledge** - Proper branching and commits  
✅ **Documentation skills** - Clear commit messages and PR description  
✅ **Code quality focus** - Makes codebase better for all users

---

## Success Criteria

Your contribution is successful when:

- ✅ PR is created
- ✅ CLA is signed
- ✅ CI/CD checks pass (automatic)
- ✅ Maintainer reviews and approves
- ✅ PR is merged into `dev` branch
- ✅ You get the Hacktoberfest contribution credit! 🎉

---

**Need Help?**

- Check the PR_TEMPLATE_DRAFT.md for the PR description
- Check HACKTOBERFEST_CONTRIBUTION.md for detailed info
- Review Home Assistant's contributing guidelines
- Ask questions in the PR comments if needed

**Good luck! You've got this! 🚀**
