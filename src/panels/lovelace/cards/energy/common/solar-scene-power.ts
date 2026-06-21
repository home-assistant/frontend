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
import type { StatisticValue, Statistics } from "../../../../../data/recorder";
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

  return { pv, grid, battery, soc, home };
}

export interface SolarBand {
  statId: string;
  idx: number; // source order, for the colour shade off the solar token
  value: number; // W at the instant (live or scrubbed); 0 when the source has no reading
}

// Per-source solar production (W) at an instant (or live), one entry per configured solar source in
// preference order, for the scene's stacked-house view. Mirrors livePower's resolution: a scrubbed
// instant reads the stat bucket covering it (rate sensor first, else the energy meter's change);
// live reads the rate sensor's current state, else the latest energy bucket. A source with no
// reading contributes 0 so the bands always cover every string. Proportions are exact regardless of
// the bucket width: every source shares the same bucket span at a given instant, so it cancels out.
export function solarBreakdownAt(
  data: EnergyData,
  states: HassEntities,
  instant?: number | null
): SolarBand[] {
  const solar = energySourcesByType(data.prefs).solar ?? [];
  return solar.map((s, idx): SolarBand => {
    const statId = s.stat_energy_from || s.stat_rate || "";
    let value: number | null = null;
    if (instant != null) {
      if (s.stat_rate) value = valueAt(data.stats[s.stat_rate], instant);
      if (value === null && s.stat_energy_from) {
        value = valueAt(data.stats[s.stat_energy_from], instant);
      }
    } else {
      if (s.stat_rate) {
        const w = getPowerFromState(states[s.stat_rate]);
        value = w === undefined ? null : w;
      }
      if (value === null && s.stat_energy_from) {
        value = latestWatts(data.stats[s.stat_energy_from]);
      }
    }
    return { statId, idx, value: value ?? 0 };
  });
}

// Average power (kW) a bucket represents. mean sensors are already power; a cumulative meter gives
// energy per bucket, divided by the bucket's NOMINAL span (`nominalH`, the period's typical width)
// rather than its raw end-start. The most recent bucket is usually partial — it ends at "now" — so
// dividing its small energy by a tiny span would spike it to an instantaneous-looking peak that
// crushes the rest of a long curve; normalising by the nominal span keeps every point comparable
// (a partial day then just reads as a lower daily average, which is the honest value).
const bucketKw = (b: StatisticValue, nominalH: number): number | null => {
  if (b.mean != null) return b.mean;
  if (b.change != null) return nominalH > 0 ? b.change / nominalH : null;
  return null;
};

// Typical bucket width (hours) of a meter set: the median of the buckets' own spans, so a single
// partial bucket at either end can't skew it. Falls back to 1h when nothing usable is present.
const nominalHoursFor = (ids: string[], data: EnergyData): number => {
  const spans: number[] = [];
  for (const id of ids) {
    for (const b of data.stats[id] ?? []) {
      if (b.change != null) spans.push((b.end - b.start) / 3600000);
    }
  }
  if (!spans.length) return 1;
  spans.sort((a, b) => a - b);
  return spans[Math.floor(spans.length / 2)] || 1;
};

// Power (kW) over the period from one set of meters, merging buckets keyed on bucket start like
// (same-period sources share their start, so multi-entity sources are a clean per-bucket sum).
const seriesFor = (
  ids: string[],
  data: EnergyData,
  sign: number
): [number, number][] => {
  const nominalH = nominalHoursFor(ids, data);
  const byStart: Record<number, number> = {};
  for (const id of ids) {
    for (const b of data.stats[id] ?? []) {
      const kw = bucketKw(b, nominalH);
      if (kw != null) byStart[b.start] = (byStart[b.start] ?? 0) + sign * kw;
    }
  }
  return Object.keys(byStart)
    .map((ts): [number, number] => [Number(ts), byStart[Number(ts)]])
    .sort((a, b) => a[0] - b[0]);
};

