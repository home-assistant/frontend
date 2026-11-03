---
title: Schedule timeline
subtitle: Weekly time blocks for the schedule helper
---

`ha-schedule-timeline` shows a weekly schedule as one 24-hour track per day, in the user's week order. It is used by the schedule helper editor.

- Tap a track to create a one-hour time block, or drag on it to draw one.
- Drag a block to move it, or drag its edges to change the start or end. Blocks snap to 15 minutes and cannot overlap.
- Focus a block to move it with the arrow keys, change its end time with Shift and the arrow keys, or delete it with Delete. Enter selects it.
- The day menu copies a day to other days or clears it.

Set `readonly` to show a schedule that cannot be edited, like a schedule defined in YAML.

## API

- `value`: the `ScheduleWeek` to show.
- `selected`: the `ScheduleBlockRef` of the selected block.
- `readonly`: show the schedule without editing controls.
- `value-changed`: fired with the updated week.
- `schedule-block-selected`: fired when a block is selected, or with no block when the selection is cleared.
- `schedule-day-copy`: fired when the user picks "Copy to other days" in a day menu.
