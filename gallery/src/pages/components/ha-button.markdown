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

  <ha-button size="small">
    small
  </ha-button>
</div>

```html
<ha-button> simple button </ha-button>

<ha-button size="small"> small </ha-button>
```

### API

This component is based on the shoelace button component.
Check the [shoelace documentation](https://shoelace.style/components/button) for more details.

**Slots**

- default slot: Label of the button
  ` - no default
- `prefix`: The prefix container (usually for icons).
  ` - no default
- `suffix`: The suffix container (usually for icons).
  ` - no default

**Properties/Attributes**

| Name        | Type                                             | Default   | Description                                          |
| ----------- | ------------------------------------------------ | --------- | ---------------------------------------------------- |
| appearance  | "accent"/"filled"/"plain"                        | "accent"  | Sets the button appearance.                          |
| variants    | "primary"/"danger"/"neutral"/"warning"/"success" | "primary" | Sets the button color variant. "primary" is default. |
| size        | "small"/"medium"                                 | "medium"  | Sets the button size.                                |
| hideContent | Boolean                                          | false     | Hides the button content (for overlays)              |

**CSS Custom Properties**

- `--ha-button-font-family` - Font family for the button text.
- `--ha-button-font-weight` - buttons font weight.
- `--ha-button-font-size` - Font weight for the button text.
- `--ha-button-height` - Height of the button.
- `--ha-button-padding-inline-start` - padding for the button text on the left side.
- `--ha-button-padding-inline-end` - padding for the button text on the right side.
- `--ha-button-border-radius` - Border radius for the button.
- `--ha-button-border-width` - Border width for the button.
- `--ha-button-theme-color` - Main color for the button.
- `--ha-button-theme-dark-color` - Dark variant of the main color.
- `--ha-button-theme-darker-color` - Dark variant of the main color.
- `--ha-button-theme-light-color` - Light variant of the main color.
- `--ha-button-text-color` - Text color for the button.
- `--ha-button-focus-ring-color` - Focus ring color for the button.
- `--ha-button-primary-color` - Main color for the primary variant.
- `--ha-button-primary-light-color` - Light color for the primary variant.
- `--ha-button-primary-dark-color` - Dark color for the primary variant.
- `--ha-button-primary-darker-color` - Darker color for the primary variant.
- `--ha-button-error-color` - Main color for the error variant.
- `--ha-button-error-light-color` - Light color for the error variant.
- `--ha-button-error-dark-color` - Dark color for the error variant.
- `--ha-button-error-darker-color` - Darker color for the error variant.
- `--ha-button-neutral-color` - Main color for the neutral variant.
- `--ha-button-neutral-light-color` - Light color for the neutral variant.
- `--ha-button-neutral-dark-color` - Dark color for the neutral variant.
- `--ha-button-neutral-darker-color` - Darker color for the neutral variant.
- `--ha-button-warning-color` - Main color for the warning variant.
- `--ha-button-warning-light-color` - Light color for the warning variant.
- `--ha-button-warning-dark-color` - Dark color for the warning variant.
- `--ha-button-warning-darker-color` - Darker color for the warning variant.
- `--ha-button-success-color` - Main color for the success variant.
- `--ha-button-success-light-color` - Light color for the success variant.
- `--ha-button-success-dark-color` - Dark color for the success variant.
- `--ha-button-success-darker-color` - Darker color for the success variant.
