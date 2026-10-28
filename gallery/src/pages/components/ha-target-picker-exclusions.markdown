---
title: Target picker exclusions
subtitle: How the target picker shows and edits the exclude of a target
---

A target can leave things out again with `exclude`, which has the same shape as
the target itself. Excludes are global: an exclusion takes its entities out of
every included target, not only one.

The target selector shows exclusions as follows:

- **Exclude** sits next to **Add target**. It offers only what overlaps with the
  included targets and hides what is already excluded. Child devices of an
  included device can still be excluded on their own.
- Each included target lists, muted, the exclusions that take entities out of
  it, with how many they remove. Its count says how many are excluded.
- An exclusion that takes nothing out of any target, like one of a deleted
  area, is listed under **Exclusions with no effect**, where it can be removed.
- The target details show which entities are excluded and by what, and let
  you tick or untick what the target holds.

Only the target selector offers **Exclude**. Other users of the target picker
set `allow-exclude` once they handle `exclude`.
