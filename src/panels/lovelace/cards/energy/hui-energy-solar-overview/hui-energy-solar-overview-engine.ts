import type { Map as MapLibreMap } from "maplibre-gl";
import maplibregl from "./maplibre";
import {
  getSunPosition,
  computePvPower,
  computeIrradianceWm2,
} from "./engine/sun";
import {
  fetchHomePointData,
  RATE_LIMIT_BACKOFF_MS,
  OTHER_ERROR_BACKOFF_MS,
  type SampleHourly,
} from "./engine/weather";
import {
  fetchBuildingsAroundHome,
  type BuildingsResult,
} from "./engine/buildings";
import {
  projectExtrusionShadows,
  shadowRasterSizeFor,
  BLANK_SHADOW_DATA_URL,
  shadowBoundsCornersLL,
  paintShadowRaster,
  type ShadowBoundsCorners,
  type ShadowPrecisionLevel,
} from "./engine/shadows";
import { WeatherCloudLayer } from "./engine/weather-cloud-layer";
import {
  CAMERA_PITCH_MIN_DEG,
  CAMERA_PITCH_MAX_DEG,
  CAMERA_PITCH_REST_DEG,
  CAMERA_TARGET_HEIGHT_M,
  type SolarOverviewCardConfig,
  DISPLAY_FADE_DELTA_M,
  displayRadiusM,
  DEFAULT_BUILDING_OPACITY,
  DEFAULT_BUILDING_CLUSTER_RADIUS_M,
  DEFAULT_BUILDING_COLOR_HEX,
  DEFAULT_SHADOW_OPACITY,
} from "./constants";
import {
  nightShadeForAltitude,
  buildingColorForAltitude,
  sunLightPolarFromAltitude,
} from "./engine/lighting";

//Engine for the solar overview card: a MapLibre 3D map of the home with
//sun arc, cast shadows and on-map readout chips.

//Cast shadows are rasterised to a single image source rather than fill layers:
//per-pixel coverage avoids the alpha-compositing saturation many overlapping
//fill polygons produce in a dense neighbourhood.
export const SHADOW_LAYER_IDS: readonly string[] = ["sol-building-shadows"];

//Cap on live engine instances. The HA editor spawns fresh preview cards on every
//edit without reliably tearing down the previous one, and each holds a WebGL
//context (Safari mobile caps active contexts at ~8). We evict the oldest engine
//when a new one would exceed the cap. 4 leaves room for the live card + editor
//preview + transient previews while staying under browser per-origin limits.
const MAX_LIVE_ENGINES = 4;

const _liveEngines = new Set<SolarOverviewEngine>();

//Shared module-scope cache for parsed fetch payloads. HA's editor re-creates the
//sol-card element on every config commit; stashing the parsed buildings GeoJSON
//here lets a fresh engine skip the re-parse (a visible flash otherwise). Key
//encodes home position + radius so any meaningful change invalidates naturally.
const SHARED_FETCH_CACHE_TTL_MS = 30 * 60_000;

interface SharedBuildingsCacheEntry {
  data: BuildingsResult;
  ts: number;
}

const _sharedBuildingsCache = new Map<string, SharedBuildingsCacheEntry>();

function sharedBuildingsCacheGet(key: string): BuildingsResult | null {
  const entry = _sharedBuildingsCache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.ts > SHARED_FETCH_CACHE_TTL_MS) {
    _sharedBuildingsCache.delete(key);
    return null;
  }
  return entry.data;
}

export type CloudIntensity =
  | "clear"
  | "light"
  | "moderate"
  | "heavy"
  | "storm"
  | "fog";

//Source of the displayed irradiance value, in priority order: sensor (HA entity
//measurement at the home) > shortwave (Open-Meteo model) > haurwitz (analytical
//clear-sky + cloud-attenuation fallback, always available).
export type IrradianceSource = "haurwitz" | "shortwave" | "sensor";

export interface WeatherData {
  cloudCover: number;
  cloudLow: number; //%, low-level clouds (≤ 3 km)
  cloudMid: number; //%, mid-level clouds (3–8 km)
  cloudHigh: number; //%, high-level clouds (≥ 8 km)
  cloudIntensity: CloudIntensity;
  timeRange: { start: Date; end: Date } | null;
  isLiveTime: boolean;
  pvPower: number; //primary value, normalised 0..100 (≈ GHI/10 W/m²)
  pvPowerHaurwitz: number; //always populated (analytical fallback)
  pvPowerShortwave: number; //-1 if shortwave_radiation is unavailable
  irradianceSource: IrradianceSource;
  //Ambient context for the card-side PV prediction (temperature → thermal
  //derating, wind → convective cooling). NaN means the model omitted the value;
  //the predictor falls back to no derating.
  temperatureC: number;
  windMs: number;
}

//Mobile detection, used to scale pixel ratio so older phones keep usable framerates.
const IS_MOBILE = (() => {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  if (/Mobi|Android|iPhone|iPad|iPod|IEMobile|BlackBerry/i.test(ua)) {
    return true;
  }
  if (typeof window !== "undefined" && window.innerWidth <= 768) {
    return true;
  }
  return false;
})();

//Haversine distance in metres.
function geoDistM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6_371_000;
  const D = Math.PI / 180;
  const dφ = (lat2 - lat1) * D;
  const dλ = (lon2 - lon1) * D;
  const a =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(lat1 * D) * Math.cos(lat2 * D) * Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

//Vertical screen-space offset (CSS px) anchoring the PV/battery chip cluster
//relative to the projected home.
const PV_CHIP_OFFSET_PX = 70;

//Sun-arc parameters. The arc traces the sun's 24h trajectory projected via
//MapLibre's camera matrices. Radius is the metres of the imaginary celestial
//hemisphere centred on the home; 48 m uses the headroom freed by aiming the
//camera above the house (CAMERA_TARGET_HEIGHT_M) while keeping the whole arc
//inside a card-sized canvas even at low solar altitudes.
const SUN_ARC_RADIUS_M = 48;
//Samples uniformly spaced over the 24h day (one per 15 min); smooth yet cheap to
//re-project on every map transform.
const SUN_ARC_SAMPLES = 96;
//Opacity multiplier for the below-horizon portion of the arc.
const SUN_ARC_NIGHT_OPACITY = 0.25;

function weatherCodeToIntensity(code: number, pct: number): CloudIntensity {
  if (code >= 95) {
    return "storm";
  }
  if (code >= 45 && code <= 48) {
    return "fog";
  }
  if ((code >= 61 && code <= 67) || (code >= 71 && code <= 77) || code >= 80) {
    return "heavy";
  }
  if (code >= 51) {
    return "moderate";
  }
  if (pct < 15) {
    return "clear";
  }
  if (pct < 50) {
    return "light";
  }
  return pct < 80 ? "moderate" : "heavy";
}

export class SolarOverviewEngine {
  map?: MapLibreMap;
  homeLat: number;
  homeLon: number;
  //Home altitude (m a.s.l.), forwarded to Open-Meteo via &elevation=. Undefined
  //falls back to the API's global 90 m DEM.
  private homeElevation?: number;
  cfg: SolarOverviewCardConfig;

  private _fetchLat = 0;
  private _fetchLon = 0;

  private _mapReady = false;
  //Single source of truth for hourly forecast data; null until first fetch.
  private _homeHourlyData: SampleHourly | null = null;
  private _selectedTime: Date | null = null;

  private _lastAtmosphereAlt = -999;

  //Consecutive HTTP 429 count, drives exponential back-off. Resets on success.
  private _rateLimitStreak = 0;
  //Consecutive non-429 failure count (5xx, network, parse). Drives a graduated
  //back-off so a server outage can't pile up rate-limit-triggering traffic.
  private _otherErrorStreak = 0;

  private _fetchAbortController?: AbortController;
  private _resizeDebounceTimer?: number;
  private _weatherTimer?: number;
  private _skyTimer?: number;
  private _resizeObserver?: ResizeObserver;
  //When true (card off-screen / hidden tab), the shadow-refresh timer and dome
  //re-projection short-circuit so an invisible card costs nothing.
  private _paused = false;

  //_weatherTimer holds either a setInterval id (refresh) or a setTimeout id
  //(back-off). The ID spaces aren't guaranteed disjoint, so clear both kinds.
  private _clearWeatherTimer(): void {
    if (this._weatherTimer !== undefined) {
      window.clearInterval(this._weatherTimer);
      window.clearTimeout(this._weatherTimer);
      this._weatherTimer = undefined;
    }
  }

  public onFetchStart?: () => void;
  public onFetchEnd?: () => void;
  public onWeatherUpdate?: (data: WeatherData) => void;
  public onBuildingsFetchStart?: () => void;
  public onBuildingsFetchEnd?: () => void;

  //Irradiance samples (W/m², global shortwave) pushed by the card from a HA
  //solar-radiation sensor, sorted ascending by time. Same units as Open-Meteo's
  //shortwave_radiation_instant. Null = no usable samples; use model irradiance.
  private _sensorIrradianceSamples: { tMs: number; wm2: number }[] | null =
    null;
  private static readonly SENSOR_IRRADIANCE_WINDOW_MS = 30 * 60 * 1000;
  public setSolarRadiationSamples(
    samples: { time: Date; wm2: number }[] | null
  ): void {
    if (!samples || samples.length === 0) {
      if (this._sensorIrradianceSamples === null) {
        return;
      }
      this._sensorIrradianceSamples = null;
      this._arcInputsCache = undefined;
      this._renderForCurrentSelection();
      return;
    }
    const cleaned: { tMs: number; wm2: number }[] = [];
    for (const s of samples) {
      const ms = s.time.getTime();
      if (!isFinite(ms)) {
        continue;
      }
      if (!isFinite(s.wm2) || s.wm2 < 0) {
        continue;
      }
      cleaned.push({ tMs: ms, wm2: s.wm2 });
    }
    cleaned.sort((a, b) => a.tMs - b.tMs);
    const next = cleaned.length > 0 ? cleaned : null;

    //Skip the re-render when the dataset is unchanged. The card pushes samples on
    //every Lit cycle; without this guard each push fires onWeatherUpdate →
    //updated() → push again, an unterminated render loop that freezes the board.
    if (this._sensorSamplesEqual(this._sensorIrradianceSamples, next)) {
      return;
    }
    this._sensorIrradianceSamples = next;
    //New ground truth invalidates the per-day arc cache so the next
    //projectSunScene rebuilds with the sensor data.
    this._arcInputsCache = undefined;
    this._renderForCurrentSelection();
  }

