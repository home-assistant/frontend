//Grid import / export readout. Wiring resolves from the HA Energy dashboard: import = each source's
//`stat_energy_from`, export = `stat_energy_to`, live signed power = `stat_rate` / `power_config`.
//Past series read the recorder `change` metric on the directional meters (import / export are
//SEPARATE meters, so each direction's watts come from its own, no sign inference). Live "now" prefers
//the signed `stat_rate` summed across sources and split into import (net >= 0) / export (net < 0),
//honouring per-source inversion via invertedRateEntities; otherwise falls back to the latest change
//bucket per direction.

import { pvNormalizeToWatts } from "./pv";
import {
  formatLocalisedNumber,
  formatPowerKw,
  formatEnergyKwh,
  energyToKwh,
} from "./format";
import type { EnergyDefaults } from "./energy-prefs";
import {
  fetchChangeSeries,
  latestWattsFromChangeSeries,
  changeRefreshAnchorMs,
  adaptivePeriodFor,
  type ChangeBucket,
} from "./energy-stats";

export interface GridHost {
  readonly hass: any;
  //HA Energy defaults, populated by card/energy-prefs.ts; grid wiring resolves exclusively from here.
  readonly _energyDefaults?: EnergyDefaults;
  //The Energy date-pick window the scrub series is fetched over.
  readonly _energyStart?: Date;
  readonly _energyEnd?: Date;

  requestUpdate(): void;

  _gridImportValue: number | null;
  _gridImportUnit: string;
  _gridExportValue: number | null;
  _gridExportUnit: string;

  //Recorder `change` series for the import / export meters, converted to average watts by the
  //consumer. Null until first fetch.
  _gridImportChangeSeries: ChangeBucket[] | null;
  _gridExportChangeSeries: ChangeBucket[] | null;
  _gridImportChangeFetchKey: string;
  _gridExportChangeFetchKey: string;
  _gridImportChangeFetching: boolean;
  _gridExportChangeFetching: boolean;
}

export function refreshGrid(host: GridHost): void {
  if (!host.hass) {
    if (host._gridImportValue !== null) {
      host._gridImportValue = null;
    }
    if (host._gridImportUnit !== "") {
      host._gridImportUnit = "";
    }
    if (host._gridExportValue !== null) {
      host._gridExportValue = null;
    }
    if (host._gridExportUnit !== "") {
      host._gridExportUnit = "";
    }
    return;
  }

  //Past series: recorder `change` on the directional energy meters.
  fetchGridChangeSeries(host, "import");
  fetchGridChangeSeries(host, "export");

  //Live chip: mirror HA's signed-power read when declared, else latest change bucket per direction.
  const statRates = host._energyDefaults?.gridStatRates ?? [];
  if (statRates.length > 0) {
    readStatRates(host, statRates);
  } else {
    const nowMs = Date.now();
    const imp = latestWattsFromChangeSeries(
      host._gridImportChangeSeries,
      nowMs
    );
    const exp = latestWattsFromChangeSeries(
      host._gridExportChangeSeries,
      nowMs
    );
    applyValue(
      host,
      "import",
      imp !== null ? Math.max(0, imp) : null,
      imp !== null ? "W" : ""
    );
    applyValue(
      host,
      "export",
      exp !== null ? Math.max(0, exp) : null,
      exp !== null ? "W" : ""
    );
  }
}

