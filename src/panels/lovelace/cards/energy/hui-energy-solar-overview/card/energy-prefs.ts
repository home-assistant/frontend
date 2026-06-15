//HA Energy dashboard preferences parsing + recorder day-totals. The card resolves its data
//exclusively from the Energy dashboard global settings (no per-card entity slots). Prefs arrive via
//the shared getEnergyDataCollection subscription; parseEnergyPrefs folds each source's declared
//meters into the card's live-power model.

export interface EnergyDefaults {
  //Solar live signed power (`stat_rate`), preferred over cumulative for the live chip + chart.
  solarStatRates: string[];
  //Cumulative solar kWh meters (`stat_energy_from`); drive the chart curve and `produced today` total.
  solarStatEnergyFroms: string[];
  //Grid live signed power (`stat_rate`); positive -> import chip, negative -> export chip.
  gridStatRates: string[];
  //Grid import kWh meters (`stat_energy_from`).
  gridStatEnergyFroms: string[];
  //Grid export kWh meters (`stat_energy_to`).
  gridStatEnergyTos: string[];
  //Battery live power via `power_config`; after invertedRateEntities flips, charge + / discharge −.
  batteryStatRates: string[];
  //Battery discharge kWh meters (`stat_energy_from`).
  batteryStatEnergyFroms: string[];
  //Battery charge kWh meters (`stat_energy_to`).
  batteryStatEnergyTos: string[];
  //Battery SoC sensors (`stat_soc`); uniform-averaged across banks.
  batteryStatSocs: string[];
  //Entity ids whose raw value opposes the card's canonical sign (battery + = charging, grid + =
  //import). Which `power_config` slot lands here is flavor-dependent; see collectPowerConfigRates.
  //Consumers flip the sign at sample time.
  invertedRateEntities: string[];
}

export const EMPTY_ENERGY_DEFAULTS: EnergyDefaults = {
  solarStatRates: [],
  solarStatEnergyFroms: [],
  gridStatRates: [],
  gridStatEnergyFroms: [],
  gridStatEnergyTos: [],
  batteryStatRates: [],
  batteryStatEnergyFroms: [],
  batteryStatEnergyTos: [],
  batteryStatSocs: [],
  invertedRateEntities: [],
};

//Find the co2signal / Electricity Maps fossil-fuel % sensor (the share the low-carbon split derives
//from), mirroring HA's Energy dashboard. Null when the integration is absent (hides the chip).
export function findCo2SignalEntity(hass: any): string | null {
  const entities = hass?.entities;
  if (!entities || typeof entities !== "object") {
    return null;
  }
  for (const ent of Object.values(entities) as {
    entity_id?: string;
    platform?: string;
  }[]) {
    if (
      !ent ||
      (ent.platform !== "co2signal" && ent.platform !== "electricity_maps")
    ) {
      continue;
    }
    const id = ent.entity_id;
    if (!id) {
      continue;
    }
    //The integration exposes a g/kWh intensity sensor AND a % fossil sensor; we want the % one.
    if (hass.states?.[id]?.attributes?.unit_of_measurement === "%") {
      return id;
    }
  }
  return null;
}

//Host shape for refreshHaDailyTotals; the card writes these slots when the recorder query lands.
export interface HaDailyTotalsHost {
  readonly hass: any;
  readonly _energyDefaults: EnergyDefaults;
  _haSolarTodayKwh: number | null;
  _haGridImportTodayKwh: number | null;
  _haGridExportTodayKwh: number | null;
  _haBatteryChargedKwh: number | null;
  _haBatteryDischargedKwh: number | null;
  requestUpdate(): void;
}

//Module-level cache for the recorder day-totals fetch, keyed by `${localDate}|${sortedStatIds}` so
//cards on the same dashboard share one WS round-trip per window. TTL undershoots the 30 s tick;
//inflight requests are deduped.
interface HaDailyTotalsCacheEntry {
  ts: number;
  result: number | null;
  inflight?: Promise<number | null>;
}
const HA_DAILY_TOTALS_TTL_MS = 25_000;
const _haDailyTotalsCache = new Map<string, HaDailyTotalsCacheEntry>();

