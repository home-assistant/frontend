//Shared energy-statistics layer. Every PAST series (production, grid import / export, battery
//charge / discharge) is sourced like the HA Energy dashboard: the recorder's `change` metric, never
//a client-side differentiation. `recorder/statistics_during_period` with `types: ['change']`
//returns the per-bucket energy delta, with resets handled and `units: { energy: 'kWh' }`
//normalising server-side. The card's only math is kWh-per-bucket / bucket-duration = average watts.

const HOUR_MS = 3_600_000;

//Re-fetch cadence for the change-series gates. The recorder commits a 5-minute bucket every 5 min;
//callers fold floor(now / CHANGE_REFRESH_MS) into their fetch key so the gate re-arms once a minute.
export const CHANGE_REFRESH_MS = 60_000;

//"Now" floored to the refresh boundary; the single anchor every fetch gate folds into its key, so
//all cards compute the identical anchor and share one cache entry per interval.
export function changeRefreshAnchorMs(): number {
  return Math.floor(Date.now() / CHANGE_REFRESH_MS) * CHANGE_REFRESH_MS;
}

//One recorder change bucket: kWh delta over [startMs, endMs), reset-corrected + unit-normalised.
export interface ChangeBucket {
  startMs: number;
  endMs: number;
  kwh: number;
}

//Recorder statistics period. 5 minutes is the finest HA offers (kept ~10 days).
export type StatPeriod = "5minute" | "hour" | "day";

//Finest period that keeps the bucket count sane for a span: day -> 5minute, weeks -> hour, wider ->
//day. One source of truth shared by the chart and the scrub fetches so they never disagree.
export function adaptivePeriodFor(spanMs: number): StatPeriod {
  const days = spanMs / 86_400_000;
  if (days <= 3.05) {
    return "5minute";
  }
  if (days <= 35.05) {
    return "hour";
  }
  return "day";
}

//Module-level cache shared across cards so an N-card dashboard hits the recorder once per (window |
//period | statIds) tuple. TTL undershoots CHANGE_REFRESH_MS; inflight requests dedup.
interface CacheEntry {
  ts: number;
  result: ChangeBucket[] | null;
  inflight?: Promise<ChangeBucket[] | null>;
}
const TTL_MS = CHANGE_REFRESH_MS - 5_000;
const _cache = new Map<string, CacheEntry>();

//Drop settled entries past their TTL. The re-arm scheme retires a key every CHANGE_REFRESH_MS;
//without eviction the map would gain an entry per series per minute (hundreds of MB/day on a
//wall-mounted dashboard). Called on every fetch; the sweep is O(handful).
function pruneExpired(
  cache: Map<string, { ts: number; inflight?: unknown }>,
  nowMs: number
): void {
  for (const [key, e] of cache) {
    if (!e.inflight && nowMs - e.ts > TTL_MS) {
      cache.delete(key);
    }
  }
}

//Fetch the summed `change` series for a set of statistic ids over [startMs, endMs] at `period`.
//Per-source buckets are summed (aligned on bucket start) into one combined curve. Null when the id
//list is empty, hass is unavailable, or the call rejects.
export async function fetchChangeSeries(
  hass: any,
  statisticIds: string[],
  startMs: number,
  endMs: number,
  period: StatPeriod = "5minute"
): Promise<ChangeBucket[] | null> {
  if (statisticIds.length === 0) {
    return null;
  }
  if (!hass?.callWS) {
    return null;
  }
  if (endMs <= startMs) {
    return null;
  }

  const cacheKey = `${period}|${startMs}|${endMs}|${[...statisticIds].sort().join("|")}`;
  const nowMs = Date.now();
  pruneExpired(_cache, nowMs);
  const cached = _cache.get(cacheKey);
  if (cached) {
    if (cached.inflight) {
      return cached.inflight;
    }
    if (nowMs - cached.ts < TTL_MS) {
      return cached.result;
    }
  }

  const inflight: Promise<ChangeBucket[] | null> = (async () => {
    try {
      const result = (await hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: new Date(startMs).toISOString(),
        end_time: new Date(endMs).toISOString(),
        statistic_ids: statisticIds,
        period,
        types: ["change"],
        units: { energy: "kWh" },
      })) as Record<
        string,
        { start?: unknown; end?: unknown; change?: number | null }[]
      >;

      //Merge per-source buckets keyed on bucket start. Same-period sources align cleanly; misaligned
      //sources still accumulate into the nearest start key without dropping energy.
      const merged = new Map<number, ChangeBucket>();
      let anyHit = false;
      for (const id of statisticIds) {
        const buckets = result?.[id];
        if (!Array.isArray(buckets)) {
          continue;
        }
        for (const b of buckets) {
          const startBoundary = parseStatBoundary(b?.start);
          if (startBoundary === null) {
            continue;
          }
          const kwh = typeof b?.change === "number" ? b.change : null;
          if (kwh === null || !Number.isFinite(kwh)) {
            continue;
          }
          const endBoundary =
            parseStatBoundary(b?.end) ?? startBoundary + periodMs(period);
          const existing = merged.get(startBoundary);
          if (existing) {
            existing.kwh += kwh;
          } else {
            merged.set(startBoundary, {
              startMs: startBoundary,
              endMs: endBoundary,
              kwh,
            });
          }
          anyHit = true;
        }
      }
      if (!anyHit) {
        return null;
      }
      return [...merged.values()].sort((a, b) => a.startMs - b.startMs);
    } catch (_) {
      //Statistic missing / recorder under load / RBAC denied: keep the caller's previous series.
      return null;
    }
  })();

  _cache.set(cacheKey, { ts: nowMs, result: null, inflight });
  const settled = await inflight;
  _cache.set(cacheKey, { ts: Date.now(), result: settled });
  return settled;
}

