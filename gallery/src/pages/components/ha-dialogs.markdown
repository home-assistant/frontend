---
title: Dialog
subtitle: Dialogs provide important prompts in a user flow.
---

# Material Design 3

Our dialogs are based on the latest version of Material Design. Specs and guidelines can be found on its [website](https://m3.material.io/components/dialogs/overview).

# Highlighted guidelines

## Content

- A best practice is to always use a title, even if it is optional by Material guidelines.
- People mainly read the title and a button. Put the most important information in those two.
- Try to avoid user generated content in the title, this could make the title unreadable long.
- If users become unsure, they read the description. Make sure this explains what will happen.
- Strive for minimalism.

## Buttons and X-icon

- Keep the labels short, for example `Save`, `Delete`, `Enable`.
- Dialog with actions must always have a discard button. On desktop a `Cancel` button and X-icon, on mobile only the X-icon.
- Destructive actions should be a red warning button.
- Alert or confirmation dialogs only have buttons and no X-icon.
- Try to avoid three buttons in one dialog. Especially when you leave the dialog task unfinished.

## Example

### Confirmation dialog

> **Delete dashboard?**
>
> Dashboard [dashboard name] will be permanently deleted from Home Assistant.
>
> Cancel / Delete
