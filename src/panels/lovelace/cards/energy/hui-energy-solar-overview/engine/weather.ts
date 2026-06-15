//Open-Meteo weather data layer: multi-model fetch, in-browser cache, and pure-function
//helpers. No DOM, no map, no engine state.

//Hourly forecast at the home location; numeric arrays aligned on `times`. `shortwave`
//uses -1 as a "no data" sentinel (0 is a valid night value).
export interface SampleHourly {
  lat: number;
  lon: number;
  times: Date[];
  cloudCover: number[];
  cloudLow: number[];
  cloudMid: number[];
  cloudHigh: number[];
  weatherCode: number[];
  shortwave: number[];
  //directRad/diffuseRad: beam + diffuse on the horizontal plane (W/m², -1 sentinel).
  //snowDepth (m), temperature (°C), windSpeed (m/s): NaN-padded. None of these are
  //fetched anymore (the card's own PV forecast that used them is gone); the fields
  //stay so the cache plumbing that threads them is unchanged.
  directRad: number[];
  diffuseRad: number[];
  snowDepth: number[];
  temperature: number[];
  windSpeed: number[];
}

//Forecast window: 5 days back + today + 2 forward. Matches the timeline range and
//keeps the fetch within Open-Meteo's minimum 1 day-bucket.
const PAST_DAYS = 5;
//Today counts inside forecast_days, so 3 yields today + 2 future days.
const FORECAST_DAYS = 3;

//Exponential back-off on consecutive HTTP 429, indexed by streak; stays at the last
//value (60 min) once exhausted, and a single success resets the counter.
export const RATE_LIMIT_BACKOFF_MS = [5 * 60_000, 15 * 60_000, 60 * 60_000];

//Back-off for non-429 failures (network/5xx/parse), starting at 1 min for quick
//recovery, capped at 60 min so a sustained outage can't pile up retry traffic.
export const OTHER_ERROR_BACKOFF_MS = [
  1 * 60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
];

//Median of a numeric array, ignoring null/undefined/NaN. Combines multiple weather
//models per timestep; median over mean since models occasionally emit gross outliers.
export function medianOfNumbers(
  values: readonly (number | null | undefined)[]
): number | null {
  const clean: number[] = [];
  for (const v of values) {
    if (v == null || Number.isNaN(v)) {
      continue;
    }
    clean.push(v);
  }
  if (clean.length === 0) {
    return null;
  }
  clean.sort((a, b) => a - b);
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 === 0
    ? (clean[mid - 1] + clean[mid]) / 2
    : clean[mid];
}

//Pick the Open-Meteo models for a coordinate: one global model (ECMWF IFS 0.25°)
//plus the best national/regional model whose (conservative) coverage box contains
//the point. Order matters: a box enclosed by a larger one (Korea inside Japan) is
//tested first.
export function pickModelsForLocation(
  lat: number,
  lon: number,
  precision: "standard" | "high"
): string[] {
  if (precision === "standard") {
    return ["best_match"];
  }

  const GLOBAL = "ecmwf_ifs025";

  //France métropolitaine + Corsica. AROME-France HD at 1.3 km.
  if (lat >= 41.3 && lat <= 51.2 && lon >= -5.5 && lon <= 8.5) {
    return ["meteofrance_seamless", GLOBAL];
  }
  //United Kingdom & Ireland. UKMO UK 2 km.
  if (lat >= 49.5 && lat <= 61.0 && lon >= -10.5 && lon <= 2.0) {
    return ["ukmo_seamless", GLOBAL];
  }
  //Central Europe, DE/AT/CH/CZ/PL/Benelux. ICON-D2 at 2 km.
  if (lat >= 46.0 && lat <= 56.0 && lon >= 5.0 && lon <= 22.0) {
    return ["dwd_icon_seamless", GLOBAL];
  }
  //Italy proper (peninsula + islands).
  if (lat >= 36.5 && lat <= 47.0 && lon >= 10.0 && lon <= 18.5) {
    return ["italia_meteo_arpae_icon_2i", GLOBAL];
  }
  //Nordics, Norway/Sweden/Finland/Denmark. MET Nordic at 1 km.
  if (lat >= 54.5 && lat <= 71.5 && lon >= 4.0 && lon <= 32.0) {
    return ["metno_seamless", GLOBAL];
  }
  //Continental US (CONUS). NOAA HRRR 3 km via gfs_seamless.
  if (lat >= 24.5 && lat <= 49.5 && lon >= -125.0 && lon <= -66.5) {
    return ["gfs_seamless", GLOBAL];
  }
  //Korea, must be tested before Japan (the JMA box encloses Korea).
  if (lat >= 33.0 && lat <= 39.0 && lon >= 124.5 && lon <= 132.0) {
    return ["kma_seamless", GLOBAL];
  }
  //Japan. JMA MSM 5 km.
  if (lat >= 24.0 && lat <= 46.0 && lon >= 122.0 && lon <= 146.0) {
    return ["jma_seamless", GLOBAL];
  }
  //Australia & NZ. BOM ACCESS-G 15 km.
  if (lat >= -47.5 && lat <= -10.0 && lon >= 112.0 && lon <= 179.0) {
    return ["bom_access_global", GLOBAL];
  }
  //Anywhere else: ECMWF + GFS, two independent globals for a better median.
  return [GLOBAL, "gfs_seamless"];
}

