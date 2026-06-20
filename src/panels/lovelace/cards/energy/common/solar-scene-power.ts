// Live energy values for the Solar scene chips and the metric series for its timeline, resolved
// from the energy preferences + the energy collection's statistics, the same way the dashboard
// does: a live `stat_rate` when configured, otherwise the latest `change` bucket of the cumulative
// meter turned into average watts (kWh / hours). No bespoke maths, just the energy data layer.
import type { HassEntities } from "home-assistant-js-websocket";
import type {
  EnergyData,
  EnergySolarForecasts,
} from "../../../../../data/energy";
import {
  energySourcesByType,
  getPowerFromState,
} from "../../../../../data/energy";
import type { StatisticValue } from "../../../../../data/recorder";
import type { ChartTarget } from "./solar-scene-sync";

interface Resolved {
  solarRate: string[];
  solarEnergy: string[];
  gridRate: string[];
  gridImport: string[];
  gridExport: string[];
  batteryRate: string[];
  batteryCharge: string[];
  batteryDischarge: string[];
  soc: string[];
}

function resolve(data: EnergyData): Resolved {
  const types = energySourcesByType(data.prefs);
  const r: Resolved = {
    solarRate: [],
    solarEnergy: [],
    gridRate: [],
    gridImport: [],
    gridExport: [],
    batteryRate: [],
    batteryCharge: [],
    batteryDischarge: [],
    soc: [],
  };
  for (const s of types.solar ?? []) {
    if (s.stat_rate) r.solarRate.push(s.stat_rate);
    if (s.stat_energy_from) r.solarEnergy.push(s.stat_energy_from);
  }
  for (const s of types.grid ?? []) {
    if (s.stat_rate) r.gridRate.push(s.stat_rate);
    if (s.stat_energy_from) r.gridImport.push(s.stat_energy_from);
    if (s.stat_energy_to) r.gridExport.push(s.stat_energy_to);
  }
  for (const s of types.battery ?? []) {
    if (s.stat_rate) r.batteryRate.push(s.stat_rate);
    if (s.stat_energy_to) r.batteryCharge.push(s.stat_energy_to);
    if (s.stat_energy_from) r.batteryDischarge.push(s.stat_energy_from);
    if (s.stat_soc) r.soc.push(s.stat_soc);
  }
  return r;
}

// Average watts over the latest completed change bucket of a cumulative meter.
function latestWatts(buckets?: StatisticValue[]): number | null {
  if (!buckets?.length) return null;
  for (let i = buckets.length - 1; i >= 0; i--) {
    const b = buckets[i];
    if (b.change != null) {
      const hours = (b.end - b.start) / 3600000;
      return hours > 0 ? (b.change / hours) * 1000 : null;
    }
  }
  return null;
}

const sumRates = (ids: string[], states: HassEntities): number | null => {
  let sum = 0;
  let any = false;
  for (const id of ids) {
    const w = getPowerFromState(states[id]);
    if (w !== undefined) {
      sum += w;
      any = true;
    }
  }
  return any ? sum : null;
};

const sumEnergy = (
  ids: string[],
  stats: EnergyData["stats"]
): number | null => {
  let sum = 0;
  let any = false;
  for (const id of ids) {
    const w = latestWatts(stats[id]);
    if (w !== null) {
      sum += w;
      any = true;
    }
  }
  return any ? sum : null;
};

export interface LivePower {
  pv: number | null; // W produced
  grid: number | null; // W, + import / - export
  battery: number | null; // W, + discharging into the home / - charging
  soc: number | null; // %
  home: number | null; // W consumption = max(0, pv + grid + battery)
  lowCarbon: number | null; // W of grid import that is low-carbon
}

// Watts a single bucket represents: its mean power, or its energy change averaged over the bucket.
function bucketWatts(b: StatisticValue): number | null {
  if (b.mean != null) return b.mean * 1000;
  if (b.change != null) {
    const hours = (b.end - b.start) / 3600000;
    return hours > 0 ? (b.change / hours) * 1000 : null;
  }
  return null;
}

// Watts at a scrubbed instant: the bucket covering it, or, when none does (the instant sits past the
// last bucket or in a gap), the nearest known reading. Carrying the last measurement keeps the value
// honest, instead of reading null and making a configured source flicker out of the scene.
function valueAt(
  buckets: StatisticValue[] | undefined,
  instant: number
): number | null {
  if (!buckets?.length) return null;
  let before: number | null = null; // latest reading at or before the instant
  let after: number | null = null; // first reading past the instant
  for (const b of buckets) {
    const w = bucketWatts(b);
    if (w === null) continue;
    if (instant >= b.start && instant < b.end) return w; // the covering bucket always wins
    if (b.end <= instant) {
      before = w;
    } // buckets are chronological, so this keeps the most recent
    else if (after === null) after = w;
  }
  return before ?? after;
}

