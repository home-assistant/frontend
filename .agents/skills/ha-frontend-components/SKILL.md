---
name: ha-frontend-components
description: Home Assistant frontend component patterns. Use when implementing or reviewing dialogs, ha-form, ha-alert, keyboard shortcuts, tooltips, panels, Lovelace cards, or ha-button usage.
---

# HA Frontend Components

Use this skill when creating or reviewing Home Assistant UI components and common interaction patterns.

## Event Handling

Use the event types from `src/common/dom/fire_event.ts` instead of plain `Event`, generic `CustomEvent`, or element casts when they express the handler contract:

- Use `HASSDomCurrentTargetEvent<T>` to read the element on which the listener was registered through `ev.currentTarget`.
- Use `HASSDomTargetEvent<T>` only to read the element that originated the event through `ev.target`.
- Use `HASSDomEvent<T>` to read a custom event payload through `ev.detail`.
- Use `ValueChangedEvent<T>` from `src/types.ts` for the standard `value-changed` event.
- Prefer an event type exported by the component being listened to, such as `HaSelectSelectEvent<T, Clearable>` or `HaDropdownSelectEvent<TValue, TData>`, over reconstructing its detail type.
- Use `ActionHandlerEvent` from `src/data/lovelace/action_handler.ts` for Lovelace tap, hold, and double-tap handlers.

Import event and element types with `import type`:

```ts
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
  HASSDomTargetEvent,
} from "../common/dom/fire_event";
import type { HaCheckbox } from "../components/ha-checkbox";
import type { HaEntityPicker } from "../components/entity/ha-entity-picker";
import type { HaRadioGroup } from "../components/radio/ha-radio-group";
import type { ValueChangedEvent } from "../types";
```

Type the handler so the selected property can be read directly. Do not cast `ev.currentTarget` or assign it to a single-use variable:

```ts
private _scopeChanged(ev: HASSDomCurrentTargetEvent<HaRadioGroup>): void {
  this._scope = ev.currentTarget.value;
}

private _checkedChanged(ev: HASSDomTargetEvent<HaCheckbox>): void {
  this._checked = ev.target.checked;
}

private _valueChanged(ev: ValueChangedEvent<string>): void {
  this._value = ev.detail.value;
}

private _itemSelected(ev: HASSDomEvent<{ id: string }>): void {
  this._selectedId = ev.detail.id;
}
```

Use intersections when a handler needs more than one facet of an event. Keep the native event type when the handler reads native fields such as `key`, modifier keys, `dataTransfer`, or focus relationships:

```ts
private _entityChanged(
  ev: ValueChangedEvent<string> & HASSDomCurrentTargetEvent<HaEntityPicker>
): void {
  ev.currentTarget.value = ev.detail.value;
}

private _keyDown(
  ev: KeyboardEvent & HASSDomCurrentTargetEvent<HTMLInputElement>
): void {
  if (ev.key === "Enter") {
    this._submit(ev.currentTarget.value);
  }
}
```

Dispatch Home Assistant component events with `fireEvent()` instead of constructing `Event` or `CustomEvent` directly. Register the event name and detail type by augmenting `HASSDomEvents`; use `undefined` when an event has no detail. `fireEvent()` constrains event names and supplied detail, and events bubble and cross shadow boundaries by default:

```ts
fireEvent(this, "item-selected", { id: item.id });
fireEvent(this, "refresh-requested");
```

When an event is already registered, derive handler and listener types from its registration rather than repeating the payload shape:

```ts
private _itemSelected(
  ev: HASSDomEvent<HASSDomEvents["item-selected"]>
): void {
  this._selectedId = ev.detail.id;
}
```

`HASSDomEvents` types `fireEvent()` calls. Augment `HTMLElementEventMap` for typed listeners on HTML elements, or `GlobalEventHandlersEventMap` when the event is handled on global event targets.

In component files, prefer placing global event declarations after the class at the bottom of the file. Preserve the existing placement when editing established files; foundational type, helper, and mixin files commonly keep declarations near the top before their consumers.

```ts
declare global {
  interface HASSDomEvents {
    "item-selected": { id: string };
    "refresh-requested": undefined;
  }

  interface HTMLElementEventMap {
    "item-selected": HASSDomEvent<HASSDomEvents["item-selected"]>;
  }
}
```

