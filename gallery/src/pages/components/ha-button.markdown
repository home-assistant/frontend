---
title: Button
---

<style>
  .wrapper {
    display: flex;
    gap: 24px;
  }
</style>

# Button `<ha-button>`

## Implementation

### Example Usage

<div class="wrapper">
  <ha-button>
    simple button
  </ha-button>
  <ha-button appearance="plain">
    plain button
  </ha-button>
  <ha-button appearance="filled">
    filled button
  </ha-button>

  <ha-button size="s">
    small
  </ha-button>
</div>

```html
<ha-button> simple button </ha-button>

<ha-button size="s"> small </ha-button>
```

### Icons in the `xs` size

Avoid icons in `xs` buttons. At 24px the label carries the meaning on its own, and a
16px glyph next to it adds visual noise without adding information.

Use an icon only when the button needs to be recognized at a glance in a dense layout,
and only when the glyph is a common one users can identify from its silhouette alone,
such as close, add, or settings. A detailed or unfamiliar glyph is unreadable at this
size and should be replaced by the label alone.

### API

This component is based on the webawesome button component.
Check the [webawesome documentation](https://webawesome.com/docs/components/button/) for more details.

**Slots**

- default slot: Label of the button
  ` - no default
- `start`: The prefix container (usually for icons).
  ` - no default
- `end`: The suffix container (usually for icons).
  ` - no default

**Properties/Attributes**

| Name       | Type                                           | Default  | Description                                                                       |
| ---------- | ---------------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| appearance | "accent"/"filled"/"plain"                      | "accent" | Sets the button appearance.                                                       |
| variants   | "brand"/"danger"/"neutral"/"warning"/"success" | "brand"  | Sets the button color variant. "brand" is default.                                |
| size       | "xs"/"s"/"m"/"l"/"xl"                          | "m"      | Sets the button size.                                                             |
| loading    | Boolean                                        | false    | Shows a loading indicator instead of the buttons label and disable buttons click. |
| disabled   | Boolean                                        | false    | Disables the button and prevents user interaction.                                |

**CSS Custom Properties**

- `--ha-button-height` - Height of the button.
- `--ha-button-border-radius` - Border radius of the button. Defaults to `var(--ha-border-radius-pill)`.
