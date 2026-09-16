---
title: Control scrubber
---

A horizontal control where the value sits under a fixed window in the middle and the background strip moves. Drag the strip to change the value, or tap a point of the strip to bring it under the window.

Set `--control-scrubber-track-width` to make the strip wider than the control, so only a part of the range is visible at a time and each pixel of drag changes the value less. Set `wrap` for cyclic ranges such as hue, where the strip repeats and the value wraps around at the bounds.