const sumStatAt = (
  ids: string[],
  stats: EnergyData["stats"],
  instant: number
): number | null => {
  let sum = 0;
  let any = false;
  for (const id of ids) {
    const w = valueAt(stats[id], instant);
    if (w !== null) {
      sum += w;
      any = true;
    }
  }
  return any ? sum : null;
};

export function livePower(
  data: EnergyData,
  states: HassEntities,
  instant?: number | null,
  socOverride?: number | null
): LivePower {
  const r = resolve(data);
  const stats = data.stats;

  // One value per metric, null only when the source is NOT configured, so a chip's presence follows
  // the energy preferences (like the distribution card) rather than whether data happens to be
  // flowing right now. A configured-but-idle source reads 0, not null. At a scrubbed instant read the
  // matching stat bucket; live, read the rate sensor (or the latest energy bucket). Signed through
  // the plus/minus meter pair.
  const metricW = (
    rateIds: string[],
    plusIds: string[],
    minusIds: string[],
    rateSign = 1
  ): number | null => {
    if (!rateIds.length && !plusIds.length && !minusIds.length) return null;
    if (instant != null) {
      const rate = sumStatAt(rateIds, stats, instant);
      if (rate !== null) return rate * rateSign;
      return (
        (sumStatAt(plusIds, stats, instant) ?? 0) -
        (sumStatAt(minusIds, stats, instant) ?? 0)
      );
    }
    const rate = sumRates(rateIds, states);
    if (rate !== null) return rate * rateSign;
    return (sumEnergy(plusIds, stats) ?? 0) - (sumEnergy(minusIds, stats) ?? 0);
  };

  const pv = metricW(r.solarRate, r.solarEnergy, []);
  const grid = metricW(r.gridRate, r.gridImport, r.gridExport);
  // stat_rate convention is + charging, so its into-home sign is flipped.
  const battery = metricW(
    r.batteryRate,
    r.batteryDischarge,
    r.batteryCharge,
    -1
  );

  // While scrubbing, the caller passes the SoC sampled from its own stat fetch (the energy data has
  // no SoC); live, average the battery SoC entities' current state.
  let soc: number | null;
  if (socOverride !== undefined) {
    soc = socOverride;
  } else {
    let socSum = 0;
    let socCount = 0;
    for (const id of r.soc) {
      const v = parseFloat(states[id]?.state ?? "");
      if (isFinite(v)) {
        socSum += v;
        socCount += 1;
      }
    }
    soc = socCount ? Math.max(0, Math.min(100, socSum / socCount)) : null;
  }

  const home =
    pv === null && grid === null && battery === null
      ? null
      : Math.max(0, (pv ?? 0) + (grid ?? 0) + (battery ?? 0));

  let lowCarbon: number | null = null;
  const gridImport = grid !== null && grid > 0 ? grid : 0;
  if (data.co2SignalEntity && gridImport > 0) {
    const fossil = parseFloat(states[data.co2SignalEntity]?.state ?? "");
    if (isFinite(fossil)) {
      lowCarbon = gridImport * Math.max(0, Math.min(1, 1 - fossil / 100));
    }
  }

  return { pv, grid, battery, soc, home, lowCarbon };
}

const bucketKw = (b: StatisticValue): number | null => {
  if (b.mean != null) return b.mean;
  if (b.change != null) {
    const hours = (b.end - b.start) / 3600000;
    return hours > 0 ? b.change / hours : null;
  }
  return null;
};

// Power (kW) over the period from one set of meters, merging buckets keyed on bucket start like
// (same-period sources share their start, so multi-entity sources are a clean per-bucket sum).
const seriesFor = (
  ids: string[],
  data: EnergyData,
  sign: number
): [number, number][] => {
  const byStart: Record<number, number> = {};
  for (const id of ids) {
    for (const b of data.stats[id] ?? []) {
      const kw = bucketKw(b);
      if (kw != null) byStart[b.start] = (byStart[b.start] ?? 0) + sign * kw;
    }
  }
  return Object.keys(byStart)
    .map((ts): [number, number] => [Number(ts), byStart[Number(ts)]])
    .sort((a, b) => a[0] - b[0]);
};

