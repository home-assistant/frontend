---
title: List
---

# List

The list family provides accessible, keyboard-navigable list containers and
item variants. Pick the container based on semantics, then the item based on
interactivity.

## Containers

### `<ha-list-base>`

A styled container with roving-tabindex keyboard navigation. Host role is
`list`. Children should be `<ha-list-item-*>`. Arrow keys rove focus;
Home/End jump to the first/last enabled item; Enter/Space activates the
focused item.

**Properties**

| Name         | Type    | Default | Description                    |
| ------------ | ------- | ------- | ------------------------------ |
| `wrap-focus` | Boolean | false   | Arrow keys wrap past the ends. |
| `aria-label` | String  | —       | Accessible name.               |

**Events**

- `ha-list-items-updated` — items added/removed.
- `ha-list-activated` — Enter/Space on a focused item. Detail `{ index, item }`.

**CSS custom properties**

- `--ha-list-gap` — spacing between items.
- `--ha-list-padding` — padding around the list.

### `<ha-list-selectable>`

Selectable list. Host role is `listbox`; items must be `<ha-list-item-option>`
(role `option`). Set `multi` for multi-select.

Fires `ha-list-selected` on change with detail
`{ index: number | Set<number>, diff: { added, removed } }`.

### `<ha-list-nav>`

Same as `ha-list-base`, but wrapped in a `<nav>` landmark
(`<nav><div role="list">…</div></nav>`). Use `aria-label` to name the
landmark. Items should be `<ha-list-item-button>` with an `href`.

## Items

### `<ha-list-item-base>`

Non-interactive base row. Host role is `listitem`.

- Slots: `start`, `end`, `headline`, `supporting-text`, `content`
- Parts: `base`, `start`, `content`, `headline`, `supporting-text`, `end`

### `<ha-list-item-button>`

Interactive row. Renders an inner `<a>` when `href` is set, otherwise a
`<button>`. When placed inside a list using roving tabindex, the host is the
tab stop and the inner button/anchor has `tabindex="-1"`.

### `<ha-list-item-option>`

Selectable row. Host role is `option`. Reflects `aria-selected`. Typically
placed inside `<ha-list-selectable>`; the parent listbox owns selection state and
toggles `selected` on this item.

- `appearance="line" | "checkbox"` (default `line`)
- `selection-position="start" | "end"` (default `start`, only meaningful with checkbox)
- `selected: boolean`, `value?: string`, `disabled: boolean`

**Events**

- `item-toggle` — `{ checked: boolean }` — fired when the checkbox toggles.
  The consumer is the source of truth for `checked`.
- `item-click` — fired when the row body is activated (mouse anywhere except
  the checkbox, or Enter on the focused row).

**Props**

- `checked: boolean` — reflected as `checked` attribute.
- `checkbox-end: boolean` — place the checkbox at the trailing side (default: start).
- `disabled: boolean`.
- plus everything on `ha-list-item-base`.