//Live power from a `change` series must cope with two meter cadences:
//  - FINE (Shelly, P1, Victron): counter advances every few seconds, so every bucket carries energy;
//    the latest bucket is the responsive, correct read.
//  - COARSE (SolarEdge, 15 min): the whole 15-min delta lands in ONE bucket and zeroes the other two,
//    so the latest bucket reads 0 two-thirds of the time and ~3x the rest.
//Distinguished by the density of non-zero buckets in a probe window: dense -> read latest bucket;
//sparse -> average the probe window so the lone delta spreads over its real interval.
const COARSE_PROBE_MS = 15 * 60_000;
const DENSE_FRACTION = 0.6; //>= this share non-zero => fine meter

//Average power (W) over buckets overlapping [loMs, hiMs), pro-rating straddlers. Returns kwh / ms /
//nonZero / total so the caller can compute the average AND judge density.
function probeChangeWindow(
  buckets: ChangeBucket[],
  loMs: number,
  hiMs: number
): { kwh: number; ms: number; nonZero: number; total: number } {
  let kwh = 0;
  let ms = 0;
  let nonZero = 0;
  let total = 0;
  for (const b of buckets) {
    if (b.endMs <= loMs || b.startMs >= hiMs) {
      continue;
    }
    const span = b.endMs - b.startMs;
    if (span <= 0) {
      continue;
    }
    const ov = Math.min(b.endMs, hiMs) - Math.max(b.startMs, loMs);
    if (ov <= 0) {
      continue;
    }
    kwh += b.kwh * (ov / span);
    ms += ov;
    total++;
    if (b.kwh > 0) {
      nonZero++;
    }
  }
  return { kwh, ms, nonZero, total };
}

function wattsFromBucket(b: ChangeBucket): number {
  const dt = b.endMs - b.startMs;
  return dt > 0 ? Math.max(0, (b.kwh * 1000) / (dt / HOUR_MS)) : 0;
}

//Live power for cumulative-only installs (no stat_rate). Fine: latest completed bucket. Coarse:
//probe-window average. Null only when no completed bucket exists.
export function latestWattsFromChangeSeries(
  buckets: ChangeBucket[] | null,
  nowMs: number
): number | null {
  if (!buckets || buckets.length === 0) {
    return null;
  }
  //Most recent COMPLETED bucket (end <= now, never a half-filled in-progress one).
  let lastIdx = -1;
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (buckets[i].endMs <= nowMs) {
      lastIdx = i;
      break;
    }
  }
  if (lastIdx < 0) {
    return null;
  }
  const lastEnd = buckets[lastIdx].endMs;

  const probe = probeChangeWindow(buckets, lastEnd - COARSE_PROBE_MS, lastEnd);
  if (probe.total === 0) {
    return wattsFromBucket(buckets[lastIdx]);
  }
  const dense = probe.nonZero >= Math.ceil(probe.total * DENSE_FRACTION);
  if (dense) {
    return wattsFromBucket(buckets[lastIdx]);
  }
  //Coarse meter: spread the sparse delta over the probe span -> true average power.
  return probe.ms > 0
    ? Math.max(0, (probe.kwh * 1000) / (probe.ms / HOUR_MS))
    : 0;
}

//Average watts at a past instant, for the scrub tooltip. Same fine / coarse split centred on tMs.
//Null when no bucket covers the probe window (future scrub, gap before the data starts).
export function wattsAtFromChangeSeries(
  buckets: ChangeBucket[] | null,
  tMs: number
): number | null {
  if (!buckets || buckets.length === 0) {
    return null;
  }
  const half = COARSE_PROBE_MS / 2;
  const probe = probeChangeWindow(buckets, tMs - half, tMs + half);
  if (probe.total === 0) {
    return null;
  }
  const dense = probe.nonZero >= Math.ceil(probe.total * DENSE_FRACTION);
  if (dense) {
    //Fine meter: read the bucket containing tMs.
    for (const b of buckets) {
      if (tMs >= b.startMs && tMs < b.endMs) {
        return wattsFromBucket(b);
      }
    }
  }
  //Coarse meter (or tMs between buckets): average the probe window.
  return probe.ms > 0
    ? Math.max(0, (probe.kwh * 1000) / (probe.ms / HOUR_MS))
    : 0;
}

function periodMs(period: StatPeriod): number {
  if (period === "5minute") {
    return 5 * 60_000;
  }
  if (period === "hour") {
    return HOUR_MS;
  }
  return 24 * HOUR_MS;
}

//Parse a statistics bucket boundary: epoch ms (modern cores) or ISO string (older); accept both.
function parseStatBoundary(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const ms = Date.parse(raw);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}
