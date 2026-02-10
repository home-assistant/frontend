---
name: component-form
description: Build schema-driven ha-form UIs. Use when defining HaFormSchema, wiring data/error/schema, and localized labels/helpers in forms.
---

### Form Component (ha-form)

- Schema-driven using `HaFormSchema[]`
- Supports entity, device, area, target, number, boolean, time, action, text, object, select, icon, media, location selectors
- Built-in validation with error display
- Use `autofocus` attribute to automatically focus the first focusable element. If using the legacy `ha-dialog` dialogs, use `dialogInitialFocus`
- Use `computeLabel`, `computeError`, `computeHelper` for translations

```typescript
<ha-form
  .hass=${this.hass}
  .data=${this._data}
  .schema=${this._schema}
  .error=${this._errors}
  .computeLabel=${(schema) => this.hass.localize(`ui.panel.${schema.name}`)}
  @value-changed=${this._valueChanged}
></ha-form>
```

**Gallery Documentation:**

- `gallery/src/pages/components/ha-form.markdown`