// Solar production forecast as power (kW), summed across the configured forecast providers (wh_hours
// = Wh per hour). Same source the HA solar graph dashes in; forecasts aren't part of the energy data,
// so the caller fetches them and passes them in. `period` must match the resolution of the actual
// curve it sits on: at "hour" each point is the average kW of that hour (Wh / 1000); at "day" the
// hours are summed per day and averaged over 24 h (Wh / 1000 / 24), so the dashed forecast stays on
// the same scale as a daily-averaged production curve instead of towering over it with hourly peaks.
export function forecastSeries(
  forecasts: EnergySolarForecasts,
  prefs: EnergyData["prefs"],
  start: number,
  end: number,
  period: "hour" | "day" = "hour"
): [number, number][] {
  const daily = period === "day";
  const byTime: Record<number, number> = {}; // Wh accumulated per bucket
  for (const s of prefs.energy_sources) {
    if (s.type !== "solar" || !s.config_entry_solar_forecast) continue;
    for (const ceid of s.config_entry_solar_forecast) {
      const f = forecasts[ceid];
      if (!f) continue;
      for (const [date, value] of Object.entries(f.wh_hours)) {
        const d = new Date(date);
        const ts = d.getTime();
        if (ts < start || ts > end) continue;
        if (daily) d.setHours(0, 0, 0, 0);
        else d.setMinutes(0, 0, 0);
        const t = d.getTime();
        byTime[t] = (byTime[t] ?? 0) + Number(value);
      }
    }
  }
  const divisor = daily ? 1000 * 24 : 1000;
  return Object.keys(byTime)
    .map((t): [number, number] => [Number(t), byTime[Number(t)] / divisor])
    .sort((a, b) => a[0] - b[0]);
}

