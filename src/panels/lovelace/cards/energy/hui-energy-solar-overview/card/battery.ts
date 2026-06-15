//Home-battery data subsystem: live SoC + power polling, SoC history fetch, scrub-time sampling and
//chip formatting. Battery wiring resolves from the HA Energy dashboard sources.

import { formatPowerKw } from "./format";
import { pvNormalizeToWatts } from "./pv";
import type { EnergyDefaults } from "./energy-prefs";
import {
  fetchChangeSeries,
  latestWattsFromChangeSeries,
  changeRefreshAnchorMs,
  adaptivePeriodFor,
  type ChangeBucket,
} from "./energy-stats";

//Module-level cache for the battery history fetch; survives unmount + remount (navigating away and
//back). 15-minute TTL.
const BATTERY_CACHE_TTL_MS = 15 * 60_000;

interface BatteryHistoryCacheEntry {
  soc: BatteryHistory;
  ts: number;
}

const _batteryHistoryCache = new Map<string, BatteryHistoryCacheEntry>();

function batteryHistoryCacheGet(key: string): BatteryHistoryCacheEntry | null {
  const e = _batteryHistoryCache.get(key);
  if (!e) {
    return null;
  }
  if (Date.now() - e.ts > BATTERY_CACHE_TTL_MS) {
    _batteryHistoryCache.delete(key);
    return null;
  }
  return e;
}

//Parallel times[] / values[] arrays for one battery entity (SoC or power).
export interface BatteryHistory {
  times: Date[];
  values: number[];
}

//Resolve battery power + SoC entity ids. Power prefers `stat_rate`, falling back to
//`stat_energy_from` then `stat_energy_to`; SoC reads `stat_soc`. Either side is null when empty.
export function resolveBatteryEntities(defaults: EnergyDefaults): {
  powerEntity: string | null;
  socEntity: string | null;
} {
  const powerEntity =
    defaults.batteryStatRates[0] ??
    defaults.batteryStatEnergyFroms[0] ??
    defaults.batteryStatEnergyTos[0] ??
    null;
  const socEntity = defaults.batteryStatSocs[0] ?? null;
  return { powerEntity, socEntity };
}

export interface BatteryHost {
  readonly hass: any;
  readonly _timeRange: { start: Date; end: Date } | null;
  //The Energy date-pick window the scrub series is fetched over.
  readonly _energyStart?: Date;
  readonly _energyEnd?: Date;
  readonly _energyDefaults: EnergyDefaults;
  requestUpdate(): void;

  _batterySoc: number | null;
  _batteryPower: number | null;
  _batteryPowerUnit: string;
  _batterySocHistory: BatteryHistory | null;
  _batteryFetchKey: string;
  _batteryFetching: boolean;
  //Recorder `change` series for charge (`stat_energy_to`) and discharge (`stat_energy_from`). Two
  //SEPARATE directional meters, so the net sign is structural (charge +, discharge −) rather than
  //inferred from one signed sensor (fixes "charge stuck at 0 W"). Null until first fetch.
  _batteryChargeChangeSeries: ChangeBucket[] | null;
  _batteryDischargeChangeSeries: ChangeBucket[] | null;
  _batteryChangeFetchKey: string;
  _batteryChangeFetching: boolean;
  //Today's net charge / discharge kWh from the recorder. Null when unavailable or not yet landed.
  _haBatteryChargedKwh?: number | null;
  _haBatteryDischargedKwh?: number | null;
}

