---
title: Energy distribution card
---

The energy distribution card shows how solar, battery, and grid energy moved through the home for the selected period.

These demos use hourly recorder statistics whose daily totals match [GitHub issue 54185](https://github.com/home-assistant/frontend/issues/54185): 82.4 kWh solar, 68.6 kWh export, 0.12 kWh import, 5.3 kWh battery charge, 4.6 kWh battery discharge, and 13.2 kWh home use. The solar curve is a clear summer day peaking around 10 kW. Battery charge is midday; discharge is evening.

Each card mounts its own mocked Home Assistant connection. Energy data is cached on the connection, so two hourly series cannot share one mock.

## Aligned meters

Solar production and grid export land in the same hour. The home ring is mixed solar and battery.

## Export recorded one hour later

The same daily totals, with export shifted into the next hour. That matches an inverter and grid meter landing in different statistic buckets. Hourly allocation then reports more solar used at home than the net home total. The home kWh label stays at 13.2. The ring must still fit the circle and must not paint as 100% grid.