//In-browser cache. The precision tag stays in the key so a future precision toggle
//won't collide with existing payloads.
const CACHE_KEY_PREFIX = "sol-weather-cache:";
//45 min: the 10-min refresh interval hits cache for 4 cycles then re-fetches, well
//within "fresh enough" given Open-Meteo's 15-min server-side model refresh.
const CACHE_TTL_MS = 45 * 60_000;
//3 decimals = 110 m, well below Open-Meteo's coarsest grid cell, so near-identical
//homes round to one cache entry and share the fetch. The API URL uses the same
//precision so the edge CDN also sees one canonical request.
const CACHE_KEY_DECIMALS = 3;

//Diagnostics counters surfaced in the engine stats snapshot. No behavioural effect.
const _weatherStats = {
  cacheHits: 0,
  networkFetches: 0,
  inflightDedups: 0,
  rateLimit429: 0,
  otherErrors: 0,
};
export function getWeatherFetchStats(): {
  cacheHits: number;
  networkFetches: number;
  inflightDedups: number;
  rateLimit429: number;
  otherErrors: number;
} {
  return { ..._weatherStats };
}

//Inflight Promise map keyed on cache key: concurrent callers for the same tuple await
//one Promise instead of each firing a network round-trip. Cleared in a finally block.
const _inflightFetches = new Map<string, Promise<SampleHourly | null>>();

interface CachedPayload {
  storedAt: number;
  payload: {
    lat: number;
    lon: number;
    times: string[];
    cloudCover: number[];
    cloudLow: number[];
    cloudMid: number[];
    cloudHigh: number[];
    weatherCode: number[];
    shortwave: number[];
    directRad?: number[]; //optional: older caches predate these fields
    diffuseRad?: number[];
    snowDepth?: number[];
    temperature?: number[];
    windSpeed?: number[];
  };
}

function cacheKey(
  lat: number,
  lon: number,
  precision: "standard" | "high"
): string {
  return `${CACHE_KEY_PREFIX}${precision}:${lat.toFixed(CACHE_KEY_DECIMALS)},${lon.toFixed(CACHE_KEY_DECIMALS)}`;
}

function readCache(
  lat: number,
  lon: number,
  precision: "standard" | "high"
): SampleHourly | null {
  try {
    const raw = window.localStorage?.getItem(cacheKey(lat, lon, precision));
    if (!raw) {
      return null;
    }
    const obj = JSON.parse(raw);
    if (Date.now() - obj.storedAt > CACHE_TTL_MS) {
      return null;
    }
    //Reject the cache if we crossed local midnight since it was written: Open-Meteo
    //anchors its window to "today", so yesterday's payload would pin the wrong day.
    if (new Date(obj.storedAt).toDateString() !== new Date().toDateString()) {
      return null;
    }
    const p = obj.payload;
    if (!p || Array.isArray(p) || !Array.isArray(p.times)) {
      return null;
    }
    return {
      lat: p.lat,
      lon: p.lon,
      times: p.times.map((t: string) => new Date(t)),
      cloudCover: p.cloudCover ?? [],
      cloudLow: p.cloudLow ?? [],
      cloudMid: p.cloudMid ?? [],
      cloudHigh: p.cloudHigh ?? [],
      weatherCode: p.weatherCode ?? [],
      shortwave: p.shortwave ?? [],
      //Older caches predate these fields; empty arrays read as the no-data sentinel.
      directRad: p.directRad ?? [],
      diffuseRad: p.diffuseRad ?? [],
      snowDepth: p.snowDepth ?? [],
      temperature: p.temperature ?? [],
      windSpeed: p.windSpeed ?? [],
    };
  } catch {
    return null;
  }
}

