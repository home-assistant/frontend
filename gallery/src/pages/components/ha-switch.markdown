---
title: Switch / Toggle
---

<style>
  .wrapper {
    display: flex;
    gap: 24px;
    align-items: center;
  }
</style>

# Switch `<ha-switch>`

A toggle switch representing two states: on and off.

## Implementation

### Example usage

<div class="wrapper">
  <ha-switch checked></ha-switch>
  <ha-switch></ha-switch>
  <ha-switch disabled></ha-switch>
  <ha-switch disabled checked></ha-switch>
</div>

```html
<ha-switch checked></ha-switch>

<ha-switch></ha-switch>

<ha-switch disabled></ha-switch>

<ha-switch disabled checked></ha-switch>
```

### API

This component is based on the webawesome switch component.
Check the [webawesome documentation](https://webawesome.com/docs/components/switch/) for more details.

**Properties/Attributes**

| Name     | Type    | Default | Description                                                                                                         |
| -------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| checked  | Boolean | false   | The checked state of the switch.                                                                                    |
| disabled | Boolean | false   | Disables the switch and prevents user interaction.                                                                  |
| required | Boolean | false   | Makes the switch a required field.                                                                                  |
| haptic   | Boolean | false   | Enables haptic vibration on toggle. Only use when the new state is applied immediately (not when save is required). |

**CSS Custom Properties**

- `--ha-switch-size` - The size of the switch track height. Defaults to `24px`.
- `--ha-switch-thumb-size` - The size of the thumb. Defaults to `18px`.
- `--ha-switch-width` - The width of the switch track. Defaults to `48px`.
- `--ha-switch-thumb-box-shadow` - The box shadow of the thumb. Defaults to `var(--ha-box-shadow-s)`.
- `--ha-switch-background-color` - Background color of the unchecked track.
- `--ha-switch-thumb-background-color` - Background color of the unchecked thumb.
- `--ha-switch-background-color-hover` - Background color of the unchecked track on hover.
- `--ha-switch-thumb-background-color-hover` - Background color of the unchecked thumb on hover.
- `--ha-switch-border-color` - Border color of the unchecked track.
- `--ha-switch-thumb-border-color` - Border color of the unchecked thumb.
- `--ha-switch-thumb-border-color-hover` - Border color of the unchecked thumb on hover.
- `--ha-switch-checked-background-color` - Background color of the checked track.
- `--ha-switch-checked-thumb-background-color` - Background color of the checked thumb.
- `--ha-switch-checked-background-color-hover` - Background color of the checked track on hover.
- `--ha-switch-checked-thumb-background-color-hover` - Background color of the checked thumb on hover.
- `--ha-switch-checked-border-color` - Border color of the checked track.
- `--ha-switch-checked-thumb-border-color` - Border color of the checked thumb.
- `--ha-switch-checked-border-color-hover` - Border color of the checked track on hover.
- `--ha-switch-checked-thumb-border-color-hover` - Border color of the checked thumb on hover.
- `--ha-switch-disabled-opacity` - Opacity of the switch when disabled. Defaults to `0.2`.
- `--ha-switch-required-marker` - The marker shown after the label for required fields. Defaults to `"*"`.
- `--ha-switch-required-marker-offset` - Offset of the required marker. Defaults to `0.1rem`.