function homeSeries(r: Resolved, data: EnergyData): [number, number][] {
  const byStart: Record<number, number> = {};
  const add = (ids: string[], sign: number): void => {
    const nominalH = nominalHoursFor(ids, data);
    for (const id of ids) {
      for (const b of data.stats[id] ?? []) {
        const kw = bucketKw(b, nominalH);
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
  // Production splits into one stacked band per configured solar source (panel string). These carry
  // what the chart needs to draw and label those bands; they stay undefined for the other targets.
  idx?: number; // colour-derivation index off the token, like the native Solar production graph
  stack?: string; // ECharts stack group, so the bands sum to the total production height
  statId?: string; // the source's energy meter, so the card can label the band
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
    case "home":
      out = [
        { key: "home", token: "--primary-color", data: homeSeries(r, data) },
      ];
      break;
    default: {
      // One stacked area per configured solar source (each panel string), shaded off the solar
      // colour by its index exactly like the native Solar production graph. Stacked, so the curve's
      // height at any instant is the sum of every string's production. A single source reads as one
      // plain solar band (index 0 keeps the base colour), so nothing changes for a one-string setup.
      const solarSources = energySourcesByType(data.prefs).solar ?? [];
      out = solarSources.map((s, idx): DirSeries => {
        const statId = s.stat_energy_from || s.stat_rate;
        return {
          key: statId ? `solar-${statId}` : `solar-${idx}`,
          token: "--energy-solar-color",
          idx,
          stack: "solar",
          statId: statId || undefined,
          data: seriesFor(statId ? [statId] : [], data, 1),
        };
      });
    }
  }
  return out.filter((s) => s.data.length > 0);
}

export interface MetricMeta {
  icon: string;
  token: string; // colour custom property
  level: boolean; // true for a level metric (SoC, %) rather than energy (kWh)
}

// Icon + colour token + kind for a timeline/clock series key. Solar strings (key "solar-<id>") and the
// directional / aggregate keys produced by targetSeries all map here, so the Energy clock can label and
// colour the selected chip's series the same way the timeline does.
export function metricMeta(key: string): MetricMeta {
  if (key.startsWith("solar") || key === "forecast") {
    return {
      icon: "mdi:solar-power",
      token: "--energy-solar-color",
      level: false,
    };
  }
  switch (key) {
    case "import":
      return {
        icon: "mdi:transmission-tower-import",
        token: "--energy-grid-consumption-color",
        level: false,
      };
    case "export":
      return {
        icon: "mdi:transmission-tower-export",
        token: "--energy-grid-return-color",
        level: false,
      };
    case "discharge":
      return {
        icon: "mdi:battery-arrow-up",
        token: "--energy-battery-out-color",
        level: false,
      };
    case "charge":
      return {
        icon: "mdi:battery-arrow-down",
        token: "--energy-battery-in-color",
        level: false,
      };
    case "home":
      return { icon: "mdi:home", token: "--primary-color", level: false };
    case "soc":
      return {
        icon: "mdi:battery",
        token: "--energy-battery-out-color",
        level: true,
      };
    default:
      return { icon: "mdi:flash", token: "--primary-color", level: false };
  }
}

export interface RingBand {
  key: string; // series key from targetSeries (solar-<id>, import, export, charge, …)
  token: string; // colour token
  idx?: number; // shade index for the per-string solar bands
  statId?: string; // the source's meter, for labelling solar bands
  value: number; // average magnitude over the period at this hour (kW, or % for SoC) — cylinder height
  total: number; // cumulated magnitude over the period at this hour (kWh for energy series)
  forecast: number; // forecast average (kW) at this hour — solar only, else 0
  forecastTotal: number; // forecast cumulated (kWh) at this hour — solar only, else 0
}

export interface RingHour {
  hour: number; // 0..23 local
  bands: RingBand[];
}

// Bin the selected chip's timeline series (DirSeries, at hourly resolution over the period) into 24
// hours-of-day: each band's `value` is the average magnitude at that hour (drives the cylinder height)
// and `total` the cumulated magnitude (kWh for energy series, for the tooltip). Magnitudes are
// absolute since export / charge come back signed-negative from targetSeries. This is the one place
// the clock turns "whatever the timeline draws" into 24 stacked columns — same source, same colours.
export function hourlyTargetRings(dirs: DirSeries[]): RingHour[] {
  const acc = dirs.map(() =>
    Array.from({ length: 24 }, () => ({ sum: 0, n: 0 }))
  );
  dirs.forEach((d, i) => {
    for (const [ts, v] of d.data) {
      const h = new Date(ts).getHours();
      acc[i][h].sum += Math.abs(v);
      acc[i][h].n += 1;
    }
  });
  const rings: RingHour[] = [];
  for (let h = 0; h < 24; h++) {
    rings.push({
      hour: h,
      bands: dirs.map((d, i) => ({
        key: d.key,
        token: d.token,
        idx: d.idx,
        statId: d.statId,
        value: acc[i][h].n ? acc[i][h].sum / acc[i][h].n : 0,
        total: acc[i][h].sum,
        forecast: 0,
        forecastTotal: 0,
      })),
    });
  }
  return rings;
}

// Per-solar-source forecast binned by hour-of-day within [start, end]: average kW and cumulated kWh
// per hour, keyed by the source's energy meter id. Lets the clock show predicted (transparent)
// cylinders for hours with no actuals yet — e.g. a future day. Solar is the only metric with a forecast.
export function solarForecastByHour(
  prefs: EnergyData["prefs"],
  forecasts: EnergySolarForecasts,
  start: number,
  end: number
): Map<string, { avg: number[]; total: number[] }> {
  const out = new Map<string, { avg: number[]; total: number[] }>();
  for (const s of energySourcesByType(prefs).solar ?? []) {
    const id = s.stat_energy_from;
    if (!id) continue;
    const sum = new Array(24).fill(0);
    const cnt = new Array(24).fill(0);
    for (const ceid of s.config_entry_solar_forecast ?? []) {
      const f = forecasts[ceid];
      if (!f) continue;
      for (const [date, wh] of Object.entries(f.wh_hours)) {
        const d = new Date(date);
        const ts = d.getTime();
        if (ts < start || ts > end) continue;
        const h = d.getHours();
        sum[h] += Number(wh) / 1000;
        cnt[h] += 1;
      }
    }
    out.set(id, {
      avg: sum.map((v, h) => (cnt[h] ? v / cnt[h] : 0)),
      total: sum,
    });
  }
  return out;
}

// Per-hour-of-day rings for the PRODUCTION target. Unlike the generic builder it always emits a band
// per solar source (even with no actuals), so a future day with only a forecast still shows every
// string's predicted cylinder. Actuals from hourly `change`; forecast from `solarForecastByHour`.
export function solarRings(
  prefs: EnergyData["prefs"],
  hourlyStats: Statistics,
  forecasts?: EnergySolarForecasts,
  start?: number,
  end?: number
): RingHour[] {
  const solar = energySourcesByType(prefs).solar ?? [];
  const acc = solar.map(() =>
    Array.from({ length: 24 }, () => ({ sum: 0, n: 0 }))
  );
  solar.forEach((s, idx) => {
    const id = s.stat_energy_from;
    if (!id) return;
    for (const b of hourlyStats[id] ?? []) {
      if (b.change == null) continue;
      const hours = (b.end - b.start) / 3600000;
      if (hours <= 0) continue;
      const h = new Date(b.start).getHours();
      acc[idx][h].sum += b.change / hours;
      acc[idx][h].n += 1;
    }
  });
  const fc =
    forecasts && start != null && end != null
      ? solarForecastByHour(prefs, forecasts, start, end)
      : undefined;
  const rings: RingHour[] = [];
  for (let h = 0; h < 24; h++) {
    rings.push({
      hour: h,
      bands: solar.map((s, idx) => {
        const id = s.stat_energy_from || s.stat_rate || "";
        const f = s.stat_energy_from ? fc?.get(s.stat_energy_from) : undefined;
        return {
          key: `solar-${id}`,
          token: "--energy-solar-color",
          idx,
          statId: id,
          value: acc[idx][h].n ? acc[idx][h].sum / acc[idx][h].n : 0,
          total: acc[idx][h].sum,
          forecast: f ? f.avg[h] : 0,
          forecastTotal: f ? f.total[h] : 0,
        };
      }),
    });
  }
  return rings;
}
