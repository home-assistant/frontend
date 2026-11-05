---
title: Schedule timeline
subtitle: Weekly time blocks for the schedule helper
---

`ha-schedule-timeline` shows a weekly schedule as one 24-hour track per day, in the user's week order. It is used by the schedule helper editor.

- Tap a track to create a one-hour time block, or drag on it to draw one.
- Drag a block to move it, or drag its edges to change the start or end. Blocks snap to 15 minutes and cannot overlap.
- Focus a block to move it with the arrow keys, change its end time with Shift and the arrow keys, or delete it with Delete. Enter selects it.
- The day menu copies a day to other days or clears it.
- Hovering or focusing a block shows its day and times, which narrow blocks cannot show inside.

Set `readonly` to show a schedule that cannot be edited, like a schedule defined in YAML. Selecting a block shows its day and times below the timeline.

## API

- `value`: the `ScheduleWeek` to show.
- `selected`: the `ScheduleBlockRef` of the selected block.
- `preview`: a `ScheduleBlockPreview` with a block that is not applied yet, drawn dashed on its days and in red where it would overlap. When it edits a block, that block fades once the preview moves it.
- `confirmChange`: an optional function that returns a promise. It is called before a change on the timeline is applied, and the change is dropped when it resolves to `false`.
- `readonly`: show the schedule without editing controls.
- `value-changed`: fired with the updated week.
- `schedule-block-selected`: fired when a block is selected, or with no block when the selection is cleared.
- `schedule-day-copy`: fired when the user picks "Copy to other days" in a day menu.
