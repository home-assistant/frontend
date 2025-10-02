---
title: Slider
subtitle: A slider component for selecting a value from a range.
---

<style>
  .wrapper {
    display: flex;
    gap: 24px;
  }
</style>

# Slider `<ha-slider>`

## Implementation

### Example Usage

<div class="wrapper">
  <ha-slider size="small" with-markers min="0" max="8" value="4"></ha-slider>
  <ha-slider size="medium"></ha-slider>
</div>

```html
<ha-slider size="small" with-markers min="0" max="8" value="4"></ha-slider>
<ha-slider size="medium"></ha-slider>
```

### API

This component is based on the webawesome slider component.
Check the [webawesome documentation](https://webawesome.com/docs/components/slider/) for more details.

**CSS Custom Properties**

- `--ha-slider-track-size` - Height of the slider track. Defaults to `4px`.