//Live + history refresh, called every lifecycle cycle. Reads SoC + power from hass.states and
//dispatches a history fetch when the (entities, range) tuple changes.
export function refreshBattery(host: BatteryHost): void {
  if (!host.hass) {
    return;
  }

  const { powerEntity, socEntity } = resolveBatteryEntities(
    host._energyDefaults
  );

  //Nothing configured: clear everything and bail so no stale graph lingers.
  if (!powerEntity && !socEntity) {
    if (host._batterySoc !== null) {
      host._batterySoc = null;
    }
    if (host._batteryPower !== null) {
      host._batteryPower = null;
    }
    if (host._batteryPowerUnit !== "") {
      host._batteryPowerUnit = "";
    }
    if (host._batterySocHistory !== null) {
      host._batterySocHistory = null;
    }
    host._batteryFetchKey = "";
    return;
  }

  //Live SoC, clamped to [0, 100] (some BMS briefly report 100.5 % or dip negative around
  //calibration). Multi-bank SoC is a plain arithmetic mean of every wired stat_soc, NaN filtered,
  //mirroring hui-energy-distribution-card.
  let nextSoc: number | null = null;
  const socEntities = host._energyDefaults.batteryStatSocs;
  if (socEntities.length > 0) {
    let sum = 0;
    let count = 0;
    for (const id of socEntities) {
      const so = host.hass.states?.[id];
      const v = so ? parseFloat(so.state) : NaN;
      if (isFinite(v)) {
        sum += v;
        count += 1;
      }
    }
    if (count > 0) {
      nextSoc = Math.max(0, Math.min(100, sum / count));
    }
  }
  //Live battery power, convention "positive = charging". Prefer a signed `stat_rate` summed across
  //banks (with per-bank inversion via invertedRateEntities); else net the two directional meters
  //(latest charge bucket minus discharge), whose structural sign never loses charging.
  let nextPower: number | null = null;
  let nextUnit = "";
  const rateEntities = host._energyDefaults.batteryStatRates;
  if (rateEntities.length > 0) {
    let sum = 0;
    let anyValid = false;
    for (const id of rateEntities) {
      const so = host.hass.states?.[id];
      const v = so ? parseFloat(so.state) : NaN;
      if (!isFinite(v)) {
        continue;
      }
      const unit = String(so.attributes?.unit_of_measurement ?? "");
      const watts = pvNormalizeToWatts(v, unit);
      const inverted = host._energyDefaults.invertedRateEntities.includes(id);
      sum += inverted ? -watts : watts;
      anyValid = true;
    }
    if (anyValid) {
      nextPower = sum;
      nextUnit = "W";
    }
  } else if (
    host._energyDefaults.batteryStatEnergyTos.length > 0 ||
    host._energyDefaults.batteryStatEnergyFroms.length > 0
  ) {
    const nowMs = Date.now();
    const chargeW = latestWattsFromChangeSeries(
      host._batteryChargeChangeSeries,
      nowMs
    );
    const dischargeW = latestWattsFromChangeSeries(
      host._batteryDischargeChangeSeries,
      nowMs
    );
    if (chargeW !== null || dischargeW !== null) {
      nextPower = Math.max(0, chargeW ?? 0) - Math.max(0, dischargeW ?? 0);
      nextUnit = "W";
    }
  }
  if (nextSoc !== host._batterySoc) {
    host._batterySoc = nextSoc;
  }
  if (nextPower !== host._batteryPower) {
    host._batteryPower = nextPower;
  }
  if (nextUnit !== host._batteryPowerUnit) {
    host._batteryPowerUnit = nextUnit;
  }

  //Past power series: recorder `change` on the two directional energy meters.
  fetchBatteryChangeSeries(host);

  //History fetch, only when the (entities, range) tuple changed, to avoid reissuing every cycle.
  if (!host._timeRange || host._batteryFetching) {
    return;
  }

  //SoC history (a measurement, from the LTS `mean` path; past power comes from the change series above).
  if (socEntities.length === 0 || !host._energyStart || !host._energyEnd) {
    return;
  }
  //Over the date-pick window. The clamp in fetchBatteryHistory keeps the fetch end at "now".
  const ltsStart = host._energyStart;
  const rangeKey = `${ltsStart.getTime()}|${host._energyEnd.getTime()}`;
  //Fetch key carries every wired SoC entity (sorted) so adding / removing a bank invalidates it.
  const sortedSoc = [...socEntities].sort();
  const fetchKey = `${sortedSoc.join(",")}@${rangeKey}`;
  if (fetchKey === host._batteryFetchKey) {
    return;
  }
  host._batteryFetchKey = fetchKey;

  //Cache hit short-circuits the WS round-trip on navigate-away-and-back. Invalidates on TTL or any
  //(entities / range) change.
  const cached = batteryHistoryCacheGet(fetchKey);
  if (cached) {
    host._batterySocHistory = cached.soc;
    return;
  }
  fetchBatteryHistory(host, sortedSoc, ltsStart, host._energyEnd, fetchKey);
}

