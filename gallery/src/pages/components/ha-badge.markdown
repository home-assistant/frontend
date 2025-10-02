---
title: Badge
subtitle: Lovelace dashboard badge
---

<style>
  .wrapper {
    display: flex;
    gap: 24px;
  }
</style>

# Badge `<ha-badge>`

The badge component is a small component that displays a number or status information. It is used in the lovelace dashboard on the top.

## Implementation

### Example Usage

<div class="wrapper">
  <ha-badge>
    simple badge
  </ha-badge>

  <ha-badge label="Info">
    With a label
  </ha-badge>

  <ha-badge type="button">
    Type button
  </ha-badge>
</div>

```html
<ha-badge> simple badge </ha-badge>

<ha-badge label="Info"> With a label </ha-badge>

<ha-badge type="button"> Type button </ha-badge>
```

### API

**Slots**

- default slot is the content of the badge
  - no default
- `icon` set the icon of the badge
  - no default

**Properties/Attributes**

| Name     | Type                    | Default     | Description                                                  |
| -------- | ----------------------- | ----------- | ------------------------------------------------------------ |
| type     | `"badge"` or `"button"` | `"badge"`   | If it's button it shows a ripple effect                      |
| label    | string                  | `undefined` | Text label for the badge, only visible if `iconOnly = false` |
| iconOnly | boolean                 | `false`     | Only show label                                              |

**CSS Custom Properties**

- `--ha-badge-size` (default `36px`)
- `--ha-badge-border-radius` (default `calc(var(--ha-badge-size, 36px) / 2)`)
- `--ha-badge-font-size` (default `var(--ha-font-size-s)`)
- `--ha-badge-icon-size` (default `18px`)