// Low-carbon import power: the grid import scaled, per bucket, by its non-fossil share. HA gives the
// fossil energy per bucket (fossilEnergyConsumption, keyed by period start); the low-carbon share is
// 1 - fossil/import. Same shape as the live low-carbon chip, over the whole period.
function lowCarbonSeries(r: Resolved, data: EnergyData): [number, number][] {
  const fossilByTs: Record<number, number> = {};
  for (const [iso, kwh] of Object.entries(data.fossilEnergyConsumption ?? {})) {
    const ts = new Date(iso).getTime();
    if (!Number.isNaN(ts)) fossilByTs[ts] = kwh;
  }
  const byStart: Record<number, number> = {};
  for (const id of r.gridImport) {
    for (const b of data.stats[id] ?? []) {
      const kw = bucketKw(b);
      if (kw == null || b.change == null) continue;
      const share =
        b.change > 0
          ? Math.max(0, Math.min(1, 1 - (fossilByTs[b.start] ?? 0) / b.change))
          : 0;
      byStart[b.start] = (byStart[b.start] ?? 0) + kw * share;
    }
  }
  return Object.keys(byStart)
    .map((ts): [number, number] => [Number(ts), byStart[Number(ts)]])
    .sort((a, b) => a[0] - b[0]);
}

// Solar production forecast as hourly power (kW), summed across the configured forecast providers
// (wh_hours = Wh per hour, so /1000 is the average kW). Same source the HA solar graph dashes in.
// Forecasts aren't part of the energy data, so the caller fetches them and passes them in.
export function forecastSeries(
  forecasts: EnergySolarForecasts,
  prefs: EnergyData["prefs"],
  start: number,
  end: number
): [number, number][] {
  const byTime: Record<number, number> = {};
  for (const s of prefs.energy_sources) {
    if (s.type !== "solar" || !s.config_entry_solar_forecast) continue;
    for (const ceid of s.config_entry_solar_forecast) {
      const f = forecasts[ceid];
      if (!f) continue;
      for (const [date, value] of Object.entries(f.wh_hours)) {
        const d = new Date(date);
        const ts = d.getTime();
        if (ts < start || ts > end) continue;
        d.setMinutes(0, 0, 0);
        const t = d.getTime();
        byTime[t] = (byTime[t] ?? 0) + Number(value);
      }
    }
  }
  return Object.keys(byTime)
    .map((t): [number, number] => [Number(t), byTime[Number(t)] / 1000])
    .sort((a, b) => a[0] - b[0]);
}

function homeSeries(r: Resolved, data: EnergyData): [number, number][] {
  const byStart: Record<number, number> = {};
  const add = (ids: string[], sign: number): void => {
    for (const id of ids) {
      for (const b of data.stats[id] ?? []) {
        const kw = bucketKw(b);
        if (kw != null) byStart[b.start] = (byStart[b.start] ?? 0) + sign * kw;
      }
    }
  };
  add(r.solarEnergy.length ? r.solarEnergy : r.solarRate, 1);
  add(r.gridImport, 1);
  add(r.gridExport, -1);
  add(r.batteryDischarge, 1);
  add(r.batteryCharge, -1);
  return Object.keys(byStart)
    .map((ts): [number, number] => [
      Number(ts),
      Math.max(0, byStart[Number(ts)]),
    ])
    .sort((a, b) => a[0] - b[0]);
}

export interface DirSeries {
  key: string;
  token: string;
  data: [number, number][];
}

// Up to two area series per target, each from its own meter in its own colour: import
// and export, or discharge and charge. Export and charge plot below zero. No signed maths.
export function targetSeries(
  data: EnergyData,
  target: ChartTarget
): DirSeries[] {
  const r = resolve(data);
  let out: DirSeries[];
  switch (target) {
    case "grid":
      out = [
        {
          key: "import",
          token: "--energy-grid-consumption-color",
          data: seriesFor(r.gridImport, data, 1),
        },
        {
          key: "export",
          token: "--energy-grid-return-color",
          data: seriesFor(r.gridExport, data, -1),
        },
      ];
      break;
    case "battery":
      out = [
        {
          key: "discharge",
          token: "--energy-battery-out-color",
          data: seriesFor(r.batteryDischarge, data, 1),
        },
        {
          key: "charge",
          token: "--energy-battery-in-color",
          data: seriesFor(r.batteryCharge, data, -1),
        },
      ];
      break;
    case "battery-soc":
      out = [
        {
          key: "soc",
          token: "--energy-battery-out-color",
          data: seriesFor(r.soc, data, 1),
        },
      ];
      break;
    case "lowcarbon":
      out = [
        {
          key: "lowcarbon",
          token: "--energy-non-fossil-color",
          data: lowCarbonSeries(r, data),
        },
      ];
      break;
    case "home":
      out = [
        { key: "home", token: "--primary-color", data: homeSeries(r, data) },
      ];
      break;
    default:
      out = [
        {
          key: "solar",
          token: "--energy-solar-color",
          data: seriesFor(
            r.solarEnergy.length ? r.solarEnergy : r.solarRate,
            data,
            1
          ),
        },
      ];
  }
  return out.filter((s) => s.data.length > 0);
}
