---
title: Dialog
subtitle: Dialogs provide important prompts in a user flow.
---

# Material Design 3

Our dialogs are based on the latest version of Material Design. Please note that we have made some well-considered adjustments to these guideliness. Specs and guidelines can be found on its [website](https://m3.material.io/components/dialogs/overview).

# Guidelines

## Design

- Dialogs have a max width of 560px. Alert and confirmation dialogs got a fixed width of 320px. If you need more width, consider a dedicated page instead.
- The close X-icon is on the top left, on all screen sizes. Except for alert and confirmation dialogs, they only have buttons and no X-icon. This is different compared to the Material guideliness.
- Dialogs can't be closed with ESC or clicked outside of the dialog when there is a form that the user needs to fill out. Instead it will animate "no" by a little shake.
- Extra icon buttons are on the top right, for example help, settings and expand dialog. More than 2 icon buttons, they will be in an overflow menu.
- The submit button is grouped with a cancel button at the bottom right, on all screen sizes. Fullscreen mobile dialogs have them sticky at the bottom.
- Keep the labels short, for example `Save`, `Delete`, `Enable`.
- Dialog with actions must always have a discard button. On desktop a `Cancel` button and X-icon, on mobile only the X-icon.
- Destructive actions should be a red warning button.
- Alert or confirmation dialogs only have buttons and no X-icon.
- Try to avoid three buttons in one dialog. Especially when you leave the dialog task unfinished.

## Content

- A best practice is to always use a title, even if it is optional by Material guidelines.
- People mainly read the title and a button. Put the most important information in those two.
- Try to avoid user generated content in the title, this could make the title unreadable long.
- If users become unsure, they read the description. Make sure this explains what will happen.
- Strive for minimalism.

## Example

### Confirmation dialog

> **Delete dashboard?**
>
> Dashboard [dashboard name] will be permanently deleted from Home Assistant.
>
> Cancel / Delete