function writeCache(
  lat: number,
  lon: number,
  precision: "standard" | "high",
  data: SampleHourly
): void {
  try {
    const obj: CachedPayload = {
      storedAt: Date.now(),
      payload: {
        lat: data.lat,
        lon: data.lon,
        times: data.times.map((t) => t.toISOString()),
        cloudCover: data.cloudCover,
        cloudLow: data.cloudLow,
        cloudMid: data.cloudMid,
        cloudHigh: data.cloudHigh,
        weatherCode: data.weatherCode,
        shortwave: data.shortwave,
        directRad: data.directRad,
        diffuseRad: data.diffuseRad,
        snowDepth: data.snowDepth,
        temperature: data.temperature,
        windSpeed: data.windSpeed,
      },
    };
    window.localStorage?.setItem(
      cacheKey(lat, lon, precision),
      JSON.stringify(obj)
    );
  } catch {
    //Storage quota / permission errors ignored; the user gets a fresh fetch next time.
  }
}

//Variables fetched from Open-Meteo. shortwave_radiation_instant is the GHI *at* the
//hour (not averaged), matching our time cursor; it powers the irradiance chip and
//sun-arc colouring, the cloud variables the overlay and glyphs. The PV forecast now
//comes from HA, so the radiation split / snow / temp / wind are no longer requested.
const HOURLY_VARS = [
  "shortwave_radiation_instant",
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "weather_code",
];

//Multi-model responses suffix the key with the model name; "best_match" uses bare
//keys. Try the bare key first, then the suffixed ones, so both modes work.
function readSeries(
  row: any,
  varName: string,
  models: string[]
): (number | null)[] {
  const direct = row?.hourly?.[varName];
  if (Array.isArray(direct)) {
    return direct.map((v: any) =>
      v == null || Number.isNaN(v) ? null : Number(v)
    );
  }
  const series: (number | null)[][] = [];
  for (const m of models) {
    const arr = row?.hourly?.[`${varName}_${m}`];
    if (!Array.isArray(arr)) {
      continue;
    }
    series.push(
      arr.map((v: any) => (v == null || Number.isNaN(v) ? null : Number(v)))
    );
  }
  if (series.length === 0) {
    return [];
  }
  const len = Math.max(...series.map((s) => s.length));
  const out = new Array<number | null>(len);
  for (let i = 0; i < len; i++) {
    out[i] = medianOfNumbers(series.map((s) => s[i]));
  }
  return out;
}

//weather_code is categorical (WMO 0..99), so averaging is meaningless: take the first
//model that has it (by construction the most appropriate for the location).
function readWeatherCode(row: any, models: string[]): number[] {
  const direct = row?.hourly?.weather_code;
  if (Array.isArray(direct)) {
    return direct.map((v: any) => Number(v) || 0);
  }
  for (const m of models) {
    const arr = row?.hourly?.[`weather_code_${m}`];
    if (Array.isArray(arr)) {
      return arr.map((v: any) => Number(v) || 0);
    }
  }
  return [];
}

//Gap fills: cloud → 0 (missing = clear), shortwave → -1 (0 is a valid night value),
//temp/wind → NaN (so a downstream isFinite check rejects the sample cleanly).
const fillCloud = (arr: (number | null)[]): number[] =>
  arr.map((v) => (v == null ? 0 : v));
const fillShortwave = (arr: (number | null)[]): number[] =>
  arr.map((v) => (v == null ? -1 : v));
const fillNaN = (arr: (number | null)[]): number[] =>
  arr.map((v) => (v == null ? NaN : v));

