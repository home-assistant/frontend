---
title: Tooltip
---

A tooltip's target is its _first child element_, so you should only wrap one element inside of the tooltip. If you need the tooltip to show up for multiple elements, nest them inside a container first.

Tooltips use `display: contents` so they won't interfere with how elements are positioned in a flex or grid layout.

<ha-button id="hover">Hover Me</ha-button>
<ha-tooltip for="hover">
This is a tooltip
</ha-tooltip>

```
<ha-button id="hover">Hover Me</ha-button>
<ha-tooltip for="hover">
This is a tooltip
</ha-tooltip>
```

## Documentation

This element is based on webawesome `wa-tooltip` it only sets some css tokens and has a custom show/hide animation.

<a href="https://webawesome.com/docs/components/tooltip/" target="_blank" rel="noopener noreferrer">Webawesome documentation</a>

### HA style tokens

In your theme settings use this without the prefixed `--`.

- `--ha-tooltip-border-radius` (Default: 4px)
- `--ha-tooltip-arrow-size` (Default: 8px)
- `--wa-tooltip-font-family` (Default: `var(--ha-font-family-body)`)
- `--ha-tooltip-font-size` (Default: `var(--ha-font-size-s)`)
- `--wa-tooltip-font-weight` (Default: `var(--ha-font-weight-normal)`)
- `--wa-tooltip-line-height` (Default: `var(--ha-line-height-condensed)`)