  private _sensorSamplesEqual(
    a: { tMs: number; wm2: number }[] | null,
    b: { tMs: number; wm2: number }[] | null
  ): boolean {
    if (a === b) {
      return true;
    }
    if (a === null || b === null) {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i].tMs !== b[i].tMs) {
        return false;
      }
      if (a[i].wm2 !== b[i].wm2) {
        return false;
      }
    }
    return true;
  }

  //Nearest-neighbour lookup over sensor history. Returns the W/m² reading closest
  //to `t` within the window, else null (caller falls back to the model).
  private _sensorIrradianceAt(t: Date): number | null {
    const samples = this._sensorIrradianceSamples;
    if (!samples || samples.length === 0) {
      return null;
    }
    const tMs = t.getTime();
    let bestIdx = -1;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (let i = 0; i < samples.length; i++) {
      const d = Math.abs(samples[i].tMs - tMs);
      if (d < bestDelta) {
        bestDelta = d;
        bestIdx = i;
      }
      //Samples are sorted: once delta grows the rest is monotonically worse.
      else if (d > bestDelta) {
        break;
      }
    }
    if (
      bestIdx < 0 ||
      bestDelta > SolarOverviewEngine.SENSOR_IRRADIANCE_WINDOW_MS
    ) {
      return null;
    }
    return samples[bestIdx].wm2;
  }
  //Map transform changed; the card recomputes screen-space projections from here.
  public onMapTransform?: () => void;

  //False once cleanup() has run. The card polls this so it can detect when its
  //engine was force-evicted by the MAX_LIVE_ENGINES cap (otherwise it keeps a
  //stale reference and calls updateConfig() on a destroyed map).
  public isAlive(): boolean {
    return this.map !== undefined;
  }

  //Camera pose persistence. Lovelace doesn't persist config-changed from a live
  //card, so we use localStorage keyed on home coords (3-decimal ~111 m precision,
  //enough to separate neighbouring homes while tolerating GPS jitter).
  private _cameraPoseStorageKey(): string {
    const lat = Math.round(this.homeLat * 1000) / 1000;
    const lon = Math.round(this.homeLon * 1000) / 1000;
    return `sol:camera-pose:${lat}:${lon}`;
  }
  private _readStoredPose(): {
    bearing?: number;
    pitch?: number;
  } | null {
    try {
      const raw = window.localStorage.getItem(this._cameraPoseStorageKey());
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as { bearing?: number; pitch?: number };
      }
    } catch {
      //Quota / disabled storage / private windows: degrade to defaults.
    }
    return null;
  }
  private _writeStoredPose(pose: { bearing: number; pitch: number }): void {
    try {
      window.localStorage.setItem(
        this._cameraPoseStorageKey(),
        JSON.stringify(pose)
      );
    } catch {
      //Silent degrade: only persistence across reloads is lost.
    }
  }
  //Resting pose applied on map init: localStorage, then the hemisphere-aware
  //default (faces south, the closest grazing angle our pitch clamp allows:
  //south-up bearing in NH, north-up in SH). Wrapped/clamped so a stale read can't
  //yield an unrenderable pose.
  private _initialBearing(): number {
    const stored = this._readStoredPose();
    const raw =
      stored && typeof stored.bearing === "number" ? stored.bearing : NaN;
    if (Number.isFinite(raw)) {
      return ((raw % 360) + 360) % 360;
    }
    return this.homeLat >= 0 ? 180 : 0;
  }
  private _initialPitch(): number {
    const stored = this._readStoredPose();
    const raw = stored && typeof stored.pitch === "number" ? stored.pitch : NaN;
    if (Number.isFinite(raw)) {
      return Math.max(
        CAMERA_PITCH_MIN_DEG,
        Math.min(CAMERA_PITCH_MAX_DEG, raw)
      );
    }
    return CAMERA_PITCH_REST_DEG;
  }
  //Save the current base-view pose so a reload restores it. Skipped while weather
  //mode owns the camera (its top-down pose is transient).
  private _persistPose(): void {
    if (!this.map || this._preWeatherPose) {
      return;
    }
    this._writeStoredPose({
      bearing: this.map.getBearing(),
      pitch: this.map.getPitch(),
    });
  }
  //Runtime rotation lock. Weather mode force-locks rotation while the top-down
  //cloud overlay is shown and restores the prior state on exit; it is not
  //user-configurable, so it lives purely in memory.
  private _cameraLocked = false;
  public isCameraLocked(): boolean {
    return this._cameraLocked;
  }
  public setCameraLocked(locked: boolean): void {
    this._cameraLocked = locked;
    if (!this.map) {
      return;
    }
    if (locked) {
      this.map.touchZoomRotate.disable();
    } else {
      this.map.touchZoomRotate.enable({ around: "center" });
    }
  }

  //Snapshot of the pose captured on enterWeatherCamera() so exitWeatherCamera()
  //restores exactly the pose / lock state / zoom envelope the user was on.
  private _preWeatherPose: {
    bearing: number;
    pitch: number;
    zoom: number;
    center: [number, number];
    locked: boolean;
    minZoom: number;
    maxZoom: number;
    //Camera-target top padding active before weather mode, restored (animated)
    //on exit so the zoom-in lands on the framed point with no end-of-ease snap.
    paddingTop: number;
    //Captured maxBounds so the exit restores the tight building-radius clamp;
    //without it _applyMapBounds would race the easeTo and clamp mid-animation.
    maxBoundsWest: number | null;
    maxBoundsSouth: number | null;
    maxBoundsEast: number | null;
    maxBoundsNorth: number | null;
  } | null = null;
  //Pending setTimeout that re-tightens the zoom envelope after an exit's easeTo
  //lands. Held so a rapid UI↔Weather sequence can cancel a stale tighten before
  //it re-clamps min/maxZoom mid-ease.
  private _weatherZoomTighten: number | null = null;

  //Weather mode: tilt to top-down + zoom out so the cloud overlay reads as a
  //satellite plan. Temporarily widens the zoom envelope, force-locks rotation,
  //and eases the pose over 1200 ms; exit restores everything.
  public enterWeatherCamera(): void {
    if (!this.map) {
      return;
    }
    //Cancel a pending zoom-tighten from a prior exit; otherwise it fires mid-ease
    //and re-clamps the zoom envelope, freezing the camera before this ease lands.
    if (this._weatherZoomTighten !== null) {
      window.clearTimeout(this._weatherZoomTighten);
      this._weatherZoomTighten = null;
    }
    const prevLocked = this.isCameraLocked();
    const mb = this.map.getMaxBounds();
    this._preWeatherPose = {
      bearing: this.map.getBearing(),
      pitch: this.map.getPitch(),
      zoom: this.map.getZoom(),
      center: [this.homeLon, this.homeLat],
      locked: prevLocked,
      minZoom: this.map.getMinZoom(),
      maxZoom: this.map.getMaxZoom(),
      paddingTop: Math.max(0, this._appliedPaddingTop),
      maxBoundsWest: mb ? mb.getWest() : null,
      maxBoundsSouth: mb ? mb.getSouth() : null,
      maxBoundsEast: mb ? mb.getEast() : null,
      maxBoundsNorth: mb ? mb.getNorth() : null,
    };
    //Clear the maxBounds clamp before the easeTo: MapLibre enforces a minimum
    //zoom such that the bounds fit the viewport, which would otherwise clamp the
    //weather-mode dezoom regardless of setMinZoom. Pass undefined (not null) to
    //avoid MapLibre 5.x's "expected number, got null" log spam. Exit restores it.
    this.map.setMaxBounds(undefined);
    //Widen the zoom envelope (buffer below the target avoids edge-clamping mid-ease).
    this.map.setMinZoom(8);
    this.map.setMaxZoom(18);
    //Force the rotation lock on; exit restores the user's original preference.
    if (!prevLocked) {
      this.setCameraLocked(true);
    }
    this.map.stop();
    //Animate the camera-target padding back to zero alongside the dezoom so the
    //top-down weather view is centred (the moveend handler would otherwise snap it
    //at the end). _appliedPaddingTop tracks it so the guard stays consistent.
    this._appliedPaddingTop = 0;
    this.map.easeTo({
      center: [this.homeLon, this.homeLat],
      bearing: 0,
      pitch: 0,
      zoom: 11,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      duration: 1200,
    });
  }

  public exitWeatherCamera(): void {
    if (!this.map) {
      return;
    }
    const pose = this._preWeatherPose;
    if (!pose) {
      return;
    }
    this._preWeatherPose = null;
    this.map.stop();
    //Restore the camera-target padding in lock-step with the zoom-in so the view
    //animates straight to the framed-above-house point, with no end-of-ease snap.
    //_appliedPaddingTop is pre-set so the settling moveend handler is a no-op.
    this._appliedPaddingTop = pose.paddingTop;
    this.map.easeTo({
      center: pose.center,
      bearing: pose.bearing,
      pitch: pose.pitch,
      zoom: pose.zoom,
      padding: { top: pose.paddingTop, bottom: 0, left: 0, right: 0 },
      duration: 1200,
    });
    //Restore the pre-enter runtime rotation-lock state.
    if (this.isCameraLocked() !== pose.locked) {
      this.setCameraLocked(pose.locked);
    }
    //Re-tighten the zoom envelope + restore the maxBounds clamp after the ease
    //lands (deferred past the 1200 ms ease + buffer). Handle kept so a fast
    //re-enter can cancel it.
    const tighten = (): void => {
      this._weatherZoomTighten = null;
      if (!this.map) {
        return;
      }
      if (
        pose.maxBoundsWest !== null &&
        pose.maxBoundsSouth !== null &&
        pose.maxBoundsEast !== null &&
        pose.maxBoundsNorth !== null
      ) {
        this.map.setMaxBounds([
          [pose.maxBoundsWest, pose.maxBoundsSouth],
          [pose.maxBoundsEast, pose.maxBoundsNorth],
        ]);
      }
      this.map.setMinZoom(pose.minZoom);
      this.map.setMaxZoom(pose.maxZoom);
    };
    this._weatherZoomTighten = window.setTimeout(tighten, 1250);
  }

  //Weather mode cloud grid: a coarse lat/lon grid of Open-Meteo cloud_cover_low/
  //mid/high over the weather-mode viewport, rendered as a GPU overlay. Open-Meteo
  //bills per location, so the grid size is kept modest; localStorage cache + an
  //in-flight Promise dedup keep the API bill down.

  //10 x 10 points per fetch. At zoom 11 (~22 km bbox) the ~2.2 km cell pitch
  //over-samples the underlying model on purpose so bilinear interpolation + FBM
  //noise in the shader carry the texture.
  private static readonly _WEATHER_GRID_SIDE = 10;
  //Half-extent in latitude degrees around the home. 0.20 deg (~22 km) makes the
  //grid wider than the viewport so the shader's edge fade completes off-screen.
  //API cost is invariant in bbox size, so widening is free.
  private static readonly _WEATHER_GRID_HALF_LAT_DEG = 0.2;
  //Refresh cadence while in weather mode (cache or network per freshness).
  private static readonly _WEATHER_GRID_REFRESH_MS = 5 * 60_000;
  //localStorage cache TTL. Models tick every 15 min server-side; key precision is
  //3 decimal degrees (~110 m) so neighbouring homes share the cached grid.
  private static readonly _WEATHER_GRID_CACHE_TTL_MS = 30 * 60_000;
  private static readonly _WEATHER_GRID_CACHE_PREFIX = "sol-weather-grid:v3:";

  private _weatherCloudGrid: {
    bounds: { south: number; north: number; west: number; east: number };
    nLat: number;
    nLon: number;
    lats: Float32Array;
    lons: Float32Array;
    //Hourly time axis the cloud arrays index along; one fetch covers the full
    //window so timeline scrub slices from cache without another round-trip.
    times: Date[];
    //Cloud-cover %, row-major: point outer, time inner. Read via
    //`values[pointIdx * nTimes + timeIdx]`.
    cloudLow: Float32Array;
    cloudMid: Float32Array;
    cloudHigh: Float32Array;
    //Resolved weather model (`best_match`), surfaced in the UI so the user can
    //judge the grid pitch against the model's native resolution.
    modelName: string;
    //Epoch ms of the last fetch (network or cache); drives the per-call TTL guard.
    storedAt: number;
  } | null = null;
  //In-flight Promise shared between concurrent callers (ensureWeatherCloudGrid +
  //the 5 min refresh). Cleared in finally so an error path frees the slot.
  private _weatherCloudGridPending: Promise<void> | null = null;
  private _weatherCloudGridAbort: AbortController | null = null;
  private _weatherCloudGridRefreshTimer: number | undefined = undefined;
  //Live GPU overlay over the cloud grid: the MapLibre custom layer + card-driven
  //render state. Null while weather mode is off.
  private _weatherCloudLayer: WeatherCloudLayer | null = null;
  private _weatherCloudShownTimeIdx = -1;
  private _weatherCloudBandsVisible: [boolean, boolean, boolean] = [
    true,
    true,
    true,
  ];
  private _weatherCloudColor: [number, number, number] = [1, 1, 1];

  public getWeatherCloudGrid(): typeof this._weatherCloudGrid {
    return this._weatherCloudGrid;
  }

  //Time-axis index closest to `t`; -1 when the grid is empty.
  public getWeatherCloudGridTimeIndex(t: Date): number {
    const g = this._weatherCloudGrid;
    if (!g || g.times.length === 0) {
      return -1;
    }
    const tMs = t.getTime();
    let best = 0;
    let bestDt = Math.abs(g.times[0].getTime() - tMs);
    for (let i = 1; i < g.times.length; i++) {
      const dt = Math.abs(g.times[i].getTime() - tMs);
      if (dt < bestDt) {
        bestDt = dt;
        best = i;
      }
    }
    return best;
  }

  //localStorage key for the cloud grid. Home coords rounded to 3 decimals
  //(~110 m); grid side + half-extent are in the key so a constant change
  //invalidates stale payloads.
  private _weatherCloudGridCacheKey(): string {
    const lat = this.homeLat.toFixed(3);
    const lon = this.homeLon.toFixed(3);
    const N = SolarOverviewEngine._WEATHER_GRID_SIDE;
    const hl = SolarOverviewEngine._WEATHER_GRID_HALF_LAT_DEG;
    return `${SolarOverviewEngine._WEATHER_GRID_CACHE_PREFIX}${lat},${lon}:${N}:${hl}`;
  }

  //Read a fresh grid from localStorage; null on miss / stale / corrupt. Rehydrates
  //typed arrays so the renderer's indexed reads stay on the fast path.
  private _readWeatherCloudGridFromCache(): NonNullable<
    typeof this._weatherCloudGrid
  > | null {
    try {
      const raw = window.localStorage?.getItem(
        this._weatherCloudGridCacheKey()
      );
      if (!raw) {
        return null;
      }
      const j: any = JSON.parse(raw);
      const storedAt = Number(j?.storedAt);
      if (!Number.isFinite(storedAt)) {
        return null;
      }
      if (
        Date.now() - storedAt >
        SolarOverviewEngine._WEATHER_GRID_CACHE_TTL_MS
      ) {
        return null;
      }
      const p = j?.payload;
      if (!p?.bounds || !p?.lats?.length || !p?.times?.length) {
        return null;
      }
      return {
        bounds: p.bounds,
        nLat: p.nLat,
        nLon: p.nLon,
        lats: new Float32Array(p.lats),
        lons: new Float32Array(p.lons),
        times: p.times.map((s: string) => new Date(s)),
        cloudLow: new Float32Array(p.cloudLow),
        cloudMid: new Float32Array(p.cloudMid),
        cloudHigh: new Float32Array(p.cloudHigh),
        modelName: String(p.modelName ?? "best_match"),
        storedAt,
      };
    } catch {
      return null;
    }
  }

  private _writeWeatherCloudGridToCache(
    g: NonNullable<typeof this._weatherCloudGrid>
  ): void {
    try {
      const payload = {
        bounds: g.bounds,
        nLat: g.nLat,
        nLon: g.nLon,
        lats: Array.from(g.lats),
        lons: Array.from(g.lons),
        times: g.times.map((t) => t.toISOString()),
        cloudLow: Array.from(g.cloudLow),
        cloudMid: Array.from(g.cloudMid),
        cloudHigh: Array.from(g.cloudHigh),
        modelName: g.modelName,
      };
      window.localStorage?.setItem(
        this._weatherCloudGridCacheKey(),
        JSON.stringify({ storedAt: g.storedAt, payload })
      );
    } catch {
      /* quota exceeded / disabled storage: silently degrade, in-memory grid still works */
    }
  }

  //Fetch the cloud grid. Resolution order: fresh in-memory grid, localStorage
  //cache, in-flight Promise, then a cold POST to Open-Meteo. Errors leave the
  //previous grid in place; AbortController lets exit cut a pending fetch cleanly.
  public async ensureWeatherCloudGrid(): Promise<void> {
    const now = Date.now();
    if (
      this._weatherCloudGrid &&
      now - this._weatherCloudGrid.storedAt <
        SolarOverviewEngine._WEATHER_GRID_CACHE_TTL_MS
    ) {
      return;
    }
    const cached = this._readWeatherCloudGridFromCache();
    if (cached) {
      this._weatherCloudGrid = cached;
      //Push the cached payload into the active shader layer, if any.
      this.reuploadCloudShaderFromGrid(
        this._weatherCloudShownTimeIdx >= 0 ? this._weatherCloudShownTimeIdx : 0
      );
      return;
    }
    if (this._weatherCloudGridPending) {
      await this._weatherCloudGridPending;
      return;
    }

    this._weatherCloudGridAbort?.abort();
    this._weatherCloudGridAbort = new AbortController();
    const signal = this._weatherCloudGridAbort.signal;

    const fetchPromise = (async (): Promise<void> => {
      try {
        const N = SolarOverviewEngine._WEATHER_GRID_SIDE;
        const halfLat = SolarOverviewEngine._WEATHER_GRID_HALF_LAT_DEG;
        //cos(lat) compression keeps the grid roughly square in km; the abs+floor
        //guards the division near the poles.
        const cosLat = Math.max(
          0.1,
          Math.abs(Math.cos((this.homeLat * Math.PI) / 180))
        );
        const halfLon = halfLat / cosLat;
        const south = this.homeLat - halfLat;
        const north = this.homeLat + halfLat;
        const west = this.homeLon - halfLon;
        const east = this.homeLon + halfLon;

        const lats = new Float32Array(N);
        const lons = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          lats[i] = south + (i / (N - 1)) * (north - south);
          lons[i] = west + (i / (N - 1)) * (east - west);
        }

        //Row-major (lat-outer, lon-inner) lat/lon string pairs. Open-Meteo's POST
        //endpoint wants the same comma-separated format the GET query uses.
        const total: number = N * N;
        const flatLats: string[] = new Array(total);
        const flatLons: string[] = new Array(total);
        for (let iLat = 0; iLat < N; iLat++) {
          for (let iLon = 0; iLon < N; iLon++) {
            flatLats[iLat * N + iLon] = lats[iLat].toFixed(4);
            flatLons[iLat * N + iLon] = lons[iLon].toFixed(4);
          }
        }

        //Multi-day hourly window in one round-trip so timeline scrub slices from
        //cache without another fetch per cursor move.
        const body =
          "latitude=" +
          flatLats.join(",") +
          "&longitude=" +
          flatLons.join(",") +
          "&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high" +
          "&models=best_match" +
          "&forecast_days=3&past_days=2&timezone=UTC";
        const resp = await fetch("https://api.open-meteo.com/v1/forecast", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
          signal,
        });
        if (!resp.ok) {
          throw new Error(`Open-Meteo cloud grid HTTP ${resp.status}`);
        }
        const j: any = await resp.json();
        const results: any[] = Array.isArray(j) ? j : [j];
        if (results.length === 0 || !results[0]?.hourly?.time) {
          throw new Error("Open-Meteo cloud grid: empty payload");
        }
        const timeStrs: string[] = results[0].hourly.time;
        const times: Date[] = timeStrs.map((s) => new Date(s + "Z"));
        const nTimes = times.length;

        //Pack the per-point hourly cloud series row-major (point outer, time
        //inner) so the renderer reads one indexed lookup per band.
        const cloudLow = new Float32Array(total * nTimes);
        const cloudMid = new Float32Array(total * nTimes);
        const cloudHigh = new Float32Array(total * nTimes);
        for (let p = 0; p < total; p++) {
          const r = results[p];
          const lo = r?.hourly?.cloud_cover_low ?? [];
          const mi = r?.hourly?.cloud_cover_mid ?? [];
          const hi = r?.hourly?.cloud_cover_high ?? [];
          const base = p * nTimes;
          for (let t = 0; t < nTimes; t++) {
            cloudLow[base + t] = lo[t] ?? 0;
            cloudMid[base + t] = mi[t] ?? 0;
            cloudHigh[base + t] = hi[t] ?? 0;
          }
        }

        //One regional model covers the whole bbox in practice, so the first
        //sample's resolved model labels the overlay.
        const modelName = String(results[0]?.model ?? "best_match");

        const grid = {
          bounds: { south, north, west, east },
          nLat: N,
          nLon: N,
          lats,
          lons,
          times,
          cloudLow,
          cloudMid,
          cloudHigh,
          modelName,
          storedAt: Date.now(),
        };
        this._weatherCloudGrid = grid;
        this._writeWeatherCloudGridToCache(grid);
        //Push the fresh payload into the active shader layer, if any.
        this.reuploadCloudShaderFromGrid(
          this._weatherCloudShownTimeIdx >= 0
            ? this._weatherCloudShownTimeIdx
            : 0
        );
      } catch (_) {
        /* best-effort: keep last cloud grid on fetch/abort failure */
      }
    })();

    this._weatherCloudGridPending = fetchPromise;
    try {
      await fetchPromise;
    } finally {
      if (this._weatherCloudGridPending === fetchPromise) {
        this._weatherCloudGridPending = null;
      }
    }
  }

  //Start the periodic cloud-grid refresh. Idempotent.
  public startWeatherCloudRefresh(): void {
    if (this._weatherCloudGridRefreshTimer !== undefined) {
      return;
    }
    this._weatherCloudGridRefreshTimer = window.setInterval(() => {
      void this.ensureWeatherCloudGrid();
    }, SolarOverviewEngine._WEATHER_GRID_REFRESH_MS);
  }

  public stopWeatherCloudRefresh(): void {
    if (this._weatherCloudGridRefreshTimer !== undefined) {
      window.clearInterval(this._weatherCloudGridRefreshTimer);
      this._weatherCloudGridRefreshTimer = undefined;
    }
    //Abort any in-flight grid fetch so leaving weather mode mid-fetch doesn't
    //keep the POST alive.
    this._weatherCloudGridAbort?.abort();
    this._weatherCloudGridAbort = null;
  }

  //Attach the GPU cloud overlay. Idempotent: a second call refreshes data +
  //visibility instead of mounting a duplicate. Reads --primary-text-color off the
  //host so the shader matches the HA theme (falls back to white).
  public addCloudShaderLayer(
    host: HTMLElement | null,
    bandsVisible: [boolean, boolean, boolean],
    timeIdx: number
  ): void {
    if (!this.map) {
      return;
    }
    const grid = this._weatherCloudGrid;
    if (!grid) {
      return;
    }
    this._weatherCloudColor = this._readPrimaryTextColor(host);
    this._weatherCloudBandsVisible = [...bandsVisible] as [
      boolean,
      boolean,
      boolean,
    ];
    this._weatherCloudShownTimeIdx = Math.max(
      0,
      Math.min(grid.times.length - 1, timeIdx)
    );
    const slice = this._sliceCloudGridForTime(this._weatherCloudShownTimeIdx);
    if (this._weatherCloudLayer) {
      this._weatherCloudLayer.updateData({
        color: this._weatherCloudColor,
        gridSide: grid.nLat,
        bbox: {
          west: grid.bounds.west,
          south: grid.bounds.south,
          east: grid.bounds.east,
          north: grid.bounds.north,
        },
        cloudLow: slice.low,
        cloudMid: slice.mid,
        cloudHigh: slice.high,
        bandsVisible: this._weatherCloudBandsVisible,
      });
      return;
    }
    this._weatherCloudLayer = new WeatherCloudLayer({
      color: this._weatherCloudColor,
      gridSide: grid.nLat,
      bbox: {
        west: grid.bounds.west,
        south: grid.bounds.south,
        east: grid.bounds.east,
        north: grid.bounds.north,
      },
      cloudLow: slice.low,
      cloudMid: slice.mid,
      cloudHigh: slice.high,
      bandsVisible: this._weatherCloudBandsVisible,
    });
    try {
      this.map.addLayer(this._weatherCloudLayer);
    } catch (_) {
      /* best-effort: cloud shader layer add */
    }
  }

  //Detach the GPU cloud overlay. Safe to call when the layer is already absent.
  public removeCloudShaderLayer(): void {
    if (!this._weatherCloudLayer) {
      return;
    }
    try {
      this.map?.removeLayer(this._weatherCloudLayer.id);
    } catch {
      /* style swapped underneath us, layer already gone */
    }
    this._weatherCloudLayer = null;
    this._weatherCloudShownTimeIdx = -1;
  }

  //Re-upload the data texture for a different hour. Called on every scrub move;
  //cost is one small texture upload.
  public refreshCloudShaderTime(timeIdx: number): void {
    if (!this._weatherCloudLayer || !this._weatherCloudGrid) {
      return;
    }
    const clamped = Math.max(
      0,
      Math.min(this._weatherCloudGrid.times.length - 1, timeIdx)
    );
    if (clamped === this._weatherCloudShownTimeIdx) {
      return;
    }
    this._weatherCloudShownTimeIdx = clamped;
    const slice = this._sliceCloudGridForTime(clamped);
    this._weatherCloudLayer.updateData({
      cloudLow: slice.low,
      cloudMid: slice.mid,
      cloudHigh: slice.high,
    });
  }

  //Toggle individual altitude bands without re-uploading the texture.
  public setCloudShaderBands(bandsVisible: [boolean, boolean, boolean]): void {
    this._weatherCloudBandsVisible = [...bandsVisible] as [
      boolean,
      boolean,
      boolean,
    ];
    this._weatherCloudLayer?.updateData({
      bandsVisible: this._weatherCloudBandsVisible,
    });
  }

  //After a fresh grid lands, push the new payload into the layer and reset the
  //shown time index (the timeline shifted underneath us).
  public reuploadCloudShaderFromGrid(timeIdx: number): void {
    const grid = this._weatherCloudGrid;
    if (!this._weatherCloudLayer || !grid) {
      return;
    }
    this._weatherCloudShownTimeIdx = Math.max(
      0,
      Math.min(grid.times.length - 1, timeIdx)
    );
    const slice = this._sliceCloudGridForTime(this._weatherCloudShownTimeIdx);
    this._weatherCloudLayer.updateData({
      gridSide: grid.nLat,
      bbox: {
        west: grid.bounds.west,
        south: grid.bounds.south,
        east: grid.bounds.east,
        north: grid.bounds.north,
      },
      cloudLow: slice.low,
      cloudMid: slice.mid,
      cloudHigh: slice.high,
    });
  }

  //Extract one hour from the packed storage into three flat N x N arrays the
  //shader uploads as the R/G/B channels of its data texture.
  private _sliceCloudGridForTime(timeIdx: number): {
    low: Float32Array;
    mid: Float32Array;
    high: Float32Array;
  } {
    const grid = this._weatherCloudGrid!;
    const N = grid.nLat;
    const total = N * N;
    const nTimes = grid.times.length;
    const low = new Float32Array(total);
    const mid = new Float32Array(total);
    const high = new Float32Array(total);
    for (let p = 0; p < total; p++) {
      const idx = p * nTimes + timeIdx;
      low[p] = grid.cloudLow[idx];
      mid[p] = grid.cloudMid[idx];
      high[p] = grid.cloudHigh[idx];
    }
    return { low, mid, high };
  }

  //Resolve --primary-text-color off the host into a normalised RGB triplet for
  //the shader; falls back to white when unset/unparseable.
  private _readPrimaryTextColor(
    host: HTMLElement | null
  ): [number, number, number] {
    if (!host) {
      return [1, 1, 1];
    }
    try {
      const raw =
        getComputedStyle(host)
          .getPropertyValue("--primary-text-color")
          ?.trim() ?? "";
      const parsed = this._parseCssColor(raw);
      if (parsed) {
        return parsed;
      }
    } catch {
      /* getComputedStyle on a detached node */
    }
    return [1, 1, 1];
  }

  //Minimal CSS colour parser: #rgb / #rrggbb / rgb(...) / rgba(...); null otherwise.
  private _parseCssColor(s: string): [number, number, number] | null {
    if (!s) {
      return null;
    }
    const hex = s.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (hex) {
      let h = hex[1];
      if (h.length === 3) {
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      }
      const r = parseInt(h.slice(0, 2), 16) / 255;
      const g = parseInt(h.slice(2, 4), 16) / 255;
      const b = parseInt(h.slice(4, 6), 16) / 255;
      return [r, g, b];
    }
    const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgb) {
      return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255];
    }
    return null;
  }

  //Lat/lon -> screen pixel projection via MapLibre's camera transform; null when
  //the map is not ready.
  public projectLonLat(
    lon: number,
    lat: number
  ): { x: number; y: number } | null {
    if (!this.map) {
      return null;
    }
    const p = this.map.project([lon, lat]);
    return { x: p.x, y: p.y };
  }

  //MapLibre canvas, captured at init so cleanup() can detach listeners against
  //the same node (map.getCanvas() returns null after map.remove()).
  private _mapCanvas?: HTMLCanvasElement;

  //Single-pointer drag-rotate state. MapLibre's right-click dragRotate is
  //disabled and replaced with left-click / single-finger rotation; two-finger
  //pinch-rotate (touchZoomRotate) is preserved.
  private _dragRotateHandlers?: {
    canvas: HTMLCanvasElement;
    onDown: (e: PointerEvent) => void;
    onMove: (e: PointerEvent) => void;
    onEnd: (e: PointerEvent) => void;
  };

  //Stored handler references so cleanup() can map.off() / removeEventListener
  //explicitly before map.remove(). A buggy map.remove() (seen on iOS Safari)
  //would otherwise leave dangling closures pinning the dead engine + its context.
  private _mapPinHandler?: (e: { originalEvent?: unknown }) => void;
  private _mapStyleLoadHandler?: () => void;
  private _mapLoadHandler?: () => void;
  private _mapMoveHandler?: () => void;
  private _mapMoveEndHandler?: () => void;
  private _mapStyleImageMissingHandler?: (e: { id?: string }) => void;
  private _mapErrorHandler?: (e: { error?: { message?: string } }) => void;
  private _webglLostHandler?: (e: Event) => void;
  private _webglRestoredHandler?: () => void;

  //Card-level hook fired when the WebGL context is lost (iOS Safari recycles
  //contexts under memory pressure). The card triggers a clean re-init.
  public onContextLost?: () => void;

  //Cached building fetch result. The home doesn't move during a session, so we
  //fetch once and reuse across style reloads; invalidated on building-radius edit.
  private _buildingsData: BuildingsResult | null = null;
  private _buildingsFetchKey = "";
  private _buildingsAbort?: AbortController;

  //Offscreen canvas to rasterise cast shadows; lives for the engine lifetime so
  //we don't realloc per sun tick.
  private _shadowCanvas?: HTMLCanvasElement;

  //Debounce timer coalescing the shadow/atmosphere refresh during a rapid scrub
  //(curves + chips still update every move; only the costly raster paint waits).
  private _selectedTimeShadowTimer: number | null = null;

  //Cache of the per-day sun arc samples. Sun position + clear-sky irradiance
  //depend only on the day + cloud cover, so the heavy trig recomputes only on a
  //cache miss; every transform just re-projects the cached lon/lat/altitudeM.
  private _arcInputsCache?: {
    dayStartMs: number;
    cloudPctInt: number;
    samples: ({
      lon: number;
      lat: number;
      altitudeM: number;
      wm2: number;
      belowHorizon: boolean;
    } | null)[];
  };

  //Last signature of the shadow raster inputs. When unchanged we skip the
  //project + paint + PNG-encode round-trip, the most expensive recurring op.
  private _lastShadowSig?: string;

  constructor(
    container: HTMLElement,
    config: SolarOverviewCardConfig,
    haCoords: [number, number],
    haElevation?: number
  ) {
    this.homeLat = haCoords[1];
    this.homeLon = haCoords[0];
    this.homeElevation =
      typeof haElevation === "number" && Number.isFinite(haElevation)
        ? haElevation
        : undefined;
    this.cfg = { ...config };

    //Evict the oldest live engine at the cap. Set iteration is insertion order,
    //so the first value is the longest-lived (usually an orphaned preview).
    while (_liveEngines.size >= MAX_LIVE_ENGINES) {
      const oldest = _liveEngines.values().next().value;
      if (!oldest) {
        break;
      }
      try {
        oldest.cleanup();
      } catch (_) {
        /* best-effort: oldest engine teardown */
      }
      //cleanup() removes it; defensive in case it threw beforehand.
      _liveEngines.delete(oldest);
    }
    _liveEngines.add(this);

    this._fetchLat = this.homeLat;
    this._fetchLon = this.homeLon;

    //Create the map immediately regardless of container dimensions: deferring
    //init until an observer reported a "ready" container failed in some HA
    //layouts (notably Masonry) where the observer never fired, leaving the map
    //null forever. The post-load triple-resize + tile-fetch watchdog handle the
    //0x0-at-init edge case.
    this._initMapInstance(container, haCoords);
  }

  private _initMapInstance(
    container: HTMLElement,
    haCoords: [number, number]
  ): void {
    const pixelRatio = this._pixelRatio();

    const styleInfo = this._resolveMapStyle();
    //Track the URL handed to setStyle so _onStyleLoad can detect a polarity
    //change that landed before the first style.load and re-trigger setStyle.
    this._currentStyleUrl = styleInfo.url;

    //Camera locked on the home for zoom/pan/pitch; rotation is the only user
    //input. Bearing auto-flips per hemisphere so noon sits at the top.
    this.map = new maplibregl.Map({
      container,
      style: styleInfo.url,
      center: haCoords,
      zoom: 18,
      pitch: this._initialPitch(),
      bearing: this._initialBearing(),
      //Push our own pitch bounds in so MapLibre's internals can't bypass the
      //floor/ceiling even when a caller forgets to clamp first.
      minPitch: CAMERA_PITCH_MIN_DEG,
      maxPitch: CAMERA_PITCH_MAX_DEG,
      //Zoom locked to the resting pose: the 3D camera + overlays are tuned for
      //this single altitude.
      minZoom: 18,
      maxZoom: 18,
      dragPan: false,
      scrollZoom: false,
      doubleClickZoom: false,
      //Disable MapLibre's right-click dragRotate; our pointer handlers below wire
      //left-click / single-finger rotation instead.
      dragRotate: false,
      touchZoomRotate: true,
      touchPitch: false,
      boxZoom: false,
      keyboard: false,
      pixelRatio,
      //compact: true collapses the (license-required) attribution to a small "i"
      //disc that expands on click.
      attributionControl: { compact: true },
    });

    //ResizeObserver fires aggressively on iOS orientation changes; coalesce bursts.
    this._resizeObserver = new ResizeObserver((entries) => {
      //A resize invalidates the cached canvas dimensions in _projCache; drop it
      //and refresh the cached CSS dims so the projection path never re-reads
      //canvas.clientWidth (a layout flush).
      this._invalidateProjCache();
      const entry = entries[entries.length - 1];
      if (entry) {
        const cr = entry.contentRect;
        this._cachedCanvasCssW = cr.width || this._cachedCanvasCssW;
        this._cachedCanvasCssH = cr.height || this._cachedCanvasCssH;
      }
      window.clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = window.setTimeout(() => {
        if (this.map) {
          requestAnimationFrame(() => this.map?.resize());
        }
      }, 80);
    });

    this._resizeObserver.observe(container);

    //Lock the pinch-rotate pivot to the canvas centre (where the home projects)
    //so the home stays pinned during a two-finger gesture instead of orbiting the
    //pinch point. When camera-locked, pinch-rotate is disabled entirely.
    if (this.isCameraLocked()) {
      this.map.touchZoomRotate.disable();
    } else {
      this.map.touchZoomRotate.enable({ around: "center" });
    }

    //Hard-pin the map centre on every user-driven transform so the home never
    //leaves the card centre and sub-pixel drift is corrected immediately. Gated
    //on `originalEvent` so programmatic eases (recenter()) still animate freely.
    //Bound to `move` only (every centre-shifting rotation fires `move` too).
    //The `pinning` flag guards against re-entrancy from setCenter()'s own `move`.
    let pinning = false;
    this._mapPinHandler = (e: { originalEvent?: unknown }) => {
      if (pinning) {
        return;
      }
      if (!this.map || !e?.originalEvent) {
        return;
      }
      const c = this.map.getCenter();
      if (c.lng === this.homeLon && c.lat === this.homeLat) {
        return;
      }
      pinning = true;
      try {
        this.map.setCenter([this.homeLon, this.homeLat]);
      } finally {
        pinning = false;
      }
    };
    this.map.on("move", this._mapPinHandler);

    this._mapStyleLoadHandler = () => this._onStyleLoad();
    this.map.on("style.load", this._mapStyleLoadHandler);

    this._mapLoadHandler = () => {
      this.map?.resize();
      //The HA dashboard may settle a frame or two after load fires; re-resize on
      //the next frame and a short timeout so post-layout geometry reaches the
      //tile manager.
      requestAnimationFrame(() => this.map?.resize());
      window.setTimeout(() => this.map?.resize(), 400);
      //Clamp the camera bounds to the display radius so MapLibre doesn't issue
      //speculative tile fetches outside the disc during rotation.
      this._applyMapBounds();
      //Watchdog: 5 s after load, if no tile has loaded (basemap decided the
      //viewport was empty at fetch time, e.g. a zero-sized container), force a
      //setStyle re-fetch; the custom layers re-register via the style.load handler.
      window.setTimeout(() => {
        if (!this.map) {
          return;
        }
        if (this.map.areTilesLoaded()) {
          return;
        }
        if (!this.map.isStyleLoaded()) {
          return;
        }
        //No tile in 5 s despite a loaded style: soft-reload the style URL to
        //re-walk every source and re-issue tile fetches.
        try {
          const styleUrl = this._resolveMapStyle().url;
          this.map.setStyle(styleUrl);
        } catch (_) {
          /* ignore, no recovery possible */
        }
      }, 5000);
    };
    this.map.on("load", this._mapLoadHandler);

    //OpenFreeMap's Liberty style references fill-pattern sprites missing from the
    //atlas, which MapLibre logs a warning per. Register a 1x1 transparent stub so
    //the layer falls through to its base colour without console spam.
    this._mapStyleImageMissingHandler = (e: { id?: string }) => {
      if (!this.map || !e?.id || this.map.hasImage(e.id)) {
        return;
      }
      try {
        this.map.addImage(e.id, {
          width: 1,
          height: 1,
          data: new Uint8Array(4), //RGBA, all zero = transparent
        });
      } catch (_) {
        /* best-effort: transparent placeholder tile */
      }
    };
    this.map.on("styleimagemissing", this._mapStyleImageMissingHandler);

    //Transform broadcaster: relays `move` (not `moveend`) so HTML overlays track
    //the camera frame-by-frame. Invalidating the projection cache here lets
    //_projectScenePoint() reuse one matrix snapshot across all its per-frame calls.
    this._mapMoveHandler = () => {
      this._invalidateProjCache();
      this.onMapTransform?.();
    };
    this.map.on("move", this._mapMoveHandler);

    //Re-aim the camera target only once the camera settles (moveend), never
    //frame-by-frame: setPadding mid-`move` would interrupt programmatic eases
    //(e.g. the weather-mode dezoom). The target depends on pitch/zoom, not
    //bearing, so it does not need to track auto-rotate.
    this._mapMoveEndHandler = () => {
      this._invalidateProjCache();
      this._applyCameraTargetPadding();
      this._persistPose();
    };
    this.map.on("moveend", this._mapMoveEndHandler);

    const canvas = this.map.getCanvas();
    this._mapCanvas = canvas;

    //Custom drag-rotate (left-click / single-finger; two-finger pinch stays with
    //MapLibre). touch-action: none claims every canvas gesture as a card
    //interaction, the way map widgets behave on mobile.
    canvas.style.touchAction = "none";

    const ROTATE_SENSITIVITY_DEG_PER_PX = 0.35;
    //Vertical drag drives pitch (down = flatter, up = bird's-eye), clamped to the
    //module-level CAMERA_PITCH bounds shared by every other pitch entry point.
    const PITCH_SENSITIVITY_DEG_PER_PX = 0.3;
    let dragRotating = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let activeId: number | null = null;

    const onDown = (e: PointerEvent) => {
      //Mouse: left button only. Touch/pen: always start.
      if (e.pointerType === "mouse" && e.button !== 0) {
        return;
      }
      //Single-pointer only; extra touches stay with MapLibre's pinch-rotate.
      if (activeId !== null) {
        return;
      }
      //Swallow gestures during the post-exit cooldown so a dismiss click can't
      //bleed into a fresh drag-rotate.
      if (this.isUserGestureSuppressed()) {
        return;
      }
      //camera-locked: manual rotate/pitch are inert. Re-read per pointerdown so a
      //live-preview toggle disengages without a respawn.
      if (this.isCameraLocked()) {
        return;
      }
      dragRotating = true;
      activeId = e.pointerId;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {
        /* best-effort: pointer capture */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragRotating || !this.map || e.pointerId !== activeId) {
        return;
      }
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      //Positive dx (drag right) bumps bearing so content under the cursor follows
      //the gesture direction.
      this.map.setBearing(
        this.map.getBearing() + dx * ROTATE_SENSITIVITY_DEG_PER_PX
      );
      //Subtract dy so drag up flattens the pitch and drag down tips toward
      //bird's-eye; clamp to the session bounds.
      const nextPitch = Math.max(
        CAMERA_PITCH_MIN_DEG,
        Math.min(
          CAMERA_PITCH_MAX_DEG,
          this.map.getPitch() - dy * PITCH_SENSITIVITY_DEG_PER_PX
        )
      );
      this.map.setPitch(nextPitch);
    };
    const onEnd = (e: PointerEvent) => {
      if (e.pointerId !== activeId) {
        return;
      }
      dragRotating = false;
      activeId = null;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (_) {
        /* best-effort: pointer release */
      }
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onEnd);
    canvas.addEventListener("pointercancel", onEnd);
    this._dragRotateHandlers = { canvas, onDown, onMove, onEnd };

    //WebGL context-loss recovery (iOS Safari recycles contexts under memory
    //pressure). preventDefault lets the browser attempt restore; we flip
    //_mapReady off and emit onContextLost so the card tears down and re-inits.
    this._webglLostHandler = (e: Event) => {
      e.preventDefault();
      this._mapReady = false;
      this.onContextLost?.();
    };
    this._webglRestoredHandler = () => {
      /* no-op: MapLibre restores its own GL resources */
    };
    canvas.addEventListener("webglcontextlost", this._webglLostHandler, false);
    canvas.addEventListener(
      "webglcontextrestored",
      this._webglRestoredHandler,
      false
    );

    this._mapErrorHandler = (_e: { error?: { message?: string } }) => {
      //Keep the hook registered so MapLibre internal errors don't bubble as
      //unhandled, but emit nothing (HA forbids console output); the browser's own
      //network diagnostics cover them.
    };
    this.map.on("error", this._mapErrorHandler);

    this._refreshWeather();
  }

  //Resolves the OpenFreeMap style URL from `map-style` + theme polarity:
  //  streets + light → liberty   streets + dark → fiord
  //  minimal + light → positron  minimal + dark → fiord
  //fiord is used for dark over OFM's near-black `dark` style, too oppressive at
  //the card viewport. _cardIsDark is pushed by the card on every Lit update.
  private _cardIsDark = false;
  //URL last passed to setStyle. _onStyleLoad re-fires setStyle if it diverges from
  //the desired URL (a polarity change that landed before the first style.load),
  //and it gates a redundant setStyle in setCardThemeIsDark.
  private _currentStyleUrl?: string;

  public setCardThemeIsDark(isDark: boolean): void {
    if (this._cardIsDark === isDark) {
      return;
    }
    this._cardIsDark = isDark;
    if (!this.map) {
      return;
    }
    const next = this._resolveMapStyle().url;
    if (next === this._currentStyleUrl) {
      return;
    }
    //Defer setStyle until the first style.load: a cold-start setStyle races the
    //buildings re-add ("buildings rarely show up"). _onStyleLoad re-triggers it.
    if (!this._mapReady) {
      return;
    }
    this._currentStyleUrl = next;
    try {
      this.map.setStyle(next);
    } catch (_) {
      /* best-effort: map setStyle */
    }
  }

  private _resolveMapStyle(): { url: string; styleName: string } {
    const raw = String(this.cfg["map-style"] ?? "streets").toLowerCase();
    const isDark = this._cardIsDark;

    let styleName: string;
    if (isDark) {
      styleName = "fiord";
    } else if (raw === "minimal") {
      styleName = "positron";
    } else {
      styleName = "liberty";
    }

    return {
      url: `https://tiles.openfreemap.org/styles/${styleName}`,
      styleName,
    };
  }

  //WebGL canvas pixel ratio: device-native, capped at 2 desktop / 1.25 mobile.
  private _pixelRatio(): number {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    return IS_MOBILE
      ? Math.min(Math.max(dpr, 1), 1.25)
      : Math.min(Math.max(dpr, 1.5), 2);
  }

  //Fixed precision the cast-shadow raster is sized for.
  private _shadowPrecisionLevel(): ShadowPrecisionLevel {
    return "medium";
  }

  //Master shadow toggle.
  private _shadowsEnabled(): boolean {
    return this.cfg["shadows-enabled"] !== false;
  }

  private _shadowOpacity(): number {
    const raw = Number(this.cfg["shadow-opacity"]);
    if (!Number.isFinite(raw)) {
      return DEFAULT_SHADOW_OPACITY;
    }
    return Math.max(0, Math.min(1, raw));
  }

  private _findHourIndex(t: Date): number {
    const home = this._homeHourlyData;
    if (!home || !home.times.length) {
      return 0;
    }

    const target = t.getTime();
    const times = home.times;
    let best = 0;
    let bestDist = Math.abs(times[0].getTime() - target);

    for (let i = 1; i < times.length; i++) {
      const d = Math.abs(times[i].getTime() - target);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      } else if (d > bestDist) {
        break;
      }
    }

    return best;
  }

  //Weather variables at a given time as seen from the home. Sourced from
  //_homeHourlyData; returns the empty sentinel when null. shortwave = -1 means
  //the model omitted the value (caller falls back to Haurwitz).
  private _getWeatherAtTime(t: Date): {
    cloudCover: number;
    cloudLow: number;
    cloudMid: number;
    cloudHigh: number;
    shortwave: number;
    //2-m air temperature in °C; NaN = missing (no thermal derating).
    temperatureC: number;
    //10-m wind speed in m/s; NaN = missing.
    windMs: number;
    cloudIntensity: CloudIntensity;
  } {
    const empty = {
      cloudCover: 0,
      cloudLow: 0,
      cloudMid: 0,
      cloudHigh: 0,
      shortwave: -1,
      temperatureC: NaN,
      windMs: NaN,
      cloudIntensity: "clear" as CloudIntensity,
    };

    const home = this._homeHourlyData;
    if (!home || !home.times.length) {
      return empty;
    }

    const idx = this._findHourIndex(t);
    if (idx < 0 || idx >= home.times.length) {
      return empty;
    }

    const cc = home.cloudCover[idx] ?? 0;
    const cLow = home.cloudLow[idx] ?? 0;
    const cMid = home.cloudMid[idx] ?? 0;
    const cHi = home.cloudHigh[idx] ?? 0;
    const sw = home.shortwave[idx] ?? -1;
    const wc = home.weatherCode[idx] ?? 0;
    const ta = home.temperature[idx] ?? NaN;
    const ws = home.windSpeed[idx] ?? NaN;

    return {
      cloudCover: cc,
      cloudLow: cLow,
      cloudMid: cMid,
      cloudHigh: cHi,
      shortwave: sw,
      temperatureC: ta,
      windMs: ws,
      cloudIntensity: weatherCodeToIntensity(wc, cc),
    };
  }

  //Public form of _getTimeRange so the card can re-fetch the window after a
  //midnight day rollover.
  public getTimelineRange(): { start: Date; end: Date } | null {
    return this._getTimeRange();
  }

  //Visible timeline window. The Open-Meteo payload spans more past days for
  //forecast calibration, but the timeline UI clips to the last 2 past days.
  private _getTimeRange(): { start: Date; end: Date } | null {
    const TIMELINE_PAST_DAYS = 2;
    const TIMELINE_FORECAST_DAYS = 3;
    const home = this._homeHourlyData;

    //Open-Meteo path: window from the live samples (first at/after today -
    //past_days, last sample as the end).
    if (home && home.times.length) {
      const t = home.times;
      const last = t[t.length - 1];
      const today0 = new Date();
      today0.setHours(0, 0, 0, 0);
      const visibleStartMs =
        today0.getTime() - TIMELINE_PAST_DAYS * 24 * 3_600_000;
      let startIdx = 0;
      for (let i = 0; i < t.length; i++) {
        if (t[i].getTime() >= visibleStartMs) {
          startIdx = i;
          break;
        }
      }
      return { start: t[startIdx], end: last };
    }

    //Fallback when the Open-Meteo fetch failed: synthetic window (today midnight
    //±PAST/FORECAST days) so the timeline still renders without the weather traces.
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const startMs = today0.getTime() - TIMELINE_PAST_DAYS * 24 * 3_600_000;
    const endMs = today0.getTime() + TIMELINE_FORECAST_DAYS * 24 * 3_600_000;
    return { start: new Date(startMs), end: new Date(endMs) };
  }

  private _renderForCurrentSelection(): void {
    //Only the map is required: _getWeatherAtTime returns zero defaults when
    //_homeHourlyData is null, so the sun + arc + tooltip still update offline.
    if (!this.map) {
      return;
    }

    const t = this._selectedTime ?? new Date();
    const w = this._getWeatherAtTime(t);

    //Compute every irradiance candidate (sensor > shortwave > Haurwitz) so the
    //card can pick the best available. Values are GHI (global on horizontal); the
    //tilt/azimuth transposition lives in the card-side PV helpers.
    const pvPowerHaurwitz = computePvPower(
      t,
      this.homeLat,
      this.homeLon,
      w.cloudCover
    );

    let pvPowerShortwave = -1;
    if (w.shortwave >= 0) {
      //W/m² normalised against STC (1000 W/m²), clamped to [0, 100].
      pvPowerShortwave = Math.max(0, Math.min(100, (w.shortwave / 1000) * 100));
    }

    const sensorWm2 = this._sensorIrradianceAt(t);
    const pvPowerSensor =
      sensorWm2 !== null
        ? Math.max(0, Math.min(100, (sensorWm2 / 1000) * 100))
        : -1;

    //Pick the primary value: sensor > model > Haurwitz (last resort).
    let pvPower: number;
    let irradianceSource: IrradianceSource;
    if (pvPowerSensor >= 0) {
      pvPower = pvPowerSensor;
      irradianceSource = "sensor";
    } else if (pvPowerShortwave >= 0) {
      pvPower = pvPowerShortwave;
      irradianceSource = "shortwave";
    } else {
      pvPower = pvPowerHaurwitz;
      irradianceSource = "haurwitz";
    }

    this.onWeatherUpdate?.({
      cloudCover: w.cloudCover,
      cloudLow: w.cloudLow,
      cloudMid: w.cloudMid,
      cloudHigh: w.cloudHigh,
      cloudIntensity: w.cloudIntensity,
      timeRange: this._getTimeRange(),
      isLiveTime: this._selectedTime === null,
      pvPower,
      pvPowerHaurwitz,
      pvPowerShortwave,
      irradianceSource,
      temperatureC: w.temperatureC,
      windMs: w.windMs,
    });
  }

  private _onStyleLoad(): void {
    if (!this.map) {
      return;
    }
    const wasReady = this._mapReady;
    this._mapReady = true;

    //Catch-up setStyle for a polarity change that landed before the first
    //style.load (setCardThemeIsDark deferred it to avoid the cold-start
    //buildings-re-add race). Only on the first style.load.
    if (!wasReady) {
      const desired = this._resolveMapStyle().url;
      if (this._currentStyleUrl && desired !== this._currentStyleUrl) {
        this._currentStyleUrl = desired;
        try {
          this.map.setStyle(desired);
        } catch (_) {
          /* best-effort: map setStyle */
        }
        return;
      }
      this._currentStyleUrl = desired;
    }

    this.map.getStyle().layers?.forEach((l) => {
      if (l.type === "raster") {
        try {
          this.map!.setPaintProperty(l.id, "raster-saturation", 0.1);
          this.map!.setPaintProperty(l.id, "raster-contrast", 0.05);
        } catch (_) {
          /* best-effort: raster paint tweak */
        }
      }
    });

    //Layer order: night-shade, buildings on top. The 3D solar overlays live as
    //HTML/SVG above the canvas (a GL custom layer got overpainted unpredictably
    //by MapLibre's compositor).
    this._initNightShade();
    this._addBuildings();
    this._applyLabelVisibility();

    window.clearInterval(this._skyTimer);
    this._lastAtmosphereAlt = -999;
    this._refreshShadowsAndAtmosphere();
    //60 s sky/atmosphere refresh (short-circuits internally when the sun hasn't
    //moved enough). Skipped while paused so an invisible card pays nothing.
    this._skyTimer = window.setInterval(() => {
      if (this._paused) {
        return;
      }
      this._refreshShadowsAndAtmosphere();
    }, 60_000);

    if (this._homeHourlyData) {
      this._renderForCurrentSelection();
    }
  }

  //Night-shade overlay: a full-world fill layer above the basemap but below
  //buildings. Opacity 0 by day; fades to a deep navy as the sun drops, with a
  //warm low-opacity tint at sunrise/sunset.
  private _initNightShade(): void {
    if (!this.map) {
      return;
    }
    if (this.map.getLayer("sol-night-shade")) {
      this.map.removeLayer("sol-night-shade");
    }
    if (this.map.getSource("sol-night-shade")) {
      this.map.removeSource("sol-night-shade");
    }

    //Single polygon covering the whole web-mercator extent.
    this.map.addSource("sol-night-shade", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-180, -85],
              [180, -85],
              [180, 85],
              [-180, 85],
              [-180, -85],
            ],
          ],
        },
        properties: {},
      },
    });

    this.map.addLayer({
      id: "sol-night-shade",
      type: "fill",
      source: "sol-night-shade",
      paint: {
        "fill-color": "#020410",
        "fill-opacity": 0,
      },
    });
  }

  //Project the home building(s) into screen-space silhouettes: each polygon gives
  //a base ring (render_min_height) and top ring (render_height). The union of the
  //rings + per-edge quads covers the exact extruded prism, including concave
  //footprints. Empty until the buildings GeoJSON has landed.
  public projectHomeFootprints(): {
    base: { x: number; y: number }[];
    top: { x: number; y: number }[];
  }[] {
    if (!this.map || !this._mapReady) {
      return [];
    }
    const home = this._buildingsData?.home;
    if (!home || !home.features.length) {
      return [];
    }

    const out: {
      base: { x: number; y: number }[];
      top: { x: number; y: number }[];
    }[] = [];
    for (const feat of home.features) {
      const geom = feat.geometry;
      if (!geom) {
        continue;
      }
      const props = (feat.properties ?? {}) as Record<string, unknown>;
      const topH =
        typeof props["render_height"] === "number"
          ? (props["render_height"] as number)
          : 0;
      const baseH =
        typeof props["render_min_height"] === "number"
          ? (props["render_min_height"] as number)
          : 0;

      let polygons: number[][][][] | null = null;
      if (geom.type === "Polygon") {
        polygons = [geom.coordinates as number[][][]];
      } else if (geom.type === "MultiPolygon") {
        polygons = geom.coordinates as number[][][][];
      }
      if (!polygons) {
        continue;
      }

      for (const poly of polygons) {
        if (!poly.length) {
          continue;
        }
        const outer = poly[0] as number[][];
        if (outer.length < 3) {
          continue;
        }

        const baseRing: { x: number; y: number }[] = [];
        const topRing: { x: number; y: number }[] = [];
        for (const p of outer) {
          const lon = p[0];
          const lat = p[1];
          const pBase = this._projectScenePoint(lon, lat, baseH);
          const pTop = this._projectScenePoint(lon, lat, topH);
          //Drop the pair if either point is behind the camera, else the side-wall
          //quad would shear across the screen.
          if (!pBase || !pTop) {
            continue;
          }
          baseRing.push({ x: pBase.x, y: pBase.y });
          topRing.push({ x: pTop.x, y: pTop.y });
        }
        if (baseRing.length >= 3 && topRing.length >= 3) {
          out.push({ base: baseRing, top: topRing });
        }
      }
    }
    return out;
  }

  //Cast-shadow opacity fall-off: full up to one fade-band inside the display
  //radius, ramping to 0 at the radius so buildings and shadows share a boundary.
  private _shadowFadeRange(): [fullMeters: number, fadeMeters: number] {
    const radius = this._buildingRadiusMeters();
    return [Math.max(0, radius - DISPLAY_FADE_DELTA_M), radius];
  }

  //Toggle the basemap's symbol layers (road names, POIs, ...) per `show-labels`
  //by flipping their visibility. Our own sol-* layers are skipped defensively.
  private _applyLabelVisibility(): void {
    if (!this.map) {
      return;
    }
    const showLabels = this.cfg["show-labels"] !== false;
    const visibility = showLabels ? "visible" : "none";
    const layers = this.map.getStyle().layers ?? [];
    for (const l of layers) {
      if (l.type !== "symbol" || l.id.startsWith("sol-")) {
        continue;
      }
      try {
        this.map.setLayoutProperty(l.id, "visibility", visibility);
      } catch (_) {
        /* best-effort: layer visibility */
      }
    }
  }

  //Global display radius shared by every layer + the MapLibre bounds so they all
  //stop at the same boundary. From the `display-radius` slider; the primary perf
  //lever on old phones.
  private _buildingRadiusMeters(): number {
    return displayRadiusM(this.cfg);
  }

  //Clamp the camera bounds to a bbox ~2x the display radius around the home so
  //MapLibre treats the area outside the disc as unreachable, dampening
  //speculative tile fetches during rotation. Re-called on a radius edit.
  private _applyMapBounds(): void {
    if (!this.map) {
      return;
    }
    const radiusM = this._buildingRadiusMeters();
    const halfBbox = radiusM * 2; //2 x radius keeps the pitched horizon inside
    const D = Math.PI / 180;
    const mPerDegLat = 111_320;
    const mPerDegLon = 111_320 * Math.cos(this.homeLat * D);
    const dLat = halfBbox / mPerDegLat;
    const dLon = halfBbox / mPerDegLon;
    try {
      this.map.setMaxBounds([
        [this.homeLon - dLon, this.homeLat - dLat],
        [this.homeLon + dLon, this.homeLat + dLat],
      ]);
    } catch (_) {
      /* style not ready yet, retried via _mapLoadHandler */
    }
  }

  //Configured surroundings opacity (0..1); DEFAULT_BUILDING_OPACITY on bad input.
  private _buildingOpacity(): number {
    const v = Number(this.cfg["building-opacity"]);
    if (!Number.isFinite(v)) {
      return DEFAULT_BUILDING_OPACITY;
    }
    return Math.min(1, Math.max(0, v));
  }

  //Cluster radius (m): buildings within it (or containing the home) join the home
  //group at full opacity, so attached outbuildings read as one. 0 = single polygon.
  private _buildingClusterRadiusMeters(): number {
    const v = Number(this.cfg["building-cluster-radius"]);
    if (!Number.isFinite(v) || v < 0) {
      return DEFAULT_BUILDING_CLUSTER_RADIUS_M;
    }
    return Math.min(100, v);
  }

  //Building base colour (fixed neutral grey; colour configs no longer consulted).
  private _buildingColor(): string {
    return DEFAULT_BUILDING_COLOR_HEX;
  }

  //Adds the two custom building layers: sol-buildings-surroundings (within the
  //radius, configured opacity) and sol-buildings-home (the home polygon at full
  //opacity). GeoJSON is fetched once per (home, radius) and reused across reloads.
  private _addBuildings(): void {
    if (!this.map) {
      return;
    }

    //Drop any stale sol-buildings* layer so re-runs are idempotent.
    for (const lid of [
      "sol-buildings",
      "sol-buildings-surroundings",
      "sol-buildings-home",
      "sol-buildings-home-outline",
      "sol-buildings-home-outline-glow",
    ]) {
      if (this.map.getLayer(lid)) {
        this.map.removeLayer(lid);
      }
    }

    //Suppress every native building layer so they don't Z-fight our extrusions.
    //MapLibre 5 styles can be assembled from imports, where visibility:none and
    //removeLayer() are silent no-ops against the bare id; so per import we toggle
    //config flags off AND remove / paint-zero under the scoped `${importId}\\${id}`.
    const styleObj = this.map.getStyle() as {
      layers?: { id: string; type: string; "source-layer"?: string }[];
      imports?: { id: string }[];
    };
    const allLayers = styleObj.layers ?? [];
    const imports = styleObj.imports ?? [];
    const importIds = imports.map((i) => i.id).filter(Boolean);

    //Identify every native building layer (2D or 3D).
    const buildingLayerIds: string[] = [];
    for (const l of allLayers) {
      if (
        l.id === "sol-buildings-surroundings" ||
        l.id === "sol-buildings-home"
      ) {
        continue;
      }
      const sl = l["source-layer"];
      const isBuildingSrc = sl === "building" || sl === "building_3d";
      const isExtrusion = l.type === "fill-extrusion";
      const idMentions =
        typeof l.id === "string" && l.id.toLowerCase().includes("building");
      if (isBuildingSrc || isExtrusion || idMentions) {
        buildingLayerIds.push(l.id);
      }
    }

    //Strategy A: toggle the MapTiler v4 schema flags off on every import (each
    //best-effort; a wrong key just throws and is ignored).
    const buildingConfigKeys = [
      "3dBuildings",
      "buildings3d",
      "show3dBuildings",
      "show3DBuildings",
      "building3D",
      "2dBuildings",
      "buildings",
      "showBuildings",
      "show2dBuildings",
    ];
    for (const imp of imports) {
      for (const key of buildingConfigKeys) {
        try {
          (
            this.map as unknown as {
              setConfigProperty: (id: string, k: string, v: unknown) => void;
            }
          ).setConfigProperty(imp.id, key, false);
        } catch (_) {
          /* best-effort: map setConfigProperty */
        }
      }
    }

    //Strategy B: per building layer, attempt removal AND paint-zeroing under both
    //the bare id and every scoped `${importId}\\${layerId}` variant.
    const idCandidates = (layerId: string): string[] => {
      const list = [layerId];
      for (const iid of importIds) {
        list.push(`${iid}\\${layerId}`);
      }
      return list;
    };

    for (const layerId of buildingLayerIds) {
      for (const cand of idCandidates(layerId)) {
        //Skip candidates with no real layer; set* on a missing layer fires a
        //MapLibre error event.
        if (!this.map.getLayer(cand)) {
          continue;
        }

        try {
          this.map.removeLayer(cand);
        } catch (_) {
          /* best-effort: remove layer */
        }

        //If removeLayer worked we're done; the paint/layout fallbacks below cover
        //imported layers where removeLayer is a silent no-op.
        if (!this.map.getLayer(cand)) {
          continue;
        }

        try {
          this.map.setLayoutProperty(cand, "visibility", "none");
        } catch (_) {
          /* best-effort: layer visibility */
        }
        try {
          this.map.setPaintProperty(cand, "fill-extrusion-opacity", 0);
        } catch (_) {
          /* best-effort: extrusion opacity */
        }
        try {
          this.map.setPaintProperty(cand, "fill-extrusion-height", 0);
        } catch (_) {
          /* best-effort: extrusion height */
        }
        try {
          this.map.setPaintProperty(cand, "fill-opacity", 0);
        } catch (_) {
          /* best-effort: fill opacity */
        }
      }
    }

    const opacity = this._buildingOpacity();
    const baseColor = this._buildingColor();
    const homeData =
      this._buildingsData?.home ??
      ({
        type: "FeatureCollection",
        features: [],
      } as GeoJSON.FeatureCollection);
    const surrData =
      this._buildingsData?.surroundings ??
      ({
        type: "FeatureCollection",
        features: [],
      } as GeoJSON.FeatureCollection);

    if (!this.map.getSource("sol-buildings-surroundings-src")) {
      this.map.addSource("sol-buildings-surroundings-src", {
        type: "geojson",
        data: surrData,
      });
    } else {
      (
        this.map.getSource(
          "sol-buildings-surroundings-src"
        ) as maplibregl.GeoJSONSource
      ).setData(surrData);
    }

    if (!this.map.getSource("sol-buildings-home-src")) {
      this.map.addSource("sol-buildings-home-src", {
        type: "geojson",
        data: homeData,
      });
    } else {
      (
        this.map.getSource("sol-buildings-home-src") as maplibregl.GeoJSONSource
      ).setData(homeData);
    }

    //Ground shadows: a single image source (black mask on an offscreen canvas)
    //drawn before the extrusions so buildings hide the under-building part of
    //their own shadow. Bounds match the building bbox so it's the same disc.
    const shadowBounds: ShadowBoundsCorners = shadowBoundsCornersLL(
      this.homeLat,
      this.homeLon,
      this._buildingRadiusMeters()
    );
    if (!this.map.getSource("sol-building-shadows-src")) {
      this.map.addSource("sol-building-shadows-src", {
        type: "image",
        url: BLANK_SHADOW_DATA_URL,
        coordinates: shadowBounds,
      });
    }
    const shadowOpa = this._shadowOpacity();
    if (!this.map.getLayer("sol-building-shadows")) {
      this.map.addLayer({
        id: "sol-building-shadows",
        source: "sol-building-shadows-src",
        type: "raster",
        paint: {
          "raster-opacity": shadowOpa,
          "raster-fade-duration": 0,
          "raster-resampling": "linear",
        },
      });
    }

    //Surroundings first, then home, so the home draws on top if polygons overlap.
    this.map.addLayer({
      id: "sol-buildings-surroundings",
      source: "sol-buildings-surroundings-src",
      type: "fill-extrusion",
      paint: {
        "fill-extrusion-color": baseColor,
        //coalesce → 0 for features missing render_height so MapLibre doesn't log
        //"expected number, got null" per missing feature on every paint.
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 0],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": opacity,
      },
    });

    this.map.addLayer({
      id: "sol-buildings-home",
      source: "sol-buildings-home-src",
      type: "fill-extrusion",
      paint: {
        //Home buildings take the HA Energy grid-consumption blue so they read as
        //the dashboard's "home node"; surroundings keep the neutral baseColor.
        "fill-extrusion-color": "#488fc2",
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 0],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 1,
      },
    });

    //Kick off the buildings fetch in the background; the shadow source populates
    //once the GeoJSON lands.
    this._ensureBuildingsFetched();
  }

  //Idempotent fetch helper: reuses _buildingsData across style reloads, only
  //re-hits the API when the home position or radius changed.
  private _ensureBuildingsFetched(): void {
    if (!this.map) {
      return;
    }
    const radius = this._buildingRadiusMeters();
    const clusterRadius = this._buildingClusterRadiusMeters();
    const key = `${this.homeLat.toFixed(6)}|${this.homeLon.toFixed(6)}|${radius}|${clusterRadius}`;

    if (this._buildingsData && this._buildingsFetchKey === key) {
      return;
    }

    //Shared module-level cache short-circuit so a fresh engine after an editor
    //commit skips the buildings re-parse.
    const sharedBuildings = sharedBuildingsCacheGet(key);
    if (sharedBuildings) {
      this._buildingsFetchKey = key;
      this._buildingsData = sharedBuildings;
      this._pushRenderableSources();
      this._lastAtmosphereAlt = -999;
      this._refreshShadowsAndAtmosphere();
      return;
    }

    //Abort any in-flight request so a rapid radius change doesn't let the old
    //fetch race the new one.
    this._buildingsAbort?.abort();
    const ac = new AbortController();
    this._buildingsAbort = ac;
    this._buildingsFetchKey = key;

    try {
      this.onBuildingsFetchStart?.();
    } catch (_) {
      /* best-effort: buildings-fetch-start callback */
    }

    fetchBuildingsAroundHome({
      homeLon: this.homeLon,
      homeLat: this.homeLat,
      radiusMeters: radius,
      clusterRadiusMeters: clusterRadius,
      signal: ac.signal,
    })
      .then((result) => {
        if (ac.signal.aborted || !this.map) {
          return;
        }
        this._buildingsData = result;
        _sharedBuildingsCache.set(key, { data: result, ts: Date.now() });
        this._pushRenderableSources();
        //Buildings just arrived; bypass the "sun hardly moved" guard so the next
        //call paints a full pass and populates the shadow polygons.
        this._lastAtmosphereAlt = -999;
        this._refreshShadowsAndAtmosphere();
      })
      .catch(() => {
        /* best-effort: keep last buildings on fetch/abort failure */
      })
      .finally(() => {
        try {
          this.onBuildingsFetchEnd?.();
        } catch (_) {
          /* best-effort: buildings-fetch-end callback */
        }
      });
  }

  //Pushes the building footprints into the rendering sources.
  private _pushRenderableSources(): void {
    if (!this.map) {
      return;
    }
    const homeSrc = this.map.getSource("sol-buildings-home-src") as
      | maplibregl.GeoJSONSource
      | undefined;
    const surrSrc = this.map.getSource("sol-buildings-surroundings-src") as
      | maplibregl.GeoJSONSource
      | undefined;
    const empty: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    homeSrc?.setData(this._buildingsData?.home ?? empty);
    surrSrc?.setData(this._buildingsData?.surroundings ?? empty);
  }

  //Repaint night-shade, building tints, directional light and cast shadows to
  //match the current sun altitude, blending continuously across the day. Short-
  //circuits when the sun has barely moved (see threshold below).
  private _refreshShadowsAndAtmosphere(): void {
    if (!this.map) {
      return;
    }

    const t = this._selectedTime ?? new Date();
    const sun = getSunPosition(t, this.homeLat, this.homeLon);
    const { altitude, azimuth } = sun;

    //Refresh only when the sun altitude moved >= 1.5 deg (~6 min); the eye won't
    //register a 6 min stale shadow, and this avoids ~3x redundant raster passes.
    if (Math.abs(altitude - this._lastAtmosphereAlt) < 1.5) {
      return;
    }
    this._lastAtmosphereAlt = altitude;

    //Night-shade: opacity 0 (day) up to ~0.65 (deep night), warm-tinted through
    //sunrise/sunset.
    if (this.map.getLayer("sol-night-shade")) {
      try {
        const ns = nightShadeForAltitude(altitude);
        this.map.setPaintProperty("sol-night-shade", "fill-color", ns.color);
        this.map.setPaintProperty(
          "sol-night-shade",
          "fill-opacity",
          ns.opacity
        );
      } catch (_) {
        /* best-effort: night-shade opacity */
      }
    }

    //Modulate building colour by sun altitude (cool dark at night, warm tint near
    //sunrise/sunset).
    try {
      const buildingHex = buildingColorForAltitude(
        this._buildingColor(),
        altitude
      );
      for (const lid of ["sol-buildings-surroundings", "sol-buildings-home"]) {
        if (this.map.getLayer(lid)) {
          this.map.setPaintProperty(lid, "fill-extrusion-color", buildingHex);
        }
      }
    } catch (_) {
      /* best-effort: building colour paint */
    }

    //Sun-driven face shading. MapLibre's light is [radial, azimuth, polar]:
    //azimuth clockwise from north (matches getSunPosition), polar 0 (above) to 180
    //(below); anchor='map' keeps lighting fixed under camera rotation. Below the
    //horizon the polar is clamped just under 90 deg to avoid inverted face shading.
    try {
      this.map.setLight({
        anchor: "map",
        position: [1.15, azimuth, sunLightPolarFromAltitude(altitude)],
        color: "#ffffff",
        intensity: 0.5,
      });
    } catch (_) {
      /* best-effort: directional light update */
    }

    //Cast-shadow polygons (empty when the toggle is off).
    try {
      const shadowsOn = this._shadowsEnabled();
      const radius = this._buildingRadiusMeters();
      //Signature of every shadow-raster input; an unchanged signature skips the
      //project + paint + PNG-encode. Altitude/azimuth rounded to 0.1 deg (~6 min)
      //so a scrub no longer triggers a PNG encode every half-second.
      const sig =
        `${shadowsOn ? "1" : "0"}` +
        `|${altitude.toFixed(1)}|${azimuth.toFixed(1)}` +
        `|${this.homeLat.toFixed(6)}|${this.homeLon.toFixed(6)}` +
        `|${radius}` +
        `|B${
          this._buildingsData
            ? this._buildingsData.home.features.length +
              this._buildingsData.surroundings.features.length
            : -1
        }`;
      if (sig !== this._lastShadowSig) {
        this._lastShadowSig = sig;
        let input: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: [],
        };
        if (shadowsOn && this._buildingsData) {
          input = {
            type: "FeatureCollection",
            features: [
              ...this._buildingsData.home.features,
              ...this._buildingsData.surroundings.features,
            ],
          };
        }
        const projected = projectExtrusionShadows(input, {
          sunAzimuthDeg: azimuth,
          sunAltitudeDeg: altitude,
          homeLat: this.homeLat,
          //Clip shadows to the building disc so they don't extend past it.
          clipCenterLat: this.homeLat,
          clipCenterLon: this.homeLon,
          clipRadiusMeters: radius,
        });
        if (this.map) {
          //Reuse the backing canvas across refreshes (recreate only if the
          //precision-derived size changed) to avoid allocating 16 MB per minute.
          const rasterSize = shadowRasterSizeFor(this._shadowPrecisionLevel());
          if (!this._shadowCanvas || this._shadowCanvas.width !== rasterSize) {
            this._shadowCanvas = document.createElement("canvas");
            this._shadowCanvas.width = rasterSize;
            this._shadowCanvas.height = rasterSize;
          }
          const radiusM = this._buildingRadiusMeters();
          const [fullR, fadeR] = this._shadowFadeRange();
          paintShadowRaster(
            this.map,
            this._shadowCanvas,
            projected,
            shadowBoundsCornersLL(this.homeLat, this.homeLon, radiusM),
            radiusM,
            fullR,
            fadeR
          );
        }
      }
    } catch (_) {
      /* best-effort: shadow fade paint */
    }
  }

  //Precision is fixed to 'high'; kept as a function for future tiers.
  private _resolvedPrecision(): "standard" | "high" {
    return "high";
  }

  private async _refreshWeather(lat?: number, lon?: number): Promise<void> {
    const fLat = lat ?? this.homeLat;
    const fLon = lon ?? this.homeLon;

    this._fetchAbortController?.abort();
    this._fetchAbortController = new AbortController();
    const signal = this._fetchAbortController.signal;

    this._clearWeatherTimer();

    this.onFetchStart?.();

    try {
      //Single home-point fetch with elevation; the home point is the only weather
      //source.
      const precision = this._resolvedPrecision();
      this._homeHourlyData = await fetchHomePointData(
        fLat,
        fLon,
        this.homeElevation,
        precision,
        signal
      );
      this._renderForCurrentSelection();

      //Successful fetch: reset both back-off streaks.
      this._rateLimitStreak = 0;
      this._otherErrorStreak = 0;

      if (this._selectedTime === null) {
        //Refresh every 10 min; Open-Meteo updates its forecast every 15 min
        //server-side, so this stays near-fresh within free-tier quotas.
        this._weatherTimer = window.setInterval(
          () => this._refreshWeather(this._fetchLat, this._fetchLon),
          600_000
        );
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        return;
      }

      //Open-Meteo unreachable: emit a neutral-defaults WeatherData so the card
      //still builds its timeline; the retry replaces these once the fetch succeeds.
      this.onWeatherUpdate?.({
        cloudCover: 0,
        cloudLow: 0,
        cloudMid: 0,
        cloudHigh: 0,
        cloudIntensity: "clear",
        timeRange: this._getTimeRange(),
        isLiveTime: this._selectedTime === null,
        pvPower: 0,
        pvPowerHaurwitz: 0,
        pvPowerShortwave: -1,
        irradianceSource: "haurwitz",
        temperatureC: NaN,
        windMs: NaN,
      });

      let retryDelay: number;
      if (e.status === 429) {
        //Back-off slot for the current streak (capped). setTimeout, not
        //setInterval: one retry, then reset on success or bump on re-failure.
        const idx = Math.min(
          this._rateLimitStreak,
          RATE_LIMIT_BACKOFF_MS.length - 1
        );
        retryDelay = RATE_LIMIT_BACKOFF_MS[idx];
        this._rateLimitStreak++;

        this._weatherTimer = window.setTimeout(
          () => this._refreshWeather(this._fetchLat, this._fetchLon),
          retryDelay
        );
      } else {
        //Non-rate-limit error: graduated back-off table. setTimeout schedules one
        //retry; success resets the streak, re-failure picks the next slot.
        const idx = Math.min(
          this._otherErrorStreak,
          OTHER_ERROR_BACKOFF_MS.length - 1
        );
        retryDelay = OTHER_ERROR_BACKOFF_MS[idx];
        this._otherErrorStreak++;
        this._weatherTimer = window.setTimeout(
          () => this._refreshWeather(this._fetchLat, this._fetchLon),
          retryDelay
        );
      }
    } finally {
      this.onFetchEnd?.();
    }
  }

  //"Reset view": re-anchor the camera on the home and restore the resting pose.
  public recenter(): void {
    if (!this.map) {
      return;
    }
    this.map.stop();
    const c = this.map.getCenter();
    const dist = geoDistM(c.lat, c.lng, this.homeLat, this.homeLon);
    const dur = Math.min(1200, Math.max(300, dist / 5));

    this.map.easeTo({
      center: [this.homeLon, this.homeLat],
      zoom: 18,
      pitch: this._initialPitch(),
      bearing: this._initialBearing(),
      duration: dur,
    });
  }

  //Timestamp until which fresh user gestures are ignored (read via
  //isUserGestureSuppressed() to filter timeline scrubs and canvas drag-rotate).
  _postExitCooldownUntil = 0;

  //Pause/resume gate driven by the card's IntersectionObserver: an off-screen
  //card stops the periodic refresh + dome re-projection. One immediate refresh on
  //un-pause so the sun position matches now.
  public setPaused(paused: boolean): void {
    if (this._paused === paused) {
      return;
    }
    this._paused = paused;
    if (paused) {
      //Drop the 60 s sky refresh interval (the callback already early-returns,
      //but the timer still wakes the page every minute for no work).
      if (this._skyTimer !== undefined) {
        window.clearInterval(this._skyTimer);
        this._skyTimer = undefined;
      }
      //Drop the weather refresh timer too; otherwise a hidden card keeps hitting
      //Open-Meteo every 10 min. Re-armed on un-pause via the success path.
      this._clearWeatherTimer();
    } else {
      this._refreshShadowsAndAtmosphere();
      if (this._skyTimer === undefined) {
        this._skyTimer = window.setInterval(() => {
          if (this._paused) {
            return;
          }
          this._refreshShadowsAndAtmosphere();
        }, 60_000);
      }
      //Re-arm the weather refresh: one immediate fetch (cache hit within TTL so a
      //quick flip costs nothing); the success path schedules the 10 min interval.
      if (this._weatherTimer === undefined) {
        this._refreshWeather(this._fetchLat, this._fetchLon);
      }
    }
  }

  public isPaused(): boolean {
    return this._paused;
  }

  //True while the post-exit cooldown is active (gates timeline scrubs + canvas
  //drag-rotate off the same clock).
  public isUserGestureSuppressed(): boolean {
    return Date.now() < this._postExitCooldownUntil;
  }

  //Screen-space layout (CSS px relative to the map canvas) of the on-map readout
  //chips and their leader lines. Returns null until the map is ready.
  public projectHomeLabelLayout(): {
    pvLabel: { x: number; y: number };
    batterySocLabel: { x: number; y: number };
    batteryPowerLabel: { x: number; y: number };
    gridLabel: { x: number; y: number };
    lowCarbonLabel: { x: number; y: number };
    home: { x: number; y: number };
    //SVG `points` for the PV home-anchor ground disc: points on a circle around
    //the home, expressed relative to the home so the SVG can translate-to-home and
    //scale-pulse around the origin.
    homeAnchorPoints: string;
  } | null {
    if (!this.map) {
      return null;
    }

    //project() exists at runtime but isn't on the local .d.ts; cast as for getCanvas.
    const m = this.map as any;
    const home = m.project([this.homeLon, this.homeLat]);

    const cosLat = Math.cos((this.homeLat * Math.PI) / 180);

    //Chip cluster around the home: PV vertically on the home, battery (SoC/Power)
    //stacked on the right, grid/low-carbon stacked on the left. Offsets are scaled
    //by _chipSpreadScale() so the cluster spreads on a kiosk layout (1.0 at grid).
    const scale = this._chipSpreadScale();
    //Steeper vertical-lift ramp than the horizontal spread so the leaders stay
    //readable on a fullscreen canvas (1.0 at standard card sizes).
    const liftScale = this._clusterLiftScale();
    //Wide side columns: the card is markedly landscape, so push the grid /
    //low-carbon column further left and the battery column further right to use
    //the horizontal room and keep the leaders legible.
    const CHIP_SIDE_X_OFFSET_PX = 100 * scale;
    //Vertical gap between the chip rows; 60 leaves room for the L-leader fillets.
    const CHIP_STACK_GAP_PX = 60 * scale;
    //Home roof Y, projected at the home's tallest render_height. Anchors the
    //cluster a fixed distance above the roof so it tracks the building silhouette;
    //falls back to the ground home position before _buildingsData lands.
    let roofY = home.y;
    const homeFeatures = this._buildingsData?.home?.features;
    if (homeFeatures && homeFeatures.length > 0) {
      let maxH = 0;
      for (const feat of homeFeatures) {
        const props = (feat.properties ?? {}) as Record<string, unknown>;
        const h =
          typeof props["render_height"] === "number"
            ? (props["render_height"] as number)
            : 0;
        if (h > maxH) {
          maxH = h;
        }
      }
      if (maxH > 0) {
        const projectedRoof = this._projectScenePoint(
          this.homeLon,
          this.homeLat,
          maxH
        );
        if (projectedRoof) {
          roofY = projectedRoof.y;
        }
      }
    }

    //Anchor the whole cluster (pill + chips + leaders) ON the home roof, centred on
    //the home, so it sits on the house instead of floating above it. roofY falls
    //back to the ground home position before the building geometry lands.
    const anchorX = home.x;
    const clusterY = roofY;
    const pvX = anchorX;
    const pvY = clusterY - PV_CHIP_OFFSET_PX * liftScale;
    //Battery column on the right: SoC on top, Power on the bottom.
    const batteryXRight = anchorX + CHIP_SIDE_X_OFFSET_PX;
    const batterySocY = clusterY - CHIP_STACK_GAP_PX / 2;
    const batteryPowerY = clusterY + CHIP_STACK_GAP_PX / 2;
    //Left column: low-carbon on top, grid on the bottom (mirrors the battery side).
    const gridXLeft = anchorX - CHIP_SIDE_X_OFFSET_PX;
    const gridY = clusterY + CHIP_STACK_GAP_PX / 2;
    const lowCarbonY = clusterY - CHIP_STACK_GAP_PX / 2;

    //PV home-anchor ground disc as a polygon: N points on a horizontal circle
    //around the home, projected through the camera and expressed relative to the
    //home so the SVG can translate-to-home. Flat on the ground, so it projects to
    //an ellipse under pitch. 4 m matches the visual weight of the HA Energy home node.
    const PV_HOME_ANCHOR_RADIUS_M = 4.0;
    const ANCHOR_SAMPLES = 48;
    const anchorLatPerM = 1 / 111_320;
    const anchorLonPerM = anchorLatPerM / cosLat;
    //Reuse an instance-level scratch buffer; this fires on every move during
    //auto-rotate and the per-call string allocations were a measurable freeze.
    const anchorPts = this._anchorPtsBuf;
    if (anchorPts.length !== ANCHOR_SAMPLES) {
      anchorPts.length = ANCHOR_SAMPLES;
    }
    for (let i = 0; i < ANCHOR_SAMPLES; i++) {
      const a = (i / ANCHOR_SAMPLES) * Math.PI * 2;
      const dE = Math.cos(a) * PV_HOME_ANCHOR_RADIUS_M;
      const dN = Math.sin(a) * PV_HOME_ANCHOR_RADIUS_M;
      const p = m.project([
        this.homeLon + dE * anchorLonPerM,
        this.homeLat + dN * anchorLatPerM,
      ]);
      //Direct concat instead of toFixed, whose per-call allocation compounds here.
      const dx = Math.trunc((p.x - home.x) * 100) / 100;
      const dy = Math.trunc((p.y - home.y) * 100) / 100;
      anchorPts[i] = dx + "," + dy;
    }

    return {
      pvLabel: { x: pvX, y: pvY },
      batterySocLabel: { x: batteryXRight, y: batterySocY },
      batteryPowerLabel: { x: batteryXRight, y: batteryPowerY },
      gridLabel: { x: gridXLeft, y: gridY },
      lowCarbonLabel: { x: gridXLeft, y: lowCarbonY },
      home: { x: anchorX, y: clusterY },
      homeAnchorPoints: anchorPts.join(" "),
    };
  }

  //Per-frame projection cache + scratch buffers, mutated in place by
  //_projectScenePoint(), which runs hundreds of times per transform. Naive
  //allocation here is the dominant GC-pressure source under auto-rotate.
  //_projCache holds the camera-side data for the current frame (invalidated on
  //every move/render/resize); _mvpBuf and _llBuf are reused matrix/coord scratch.
  private _projCache: {
    projM: number[];
    W: number;
    H: number;
  } | null = null;
  private _mvpBuf: number[] = new Array(16);
  private _llBuf: [number, number] = [0, 0];
  //Scratch for the PV home-anchor SVG points, reused across calls.
  private _anchorPtsBuf: string[] = [];

  //Canvas CSS dimensions fed by the ResizeObserver. Read in _projectScenePoint()
  //instead of canvas.clientWidth so the first projection of a frame doesn't force
  //a layout flush.
  private _cachedCanvasCssW = 0;
  private _cachedCanvasCssH = 0;

  private _invalidateProjCache(): void {
    this._projCache = null;
  }

  //Last applied top padding (px), the pitch/zoom it was computed for, and a
  //re-entrancy guard for the setPadding call.
  private _appliedPaddingTop = -1;
  private _lastPaddingPitch = -1;
  private _lastPaddingZoom = -1;
  private _applyingPadding = false;

  //Aim the camera at a point CAMERA_TARGET_HEIGHT_M above the home (on the
  //ground->home vertical) by sizing MapLibre top padding to that height's on-screen
  //projection, shifting the focal point down so the house sits lower with headroom
  //above. The padding depends ONLY on pitch + zoom, so it is gated on those: a
  //bearing change (rotate / auto-rotate) leaves it untouched, and crucially the
  //setPadding call's own `moveend` carries the same pitch/zoom, so this never loops
  //or jitters the overlay. Self-collapses to ~0 at top-down pitch.
  private _applyCameraTargetPadding(): void {
    if (!this.map || this._applyingPadding) {
      return;
    }
    const pitch = this.map.getPitch();
    const zoom = this.map.getZoom();
    if (
      Math.abs(pitch - this._lastPaddingPitch) < 0.5 &&
      Math.abs(zoom - this._lastPaddingZoom) < 0.01
    ) {
      return;
    }
    this._lastPaddingPitch = pitch;
    this._lastPaddingZoom = zoom;
    const ground = this._projectScenePoint(this.homeLon, this.homeLat, 0);
    const elevated = this._projectScenePoint(
      this.homeLon,
      this.homeLat,
      CAMERA_TARGET_HEIGHT_M
    );
    if (!ground || !elevated) {
      return;
    }
    const targetTop = Math.max(0, Math.round((ground.y - elevated.y) * 2));
    if (Math.abs(targetTop - this._appliedPaddingTop) <= 1) {
      return;
    }
    this._appliedPaddingTop = targetTop;
    this._applyingPadding = true;
    try {
      this.map.setPadding({ top: targetTop, bottom: 0, left: 0, right: 0 });
    } finally {
      this._applyingPadding = false;
    }
  }

  //Linear ramp on the card's min CSS dimension so the chip cluster expands on a
  //kiosk layout; 1.0 below FLOOR, ramping to MAX at TOP.
  private _chipSpreadScale(): number {
    const minDim = Math.min(
      this._cachedCanvasCssW || Infinity,
      this._cachedCanvasCssH || Infinity
    );
    if (!Number.isFinite(minDim) || minDim <= 0) {
      return 1.0;
    }
    const FLOOR = 600;
    const TOP = 1200;
    const MAX = 1.6;
    if (minDim <= FLOOR) {
      return 1.0;
    }
    if (minDim >= TOP) {
      return MAX;
    }
    return 1.0 + ((MAX - 1.0) * (minDim - FLOOR)) / (TOP - FLOOR);
  }
  //Steeper vertical-lift ramp than _chipSpreadScale() so the leaders keep pace
  //with canvas growth. Same FLOOR/TOP breakpoints.
  private _clusterLiftScale(): number {
    const minDim = Math.min(
      this._cachedCanvasCssW || Infinity,
      this._cachedCanvasCssH || Infinity
    );
    if (!Number.isFinite(minDim) || minDim <= 0) {
      return 1.0;
    }
    const FLOOR = 600;
    const TOP = 1200;
    const MAX = 2.4;
    if (minDim <= FLOOR) {
      return 1.0;
    }
    if (minDim >= TOP) {
      return MAX;
    }
    return 1.0 + ((MAX - 1.0) * (minDim - FLOOR)) / (TOP - FLOOR);
  }
  //Dedicated ramp for the sun arc + disc (world-metres geometry needs a bigger
  //multiplier than the chips to keep its canvas share constant on a kiosk layout).
  //The card-side disc/halo consume the same value via getSunArcScale().
  private _sunArcScale(): number {
    const minDim = Math.min(
      this._cachedCanvasCssW || Infinity,
      this._cachedCanvasCssH || Infinity
    );
    if (!Number.isFinite(minDim) || minDim <= 0) {
      return 1.0;
    }
    //Below FLOOR the arc scales DOWN so its full width keeps fitting a small
    //(phone) card instead of spilling past the edges, clamped at MIN so it always
    //stays clear of the central chip cluster. Above FLOOR it scales UP to keep its
    //canvas share on kiosk layouts. Stays circular either way (uniform scale).
    const SMALL = 360;
    const FLOOR = 600;
    const TOP = 1200;
    const MIN = 0.72;
    const MAX = 2.2;
    if (minDim <= SMALL) {
      return MIN;
    }
    if (minDim < FLOOR) {
      return MIN + ((1.0 - MIN) * (minDim - SMALL)) / (FLOOR - SMALL);
    }
    if (minDim >= TOP) {
      return MAX;
    }
    return 1.0 + ((MAX - 1.0) * (minDim - FLOOR)) / (TOP - FLOOR);
  }
  //Public accessor for the sun-arc scale so the card scales the disc + halo
  //together with the arc radius.
  public getSunArcScale(): number {
    return this._sunArcScale();
  }

  //Project a 3D point (lon, lat, altitude_m) to screen pixels via MapLibre's
  //camera matrices: mvp = projMatrix · modelMatrix applied to the local origin,
  //then perspective-divide and map to canvas pixels. Returns x/y in CSS px plus
  //depth (post-projection w, monotonic in camera distance) for perspective
  //scaling; null when the map isn't ready or the point is behind the camera.
  private _projectScenePoint(
    lon: number,
    lat: number,
    altitudeM: number
  ): { x: number; y: number; depth: number } | null {
    if (!this.map) {
      return null;
    }

    const t: any = (this.map as any).transform;
    if (
      typeof t?.getMatrixForModel !== "function" ||
      typeof t?.getProjectionDataForCustomLayer !== "function"
    ) {
      return null;
    }

    //Per-frame cache: the projection matrix is identical across every call in a
    //frame, so resolve it once (invalidated on every move/resize). Canvas dims come
    //from the ResizeObserver-fed cache, not clientWidth, to avoid a layout flush.
    let pc = this._projCache;
    if (!pc) {
      const projM = t.getProjectionDataForCustomLayer().mainMatrix as number[];
      //First-time fallback before the ResizeObserver fires: pay the layout flush once.
      if (this._cachedCanvasCssW === 0 || this._cachedCanvasCssH === 0) {
        const canvas: HTMLCanvasElement = (this.map as any).getCanvas();
        this._cachedCanvasCssW = canvas.clientWidth || canvas.width;
        this._cachedCanvasCssH = canvas.clientHeight || canvas.height;
      }
      pc = {
        projM,
        W: this._cachedCanvasCssW,
        H: this._cachedCanvasCssH,
      };
      this._projCache = pc;
    }
    const { projM, W, H } = pc;

    //Reuse the [lon, lat] scratch buffer (MapLibre reads it immediately, no
    //aliasing risk).
    this._llBuf[0] = lon;
    this._llBuf[1] = lat;
    const modelM: number[] = t.getMatrixForModel(this._llBuf, altitudeM);

    //mvp = projM · modelM into the _mvpBuf scratch. Both inputs are column-major,
    //so mvp[col*4+row] is element (row, col).
    const mvp = this._mvpBuf;
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += projM[k * 4 + row] * modelM[col * 4 + k];
        }
        mvp[col * 4 + row] = sum;
      }
    }

    //mvp applied to the origin (0,0,0,1) is just the last column.
    const cx = mvp[12];
    const cy = mvp[13];
    const cw = mvp[15];

    if (cw <= 0 || !isFinite(cw)) {
      //Behind the camera or numerically degenerate.
      return null;
    }

    //Perspective divide → clip space in [-1, +1].
    const ndcX = cx / cw;
    const ndcY = cy / cw;

    //Map ndc to pixels; Y flipped (ndc Y up, screen Y down).
    return {
      x: (ndcX + 1) * 0.5 * W,
      y: (1 - ndcY) * 0.5 * H,
      depth: cw,
    };
  }

  //Screen-space layout of the solar arc + the sun's current position; null until
  //the map is ready. Each arc point carries irradiance (W/m², current cloud cover
  //applied uniformly across the day) and a nearness in [0..1] (1 = nearest depth)
  //the card uses to scale segment thickness + disc radius for perspective.
  public projectSunScene(now: Date): {
    arc: {
      x: number;
      y: number;
      irradiance: number;
      nearness: number;
      belowHorizon: boolean;
    }[];
    sun: {
      x: number;
      y: number;
      irradiance: number;
      altitude: number;
      nearness: number;
    };
    home: { x: number; y: number };
    daylight: number;
    //Horizon crossings (screen position + local tangent angle in rad) for the
    //card's sunrise/sunset rings; null at high latitudes during polar day/night.
    sunrise: { x: number; y: number; angleRad: number; time: Date } | null;
    sunset: { x: number; y: number; angleRad: number; time: Date } | null;
  } | null {
    if (!this.map) {
      return null;
    }

    //Ground-level home projection, the SVG anchor for the incidence ray.
    const homeScreen = this._projectScenePoint(this.homeLon, this.homeLat, 0);
    if (!homeScreen) {
      return null;
    }

    //Sample the day at 15-min intervals from local midnight (local civil time so
    //the arc's start/end land on the user's actual midnight regardless of tz).
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;
    const stepMs = dayMs / SUN_ARC_SAMPLES;

    //Live cloud cover for irradiance colouring; 0% (clear) before the first fetch.
    const liveCloud = this._homeHourlyData
      ? (() => {
          const w = this._getWeatherAtTime(now);
          return w?.cloudCover ?? 0;
        })()
      : 0;

    //Reuse the cached arc inputs unless the day or integer cloud cover changed;
    //the heavy trig fires only on a cache miss.
    const dayStartMs = dayStart.getTime();
    const cloudPctInt = Math.round(liveCloud);
    let cache = this._arcInputsCache;
    if (
      !cache ||
      cache.dayStartMs !== dayStartMs ||
      cache.cloudPctInt !== cloudPctInt
    ) {
      const samples: ({
        lon: number;
        lat: number;
        altitudeM: number;
        wm2: number;
        belowHorizon: boolean;
      } | null)[] = [];
      for (let i = 0; i < SUN_ARC_SAMPLES; i++) {
        const t = new Date(dayStartMs + i * stepMs);
        const sun3D = this._sunSpherePoint(t);
        if (!sun3D) {
          samples.push(null);
          continue;
        }
        //Sensor reading if one is within the window, else the analytical model.
        const sensorWm2 = this._sensorIrradianceAt(t);
        const wm2 =
          sensorWm2 !== null
            ? sensorWm2
            : computeIrradianceWm2(t, this.homeLat, this.homeLon, liveCloud);
        samples.push({
          lon: sun3D.lon,
          lat: sun3D.lat,
          altitudeM: sun3D.altitudeM,
          wm2,
          //altitudeM is R·sin(α), so negative = sun below the horizon. A flag is
          //enough for the card's solid-vs-dotted render switch.
          belowHorizon: sun3D.altitudeM < 0,
        });
      }
      cache = { dayStartMs, cloudPctInt, samples };
      this._arcInputsCache = cache;
    }

    //Per-frame: re-project the cached samples, recording depth for the nearness
    //normalisation below.
    interface RawArcPoint {
      x: number;
      y: number;
      irradiance: number;
      depth: number;
      belowHorizon: boolean;
    }
    const raw: RawArcPoint[] = [];
    for (let i = 0; i < SUN_ARC_SAMPLES; i++) {
      const s = cache.samples[i];
      if (!s) {
        continue;
      }
      const px = this._projectScenePoint(s.lon, s.lat, s.altitudeM);
      if (!px) {
        continue;
      }
      raw.push({
        x: px.x,
        y: px.y,
        irradiance: s.wm2,
        depth: px.depth,
        belowHorizon: s.belowHorizon,
      });
    }

    //Sun at "now", same spherical projection as the arc points.
    const sunNow3D = this._sunSpherePoint(now);
    const sunNowAlt = getSunPosition(now, this.homeLat, this.homeLon).altitude;
    const sunNowSensor = this._sensorIrradianceAt(now);
    const sunNowWm2 =
      sunNowSensor !== null
        ? sunNowSensor
        : computeIrradianceWm2(now, this.homeLat, this.homeLon, liveCloud);

    let sunScreen: { x: number; y: number; depth: number } | null = null;
    if (sunNow3D) {
      sunScreen = this._projectScenePoint(
        sunNow3D.lon,
        sunNow3D.lat,
        sunNow3D.altitudeM
      );
    }
    if (!sunScreen) {
      //Keep a defined sun position even at night (fall back to home) so
      //downstream maths stays finite; the ray just won't be drawn.
      sunScreen = { ...homeScreen, depth: homeScreen.depth };
    }

    //Depth range across the arc + sun so every element shares one perspective
    //scale: nearness = 1 at the smallest depth, 0 at the largest.
    let dMin = Infinity;
    let dMax = -Infinity;
    for (const p of raw) {
      if (p.depth < dMin) {
        dMin = p.depth;
      }
      if (p.depth > dMax) {
        dMax = p.depth;
      }
    }
    if (sunScreen.depth < dMin) {
      dMin = sunScreen.depth;
    }
    if (sunScreen.depth > dMax) {
      dMax = sunScreen.depth;
    }
    const dRange = dMax - dMin || 1;
    const nearnessOf = (d: number) => 1 - (d - dMin) / dRange;

    const arc = raw.map((p) => ({
      x: p.x,
      y: p.y,
      irradiance: p.irradiance,
      nearness: nearnessOf(p.depth),
      belowHorizon: p.belowHorizon,
    }));

    //daylight: smooth 0..1 ramp on solar altitude (SUN_ARC_NIGHT_OPACITY below
    //-6°, full above +6°, blended between).
    const daylight = (() => {
      if (sunNowAlt >= 6) {
        return 1;
      }
      if (sunNowAlt <= -6) {
        return SUN_ARC_NIGHT_OPACITY;
      }
      const t01 = (sunNowAlt + 6) / 12;
      return SUN_ARC_NIGHT_OPACITY + (1 - SUN_ARC_NIGHT_OPACITY) * t01;
    })();

    //Horizon crossings: walk the cached samples for the below→above (sunrise) and
    //above→below (sunset) transitions, interpolating linearly between the
    //bracketing samples. Tangent comes from the bracketing points so the card can
    //rotate the ring perpendicular to the arc. Days with no crossing leave null.
    let sunrise: { x: number; y: number; angleRad: number; time: Date } | null =
      null;
    let sunset: { x: number; y: number; angleRad: number; time: Date } | null =
      null;
    for (let i = 1; i < cache.samples.length; i++) {
      const prev = cache.samples[i - 1];
      const curr = cache.samples[i];
      if (!prev || !curr) {
        continue;
      }

      const prevBelow = prev.belowHorizon;
      const currBelow = curr.belowHorizon;
      if (prevBelow === currBelow) {
        continue;
      }

      //Interpolate on altitudeM (0 at the horizon crossing); t=0 → prev, t=1 → curr.
      const aPrev = prev.altitudeM;
      const aCurr = curr.altitudeM;
      const span = aCurr - aPrev;
      const t = Math.abs(span) < 1e-6 ? 0.5 : -aPrev / span;
      const tClamped = Math.max(0, Math.min(1, t));

      const lerpLon = prev.lon + (curr.lon - prev.lon) * tClamped;
      const lerpLat = prev.lat + (curr.lat - prev.lat) * tClamped;
      const px = this._projectScenePoint(lerpLon, lerpLat, 0);
      if (!px) {
        continue;
      }

      //Tangent: angle of (curr - prev) in screen space; the ring is drawn
      //perpendicular to it so the arc threads through.
      const pxPrev = this._projectScenePoint(
        prev.lon,
        prev.lat,
        prev.altitudeM
      );
      const pxCurr = this._projectScenePoint(
        curr.lon,
        curr.lat,
        curr.altitudeM
      );
      const angleRad =
        pxPrev && pxCurr
          ? Math.atan2(pxCurr.y - pxPrev.y, pxCurr.x - pxPrev.x)
          : 0;

      const time = new Date(dayStartMs + (i - 1 + tClamped) * stepMs);
      const marker = { x: px.x, y: px.y, angleRad, time };

      if (prevBelow && !currBelow) {
        sunrise = marker;
      } else if (!prevBelow && currBelow) {
        sunset = marker;
      }
    }

    return {
      arc,
      sun: {
        x: sunScreen.x,
        y: sunScreen.y,
        irradiance: sunNowWm2,
        altitude: sunNowAlt,
        nearness: nearnessOf(sunScreen.depth),
      },
      home: { x: homeScreen.x, y: homeScreen.y },
      daylight,
      sunrise,
      sunset,
    };
  }

  //date → 3D point on the celestial hemisphere (radius SUN_ARC_RADIUS_M, centred
  //on the home) as (lon, lat, altitude_m). Azimuth is clockwise from north; ENU
  //offsets east = R·cos(α)·sin(φ), north = R·cos(α)·cos(φ), up = R·sin(α),
  //converted to lon/lat via local metres-per-degree.
  private _sunSpherePoint(date: Date): {
    lon: number;
    lat: number;
    altitudeM: number;
  } | null {
    const sun = getSunPosition(date, this.homeLat, this.homeLon);
    const D = Math.PI / 180;
    const a = sun.altitude * D;
    const z = sun.azimuth * D;

    //Scale the celestial radius on kiosk layouts so the arc keeps its canvas share.
    const R = SUN_ARC_RADIUS_M * this._sunArcScale();
    const east = R * Math.cos(a) * Math.sin(z);
    const north = R * Math.cos(a) * Math.cos(z);
    const up = R * Math.sin(a);

    //Local metres-per-degree.
    const mPerDegLat = 111_320;
    const mPerDegLon = 111_320 * Math.cos(this.homeLat * D);

    return {
      lon: this.homeLon + east / mPerDegLon,
      lat: this.homeLat + north / mPerDegLat,
      altitudeM: up,
    };
  }

  //Set the scrubbed time (null = live). Manages the weather refresh timer and
  //re-renders for the new selection.
  public setSelectedTime(time: Date | null): void {
    this._selectedTime = time;

    if (time === null) {
      this._clearWeatherTimer();
      //Resume the standard 10-min live refresh.
      this._weatherTimer = window.setInterval(
        () => this._refreshWeather(this._fetchLat, this._fetchLon),
        600_000
      );
    } else {
      this._clearWeatherTimer();
    }

    if (this._mapReady) {
      //Force an atmosphere refresh: the scrub would otherwise trip the "moved
      //enough" guard.
      this._lastAtmosphereAlt = -999;
      this._renderForCurrentSelection();
      //Coalesce rapid scrub moves into one shadow paint; the light visuals already
      //updated above, only the raster paint is deferred. 40 ms keeps the shadows
      //close behind the cursor while still merging a fast drag into ~25 paints/s.
      if (this._selectedTimeShadowTimer !== null) {
        window.clearTimeout(this._selectedTimeShadowTimer);
      }
      this._selectedTimeShadowTimer = window.setTimeout(() => {
        this._selectedTimeShadowTimer = null;
        this._refreshShadowsAndAtmosphere();
      }, 40);
    }
  }

  //Hourly global shortwave irradiance (W/m²) over the loaded window, as {t, v}
  //points for the chart. Drops the -1 entries the model omitted. Null before the
  //first weather fetch or when no usable sample exists.
  public getIrradianceSeries(): { t: number; v: number }[] | null {
    const home = this._homeHourlyData;
    if (!home || !home.times.length) {
      return null;
    }
    const out: { t: number; v: number }[] = [];
    for (let i = 0; i < home.times.length; i++) {
      const v = home.shortwave[i];
      if (typeof v === "number" && v >= 0) {
        out.push({ t: home.times[i].getTime(), v });
      }
    }
    return out.length ? out : null;
  }

  public updateConfig(cfg: SolarOverviewCardConfig): void {
    const prevStyleUrl = this._resolveMapStyle().url;
    const prevPixelR = this._pixelRatio();
    const prevRadius = this._buildingRadiusMeters();
    const prevCluster = this._buildingClusterRadiusMeters();
    const prevOpacity = this._buildingOpacity();
    const prevColor = this._buildingColor();
    const prevShadowOpa = this._shadowOpacity();
    const prevShadowsOn = this._shadowsEnabled();
    this.cfg = { ...cfg };

    if (!this.map) {
      return;
    }

    //Map-style change → reload the basemap. setStyle() wipes our custom sources;
    //_onStyleLoad re-adds them. Drop _mapReady while the new style is in flight.
    const nextStyleInfo = this._resolveMapStyle();
    const styleNeedsReload = nextStyleInfo.url !== prevStyleUrl;
    if (styleNeedsReload) {
      this._mapReady = false;
      this.map.setStyle(nextStyleInfo.url);
      return;
    }

    //Pixel-ratio toggle: apply in-place.
    const nextPixelR = this._pixelRatio();
    if (nextPixelR !== prevPixelR) {
      try {
        this.map.setPixelRatio(nextPixelR);
      } catch (_) {
        /* best-effort: pixel ratio update */
      }
    }

    this._applyLabelVisibility();

    //Building updates: radius/cluster changes invalidate the cached GeoJSON and
    //refetch; opacity/colour are cheap paint updates.
    const nextRadius = this._buildingRadiusMeters();
    const nextCluster = this._buildingClusterRadiusMeters();
    const nextOpacity = this._buildingOpacity();
    const nextColor = this._buildingColor();
    if (nextRadius !== prevRadius || nextCluster !== prevCluster) {
      this._buildingsData = null;
      this._buildingsFetchKey = "";
      this._addBuildings();
      if (nextRadius !== prevRadius) {
        //The display radius also drives the camera bounds + shadow fade, so
        //re-clamp and invalidate the shadow signature to resize in lockstep.
        this._applyMapBounds();
        this._lastShadowSig = undefined;
      }
    } else {
      if (
        nextOpacity !== prevOpacity &&
        this.map.getLayer("sol-buildings-surroundings")
      ) {
        this.map.setPaintProperty(
          "sol-buildings-surroundings",
          "fill-extrusion-opacity",
          nextOpacity
        );
      }
      if (nextColor !== prevColor) {
        for (const lid of [
          "sol-buildings-surroundings",
          "sol-buildings-home",
        ]) {
          if (this.map.getLayer(lid)) {
            this.map.setPaintProperty(lid, "fill-extrusion-color", nextColor);
          }
        }
      }
    }

    //Shadow opacity is a paint-level update on the raster layer.
    const nextShadowOpa = this._shadowOpacity();
    if (nextShadowOpa !== prevShadowOpa) {
      for (const lid of SHADOW_LAYER_IDS) {
        if (this.map.getLayer(lid)) {
          try {
            this.map.setPaintProperty(lid, "raster-opacity", nextShadowOpa);
          } catch (_) {
            /* best-effort: shadow raster opacity */
          }
        }
      }
    }

    //Master shadow toggle: force a fresh paint so the polygons appear or clear.
    const nextShadowsOn = this._shadowsEnabled();
    if (nextShadowsOn !== prevShadowsOn) {
      this._lastShadowSig = undefined;
      this._lastAtmosphereAlt = -999;
      this._refreshShadowsAndAtmosphere();
    }

    if (this._homeHourlyData && this._mapReady) {
      this._renderForCurrentSelection();
    }
  }

  public cleanup(): void {
    _liveEngines.delete(this);
    this._clearWeatherTimer();
    if (this._selectedTimeShadowTimer !== null) {
      window.clearTimeout(this._selectedTimeShadowTimer);
      this._selectedTimeShadowTimer = null;
    }
    window.clearInterval(this._skyTimer);
    window.clearTimeout(this._resizeDebounceTimer);
    this._fetchAbortController?.abort();
    this._buildingsAbort?.abort();
    this._shadowCanvas = undefined;
    this._arcInputsCache = undefined;
    this._lastShadowSig = undefined;
    this._resizeObserver?.disconnect();

    //Explicit + defensive teardown: map.remove() alone doesn't reliably release
    //every listener / source / WebGL context (iOS Safari leaves closures pinning
    //the dead engine and the context slot occupied; browsers cap at 8-16). Order
    //matters: detach DOM listeners, unhook our map.on() handlers, remove our
    //sources/layers, then map.remove(), then force-lose the WebGL context.

    const canvas = this._mapCanvas;

    //Step 1: canvas DOM listeners (drag-rotate, WebGL context lost/restored).
    if (this._dragRotateHandlers) {
      const h = this._dragRotateHandlers;
      h.canvas.removeEventListener("pointerdown", h.onDown);
      h.canvas.removeEventListener("pointermove", h.onMove);
      h.canvas.removeEventListener("pointerup", h.onEnd);
      h.canvas.removeEventListener("pointercancel", h.onEnd);
    }
    if (canvas && this._webglLostHandler) {
      canvas.removeEventListener("webglcontextlost", this._webglLostHandler);
    }
    if (canvas && this._webglRestoredHandler) {
      canvas.removeEventListener(
        "webglcontextrestored",
        this._webglRestoredHandler
      );
    }

    //Grab the WebGL context before map.remove() destroys it; force-lost at the end.
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      gl =
        (canvas?.getContext("webgl2") as WebGL2RenderingContext | null) ??
        (canvas?.getContext("webgl") as WebGLRenderingContext | null) ??
        null;
    } catch (_) {
      /* best-effort: webgl context probe */
    }

    //Step 2: our map.on() listeners, severed before the engine is dropped so no
    //leftover closure pins `this`.
    if (this.map) {
      try {
        if (this._mapPinHandler) {
          this.map.off("move", this._mapPinHandler);
        }
        if (this._mapStyleLoadHandler) {
          this.map.off("style.load", this._mapStyleLoadHandler);
        }
        if (this._mapLoadHandler) {
          this.map.off("load", this._mapLoadHandler);
        }
        if (this._mapMoveHandler) {
          this.map.off("move", this._mapMoveHandler);
        }
        if (this._mapMoveEndHandler) {
          this.map.off("moveend", this._mapMoveEndHandler);
        }
        if (this._mapErrorHandler) {
          this.map.off("error", this._mapErrorHandler);
        }
        if (this._mapStyleImageMissingHandler) {
          this.map.off("styleimagemissing", this._mapStyleImageMissingHandler);
        }
      } catch (_) {
        /* best-effort: event listener detach */
      }
    }

    //Step 3: remove every sol-* layer then source (removeLayer must precede
    //removeSource; MapLibre rejects removing a source still backing live layers).
    if (this.map) {
      for (const lid of [
        "sol-hillshade",
        "sol-night-shade",
        "sol-buildings-surroundings",
        "sol-buildings-home",
        "sol-buildings-home-outline",
        "sol-buildings-home-outline-glow",
        "sol-building-shadows",
        //onRemove() frees the program, quad VBO and data texture.
        "sol-weather-cloud",
      ]) {
        try {
          if (this.map.getLayer(lid)) this.map.removeLayer(lid);
        } catch (_) {
          /* best-effort: remove layer */
        }
      }
      //setTerrain(null) before removing DEM sources; MapLibre refuses to remove a
      //source still bound to live terrain.
      try {
        this.map.setTerrain(null);
      } catch (_) {
        /* best-effort: clear terrain */
      }
      for (const sid of [
        "sol-terrain",
        "sol-night-shade",
        "sol-buildings-surroundings-src",
        "sol-buildings-home-src",
        "sol-building-shadows-src",
      ]) {
        try {
          if (this.map.getSource(sid)) this.map.removeSource(sid);
        } catch (_) {
          /* best-effort: remove source */
        }
      }
    }

    //Step 4: drop heavy instance state before map.remove().
    this._buildingsData = null;
    this._buildingsFetchKey = "";
    this._homeHourlyData = null;
    this._mapCanvas = undefined;
    this._dragRotateHandlers = undefined;
    this._mapPinHandler = undefined;
    this._mapStyleLoadHandler = undefined;
    this._mapLoadHandler = undefined;
    this._mapMoveHandler = undefined;
    this._mapMoveEndHandler = undefined;
    this._mapErrorHandler = undefined;
    this._mapStyleImageMissingHandler = undefined;
    this._webglLostHandler = undefined;
    this._webglRestoredHandler = undefined;
    this.onContextLost = undefined;

    //Step 5: MapLibre teardown. Detach the canvas from its parent first so a
    //lingering reference can't keep the host (sol-card shadow root) alive.
    if (canvas && canvas.parentNode) {
      try {
        canvas.parentNode.removeChild(canvas);
      } catch (_) {
        /* best-effort: detach canvas node */
      }
    }
    this.map?.remove();
    this.map = undefined;
    this._mapReady = false;

    //Step 6: force-release the WebGL context slot; browsers don't reliably reclaim
    //it from canvas GC, and the 8-16 context cap is the dominant cause of the perf
    //drift + iOS Safari black screen after several re-inits.
    try {
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch (_) {
      /* best-effort: force WebGL context loss */
    }
  }
}
