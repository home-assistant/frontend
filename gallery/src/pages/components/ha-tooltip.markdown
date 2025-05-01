---
title: Tooltip
---

A tooltip's target is its _first child element_, so you should only wrap one element inside of the tooltip. If you need the tooltip to show up for multiple elements, nest them inside a container first.

Tooltips use `display: contents` so they won't interfere with how elements are positioned in a flex or grid layout.

<ha-tooltip content="This is a tooltip">
  <ha-button>Hover Me</ha-button>
</ha-tooltip>

```
<ha-tooltip content="This is a tooltip">
  <ha-button>Hover Me</ha-button>
</ha-tooltip>
```

## Documentation

This element is based on shoelace `sl-tooltip` it only sets some css tokens and has a custom show/hide animation.

<a href="https://shoelace.style/components/tooltip" target="_blank" rel="noopener noreferrer">Shoelace documentation</a>

### HA style tokens

In your theme settings use this without the prefixed `--`.

- `--ha-tooltip-border-radius` (Default: 4px)
- `--ha-tooltip-arrow-size` (Default: 8px)
- `--sl-tooltip-font-family` (Default: `var(--ha-font-family-body)`)
- `--ha-tooltip-font-size` (Default: `var(--ha-font-size-s)`)
- `--sl-tooltip-font-weight` (Default: `var(--ha-font-weight-normal)`)
- `--sl-tooltip-line-height` (Default: `var(--ha-line-height-condensed)`)
