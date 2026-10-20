---
title: Button
subtitle: Button group of the HAC component library
---

# Button `<hac-button>` and close button `<hac-button-close>`

The button group of the `@home-assistant/hac` package. Register both with
`import "@home-assistant/hac/button"`.

## `hac-button`

| Slot    | Description                  |
| ------- | ---------------------------- |
| default | Label.                       |
| `icon`  | Icon displayed before label. |

| Property     | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| `appearance` | `filled` (default), `outlined` or `plain`.                   |
| `disabled`   | Disables the button.                                         |
| `label`      | Accessible label, required for buttons without visible text. |

## `hac-button-close`

An icon button with a close icon. Its accessible label defaults to "Close";
set `label` to a translated text. `hac-header` uses it for its `show-close`
option.
