---
title: Thermostat Card
---

Enable **Disable dial interaction** in the card editor to adjust the target
temperature using only the + and − buttons. The dial still displays temperatures,
but does not respond to pointer, touch, or keyboard input.

The option is off by default. In YAML, set `disable_dial_interaction: true`:

```yaml
type: thermostat
entity: climate.living_room
disable_dial_interaction: true
```
