//Timeline subsystem: the periodic clock tick that advances the live cursor and re-projects the
//overlays. Same host-driven pattern as the data modules.

import type { SolarOverviewCardConfig } from "../constants";
import { refreshOverlays, type OverlaysHost } from "./overlays";
import type { SolarOverviewEngine } from "../hui-energy-solar-overview-engine";

export interface TimelineHost extends OverlaysHost {
  readonly config: SolarOverviewCardConfig | undefined;
  readonly _engine?: SolarOverviewEngine;

  _timeRange: { start: Date; end: Date } | null;
  _selectedTime: Date | null;
  _isLiveMode: boolean;
  _now: Date;

  //Hover cursor on the timeline charts, written in lock-step with _selectedTime so a touch drag on
  //mobile gets the same tooltip / per-curve dots desktop gets on hover.
  _chartHoverPct: number | null;
}

//Re-renders the card every 30 s to advance the HH:MM clock + live cursor. PV / battery readings
//update on hass state changes, not this tick. Skips the update when the displayed minute is
//unchanged, so a tick landing in the same minute doesn't cascade into a full re-render for no delta.
export function tick(host: TimelineHost): void {
  const next = new Date();
  const prev = host._now;
  if (
    prev &&
    next.getMinutes() === prev.getMinutes() &&
    next.getHours() === prev.getHours() &&
    next.getDate() === prev.getDate() &&
    next.getMonth() === prev.getMonth() &&
    next.getFullYear() === prev.getFullYear()
  ) {
    return;
  }
  //Day rollover: getTimelineRange() is computed off "today midnight - N days", so the window must
  //shift 24 h when the clock crosses midnight (else it sticks on the previous day until next push).
  const dayRolledOver =
    !prev ||
    next.getDate() !== prev.getDate() ||
    next.getMonth() !== prev.getMonth() ||
    next.getFullYear() !== prev.getFullYear();
  host._now = next;
  if (dayRolledOver && host._engine) {
    const range = host._engine.getTimelineRange();
    if (range) {
      host._timeRange = range;
    }
  }
  //The sun moves with time, so refresh its screen-space position.
  refreshOverlays(host);
}
