//HA native solar-production forecast reader: reads the forecast from the HA Energy dashboard
//(Forecast.Solar / Solcast / etc.). Mirrors the energy-prefs pattern: one cached WS round-trip with
//a throttle / in-flight guard and a requestUpdate when the parsed result lands.

const HOUR_MS = 3_600_000;
//Forecast refreshes every 30 min server-side; throttle the round-trip to at most this often.
const FORECAST_THROTTLE_MS = 5 * 60_000;

//One hourly forecast point. An hourly wh value equals the average watts over that hour, so the
//consumer reads watts directly without a unit conversion.
export interface SolarForecastPoint {
  tMs: number;
  wh: number;
}

export interface EnergyForecastHost {
  readonly hass: any;
  //Merged, time-sorted hourly forecast. Empty when no forecast is configured or the call failed.
  _haSolarForecast: SolarForecastPoint[];
  //Flips true the first time a fetch settles (including the empty case) so boot gating never blocks.
  _haSolarForecastLoaded: boolean;
  _haSolarForecastFetching: boolean;
  _haSolarForecastFetchedAt: number;
  requestUpdate(): void;
}

//Fetch the HA solar forecast and update the cached snapshot. Safe to call repeatedly; any failure
//collapses silently to an empty forecast.
export async function fetchHaSolarForecast(
  host: EnergyForecastHost
): Promise<void> {
  if (!host.hass?.callWS) {
    return;
  }
  if (host._haSolarForecastFetching) {
    return;
  }
  //Throttle: once a fetch has settled, skip until the window elapses.
  if (
    host._haSolarForecastLoaded &&
    Date.now() - (host._haSolarForecastFetchedAt ?? 0) < FORECAST_THROTTLE_MS
  ) {
    return;
  }
  host._haSolarForecastFetchedAt = Date.now();
  host._haSolarForecastFetching = true;
  try {
    //HA's `energy/solar_forecast` returns { [configEntryId]: { wh_hours: { [iso]: number } } }; an
    //unconfigured install returns {} which parses to an empty forecast.
    const raw = (await host.hass.callWS({
      type: "energy/solar_forecast",
    })) as Record<string, { wh_hours?: Record<string, number> }>;
    host._haSolarForecast = mergeSolarForecast(raw);
    host._haSolarForecastLoaded = true;
    host.requestUpdate();
  } catch (_) {
    //WS error / RBAC denied / no forecast: leave it empty but flip the loaded flag so boot gating
    //does not block on a payload that may never arrive.
    host._haSolarForecastLoaded = true;
  } finally {
    host._haSolarForecastFetching = false;
  }
}

//Merge the per-config-entry wh_hours maps into one hourly forecast: sum wh across entries at the
//same timestamp, emit time-sorted. Bad rows (unparseable timestamp, non-finite wh) are skipped.
function mergeSolarForecast(
  raw: Record<string, { wh_hours?: Record<string, number> }> | null | undefined
): SolarForecastPoint[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }
  const byMs = new Map<number, number>();
  for (const entryId of Object.keys(raw)) {
    const entry = raw[entryId];
    const whHours = entry?.wh_hours;
    if (!whHours || typeof whHours !== "object") {
      continue;
    }
    for (const iso of Object.keys(whHours)) {
      const tMs = Date.parse(iso);
      if (!Number.isFinite(tMs)) {
        continue;
      }
      const v = whHours[iso];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        continue;
      }
      byMs.set(tMs, (byMs.get(tMs) ?? 0) + v);
    }
  }
  const out: SolarForecastPoint[] = [];
  for (const [tMs, wh] of byMs) {
    out.push({ tMs, wh });
  }
  out.sort((a, b) => a.tMs - b.tMs);
  return out;
}

//Forecast watts at a bucket time. The hourly forecast is linearly interpolated between consecutive
//points so the 15-min store buckets draw a smooth curve. Null when no point covers the time.
export function forecastWattsAt(
  forecast: readonly SolarForecastPoint[],
  ms: number
): number | null {
  if (forecast.length === 0) {
    return null;
  }
  //Binary search for the last point whose tMs <= ms.
  let lo = 0;
  let hi = forecast.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const midIdx = Math.floor((lo + hi) / 2);
    if (forecast[midIdx].tMs <= ms) {
      idx = midIdx;
      lo = midIdx + 1;
    } else {
      hi = midIdx - 1;
    }
  }
  if (idx < 0) {
    return null;
  }
  const pt = forecast[idx];
  const next = forecast[idx + 1];
  //Interpolate toward the next point when it is the consecutive hour (no gap larger than ~1 h).
  if (next && next.tMs - pt.tMs <= HOUR_MS * 1.5 && next.tMs > pt.tMs) {
    const f = (ms - pt.tMs) / (next.tMs - pt.tMs);
    const frac = f < 0 ? 0 : f > 1 ? 1 : f;
    return pt.wh + (next.wh - pt.wh) * frac;
  }
  //No usable next point: the value only applies inside this point's own hour window.
  if (ms >= pt.tMs + HOUR_MS) {
    return null;
  }
  return pt.wh;
}