//Fetch the recorder `change` series for charge (stat_energy_to) + discharge (stat_energy_from) as
//two independent series so the consumer nets them with a structural sign. Gated on a per-host key
//that re-arms every CHANGE_REFRESH_MS (and on entity-set / window changes).
function fetchBatteryChangeSeries(host: BatteryHost): void {
  const chargeIds = host._energyDefaults.batteryStatEnergyTos;
  const dischargeIds = host._energyDefaults.batteryStatEnergyFroms;
  if (chargeIds.length === 0 && dischargeIds.length === 0) {
    return;
  }
  if (host._batteryChangeFetching || !host._energyStart || !host._energyEnd) {
    return;
  }

  //Over the date-pick window at the finest period the span allows. The refresh anchor re-arms once
  //per CHANGE_REFRESH_MS and lands every card on the same cache key (one recorder hit per interval).
  const startMs = host._energyStart.getTime();
  const endMs = host._energyEnd.getTime();
  const period = adaptivePeriodFor(endMs - startMs);
  const sortedCharge = [...chargeIds].sort();
  const sortedDischarge = [...dischargeIds].sort();
  const key = `${sortedCharge.join(",")}|${sortedDischarge.join(",")}|${startMs}|${endMs}|${period}|${changeRefreshAnchorMs()}`;
  if (key === host._batteryChangeFetchKey) {
    return;
  }
  host._batteryChangeFetchKey = key;
  host._batteryChangeFetching = true;
  void Promise.all([
    sortedCharge.length > 0
      ? fetchChangeSeries(host.hass, sortedCharge, startMs, endMs, period)
      : Promise.resolve(null),
    sortedDischarge.length > 0
      ? fetchChangeSeries(host.hass, sortedDischarge, startMs, endMs, period)
      : Promise.resolve(null),
  ])
    .then(([charge, discharge]) => {
      if (charge !== null) {
        host._batteryChargeChangeSeries = charge;
      }
      if (discharge !== null) {
        host._batteryDischargeChangeSeries = discharge;
      }
      host.requestUpdate();
    })
    .finally(() => {
      host._batteryChangeFetching = false;
    });
}

//Parse a `recorder/statistics_during_period` payload into a BatteryHistory. SoC / power sensors are
//usually `measurement` (column `mean`); a cumulative-energy counter has `mean` null with `state`
//carrying the reading. Prefer `mean`, fall back to `state`.
function parseBatteryStats(arr: any[]): BatteryHistory {
  const times: Date[] = [];
  const values: number[] = [];
  for (const item of arr ?? []) {
    const startMs = parseStatBoundary(item?.start);
    const endMs = parseStatBoundary(item?.end);
    if (startMs === null) {
      continue;
    }
    let valueRaw: unknown = item?.mean;
    let anchorAtEnd = false;
    if (valueRaw === null || valueRaw === undefined) {
      valueRaw = item?.state;
      //Cumulative readings anchor at the bucket end so deltas attribute to the right bucket.
      anchorAtEnd = true;
    }
    if (valueRaw === null || valueRaw === undefined) {
      continue;
    }
    const v =
      typeof valueRaw === "number" ? valueRaw : parseFloat(String(valueRaw));
    if (!isFinite(v)) {
      continue;
    }
    const anchorMs = anchorAtEnd
      ? (endMs ?? startMs)
      : endMs !== null
        ? (startMs + endMs) / 2
        : startMs;
    times.push(new Date(anchorMs));
    values.push(v);
  }
  return { times, values };
}

//Coerce a `start` / `end` statistics field into a millisecond epoch.
function parseStatBoundary(raw: unknown): number | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === "number") {
    return raw > 1e12 ? raw : raw * 1000;
  }
  if (typeof raw === "string") {
    const asNum = Number(raw);
    if (Number.isFinite(asNum) && asNum > 1e9) {
      return asNum > 1e12 ? asNum : asNum * 1000;
    }
    const d = new Date(raw);
    const t = d.getTime();
    return isFinite(t) ? t : null;
  }
  return null;
}

//Last-known-carry-forward aggregator across N battery banks. Walks the union of all per-entity
//timestamps in O(entities * union). `transform` and `reducer` keep it general.
function aggregateBatteryLkcf(
  perEntity: BatteryHistory[],
  reducer: "sum" | "mean",
  transform: (value: number, entityIdx: number) => number
): BatteryHistory {
  if (perEntity.length === 0) {
    return { times: [], values: [] };
  }
  if (perEntity.length === 1) {
    const only = perEntity[0];
    return {
      times: only.times,
      values: only.values.map((v, _i) => transform(v, 0)),
    };
  }
  const tsSet = new Set<number>();
  for (const h of perEntity) {
    for (const t of h.times) {
      tsSet.add(t.getTime());
    }
  }
  const sortedTs = Array.from(tsSet).sort((a, b) => a - b);
  const cursors = new Array<number>(perEntity.length).fill(-1);
  const out: number[] = [];
  for (const ts of sortedTs) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < perEntity.length; i++) {
      const h = perEntity[i];
      let c = cursors[i];
      while (c + 1 < h.times.length && h.times[c + 1].getTime() <= ts) {
        c++;
      }
      cursors[i] = c;
      if (c >= 0 && isFinite(h.values[c])) {
        sum += transform(h.values[c], i);
        count++;
      }
    }
    out.push(count === 0 ? NaN : reducer === "mean" ? sum / count : sum);
  }
  return {
    times: sortedTs.map((t) => new Date(t)),
    values: out,
  };
}