## Dialogs

Open dialogs through the fire-event pattern:

```ts
fireEvent(this, "show-dialog", {
  dialogTag: "dialog-example",
  dialogImport: () => import("./dialog-example"),
  dialogParams: { title: "Example", data: someData },
});
```

Dialog implementation requirements:

- Use `ha-dialog`.
- Use `DialogMixin`, which implements `HassDialogNext<T>`, for new dialogs. See `src/dialogs/dialog-mixin.ts`.
- Read dialog parameters from the mixin's `params` property and render the dialog open. Return `nothing` while required parameters are absent.
- Call the mixin's `closeDialog()` to close a new dialog. The mixin handles the `closed` event, fires `dialog-closed`, and removes the host element.
- Existing dialogs may implement the legacy `HassDialog<T>` interface from `src/dialogs/make-dialog-manager.ts`.
- Preserve the existing `showDialog()`, open-state, and close-event lifecycle when maintaining a legacy dialog; do not copy that lifecycle into a `DialogMixin` dialog.
- Use `header-title` and `header-subtitle` for simple header text.
- Use slots when standard header attributes are not enough.
- Use `ha-dialog-footer` with `primaryAction` and `secondaryAction` slots.
- Add `autofocus` to the first focusable element, such as `<ha-form autofocus>`, and forward it internally if needed.

Use standard dialog widths: `small`, `medium`, `large`, or `full`. Avoid custom dialog sizing unless there is a clear product need.

## Buttons

`ha-button` wraps the Web Awesome button in `src/components/ha-button.ts`.

Axes:

- `variant`: `brand`, `neutral`, `danger`, `warning`, `success`.
- `appearance`: `accent`, `filled`, `outlined`, `plain`.
- `size`: `xs`, `s`, `m`, `l`, `xl`.

Common usage:

- Use `appearance="filled"` for primary emphasis when needed.
- Use `appearance="plain"` for cancel and dismiss actions.
- Use `variant="danger"` for destructive actions.
- Place primary actions in `slot="primaryAction"` and secondary actions in `slot="secondaryAction"`.

## Forms

`ha-form` is schema-driven with `HaFormSchema[]` and supports common selectors for entities, devices, areas, targets, numbers, booleans, time, actions, text, objects, selects, icons, media, and location.

Use `computeLabel`, `computeError`, and `computeHelper` for translated labels, validation, and helper text.

```ts
<ha-form
  .hass=${this.hass}
  .data=${this._data}
  .schema=${this._schema}
  .error=${this._errors}
  .computeLabel=${(schema) => this._localize(`ui.panel.${schema.name}`)}
  @value-changed=${this._valueChanged}
></ha-form>
```

## Alerts

Use `ha-alert` for user-visible status messaging.

- Alert types: `error`, `warning`, `info`, `success`.
- Useful properties: `title`, `alert-type`, `dismissable`, `narrow`.
- Slots: `icon` for custom leading icon, `action` for custom action content.
- Content is announced by screen readers when dynamically displayed.

```ts
html`
  <ha-alert alert-type="error">${this._localize("ui.example.error")}</ha-alert>
  <ha-alert alert-type="warning" .title=${this._localize("ui.example.warning")}>
    ${this._localize("ui.example.description")}
  </ha-alert>
  <ha-alert alert-type="success" dismissable>
    ${this._localize("ui.example.success")}
  </ha-alert>
`;
```

## Shortcuts And Tooltips

Use `ShortcutManager` from `src/common/keyboard/shortcuts.ts` for keyboard shortcuts. It blocks shortcuts in input fields, can prevent shortcuts during text selection, and supports character and KeyCode shortcuts for non-latin keyboards. See `src/state/quick-bar-mixin.ts` for global shortcut examples.

Use `ha-tooltip` from `src/components/ha-tooltip.ts` for contextual hover help. See `src/components/ha-label.ts` for an example.

## Panels And Lovelace Cards

Panels commonly extend `SubscribeMixin(LitElement)` and receive route and narrow-layout properties.

Lovelace cards should implement `LovelaceCard`, validate config in `setConfig()`, handle loading, error, unavailable, and missing-entity states, and add a configuration editor when needed.

Cards are user-story surfaces. Support different households, entity types, responsive layouts, and accessible interaction states.
