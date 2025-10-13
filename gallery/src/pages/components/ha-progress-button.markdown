---
title: Progress Button
---

<style>
  .wrapper {
    display: flex;
    gap: 24px;
  }
</style>

# Progress Button `<ha-progress-button>`

### API

This component is a wrapper around `<ha-button>` that adds support for showing progress

**Slots**

- default slot: Label of the button
  ` - no default

**Properties/Attributes**

| Name       | Type                                           | Default   | Description                                        |
| ---------- | ---------------------------------------------- | --------- | -------------------------------------------------- |
| label      | string                                         | "accent"  | Sets the button label.                             |
| disabled   | Boolean                                        | false     | Disables the button if true.                       |
| progress   | Boolean                                        | false     | Shows a progress indicator on the button.          |
| appearance | "accent"/"filled"/"plain"                      | "accent"  | Sets the button appearance.                        |
| variants   | "brand"/"danger"/"neutral"/"warning"/"success" | "brand"   | Sets the button color variant. "brand" is default. |
| iconPath   | string                                         | undefined | Sets the icon path for the button.                 |
