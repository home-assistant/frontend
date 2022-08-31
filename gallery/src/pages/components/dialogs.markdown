---
title: Dialgos
subtitle: Dialogs provide important prompts in a user flow.
---

# Material Desing 3

Our dialogs are based on the latest version of Material Design. Specs and guidelines can be found on it's [website](https://m3.material.io/components/dialogs/overview). 

# Extra guidelines

## Content
* A best practice is to always use a title, even if it is optional by Material guidelines.
* People mainly read the title and a button. Put the most important information in those two.
* Try to avoid user generated content in the title, this could make the title unreadable long.
* If users become unsure, they read the description. Make sure this explains what will happen.
* Strive for minimalism.

## Buttons
* When adding an action button, there should always be a `Cancel` button
* Keep the labels short, for example `Save`, `Delete`, `Enable`.
* Destructive actions should be a red warning button.
* Try to avoid three buttons in one dialog. Especially when you leave the dialog task unfinished.

## X-icon
* Is it an alert or confirmation dialog? Then there are only buttons and no X-icon.
* Contains the dialog a form that can be saved, then it should have a X-icon to discard all changes and exit.


## Example
### Confirmation dialog
> **Delete dashboard?**
> 
> Dashboard [dashboard name] will be permanently deleted from Home Assistant.
> 
> Cancel / Delete
