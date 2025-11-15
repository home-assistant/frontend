---
title: Marquee Text
---

# Marquee Text `<ha-marquee-text>`

Marquee text component scrolls text horizontally if it overflows its container. It supports pausing on hover and customizable speed and pause duration.

## Implementation

### Example Usage

<ha-marquee-text style="width: 200px;">
    This is a long text that will scroll horizontally if it overflows the container.
</ha-marquee-text>

```html
<ha-marquee-text style="width: 200px;">
  This is a long text that will scroll horizontally if it overflows the
  container.
</ha-marquee-text>
```

### API

**Slots**

- default slot: The text content to be displayed and scrolled.
  - no default

**Properties/Attributes**

| Name           | Type    | Default | Description                                                                  |
| -------------- | ------- | ------- | ---------------------------------------------------------------------------- |
| speed          | number  | `15`    | The speed of the scrolling animation. Higher values result in faster scroll. |
| pause-on-hover | boolean | `true`  | Whether to pause the scrolling animation when                                |
| pause-duration | number  | `1000`  | The delay in milliseconds before the scrolling animation starts/restarts.    |