//Fetch the recorder `change` series for a direction's energy meters, gated on a per-host fetch key
//that re-arms every CHANGE_REFRESH_MS (and on entity-set / window changes).
function fetchGridChangeSeries(
  host: GridHost,
  slot: "import" | "export"
): void {
  const ed = host._energyDefaults;
  const ids =
    slot === "import"
      ? (ed?.gridStatEnergyFroms ?? [])
      : (ed?.gridStatEnergyTos ?? []);
  if (ids.length === 0) {
    return;
  }

  const fetching =
    slot === "import"
      ? host._gridImportChangeFetching
      : host._gridExportChangeFetching;
  if (fetching || !host._energyStart || !host._energyEnd) {
    return;
  }

  //Over the date-pick window at the finest period the span allows; the refresh anchor re-arms once
  //per CHANGE_REFRESH_MS so a live window keeps catching new buckets.
  const startMs = host._energyStart.getTime();
  const endMs = host._energyEnd.getTime();
  const period = adaptivePeriodFor(endMs - startMs);
  const sorted = [...ids].sort();
  const key = `${sorted.join(",")}|${startMs}|${endMs}|${period}|${changeRefreshAnchorMs()}`;

  const prevKey =
    slot === "import"
      ? host._gridImportChangeFetchKey
      : host._gridExportChangeFetchKey;
  if (key === prevKey) {
    return;
  }

  if (slot === "import") {
    host._gridImportChangeFetchKey = key;
    host._gridImportChangeFetching = true;
  } else {
    host._gridExportChangeFetchKey = key;
    host._gridExportChangeFetching = true;
  }
  void fetchChangeSeries(host.hass, sorted, startMs, endMs, period)
    .then((series) => {
      if (series !== null) {
        if (slot === "import") {
          host._gridImportChangeSeries = series;
        } else {
          host._gridExportChangeSeries = series;
        }
      }
      host.requestUpdate();
    })
    .finally(() => {
      if (slot === "import") {
        host._gridImportChangeFetching = false;
      } else {
        host._gridExportChangeFetching = false;
      }
    });
}

//Mirror of HA's live grid read: sum signed power across every `stat_rate`, then split via
//applyCombinedSplit (net >= 0 -> import only, net < 0 -> export only).
function readStatRates(host: GridHost, rates: string[]): void {
  let signedWatts = 0;
  let sawAny = false;
  for (const entity of rates) {
    const stateObj = host.hass.states?.[entity];
    if (!stateObj) {
      continue;
    }
    const raw = stateObj.state;
    if (
      raw === null ||
      raw === undefined ||
      raw === "" ||
      raw === "unknown" ||
      raw === "unavailable"
    ) {
      continue;
    }
    const num = parseNumericState(raw);
    if (num === null) {
      continue;
    }
    const unit = String(stateObj.attributes?.unit_of_measurement ?? "").trim();
    const watts = pvNormalizeToWatts(num, unit);
    //Per-source inversion applied at read time so the split sees "positive = import".
    const inverted =
      host._energyDefaults?.invertedRateEntities.includes(entity) ?? false;
    signedWatts += inverted ? -watts : watts;
    sawAny = true;
  }
  if (!sawAny) {
    return;
  }
  applyCombinedSplit(host, signedWatts);
}

function applyCombinedSplit(host: GridHost, signedWatts: number): void {
  if (signedWatts >= 0) {
    applyValue(host, "import", signedWatts, "W");
    applyValue(host, "export", null, "");
  } else {
    applyValue(host, "import", null, "");
    applyValue(host, "export", -signedWatts, "W");
  }
}

function applyValue(
  host: GridHost,
  slot: "import" | "export",
  value: number | null,
  unit: string
): void {
  //Negative on a directional slot is meaningless (the other slot already reports that direction);
  //clamp to 0.
  const clamped = value === null ? null : Math.max(0, value);
  if (slot === "import") {
    if (host._gridImportValue !== clamped) {
      host._gridImportValue = clamped;
    }
    if (host._gridImportUnit !== unit) {
      host._gridImportUnit = unit;
    }
  } else {
    if (host._gridExportValue !== clamped) {
      host._gridExportValue = clamped;
    }
    if (host._gridExportUnit !== unit) {
      host._gridExportUnit = unit;
    }
  }
}

//Parse a state value (string or number), accepting both '.' and ',' decimal separators. Null for
//anything non-finite.
function parseNumericState(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }
  const normalised = trimmed.replace(",", ".");
  const n = parseFloat(normalised);
  return Number.isFinite(n) ? n : null;
}

//Format the grid chip value: power in kW, energy in kWh, at the configured precision. Empty string
//when null so callers can collapse the chip.
export function formatGridValue(
  hass: any,
  value: number | null,
  unit: string,
  decimals: number
): string {
  if (value === null) {
    return "";
  }
  const u = unit.toLowerCase();
  if (u === "w" || u === "kw" || u === "mw") {
    return formatPowerKw(hass, pvNormalizeToWatts(value, unit), decimals);
  }
  if (u === "wh" || u === "kwh" || u === "mwh") {
    return formatEnergyKwh(hass, energyToKwh(value, unit), decimals);
  }
  //Unknown unit: raw value at configured precision + HA's reported unit.
  return unit
    ? `${formatLocalisedNumber(hass, value, decimals)} ${unit}`
    : String(value);
}
