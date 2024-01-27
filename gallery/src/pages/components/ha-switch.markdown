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

For the switch / toggle there are always two variables, one for the on / checked state and one for the off / unchecked state.

The track element (background rounded rectangle that the round circular handle travels on) is set to being half transparent, so the final color will also be impacted by the color behind the track.

`switch-checked-color` / `switch-unchecked-color`  
Set both the color of the round handle and the track behind it. If you want to control them separately, use the variables below instead.

`switch-checked-button-color` / `switch-unchecked-button-color`  
Color of the round handle

`switch-checked-track-color` / `switch-unchecked-track-color`  
Color of the track behind the round handle
