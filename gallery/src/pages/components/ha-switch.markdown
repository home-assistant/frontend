---
title: Switch / Toggle
---

<style>
  ha-switch {
    display: block;
  }
</style>

# Switch `<ha-switch>`

A toggle switch can represent two states: on and off.

## Examples

Switch in on state
<ha-switch checked></ha-switch>

Switch in off state
<ha-switch></ha-switch>

Disabled switch
<ha-switch disabled></ha-switch>

## CSS variables

The switch extends the Material 3 switch. In the unselected state, these variables are used for the color:

- `--switch-unchecked-track-color`: The color of the track
- `--switch-unchecked-foreground-color`: The color of the track outline and the thumb

In the selected state, these variables are used for the color:

- `--switch-checked-color`: The color of the track and the icon inside the thumb
- `--switch-checked-thumb-color`: The background in the thumb
