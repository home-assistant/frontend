---
title: Picker combo box
---

# Picker combo box `<ha-picker-combo-box>`

The searchable list used inside pickers. `ha-generic-picker` renders it in a
popover or dialog; entity, area, floor, label and device pickers all reach it
that way. It is shown directly here so the list and its keyboard model can be
inspected on their own.

It takes no `hass`. Items come from a `getItems` callback and locale comes from
`internationalizationContext`.

## Two render paths

The item count picks the renderer, and the two behave differently enough that
list changes need checking against both.

| Items                                       | Renderer          | Rows in the DOM       |
| ------------------------------------------- | ----------------- | --------------------- |
| 12 or fewer rendered rows, no sections      | `repeat()`        | all of them           |
| more than 12 rendered rows, or any sections | `lit-virtualizer` | only the visible ones |

The threshold is `MAX_PLAIN_LIST_ITEMS`, counted against the initial rendered
row set, including additional items and dialog padding. Filtering does not switch renderers.

## Two highlights

The list has two row backgrounds.

- **`selected`** — the row matching the `value` property, rendered onto its
  `ha-list-item-option`.
- **`active`** — the keyboard cursor, and the row <kbd>Enter</kbd> picks. The
  list runs in `virtual-focus` mode: DOM focus stays in the search field, and
  the list owns the active row, skips disabled rows and section titles, and
  scrolls it into view.

## Keyboard

| Key                                   | Behavior                                              |
| ------------------------------------- | ----------------------------------------------------- |
| <kbd>↑</kbd> <kbd>↓</kbd>             | Move the cursor                                       |
| <kbd>Home</kbd> <kbd>End</kbd>        | Jump to the first or last item                        |
| <kbd>PageUp</kbd> <kbd>PageDown</kbd> | Move the cursor a page                                |
| <kbd>Enter</kbd>                      | Pick the row under the cursor                         |
| <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd>  | Pick it and report `newTab: true` in `index-selected` |

With no cursor yet, <kbd>↓</kbd> and <kbd>Enter</kbd> start from the `value`
row, or from the top match while searching. With one item in the list,
<kbd>Enter</kbd> picks it whether or not the cursor has moved.

## Implementation

Without `sections`, the component filters the items from `getItems` itself as the
user types, so `getItems` can ignore its search argument. With sections,
`getItems` receives the search string and selected section and must return the
matching rows.

The host is `display: flex` with `flex: 1` and expects a parent with a bounded
height. In the app that bound comes from the popover; embedding it directly
means supplying one.

### Properties/Attributes

| Name                 | Type               | Default   | Description                                                                                                                 |
| -------------------- | ------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| getItems             | Function           | -         | Required. Returns the items, optionally filtered by search string and section.                                              |
| getAdditionalItems   | Function           | -         | Extra items appended to search results, for example "add new".                                                              |
| value                | String             | -         | Id of the current item. Marks its row `selected`, and the virtualized list opens with that row in view.                     |
| label                | String             | -         | Placeholder for the search field. Falls back to a localized "Search".                                                       |
| mode                 | "popover"/"dialog" | "popover" | Adjusts padding for the surface the list sits in.                                                                           |
| shown                | Boolean            | true      | Whether the surface finished animating. `ha-generic-picker` sets it so the virtualizer does not measure rows mid-animation. |
| sections             | Array              | -         | Filter chips. Section headers are plain strings returned by `getItems`.                                                     |
| selectedSection      | String             | -         | Section filter selected when the list is initialized.                                                                       |
| sectionTitleFunction | Function           | -         | Builds the sticky section title from the visible range.                                                                     |
| searchKeys           | Array              | -         | Fuse weighted keys for fuzzy search.                                                                                        |
| searchFn             | Function           | -         | Post-processes filtered results.                                                                                            |
| rowRenderer          | Function           | -         | Replaces the default row template.                                                                                          |
| allowCustomValue     | Boolean            | false     | Offers the typed string as an item.                                                                                         |
| customValueLabel     | String             | -         | Label for that custom item.                                                                                                 |
| notFoundLabel        | String/Function    | -         | Shown when a search matches nothing.                                                                                        |
| emptyLabel           | String             | -         | Shown when there are no items at all.                                                                                       |
| noSort               | Boolean            | false     | Keeps the order `getItems` returned.                                                                                        |
| clearable            | Boolean            | false     | Adjusts search field padding for a clear affordance.                                                                        |

### Events

| Event            | Detail                    | Description                                                    |
| ---------------- | ------------------------- | -------------------------------------------------------------- |
| `value-changed`  | `{ value }`               | An item was picked.                                            |
| `index-selected` | `{ index, item, newTab }` | Which row was picked, and whether it should open in a new tab. |
