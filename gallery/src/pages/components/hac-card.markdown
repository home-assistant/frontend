---
title: Card
subtitle: First component of the HAC component library
---

# Card `<hac-card>` and header `<hac-header>`

`hac-card` groups related content. It is a plain container with three slots
(`header`, default and `footer`) and no required class names. `hac-header` is a
separate part that can be used inside a card or any other container.

## Implementation

### Slots of `hac-card`

| Slot     | Description                                          |
| -------- | ---------------------------------------------------- |
| `header` | Header of the card, usually a `hac-header`.          |
| default  | Content of the card.                                 |
| `footer` | Footer of the card, e.g. actions. Hidden when empty. |

### Slots of `hac-header`

| Slot       | Description                       |
| ---------- | --------------------------------- |
| default    | Title.                            |
| `icon`     | Icon before the title.            |
| `subtitle` | Secondary text below the title.   |
| `actions`  | Actions at the end of the header. |
