//Photovoltaic data subsystem: live state polling, recorder change-series fetch, scrub-time
//sampling, and the chip / chart value formatter. Functions operate on a host (the card) that owns
//the @state PV fields; writing back to the same setters preserves Lit reactivity.

import type { SolarOverviewCardConfig } from "../constants";
import type { EnergyDefaults } from "./energy-prefs";
import {
  formatLocalisedNumber,
  formatPowerKw,
  formatEnergyKwh,
  energyToKwh,
} from "./format";
import {
  fetchChangeSeries,
  latestWattsFromChangeSeries,
  wattsAtFromChangeSeries,
  changeRefreshAnchorMs,
  adaptivePeriodFor,
  type ChangeBucket,
} from "./energy-stats";

//Resolve the live PV entity from the HA Energy solar source. Prefers `stat_rate` (signed power) over
//cumulative `stat_energy_from` (kWh). Returns "" when no solar source is configured (chip + chart
//hidden). Multi-source installs collapse to the first entry here.
export function resolvePvLiveEntity(defaults: EnergyDefaults): string {
  if (defaults.solarStatRates.length > 0) {
    return defaults.solarStatRates[0];
  }
  if (defaults.solarStatEnergyFroms.length > 0) {
    return defaults.solarStatEnergyFroms[0];
  }
  return "";
}

//Parallel times[] / values[] arrays so a sample can be located by timestamp without allocating
//wrapper objects.
export interface PvHistory {
  times: Date[];
  values: number[];
}

export interface PvRate {
  value: number;
  unit: string;
}

export interface PvHost {
  readonly config: SolarOverviewCardConfig | undefined;
  readonly hass: any;
  readonly _timeRange: { start: Date; end: Date } | null;
  //The Energy date-pick window the scrub series is fetched over (matches the timeline span).
  readonly _energyStart?: Date;
  readonly _energyEnd?: Date;
  readonly _energyDefaults: EnergyDefaults;
  requestUpdate(): void;

  _pvCurrent: number | null;
  _pvUnit: string;
  _pvFetchKey: string;
  _pvFetching: boolean;
  //Recorder `change` series for the solar energy meter(s): reset-corrected, unit-normalised kWh per
  //bucket, the same metric HA Energy consumes. Canonical past-production source. Null until first fetch.
  _pvChangeSeries: ChangeBucket[] | null;
  _pvChangeSeriesFetchKey: string;
  _pvChangeSeriesFetching: boolean;
}

//Live + history refresh, called every lifecycle cycle. Fast paths exit early when no entity is
//configured or the (entity, range) tuple matches the last successful fetch.
export function refreshPv(host: PvHost): void {
  const entity = resolvePvLiveEntity(host._energyDefaults);

  if (!entity || !host.hass) {
    //Reset so the chip and graph disappear immediately when the entity is cleared.
    if (host._pvCurrent !== null) {
      host._pvCurrent = null;
      host._pvUnit = "";
    }
    host._pvFetchKey = "";
    return;
  }

  //Multi-source LIVE aggregation: a split install sums every wired stat_rate / stat_energy_from.
  const liveEntities =
    host._energyDefaults.solarStatRates.length > 0
      ? host._energyDefaults.solarStatRates
      : host._energyDefaults.solarStatEnergyFroms;
  const isMultiEntity = liveEntities.length > 1;

  const stateObj = host.hass.states?.[entity];
  if (stateObj) {
    let nextValue: number | null = null;
    let nextUnit = "";
    if (isMultiEntity) {
      //Sum across entities, unit taken from the first valid one. Per-source units are assumed equal
      //(a single HA Energy block enforces it), so no per-sample normalisation.
      let sumValue = 0;
      let firstUnit = "";
      let anyValid = false;
      for (const id of liveEntities) {
        const so = host.hass.states?.[id];
        if (!so) {
          continue;
        }
        const v = parseFloat(so.state);
        if (!isFinite(v)) {
          continue;
        }
        if (!firstUnit) {
          firstUnit = String(so.attributes?.unit_of_measurement ?? "");
        }
        sumValue += v;
        anyValid = true;
      }
      if (anyValid) {
        nextValue = sumValue;
        nextUnit = firstUnit;
      }
    } else {
      const v = parseFloat(stateObj.state);
      nextValue = isFinite(v) ? v : null;
      nextUnit = stateObj.attributes?.unit_of_measurement ?? "";
    }
    if (nextValue !== host._pvCurrent) {
      host._pvCurrent = nextValue;
    }
    if (nextUnit !== host._pvUnit) {
      host._pvUnit = nextUnit;
    }
  } else if (host._pvCurrent !== null) {
    host._pvCurrent = null;
  }

  //Past-production curve (timeline backdrop + chip scrub) from the recorder `change` metric on the
  //solar energy meter(s), gated so it reissues only when its (entity, window) tuple changes.
  const changeIds = host._energyDefaults.solarStatEnergyFroms;
  if (
    changeIds.length > 0 &&
    !host._pvChangeSeriesFetching &&
    host._energyStart &&
    host._energyEnd
  ) {
    //Fetch over the date-pick window at the finest period the span allows. The refresh anchor
    //re-arms the gate once per CHANGE_REFRESH_MS so a live window keeps catching new buckets.
    const startMs = host._energyStart.getTime();
    const endMs = host._energyEnd.getTime();
    const period = adaptivePeriodFor(endMs - startMs);
    const sortedChange = [...changeIds].sort();
    const changeKey = `${sortedChange.join(",")}|${startMs}|${endMs}|${period}|${changeRefreshAnchorMs()}`;
    if (changeKey !== host._pvChangeSeriesFetchKey) {
      host._pvChangeSeriesFetchKey = changeKey;
      host._pvChangeSeriesFetching = true;
      void fetchChangeSeries(host.hass, sortedChange, startMs, endMs, period)
        .then((series) => {
          if (series !== null) {
            host._pvChangeSeries = series;
          }
          host.requestUpdate();
        })
        .finally(() => {
          host._pvChangeSeriesFetching = false;
        });
    }
  }
}

