---
name: ha-frontend-copy
description: Home Assistant frontend copy, localization, terminology, and user-facing text guidance. Use when adding or reviewing labels, buttons, dialogs, errors, translations, or UI strings.
---

# HA Frontend Copy

Use this skill for all user-facing text, translations, labels, buttons, dialog copy, errors, helper text, and review comments about wording.

## Localization

- All user-facing text must be translatable.
- Add translation keys to `src/translations/en.json` when introducing new strings.
- Use the localization system instead of inline user-visible strings.
- Prefer complete localized strings with placeholders over concatenating translated fragments.
- Give translators enough context through key naming and placeholders.

```ts
this.hass.localize("ui.panel.config.updates.update_available", {
  count: 5,
});
```

## Voice And Style

- Use American English.
- Use a friendly, informational tone.
- Address users directly with "you" and "your" when appropriate.
- Be inclusive, objective, and non-discriminatory.
- Be concise and clear.
- Use active voice.
- Avoid jargon where a familiar home automation term works.
- Always write "Home Assistant" in full. Do not use "HA" or "HASS" in user-facing copy.
- Spell out terms when possible.
- Use sentence case for titles, headings, buttons, labels, and UI elements.
- Use the Oxford comma in lists.
- Prefer "like" over "e.g." and "for example" over "i.e.".
- Avoid all caps for emphasis. Use wording, bold, or italics instead.
- Write for both technical and non-technical users.

Sentence case examples:

- Use: "Create new automation"
- Avoid: "Create New Automation"
- Use: "Device settings"
- Avoid: "Device Settings"

## Terminology

Use "integration" instead of "component" for user-facing product language unless referring to a frontend component in developer context.

Technical product terms are lowercase in prose: automation, entity, device, service.

## Delete, Remove, Create, Add

Use "Remove" for actions that can be restored or reapplied:

- Removing a user's permission.
- Removing a user from a group.
- Removing links between items.
- Removing a widget from a dashboard.
- Removing an item from a cart.

Use "Delete" for permanent, non-recoverable actions:

- Deleting a field.
- Deleting a value in a field.
- Deleting a task.
- Deleting a group.
- Deleting a permission.
- Deleting a calendar event.

Use "Add" for already-existing items:

- Adding a permission to a user.
- Adding a user to a group.
- Adding links between items.
- Adding a widget to a dashboard.
- Adding an item to a cart.

Use "Create" for something made from scratch:

- Creating a new field.
- Creating a new task.
- Creating a new group.
- Creating a new permission.
- Creating a new calendar event.

Create pairs with Delete. Add pairs with Remove.

## Review Checklist

- Text is localized.
- Copy uses sentence case.
- "Home Assistant" is written in full.
- Delete/Remove and Create/Add match recoverability and object lifecycle.
- Placeholders are used instead of string concatenation.
- The wording is concise and understandable without implementation knowledge.