//SoC history fetch. Uses `recorder/statistics_during_period` exclusively (the only path that scales
//on a >1 Hz BMS: ~576 rows for a 2-day window vs ~150-200k raw). SoC is a `measurement` (column
//`mean`); an untracked SoC sensor yields an empty series and the scrub falls back to live SoC.
export async function fetchBatteryHistory(
  host: BatteryHost,
  socEntities: string[],
  ltsStart: Date,
  end: Date,
  cacheKey = ""
): Promise<void> {
  if (!host.hass?.callWS) {
    return;
  }
  if (socEntities.length === 0) {
    return;
  }
  host._batteryFetching = true;
  try {
    //History only exists up to "now"; clamp the fetch end so we don't request empty future buckets.
    const now = new Date();
    const fetchEnd = end > now ? now : end;
    if (ltsStart >= fetchEnd) {
      host._batterySocHistory = { times: [], values: [] };
      return;
    }
    //Finest period the span allows, so a year view still has data beyond the recorder's ~10-day
    //5-minute retention.
    const socPeriod = adaptivePeriodFor(
      fetchEnd.getTime() - ltsStart.getTime()
    );

    const ids = Array.from(new Set(socEntities));
    const perEntity: Record<string, BatteryHistory> = {};

    const statsResult: any = await host.hass.callWS({
      type: "recorder/statistics_during_period",
      start_time: ltsStart.toISOString(),
      end_time: fetchEnd.toISOString(),
      statistic_ids: ids,
      period: socPeriod,
      //`state` requested too so a degenerate wiring that stores SoC in `state` still lands populated.
      types: ["mean", "state"],
      units: { energy: "kWh", power: "W" },
    });
    for (const id of ids) {
      perEntity[id] = parseBatteryStats(statsResult?.[id] ?? []);
    }

    //Multi-bank LKCF aggregation: SoC averaged across banks, clamped to [0, 100].
    const socSeries = aggregateBatteryLkcf(
      socEntities.map((id) => perEntity[id] ?? { times: [], values: [] }),
      "mean",
      (v) => Math.max(0, Math.min(100, v))
    );
    host._batterySocHistory = socSeries;

    //Persist for the next mount; cross-mount cache hits skip the WS round-trip on navigation.
    if (cacheKey) {
      _batteryHistoryCache.set(cacheKey, {
        soc: socSeries,
        ts: Date.now(),
      });
    }
  } catch (_) {
    host._batterySocHistory = { times: [], values: [] };
  } finally {
    host._batteryFetching = false;
  }
}

//History sample at or before `time`, or null if outside the fetched window. 60 s tail grace keeps
//"scrub to live" resolving cleanly.
export function batterySampleAtTime(
  hist: BatteryHistory | null,
  time: Date
): number | null {
  if (!hist || hist.times.length === 0) {
    return null;
  }
  const tMs = time.getTime();
  const firstMs = hist.times[0].getTime();
  const lastMs = hist.times[hist.times.length - 1].getTime();
  if (tMs < firstMs || tMs > lastMs + 60_000) {
    return null;
  }
  let idx = hist.times.length - 1;
  for (let i = 0; i < hist.times.length; i++) {
    if (hist.times[i].getTime() > tMs) {
      idx = i - 1;
      break;
    }
  }
  if (idx < 0) {
    idx = 0;
  }
  return hist.values[idx];
}

//Format a signed battery power value for the chip: kW at the configured precision, with an explicit
//+ / − so charging reads apart from discharging.
export function formatBatteryPower(
  hass: any,
  value: number,
  unit: string,
  decimals: number
): string {
  return formatPowerKw(hass, pvNormalizeToWatts(value, unit), decimals, true);
}
