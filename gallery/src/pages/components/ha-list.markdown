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

**Attributes**

| Name         | Type    | Default | Description                    |
| ------------ | ------- | ------- | ------------------------------ |
| `wrap-focus` | Boolean | `false` | Arrow keys wrap past the ends. |
| `aria-label` | String  | —       | Accessible name.               |

**Events**

- `ha-list-activated` — Enter/Space on a focused item. Detail
  `{ index: number, item: HaListItemBase }`.

**Methods**

- `focus()` — focus the active item (or the first focusable one).
- `focusItemAtIndex(index)` — make the item at `index` active and focus it.
- `getActiveItemIndex()` — current active index, or `-1`.
- `setActiveItemIndex(index, focusItem?)` — move the active index without
  necessarily focusing.
- `updateListItems()` — re-discover slotted items (called automatically on
  slotchange).

**CSS parts**

- `base` — the outer `<div role="list">`.

**CSS custom properties**

- `--ha-list-gap` — spacing between items. Defaults to `0`.
- `--ha-list-padding` — padding around the list. Defaults to `0`.

### `<ha-list-selectable>`

Selectable list. Extends `ha-list-base`. Host role is `listbox`; items must be
`<ha-list-item-option>` (role `option`). Set `multi` for multi-select; the
host reflects `aria-multiselectable`.

**Attributes**

| Name    | Type    | Default | Description                            |
| ------- | ------- | ------- | -------------------------------------- |
| `multi` | Boolean | `false` | Allow multiple options to be selected. |

**Events**

- `ha-list-selected` — selection changed. Detail
  `{ index: number | Set<number>, diff: { added: Set<number>, removed: Set<number> } }`.
  `index` is a `number` in single mode (`-1` when nothing selected) and a
  `Set<number>` in multi mode.

**Methods / getters**

- `selected` (getter) — current selection (`number` or `Set<number>`).
- `selectedItems` (getter) — selected `HaListItemOption` elements, in index
  order.
- `setSelected(indices)` — replace the entire selection.
- `select(index)` — add `index` to the selection (replaces in single mode).
- `toggle(index, force?)` — toggle a single index, or force on/off.
- `clearSelection()` — clear all.

### `<ha-list-nav>`

Same as `ha-list-base`, but wrapped in a `<nav>` landmark
(`<nav><div role="list">…</div></nav>`). Use `aria-label` to name the
landmark — the value is forwarded to the inner `<nav>`. Items should be
`<ha-list-item-button>` with an `href`.

**CSS parts**

- `nav` — the `<nav>` wrapper.
- `base` — the inner `<div role="list">`.

## Items

All items inherit from `ha-row-item`, which provides the row layout and the
shared slots/attributes below.

### Shared row layout (`ha-row-item`)

**Slots**

- `start` — leading container (icon/avatar).
- `end` — trailing container (meta/chevron).
- `headline` — primary text (overrides the `headline` attribute).
- `supporting-text` — secondary text (overrides the `supporting-text` attribute).
- `content` — escape hatch: replaces the entire middle column.

**Attributes**

| Name              | Type    | Default | Description                             |
| ----------------- | ------- | ------- | --------------------------------------- |
| `headline`        | String  | —       | Primary text. Overridden by the slot.   |
| `supporting-text` | String  | —       | Secondary text. Overridden by the slot. |
| `disabled`        | Boolean | `false` | Dims the row and blocks pointer events. |

**CSS parts**

`base`, `start`, `content`, `headline`, `supporting-text`, `end`.

**CSS custom properties**

- `--ha-row-item-padding-block` — vertical padding.
- `--ha-row-item-padding-inline` — horizontal padding.
- `--ha-row-item-gap` — gap between `start`, `content`, and `end`.
- `--ha-row-item-min-height` — minimum row height (default `48px`).

### `<ha-list-item-base>`

Non-interactive list row. Host role is `listitem`. Inherits everything from
`ha-row-item`.

**Attributes**

- `interactive` (Boolean, default `false`) — opt this row into the parent
  list's roving tabindex. Useful for sortable rows that need keyboard focus
  but no click action. Interactive subclasses set this automatically.

**CSS custom properties**

- `--ha-list-item-focus-radius` — focus outline border-radius.
- `--ha-list-item-focus-width` — focus outline width (steady state).
- `--ha-list-item-focus-width-start` — focus outline width at the start of
  the focus-in animation.
- `--ha-list-item-focus-offset` — focus outline offset.
- `--ha-list-item-focus-background` — background color on keyboard focus.

### `<ha-list-item-button>`

Interactive row. Renders an inner `<a>` when `href` is set, otherwise a
`<button>`. The full row is the hit target. When placed inside a list using
roving tabindex, the host is the tab stop and the inner element carries
`tabindex="-1"`.

**Attributes**

- `href` (String) — when set, renders an `<a>` instead of a `<button>`.
- `target` (String) — anchor `target` (requires `href`).
- `rel` (String) — anchor `rel` (requires `href`).
- `download` (String) — anchor `download` (requires `href`).

**CSS parts**

- `ripple` — the ripple effect element.

### `<ha-list-item-option>`

Selectable row. Host role is `option`; reflects `aria-selected`. Designed to
sit inside `<ha-list-selectable>`, which owns selection state and toggles
`selected` on this item — the option itself does not fire selection events.

**Attributes**

- `selected` (Boolean, default `false`, reflected) — set by the parent
  `ha-list-selectable`.
- `value` (String) — value identifying the option.
- `appearance` (`"line"` | `"checkbox"`, default `"line"`) — `"line"`
  highlights the row; `"checkbox"` renders a decorative `<ha-checkbox>`.
- `selection-position` (`"start"` | `"end"`, default `"start"`) — side the
  checkbox sits on when `appearance="checkbox"`.

**CSS parts**

- `checkbox` — wrapper around the `<ha-checkbox>` when `appearance="checkbox"`.
- `ripple` — the ripple effect element.

**CSS custom properties**

- `--ha-list-item-selected-background` — background color when selected
  (`appearance="line"`).
