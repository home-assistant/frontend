---
name: ha-frontend-events
description: Home Assistant frontend event patterns. Use when typing event handlers, using HASSDomEvent types, dispatching with fireEvent, or declaring HASSDomEvents and event maps.
---

# HA Frontend Events

Use this skill when implementing or reviewing event listeners and custom event contracts. Cross-load `ha-frontend-components` when the work also involves dialogs, forms, alerts, shortcuts, tooltips, panels, Lovelace cards, or buttons.

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
