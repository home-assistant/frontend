---
title: Spinner
subtitle: Can be used to indicate an ongoing task.
---

## Accessibility

`ha-spinner` is exposed to screen readers as a `progressbar` named with the translated "Loading". When the surrounding text does not already say what is in progress, name it with a translated `aria-label`, like "Installing update", rather than its state.

```ts
html`<ha-spinner
  aria-label=${this._localize("ui.panel.config.updates.update_in_progress")}
></ha-spinner>`;
```

For an action started from a button, use `ha-button` with `loading` instead of putting a spinner inside the button.