//Production rate at a scrubbed past time: average power from the recorder `change` series at the
//instant. Returns null outside the fetched window (caller hides the chip; correct for the future
//half). Watts floored at zero so a net-meter quirk never reads as negative production.
export function pvRateAtTime(host: PvHost, time: Date): PvRate | null {
  const w = wattsAtFromChangeSeries(host._pvChangeSeries, time.getTime());
  if (w === null) {
    return null;
  }
  return { value: Math.max(0, w), unit: "W" };
}

//Live "now" PV rate, like the HA Energy live tile: read `stat_rate` directly (summed across a split
//install) when declared, else fall back to the latest completed 5-minute `change` bucket average.
//Returns null when neither yields a value, so the caller hides the chip.
export function currentPvRate(host: PvHost): PvRate | null {
  const rates = host._energyDefaults.solarStatRates;
  if (rates.length > 0) {
    let sumW = 0;
    let any = false;
    for (const id of rates) {
      const so = host.hass?.states?.[id];
      if (!so) {
        continue;
      }
      const v = parseFloat(so.state);
      if (!isFinite(v)) {
        continue;
      }
      sumW += pvNormalizeToWatts(
        v,
        String(so.attributes?.unit_of_measurement ?? "")
      );
      any = true;
    }
    if (any) {
      return { value: Math.max(0, sumW), unit: "W" };
    }
  }

  const w = latestWattsFromChangeSeries(host._pvChangeSeries, Date.now());
  if (w === null) {
    return null;
  }
  return { value: Math.max(0, w), unit: "W" };
}

//Convert a POWER RATE (W / kW / MW) into watts. Contract: `value` MUST already be an instantaneous
//rate; an energy unit (Wh / kWh / MWh) returns 0 (a wiring trap) rather than mis-scaling a kWh figure.
export function pvNormalizeToWatts(value: number, unit: string): number {
  const lu = (unit || "").toLowerCase();
  if (lu === "kw") {
    return value * 1000;
  }
  if (lu === "mw") {
    return value * 1_000_000;
  }
  if (lu === "w") {
    return value;
  }
  return 0;
}

//Format a PV reading for the chip: power sources print in kW, energy sources in kWh, both at the
//configured precision.
export function formatPvValue(
  hass: any,
  value: number,
  unit: string,
  decimals: number
): string {
  const u = (unit || "").trim();
  const lu = u.toLowerCase();

  if (lu === "w" || lu === "kw" || lu === "mw") {
    return formatPowerKw(hass, pvNormalizeToWatts(value, unit), decimals);
  }
  if (lu === "wh" || lu === "kwh" || lu === "mwh") {
    return formatEnergyKwh(hass, energyToKwh(value, unit), decimals);
  }
  //Arbitrary unit: keep the entity's own unit string at the configured precision.
  const formatted = formatLocalisedNumber(hass, value, decimals);
  return u ? `${formatted} ${u}` : formatted;
}