//Sum the `change` field of `recorder/statistics_during_period` over today (local midnight to now)
//across every statistic_id. Null when the list is empty, hass is unavailable, or the call rejects.
async function fetchTodayKwhChange(
  host: HaDailyTotalsHost,
  statisticIds: string[]
): Promise<number | null> {
  if (statisticIds.length === 0) {
    return null;
  }
  if (!host.hass?.callWS) {
    return null;
  }
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const now = new Date();
  //Date stamp in the key so the cached value retires at midnight rollover.
  const cacheKey = `${midnight.getFullYear()}-${midnight.getMonth()}-${midnight.getDate()}|${[...statisticIds].sort().join("|")}`;
  const nowMs = now.getTime();
  const cached = _haDailyTotalsCache.get(cacheKey);
  if (cached) {
    if (cached.inflight) {
      return cached.inflight;
    }
    if (nowMs - cached.ts < HA_DAILY_TOTALS_TTL_MS) {
      return cached.result;
    }
  }
  const inflight: Promise<number | null> = (async () => {
    try {
      const result = (await host.hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: midnight.toISOString(),
        end_time: now.toISOString(),
        statistic_ids: statisticIds,
        //Day period -> one bucket per statistic; `change` is the recorder's net delta, matching the
        //HA Energy tile to the watt-hour.
        period: "day",
        types: ["change"],
        //Normalise to kWh; chip + dashboard formatters assume kWh downstream.
        units: { energy: "kWh" },
      })) as Record<string, { change?: number | null }[]>;
      let total = 0;
      let anyHit = false;
      for (const id of statisticIds) {
        const buckets = result?.[id];
        if (!Array.isArray(buckets)) {
          continue;
        }
        for (const bucket of buckets) {
          const v = typeof bucket?.change === "number" ? bucket.change : null;
          if (v === null) {
            continue;
          }
          total += v;
          anyHit = true;
        }
      }
      return anyHit ? total : null;
    } catch (_) {
      //Statistic missing / recorder under load / RBAC denied: caller keeps the last good snapshot.
      return null;
    }
  })();
  _haDailyTotalsCache.set(cacheKey, { ts: nowMs, result: null, inflight });
  const settled = await inflight;
  _haDailyTotalsCache.set(cacheKey, { ts: Date.now(), result: settled });
  return settled;
}

//Refresh the five HA Energy daily-total slots from the recorder (one round-trip per non-empty list,
//fired in parallel). Called periodically from the card's tick loop.
export async function refreshHaDailyTotals(
  host: HaDailyTotalsHost
): Promise<void> {
  const defaults = host._energyDefaults;
  const [solar, imp, exp, charged, discharged] = await Promise.all([
    fetchTodayKwhChange(host, defaults.solarStatEnergyFroms),
    fetchTodayKwhChange(host, defaults.gridStatEnergyFroms),
    fetchTodayKwhChange(host, defaults.gridStatEnergyTos),
    fetchTodayKwhChange(host, defaults.batteryStatEnergyTos),
    fetchTodayKwhChange(host, defaults.batteryStatEnergyFroms),
  ]);
  let changed = false;
  if (solar !== null && solar !== host._haSolarTodayKwh) {
    host._haSolarTodayKwh = solar;
    changed = true;
  }
  if (imp !== null && imp !== host._haGridImportTodayKwh) {
    host._haGridImportTodayKwh = imp;
    changed = true;
  }
  if (exp !== null && exp !== host._haGridExportTodayKwh) {
    host._haGridExportTodayKwh = exp;
    changed = true;
  }
  if (charged !== null && charged !== host._haBatteryChargedKwh) {
    host._haBatteryChargedKwh = charged;
    changed = true;
  }
  if (discharged !== null && discharged !== host._haBatteryDischargedKwh) {
    host._haBatteryDischargedKwh = discharged;
    changed = true;
  }
  if (changed) {
    host.requestUpdate();
  }
}

