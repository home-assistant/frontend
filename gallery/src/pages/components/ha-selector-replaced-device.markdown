---
title: Replaced device selectors
subtitle: How device and target selectors surface devices that were split into separate devices
---

A device that used to belong to multiple config entries is split into one
device per config entry. The original composite device is removed from the
registry, so existing references to it (targets in automations, device
selectors) point at a device that no longer exists.

When a selector holds such a reference, it shows a **replaced** state instead of
a plain "not found", and offers to point the reference at the replacement
device(s). The candidate replacements are filtered through the selector's own
filters, so in practice usually a single device matches:

- **Target selector** — the replaced device row offers **Replace**, which adds
  every replacement device that matches the target filters and removes the old
  reference.
- **Device selector** — when exactly one replacement matches, **Replace** swaps
  to it in one click; when several match, a dialog lets you pick one.

All samples below reference the removed composite device `old_composite`, which
was split into a light device and a switch device.