//Single-point hourly forecast at the home. Reads fresh cache, else fetches Open-Meteo
//with multi-model median fusion and a layer-weighted effective cloud cover
//(low + 0.6·mid + 0.2·high, capped at 100 %) that beats the raw satellite-view total.
//Returns null on any failure so the caller can degrade gracefully.
export async function fetchHomePointData(
  lat: number,
  lon: number,
  elevation: number | undefined,
  precision: "standard" | "high",
  signal: AbortSignal
): Promise<SampleHourly | null> {
  //Round to the cache-key precision up front so the cache lookup, dedup key, and API
  //URL all use the EXACT same coordinates and don't fragment against each other.
  const fLat = Number(lat.toFixed(CACHE_KEY_DECIMALS));
  const fLon = Number(lon.toFixed(CACHE_KEY_DECIMALS));

  const cached = readCache(fLat, fLon, precision);
  if (cached) {
    _weatherStats.cacheHits++;
    return cached;
  }

  //Inflight dedup: await an in-progress fetch for the same tuple instead of starting
  //another round-trip (critical on multi-card dashboards racing a cold cache).
  const inflightKey = cacheKey(fLat, fLon, precision);
  const pending = _inflightFetches.get(inflightKey);
  if (pending) {
    _weatherStats.inflightDedups++;
    return pending;
  }

  const fetchPromise = (async (): Promise<SampleHourly | null> => {
    const models = pickModelsForLocation(fLat, fLon, precision);

    let url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${fLat.toFixed(CACHE_KEY_DECIMALS)}` +
      `&longitude=${fLon.toFixed(CACHE_KEY_DECIMALS)}` +
      `&hourly=${HOURLY_VARS.join(",")}` +
      `&models=${models.join(",")}` +
      `&past_days=${PAST_DAYS}&forecast_days=${FORECAST_DAYS}` +
      `&timezone=auto`;

    if (elevation !== undefined) {
      url += `&elevation=${elevation.toFixed(0)}`;
    }

    try {
      _weatherStats.networkFetches++;
      const res = await fetch(url, { signal });
      if (!res.ok) {
        //Re-throw 429 with the status attached so the engine catch arms the back-off
        //table; returning null would skip it and keep hammering the API. Other non-OK
        //statuses fall through to the silent null path.
        if (res.status === 429) {
          _weatherStats.rateLimit429++;
          const err: Error & { status?: number } = new Error(
            "Open-Meteo rate limit (HTTP 429)"
          );
          err.status = 429;
          throw err;
        }
        _weatherStats.otherErrors++;
        return null;
      }
      const json = await res.json();
      const row = Array.isArray(json) ? json[0] : json;

      const tArr = row?.hourly?.time ?? [];
      const times: Date[] = tArr.map((t: string) => new Date(t));

      const lowSeries = fillCloud(readSeries(row, "cloud_cover_low", models));
      const midSeries = fillCloud(readSeries(row, "cloud_cover_mid", models));
      const highSeries = fillCloud(readSeries(row, "cloud_cover_high", models));

      //Clamp each layer to [0, 100] before weighting so an out-of-range layer doesn't
      //skew the relative mix (the final Math.min only catches the total).
      const cloudEffective = lowSeries.map((lo, i) => {
        const lc = Math.max(0, Math.min(100, lo ?? 0));
        const mc = Math.max(0, Math.min(100, midSeries[i] ?? 0));
        const hc = Math.max(0, Math.min(100, highSeries[i] ?? 0));
        return Math.min(100, lc + 0.6 * mc + 0.2 * hc);
      });

      const data: SampleHourly = {
        lat: fLat,
        lon: fLon,
        times,
        cloudCover: cloudEffective,
        cloudLow: lowSeries,
        cloudMid: midSeries,
        cloudHigh: highSeries,
        weatherCode: readWeatherCode(row, models),
        shortwave: fillShortwave(
          readSeries(row, "shortwave_radiation_instant", models)
        ),
        directRad: fillShortwave(
          readSeries(row, "direct_radiation_instant", models)
        ),
        diffuseRad: fillShortwave(
          readSeries(row, "diffuse_radiation_instant", models)
        ),
        snowDepth: fillNaN(readSeries(row, "snow_depth", models)),
        temperature: fillNaN(readSeries(row, "temperature_2m", models)),
        windSpeed: fillNaN(readSeries(row, "wind_speed_10m", models)),
      };

      writeCache(fLat, fLon, precision, data);
      return data;
    } catch (e) {
      //Abort / network / parse errors are swallowed (caller treats null as "no data").
      //429 is NOT swallowed: it propagates so the engine arms the back-off table.
      if (
        e &&
        typeof e === "object" &&
        (e as { status?: number }).status === 429
      ) {
        throw e;
      }
      if (
        e &&
        typeof e === "object" &&
        (e as { name?: string }).name !== "AbortError"
      ) {
        _weatherStats.otherErrors++;
      }
      return null;
    }
  })();

  _inflightFetches.set(inflightKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    //Release the slot so the next fetch sees the cached payload, not this stale Promise.
    _inflightFetches.delete(inflightKey);
  }
}