//Parse the `energy/get_prefs` payload into the arrays above; multi-source installs sum across the
//arrays at the consumer. Source shapes (HA core 2024+):
//  - solar:   { type, stat_energy_from, stat_rate?, config_entry_solar_forecast? }
//  - grid:    { type, stat_energy_from, stat_energy_to?, stat_rate?, power_config? }
//  - battery: { type, stat_energy_from, stat_energy_to, stat_soc?, power_config? }
//We read both `power_config.stat_rate` (post-2026) and the legacy top-level grid `stat_rate`.
export function parseEnergyPrefs(prefs: {
  energy_sources?: Record<string, unknown>[];
}): EnergyDefaults {
  //Fresh literal (not a spread of EMPTY_ENERGY_DEFAULTS) so the array fields aren't aliased on the
  //shared empty default across concurrent parses.
  const out: EnergyDefaults = {
    solarStatRates: [],
    solarStatEnergyFroms: [],
    gridStatRates: [],
    gridStatEnergyFroms: [],
    gridStatEnergyTos: [],
    batteryStatRates: [],
    batteryStatEnergyFroms: [],
    batteryStatEnergyTos: [],
    batteryStatSocs: [],
    invertedRateEntities: [],
  };
  const sources = Array.isArray(prefs?.energy_sources)
    ? prefs!.energy_sources!
    : [];

  for (const src of sources) {
    if (!src || typeof src !== "object") {
      continue;
    }
    const type = String(src["type"] ?? "").toLowerCase();

    if (type === "solar") {
      const meter = pickFirstString(src["stat_energy_from"]);
      if (meter) {
        out.solarStatEnergyFroms.push(meter);
      }
      const rate = pickFirstString(src["stat_rate"]);
      if (rate) {
        out.solarStatRates.push(rate);
      }
    } else if (type === "grid") {
      const imp = pickFirstString(src["stat_energy_from"]);
      if (imp) {
        out.gridStatEnergyFroms.push(imp);
      }
      const exp = pickFirstString(src["stat_energy_to"]);
      if (exp) {
        out.gridStatEnergyTos.push(exp);
      }
      const directRate = pickFirstString(src["stat_rate"]);
      if (directRate) {
        out.gridStatRates.push(directRate);
      } else {
        for (const slot of collectPowerConfigRates(
          src["power_config"],
          "grid"
        )) {
          out.gridStatRates.push(slot.entity);
          if (slot.inverted) {
            out.invertedRateEntities.push(slot.entity);
          }
        }
      }
    } else if (type === "battery") {
      const discharge = pickFirstString(src["stat_energy_from"]);
      if (discharge) {
        out.batteryStatEnergyFroms.push(discharge);
      }
      const charge = pickFirstString(src["stat_energy_to"]);
      if (charge) {
        out.batteryStatEnergyTos.push(charge);
      }
      const soc = pickFirstString(src["stat_soc"]);
      if (soc) {
        out.batteryStatSocs.push(soc);
      }
      //A battery source can also carry a top-level `stat_rate`, deliberately not read: the
      //directional pair below already nets to the same value, so summing both would double-count.
      for (const slot of collectPowerConfigRates(
        src["power_config"],
        "battery"
      )) {
        out.batteryStatRates.push(slot.entity);
        if (slot.inverted) {
          out.invertedRateEntities.push(slot.entity);
        }
      }
    }
  }
  return out;
}

//Collect every live-power entity in a `power_config` block, each with the sign flip needed to land
//on the card's canonical convention (battery + = charging, grid + = import). Slot signs are
//FLAVOR-DEPENDENT, per HA's own dialog copy:
//  - `stat_rate` ("Standard"): signed net. Grid + = import (no flip); battery + = discharge (flip).
//  - `stat_rate_inverted`: the mirror. Grid flips, battery does not.
//  - `stat_rate_from`: unsigned, battery discharge / grid import (battery flips).
//  - `stat_rate_to`: unsigned, battery charge / grid export (grid flips).
//A source can carry BOTH directional slots (separate charge + discharge meters), so every populated
//slot lands in the list and the consumer sums them.
function collectPowerConfigRates(
  raw: unknown,
  flavor: "grid" | "battery"
): { entity: string; inverted: boolean }[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }
  const pc = raw as Record<string, unknown>;
  const out: { entity: string; inverted: boolean }[] = [];
  //Net slots first, EXCLUSIVE of the directional pair: a signed net sensor already carries both
  //directions, so summing it with from/to would double-count.
  const direct = pickFirstString(pc["stat_rate"]);
  if (direct) {
    out.push({ entity: direct, inverted: flavor === "battery" });
  }
  const flipped = pickFirstString(pc["stat_rate_inverted"]);
  if (flipped) {
    out.push({ entity: flipped, inverted: flavor === "grid" });
  }
  if (out.length > 0) {
    return out;
  }
  const fromEntity = pickFirstString(pc["stat_rate_from"]);
  if (fromEntity) {
    out.push({ entity: fromEntity, inverted: flavor === "battery" });
  }
  const toEntity = pickFirstString(pc["stat_rate_to"]);
  if (toEntity) {
    out.push({ entity: toEntity, inverted: flavor === "grid" });
  }
  return out;
}

function pickFirstString(v: unknown): string | null {
  if (typeof v === "string" && v.trim() !== "") {
    return v.trim();
  }
  if (Array.isArray(v)) {
    for (const item of v) {
      if (typeof item === "string" && item.trim() !== "") {
        return item.trim();
      }
    }
  }
  return null;
}
