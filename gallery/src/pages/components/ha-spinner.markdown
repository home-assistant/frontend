---
title: Spinner
subtitle: Can be used to indicate an ongoing task.
---

`ha-spinner` is `hac-spinner` from `@home-assistant/components`.

## Accessibility

`ha-spinner` is exposed to screen readers as a `progressbar` named with the translated "Loading". When the surrounding text does not already say what is in progress, name it with a translated `accessible-label`, like "Installing update", rather than its state.

```html
<ha-spinner accessible-label="Installing update"></ha-spinner>
```

If the spinner only decorates text that already says what is in progress, hide it with `aria-hidden="true"`.

For an action started from a button, use `ha-button` with `loading` instead of putting a spinner inside the button.
