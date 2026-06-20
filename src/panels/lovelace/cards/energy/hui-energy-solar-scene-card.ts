// Solar overview card: the ground is the CARTO basemap (Map-panel style) stitched into one
// seam-free <canvas> used as a tilted/orbiting plane via a CSS 3D transform; OpenStreetMap building
// footprints are extruded with a projection that mirrors that transform, so the whole scene turns
// together. No map/geometry library (just <canvas>, <svg>, fetch) so it runs on a Raspberry Pi 0.
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../energy/constants";
import type { SolarSceneSync, ChartTarget } from "./common/solar-scene-sync";
import { getSolarSceneSync } from "./common/solar-scene-sync";
import type { LivePower } from "./common/solar-scene-power";
import {
  forecastSeries,
  livePower,
  targetSeries,
} from "./common/solar-scene-power";
import type { EnergyData, EnergySolarForecasts } from "../../../../data/energy";
import { formatNumber } from "../../../../common/number/format_number";
import { theme2hex } from "../../../../common/color/convert-color";
import "../../../../components/ha-icon";
import "./common/hui-energy-graph-chip";
import {
  getEnergyDataCollection,
  getEnergySolarForecasts,
  getSuggestedPeriod,
} from "../../../../data/energy";
import type { StatisticValue } from "../../../../data/recorder";
import { fetchStatistics } from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { formatShortDateTime } from "../../../../common/datetime/format_date_time";

type Point = [number, number];

const DEG = Math.PI / 180;
const EARTH_CIRCUMFERENCE_M = 40075016.686;
const IDLE_W = 5; // Minimal watts value a flow must to have to be treated as idle
// Building shadows: full strength at SHADOW_FADE_DEG above the horizon, easing to nothing at the
// horizon so they fade in at sunrise and out at sunset instead of popping on/off.
const SHADOW_OPACITY = 0.26;
const SHADOW_FADE_DEG = 10;

// Solar position: azimuth from NORTH clockwise, altitude, both in degrees.
function sunPosition(date: Date, latitude: number, longitude: number) {
  const lonRad = DEG * -longitude;
  const latRad = DEG * latitude;
  const days = date.valueOf() / 86400000 - 0.5 + 2440588 - 2451545;
  const meanAnomaly = DEG * (357.5291 + 0.98560028 * days);
  const eclipticLon =
    meanAnomaly +
    DEG * (1.9148 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) +
    DEG * 102.9372 +
    Math.PI;
  const dec = Math.asin(Math.sin(DEG * 23.4397) * Math.sin(eclipticLon));
  const rightAscension = Math.atan2(
    Math.cos(DEG * 23.4397) * Math.sin(eclipticLon),
    Math.cos(eclipticLon)
  );
  const hourAngle =
    DEG * (280.16 + 360.9856235 * days) - lonRad - rightAscension;
  const altitude = Math.asin(
    Math.sin(latRad) * Math.sin(dec) +
      Math.cos(latRad) * Math.cos(dec) * Math.cos(hourAngle)
  );
  const azimuth =
    Math.atan2(
      Math.sin(hourAngle),
      Math.cos(hourAngle) * Math.sin(latRad) - Math.tan(dec) * Math.cos(latRad)
    ) + Math.PI;
  return {
    azimuth: (((azimuth / DEG) % 360) + 360) % 360,
    altitude: altitude / DEG,
  };
}

const pointsAttr = (points: Point[]) =>
  points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

// Andrew's monotone-chain convex hull (merges a footprint with its shifted copy into one shadow).
function convexHull(points: Point[]): Point[] {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const turn = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (pts: Point[]) => {
    const out: Point[] = [];
    for (const p of pts) {
      while (
        out.length >= 2 &&
        turn(out[out.length - 2], out[out.length - 1], p) <= 0
      ) {
        out.pop();
      }
      out.push(p);
    }
    out.pop();
    return out;
  };
  return half(sorted).concat(half(sorted.reverse()));
}

// Web Mercator: lon/lat: fractional tile coordinates at the given zoom.
function lonLatToTile(lon: number, lat: number, zoom: number): Point {
  const world = 2 ** zoom;
  const latRad = lat * DEG;
  const y =
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
  return [((lon + 180) / 360) * world, y * world];
}

function pointInPolygon(x: number, y: number, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i];
    const [bx, by] = polygon[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) {
      inside = !inside;
    }
  }
  return inside;
}

// Distance from the home (0,0) to a footprint, 0 when inside.
function distanceToHome(polygon: Point[]): number {
  if (pointInPolygon(0, 0, polygon)) return 0;
  let nearest = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[j];
    const dx = polygon[i][0] - ax;
    const dy = polygon[i][1] - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, (-ax * dx - ay * dy) / len2)) : 0;
    nearest = Math.min(nearest, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return nearest;
}

// Ambient colour as a pure function of the sun's altitude.
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hexByte = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);

// Blend two #rrggbb colours channel by channel; t in [0..1] runs from hexA to hexB. Kept local (no
// culori) since it runs per building per frame on Raspberry-Pi-class hardware.
function mixHex(hexA: string, hexB: string, t: number): string {
  let out = "#";
  for (let i = 1; i < 7; i += 2) {
    const a = hexByte(hexA, i);
    out += Math.round(a + (hexByte(hexB, i) - a) * t)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}

function nightShade(altitude: number): { color: string; opacity: number } {
  if (altitude < -12) return { color: "#02040c", opacity: 0.68 };
  if (altitude < -6) {
    return { color: "#040824", opacity: lerp(0.5, 0.68, (-altitude - 6) / 6) };
  }
  if (altitude < 0) {
    return { color: "#0a1240", opacity: lerp(0.5, 0.3, (altitude + 6) / 6) };
  }
  if (altitude < 6) {
    return { color: "#3a1408", opacity: lerp(0.3, 0.1, altitude / 6) };
  }
  if (altitude < 20) {
    return { color: "#3a1408", opacity: lerp(0.1, 0, (altitude - 6) / 14) };
  }
  return { color: "#000000", opacity: 0 };
}

function buildingColor(base: string, altitude: number): string {
  if (altitude < -6) return mixHex(base, "#0a0e1a", 0.85);
  const night = mixHex(base, "#0a0e1a", 0.85);
  const dusk = mixHex(base, "#2a2540", 0.55);
  const warm = mixHex(base, "#5a3220", 0.35);
  if (altitude < 0) return mixHex(night, dusk, (altitude + 6) / 6);
  if (altitude < 6) return mixHex(dusk, warm, altitude / 6);
  if (altitude < 20) return mixHex(warm, base, (altitude - 6) / 14);
  return base;
}

function tintedRgba(base: string, altitude: number, opacity: number): string {
  const hex = buildingColor(base, altitude);
  return `rgba(${hexByte(hex, 1)},${hexByte(hex, 3)},${hexByte(hex, 5)},${opacity})`;
}

// Resolve a HA CSS custom property to a #rrggbb string via HA's theme2hex (handles hex, rgb() and
// named/theme colours).
function cssHex(
  styles: CSSStyleDeclaration,
  name: string,
  fallback: string
): string {
  return theme2hex(styles.getPropertyValue(name).trim() || fallback);
}

// Sun colour along the day: grey underground, warm near the horizon, amber high up.
const arcColor = (altitude: number, amber: string): string =>
  altitude <= 0
    ? "#3a4a63"
    : altitude < 12
      ? mixHex(amber, "#ff6a00", 0.5)
      : amber;

interface Building {
  footprint: Point[]; // metres east/north relative to the home
  height: number;
  isHome: boolean;
  centerX: number;
  centerY: number; // centroid, for the back-to-front draw order
}

interface OverpassWay {
  type: string;
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}

export interface EnergySolarSceneCardConfig extends LovelaceCardConfig {
  collection_key?: string;
  ground_zoom?: number;
  ground_radius?: number;
  tilt_deg?: number;
  perspective?: number;
  target_height_m?: number;
  osm_radius_m?: number;
  home_radius_m?: number;
  default_height_m?: number;
}

const DEFAULTS = {
  ground_zoom: 19,
  ground_radius: 3, // 7x7 @256px = 1792px canvas, under the 2048 GPU limit (Pi-0 safe)
  tilt_deg: 50,
  perspective: 1200,
  target_height_m: 10, // aim 10 m above the home to open up the sky
  osm_radius_m: 100,
  home_radius_m: 15, // every building within 15 m of the GPS point is "the home"
  default_height_m: 6,
};

// Camera pitch bounds (degrees).
const TILE_PX = 256;
const PITCH_MIN = 15;
const PITCH_MAX = 55;
// Card viewport: fixed height, with a width fallback for the first frame before layout settles.
const CARD_HEIGHT_PX = 380;
const FALLBACK_WIDTH_PX = 600;
// W/m² chip placement: gutter kept from the card edges, floor below the header, and rise above the sun.
const SUN_CHIP_EDGE_PAD_PX = 4;
const SUN_CHIP_MIN_TOP_PX = 28;
const SUN_CHIP_RISE_PX = 18;
// OpenStreetMap building cache: kept 30 days; a failed mirror waits this long before the next.
const BUILDING_CACHE_TTL_MS = 30 * 86400000;
const OVERPASS_RETRY_DELAY_MS = 1200;
const DARK_FILTER =
  "invert(0.9) hue-rotate(170deg) brightness(1.3) contrast(1) saturate(0.4)";

@customElement("hui-energy-solar-scene-card")
export class HuiEnergySolarSceneCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: EnergySolarSceneCardConfig & typeof DEFAULTS;
  @state() private _instant: number | null = null;
  @state() private _period?: { start: Date; end?: Date };
  @state() private _power?: LivePower;
  @state() private _target: ChartTarget = "production";
  @state() private _energyData?: EnergyData;

  // Battery SoC sampled from its own stat fetch so the chip can follow the scrub (the energy data
  // carries no SoC). Merged mean buckets across batteries, sorted by start.
  @state() private _socBuckets: StatisticValue[] = [];

  private _socKey = "";

  // Solar forecast: when the scrubbed instant is in the future the PV chip shows the forecast value
  // (italic, low opacity), since there's no actual production yet. Fetched like the timeline does.
  @state() private _forecasts?: EnergySolarForecasts;

  private _forecastFetched = false;

  @state() private _pvPredicted = false;

  @query(".wrap") private _wrap?: HTMLElement;

  @query("#ground") private _groundHolder?: HTMLElement;

  @query(".sun-chip") private _sunChip?: HTMLElement;

  // Stacked overlay layers, filled imperatively each frame (see _draw); the z-index split lives in
  // the styles.
  @query(".l-scene") private _lScene?: SVGSVGElement;

  @query(".l-arc-back") private _lArcBack?: SVGSVGElement;

  @query(".l-arc-far") private _lArcFar?: SVGSVGElement;

  @query(".l-leaders") private _lLeaders?: SVGSVGElement;

  @query(".l-ray") private _lRay?: SVGSVGElement;

  @query(".l-arc-near") private _lArcNear?: SVGSVGElement;

  @query(".l-sun") private _lSun?: SVGSVGElement;

  private _sync?: SolarSceneSync;
  private _unsub?: () => void;
  // Initial camera: facing due south (the sun's side in the northern hemisphere) and at the lowest
  // allowed tilt (most overhead). The drag still moves freely within [PITCH_MIN, PITCH_MAX].
  private _bearing = 180;
  private _tilt = PITCH_MIN;
  private _pxPerMetre = 4;
  private _centreX = 0;
  private _centreY = 0;
  // Home colour follows the timeline target; on change it squashes (_homeGrowth 1 -> 0), swaps colour
  // while flat, then grows back (0 -> 1). _growth is the one-off load rise; the home multiplies both.
  private _homeColor = "";
  private _homeGrowth = 1;
  private _homeAnimId = 0;
  // Last home-relative leader markup, so the group (and its bead animations) is rebuilt only when the
  // flows change, not on every rotation frame.
  private _leadersHtml = "";
  private _drag?: { x: number; y: number };
  private _buildings: Building[] = [];
  private _ground?: { canvas: HTMLCanvasElement; homeX: number; homeY: number };
  private _built = false;
  private _redrawScheduled = false;
  private _growth = 0;
  private _grown = false;
  private _lastLiveMinute = -1;
  private _arcSamples?: {
    dayKey: number;
    samples: { azimuth: number; altitude: number }[];
  };

  private _palette?: {
    dark: boolean;
    home: string;
    neighbor: string;
    sun: string;
    shadow: string;
  };

  public setConfig(config: EnergySolarSceneCardConfig): void {
    this._config = { ...DEFAULTS, ...config };
    this._tilt = this._config.tilt_deg;
  }

  public getCardSize(): number {
    return 6;
  }

  // Follow the dashboard date selector like the other energy cards: its day drives the sun path.
  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._energyData = data;
        this._period = { start: data.start, end: data.end };
        this._fetchSoc();
        this._fetchForecasts();
        this._scheduleDraw();
      }),
    ];
  }

  private _resizeObserver = new ResizeObserver(() => this._scheduleDraw());

  public connectedCallback(): void {
    super.connectedCallback();
    this._resizeObserver.observe(this);
    this._connectSync();
    // Returning to the tab reconnects the card; replay the rise so it matches the energy graphs,
    // which re-animate on every tab change. (No-op on first mount: buildings aren't loaded yet.)
    this._grown = false;
    this._growth = 0;
    this._palette = undefined; // theme may have changed while the tab was hidden
    if (this._buildings.length) this._startGrowth();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver.disconnect();
    this._unsub?.();
    this._unsub = undefined;
    this._sync = undefined;
  }

  // Subscribe to the cursor shared with the timeline card: scrubbing there moves the sun here.
  private _connectSync(): void {
    if (this._sync || !this._config) return;
    this._sync = getSolarSceneSync(
      this._config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY
    );
    this._unsub = this._sync.subscribe((cursor) => {
      this._instant = cursor.instant;
      this._target = cursor.target;
      this._scheduleDraw();
    });
  }

  protected firstUpdated(): void {
    this._maybeBuild();
  }

  protected willUpdate(changed: PropertyValues): void {
    // Recolour the home to the timeline target (animated) when the target or the underlying data
    // changes, since the dominant direction of a two-curve target can flip with the data.
    if (
      (changed.has("_target") || changed.has("_energyData")) &&
      this._energyData
    ) {
      this._animateHomeColor(this._targetHomeColor());
    }
    // Resolve the live chip values before every render so they appear as soon as the energy data
    // and hass are both available, and follow the scrubbed instant (SoC included).
    if (this.hass && this._energyData) {
      const power = livePower(
        this._energyData,
        this.hass.states,
        this._instant,
        this._instant != null ? this._socAt(this._instant) : undefined
      );
      // Scrubbing into the future: nothing has been measured yet, so every chip hides except PV,
      // which shows its forecast when one is available (the carried-forward stat reading would
      // otherwise leave stale values on the grid / battery / home chips).
      const t = this._instant ?? Date.now();
      const future = t > Date.now() + 60000;
      const forecastPv = future ? this._forecastPvAt(t) : null;
      this._pvPredicted = forecastPv != null;
      this._power = future
        ? {
            pv: forecastPv,
            grid: null,
            battery: null,
            soc: null,
            home: null,
            lowCarbon: null,
          }
        : forecastPv != null
          ? { ...power, pv: forecastPv }
          : power;
    }
  }

  // Forecast PV power (W) for the hour containing a future instant, or null when none.
  private _forecastPvAt(t: number): number | null {
    if (!this._forecasts || !this._energyData || !this._period) return null;
    const series = forecastSeries(
      this._forecasts,
      this._energyData.prefs,
      this._period.start.getTime(),
      (this._period.end ?? new Date()).getTime()
    );
    const hour = new Date(t);
    hour.setMinutes(0, 0, 0);
    const ht = hour.getTime();
    for (const [ts, kw] of series) if (ts === ht) return kw * 1000;
    return null;
  }

  private async _fetchForecasts(): Promise<void> {
    const hasForecast = this._energyData?.prefs.energy_sources.some(
      (s) => s.type === "solar" && s.config_entry_solar_forecast?.length
    );
    if (!hasForecast || this._forecastFetched) return;
    this._forecastFetched = true;
    try {
      this._forecasts = await getEnergySolarForecasts(this.hass);
    } catch {
      this._forecasts = undefined;
    }
  }

  // Merged battery-SoC mean at a scrubbed instant, or null when no bucket covers it.
  private _socAt(instant: number): number | null {
    for (const b of this._socBuckets) {
      if (instant >= b.start && instant < b.end && b.mean != null) {
        return b.mean;
      }
    }
    return null;
  }

  private async _fetchSoc(): Promise<void> {
    const ids =
      this._energyData?.prefs.energy_sources.flatMap((s) =>
        s.type === "battery" && s.stat_soc ? [s.stat_soc] : []
      ) ?? [];
    if (!ids.length || !this._period) {
      this._socBuckets = [];
      return;
    }
    const start = this._period.start;
    const end = this._period.end ?? new Date();
    const key = `${ids.join(",")}|${start.getTime()}|${end.getTime()}`;
    if (key === this._socKey) return;
    this._socKey = key;
    try {
      const stats = await fetchStatistics(
        this.hass,
        start,
        end,
        ids,
        getSuggestedPeriod(start, end),
        undefined,
        ["mean"]
      );
      // Average the batteries per bucket so a multi-battery home reads one SoC, like the chip.
      const byStart: Record<number, { end: number; sum: number; n: number }> =
        {};
      for (const id of ids) {
        for (const b of stats[id] ?? []) {
          if (b.mean != null) {
            const acc = byStart[b.start] ?? { end: b.end, sum: 0, n: 0 };
            acc.sum += b.mean;
            acc.n += 1;
            byStart[b.start] = acc;
          }
        }
      }
      this._socBuckets = Object.keys(byStart)
        .map((ts): StatisticValue => {
          const k = Number(ts);
          return {
            start: k,
            end: byStart[k].end,
            mean: byStart[k].sum / byStart[k].n,
          };
        })
        .sort((a, b) => a.start - b.start);
    } catch {
      this._socBuckets = [];
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps); // SubscribeMixin subscribes to the energy collection here
    this._connectSync();
    this._maybeBuild();
    if (changedProps.has("hass") && this.hass && this._instant === null) {
      // Live mode tracks "now", which only moves the sun once a minute: skip the per-state redraws.
      const minute = Math.floor(Date.now() / 60000);
      if (minute !== this._lastLiveMinute) {
        this._lastLiveMinute = minute;
        this._scheduleDraw();
      }
    }
  }

  // Build once both setConfig and hass are available, never before.
  private _maybeBuild(): void {
    if (this._built || !this.hass || !this._config) return;
    this._built = true;
    const { latitude, longitude } = this.hass.config;
    const zoom = this._config.ground_zoom;
    this._pxPerMetre =
      (256 * 2 ** zoom) / (EARTH_CIRCUMFERENCE_M * Math.cos(latitude * DEG));
    this._buildGround(latitude, longitude, zoom);
    this._fetchBuildings(latitude, longitude);
  }

  // Stitch the basemap tiles around the home into ONE seam-free canvas.
  private async _buildGround(
    lat: number,
    lng: number,
    zoom: number
  ): Promise<void> {
    const [tileX, tileY] = lonLatToTile(lng, lat, zoom);
    const radius = this._config.ground_radius;
    const firstX = Math.floor(tileX) - radius;
    const firstY = Math.floor(tileY) - radius;
    const across = 2 * radius + 1;
    const canvas = document.createElement("canvas");
    canvas.width = across * TILE_PX;
    canvas.height = across * TILE_PX;
    canvas.className = "ground";
    const ctx = canvas.getContext("2d")!;

    const loads: Promise<void>[] = [];
    for (let col = 0; col < across; col++) {
      for (let row = 0; row < across; row++) {
        const x = firstX + col;
        const y = firstY + row;
        loads.push(
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(
                img,
                col * TILE_PX,
                row * TILE_PX,
                TILE_PX,
                TILE_PX
              );
              resolve();
            };
            img.onerror = () => resolve();
            const sub = "abcd"[(x + y) % 4];
            img.src = `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/${zoom}/${x}/${y}.png`;
          })
        );
      }
    }
    await Promise.all(loads);

    if (this._groundHolder) {
      this._groundHolder.innerHTML = "";
      this._groundHolder.appendChild(canvas);
    }
    this._ground = {
      canvas,
      homeX: (tileX - firstX) * TILE_PX,
      homeY: (tileY - firstY) * TILE_PX,
    };
    this._draw();
  }

  // Building footprints from OpenStreetMap (Overpass), cached in localStorage.
  private _cacheKey(lat: number, lng: number): string {
    return `eo-bld:${lat.toFixed(4)}:${lng.toFixed(4)}:${this._config.osm_radius_m}`;
  }

  private async _fetchBuildings(lat: number, lng: number): Promise<void> {
    try {
      const raw = localStorage.getItem(this._cacheKey(lat, lng));
      const cached = raw
        ? (JSON.parse(raw) as { time: number; buildings: Building[] })
        : null;
      if (
        cached?.buildings?.length &&
        Date.now() - cached.time < BUILDING_CACHE_TTL_MS
      ) {
        this._buildings = cached.buildings;
        this._startGrowth();
        return;
      }
    } catch {
      /* ignore corrupt cache */
    }

    const radius = this._config.osm_radius_m;
    const overpassQuery = `[out:json][timeout:25];(way["building"](around:${radius},${lat},${lng}););out geom;`;
    // Try a couple of CORS-enabled mirrors: the main one rate-limits (406) under repeated loads.
    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ];
    // Mirrors are tried in order, the second only if the first fails, so we never hammer both.
    /* eslint-disable no-await-in-loop -- retries are intentionally sequential */
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(
          endpoint + "?data=" + encodeURIComponent(overpassQuery)
        );
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { elements?: OverpassWay[] };
        const buildings = this._parseBuildings(data.elements ?? [], lat, lng);
        if (buildings.length) {
          this._buildings = buildings;
          try {
            const key = this._cacheKey(lat, lng);
            localStorage.setItem(
              key,
              JSON.stringify({ time: Date.now(), buildings })
            );
          } catch {
            /* storage quota: not fatal */
          }
          this._startGrowth();
          return;
        }
      } catch {
        await new Promise((resolve) => {
          setTimeout(resolve, OVERPASS_RETRY_DELAY_MS);
        });
      }
    }
    /* eslint-enable no-await-in-loop */
  }

  private _parseBuildings(
    ways: OverpassWay[],
    lat: number,
    lng: number
  ): Building[] {
    const perLat = 111320;
    const perLon = 111320 * Math.cos(lat * DEG);
    const buildings: Building[] = [];

    for (const way of ways) {
      if (way.type !== "way" || !way.geometry) continue;
      const footprint: Point[] = way.geometry.map((n) => [
        (n.lon - lng) * perLon,
        (n.lat - lat) * perLat,
      ]);
      if (
        footprint.length > 1 &&
        footprint[0][0] === footprint[footprint.length - 1][0]
      ) {
        footprint.pop();
      }
      if (footprint.length < 3) continue;

      // Counter-clockwise winding so back-face culling has a consistent sign.
      let signedArea = 0;
      for (let i = 0; i < footprint.length; i++) {
        const next = (i + 1) % footprint.length;
        signedArea +=
          footprint[i][0] * footprint[next][1] -
          footprint[next][0] * footprint[i][1];
      }
      if (signedArea < 0) footprint.reverse();

      const tags = way.tags ?? {};
      const levels = parseFloat(tags["building:levels"]);
      const tagged = tags.height
        ? parseFloat(tags.height)
        : Number.isFinite(levels)
          ? levels * 3
          : this._config.default_height_m;
      let centerX = 0;
      let centerY = 0;
      for (const [x, y] of footprint) {
        centerX += x;
        centerY += y;
      }
      buildings.push({
        footprint,
        height: Number.isFinite(tagged)
          ? tagged
          : this._config.default_height_m,
        isHome: distanceToHome(footprint) <= this._config.home_radius_m,
        centerX: centerX / footprint.length,
        centerY: centerY / footprint.length,
      });
    }

    if (buildings.length && !buildings.some((b) => b.isHome)) {
      let closest = buildings[0];
      for (const b of buildings) {
        if (
          b.centerX ** 2 + b.centerY ** 2 <
          closest.centerX ** 2 + closest.centerY ** 2
        ) {
          closest = b;
        }
      }
      closest.isHome = true;
    }
    return buildings.slice(0, 80);
  }

  private _activeDate(): Date {
    return new Date(this._instant ?? Date.now());
  }

  private _windowContainsNow(): boolean {
    if (!this._period) return true;
    const now = Date.now();
    return (
      now >= this._period.start.getTime() &&
      now <= (this._period.end ?? new Date()).getTime()
    );
  }

  private _backToLive(): void {
    this._sync?.setLive();
  }

  // Manual 2-axis camera drag + time scrubber.
  private _onPointerDown(ev: PointerEvent): void {
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this._drag = { x: ev.clientX, y: ev.clientY };
  }

  private _onPointerMove(ev: PointerEvent): void {
    if (!this._drag) return;
    this._bearing = (this._bearing - (ev.clientX - this._drag.x) * 0.4) % 360;
    this._tilt = Math.max(
      PITCH_MIN,
      Math.min(PITCH_MAX, this._tilt - (ev.clientY - this._drag.y) * 0.3)
    );
    this._drag = { x: ev.clientX, y: ev.clientY };
    this._scheduleDraw();
  }

  // The home colour reflects the timeline target. The dominant direction wins for a two-curve target
  // (import vs export, charge vs discharge): the larger cumulated value over the period.
  private _targetHomeColor(): string {
    const fallback = this._palette?.home ?? "#488fc2";
    if (!this._energyData) return fallback;
    const dirs = targetSeries(this._energyData, this._target);
    if (!dirs.length) return fallback;
    const sumAbs = (d: [number, number][]): number =>
      d.reduce((sum, pt) => sum + Math.abs(pt[1]), 0);
    const dominant = dirs.reduce((a, b) =>
      sumAbs(b.data) > sumAbs(a.data) ? b : a
    );
    return cssHex(getComputedStyle(this), dominant.token, fallback);
  }

  // Squash the home down, swap its colour while flattened, then grow it back up. First paint (or
  // reduced motion) just sets the colour.
  private _animateHomeColor(color: string): void {
    if (color === this._homeColor) return;
    if (
      !this._homeColor ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      this._homeColor = color;
      this._homeGrowth = 1;
      this._scheduleDraw();
      return;
    }
    const id = ++this._homeAnimId;
    const DOWN_MS = 220;
    const UP_MS = 300;
    const startedAt = Date.now();
    const tick = (): void => {
      if (id !== this._homeAnimId || !this.isConnected) return;
      const t = Date.now() - startedAt;
      if (t < DOWN_MS) {
        const x = t / DOWN_MS;
        this._homeGrowth = 1 - x * x * x; // ease-in squash, 1 -> 0
      } else if (t < DOWN_MS + UP_MS) {
        this._homeColor = color; // swapped while flat
        const x = (t - DOWN_MS) / UP_MS;
        this._homeGrowth = 1 - (1 - x) ** 3; // ease-out grow, 0 -> 1
      } else {
        this._homeColor = color;
        this._homeGrowth = 1;
        this._scheduleDraw();
        return;
      }
      this._scheduleDraw();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private _onPointerUp(): void {
    this._drag = undefined;
  }

  // Coalesce redraws to one per animation frame (pointermove fires far above 60 Hz).
  private _scheduleDraw(): void {
    if (this._redrawScheduled) return;
    this._redrawScheduled = true;
    requestAnimationFrame(() => {
      this._redrawScheduled = false;
      this._draw();
    });
  }

  // Buildings rise from the ground to their real height on first load, over the same 500 ms the
  // page's energy charts animate in (cubicOut), and instant when reduced motion is requested.
  private _startGrowth(): void {
    if (this._grown) return;
    this._grown = true;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      this._growth = 1;
      this._scheduleDraw();
      return;
    }
    const startedAt = Date.now();
    const tick = (): void => {
      if (!this.isConnected) return;
      const t = Math.min(1, (Date.now() - startedAt) / 500);
      this._growth = 1 - (1 - t) ** 3;
      this._scheduleDraw();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Project (east, north, up) metres to screen px: bearing, then pitch, then perspective. Mirrors
  // the ground canvas's CSS transform so everything stays glued together as the camera turns.
  private _project3(
    eastM: number,
    northM: number,
    upM: number
  ): { x: number; y: number; depth: number } {
    const bearing = this._bearing * DEG;
    const tilt = this._tilt * DEG;
    const x = eastM * this._pxPerMetre;
    const y = -northM * this._pxPerMetre;
    const z = upM * this._pxPerMetre;
    const rx = x * Math.cos(bearing) - y * Math.sin(bearing);
    const ry = x * Math.sin(bearing) + y * Math.cos(bearing);
    const cameraZ = ry * Math.sin(tilt) + z * Math.cos(tilt);
    const p = this._config.perspective / (this._config.perspective - cameraZ);
    return {
      x: this._centreX + rx * p,
      y: this._centreY + (ry * Math.cos(tilt) - z * Math.sin(tilt)) * p,
      depth: cameraZ,
    };
  }

  private _project(eastM: number, northM: number, upM: number): Point {
    const p = this._project3(eastM, northM, upM);
    return [p.x, p.y];
  }

  private _draw(): void {
    if (!this._wrap || !this._lScene) return;
    // Layers are sized by CSS and carry no viewBox, so user units equal px and the projected
    // coordinates (computed below in px) map 1:1.
    const width = this._wrap.clientWidth || FALLBACK_WIDTH_PX;
    const height = this._wrap.clientHeight || CARD_HEIGHT_PX;

    const tilt = this._tilt * DEG;
    const persp = this._config.perspective;
    const targetPx = this._config.target_height_m * this._pxPerMetre;
    this._centreX = width / 2;
    this._centreY =
      height / 2 +
      targetPx * Math.sin(tilt) * (persp / (persp - targetPx * Math.cos(tilt)));

    const dark = !!this.hass.themes?.darkMode;
    this.style.setProperty("--map-filter", dark ? DARK_FILTER : "none");
    // Theme colours change rarely; resolve them once per theme instead of every frame.
    if (this._palette?.dark !== dark) {
      const styles = getComputedStyle(this);
      this._palette = {
        dark,
        home: cssHex(styles, "--energy-grid-consumption-color", "#488fc2"),
        neighbor: cssHex(styles, "--primary-text-color", "#dddddd"),
        sun: cssHex(styles, "--warning-color", "#ffc107"),
        shadow: cssHex(styles, "--shadow-color", "#000000"),
      };
    }
    if (this._ground) {
      const { canvas, homeX, homeY } = this._ground;
      canvas.style.transformOrigin = `${homeX}px ${homeY}px`;
      canvas.style.transform = `translate(${this._centreX - homeX}px, ${this._centreY - homeY}px) rotateX(${this._tilt}deg) rotateZ(${this._bearing}deg)`;
    }

    const { latitude, longitude } = this.hass.config;
    const date = this._activeDate();
    const sun = sunPosition(date, latitude, longitude);
    const palette = this._palette!;

    // Anchor the energy chips to the home's projected position via CSS vars (they keep a fixed
    // screen offset from it), and draw the leader lines connecting each chip back to the home.
    const home = this._project(0, 0, 0);
    this.style.setProperty("--home-x", `${home[0].toFixed(1)}px`);
    this.style.setProperty("--home-y", `${home[1].toFixed(1)}px`);

    const sky = this._renderSky(sun, date, width, height, palette);
    // Bottom-up: the 3D scene (night shade, shadows, buildings) under the depth-split arc and sun.
    this._lScene.innerHTML =
      this._renderNightShade(sun.altitude, width, height) +
      this._renderShadows(sun, palette.shadow) +
      this._renderBuildings(sun.altitude, palette);
    if (this._lArcBack) this._lArcBack.innerHTML = sky.arcBack;
    if (this._lArcFar) this._lArcFar.innerHTML = sky.arcFar;
    if (this._lLeaders) {
      // Rebuild the (home-relative) leader content only when it actually changes, then just translate
      // the group to the home each frame. Recreating the bead elements every rotation frame is what
      // made them flicker; this keeps their animations alive.
      const leaders = this._renderLeaders();
      if (leaders !== this._leadersHtml) {
        this._leadersHtml = leaders;
        this._lLeaders.innerHTML = leaders ? `<g>${leaders}</g>` : "";
      }
      const g = this._lLeaders.firstElementChild;
      if (g) {
        g.setAttribute(
          "transform",
          `translate(${home[0].toFixed(1)},${home[1].toFixed(1)})`
        );
      }
    }
    if (this._lRay) this._lRay.innerHTML = sky.ray;
    if (this._lArcNear) this._lArcNear.innerHTML = sky.arcNear;
    if (this._lSun) {
      this._lSun.innerHTML = sky.sun;
      this._lSun.classList.toggle("is-near", sky.sunNear);
      this._lSun.classList.toggle("is-far", !sky.sunNear);
    }
  }

  // Leaders from each present chip to the home: an L-path (or a straight leg) in the metric's colour
  // with a bead riding it at a speed proportional to the live power. The stacked low-carbon / SoC
  // chips link to the chip below with a static hairline. Built relative to the home at the origin
  // (0,0): the chip offsets are fixed screen px, so the whole leader group only TRANSLATES as the
  // camera turns. _draw moves it with a <g> transform instead of rebuilding it, so the bead
  // animations are never recreated mid-rotation (which made them flicker).
  private _renderLeaders(): string {
    const p = this._power;
    if (!p) return "";
    const hx = 0;
    const hy = 0;
    // Cluster geometry (must mirror the .chip CSS transforms).
    const LIFT = 28;
    const SIDE = 84;
    const HALF_GAP = 30; // CHIP_STACK_GAP_PX / 2
    const PV_OFF = 70;
    const PILL_H = 14; // home / battery pill half height
    const PILL_QX = 13;
    const FILLET = 12;
    const PV_HW = 28;
    const PV_HH = 11;
    const LEADER_NUDGE = 22; // run a leader this far from its chip before turning toward the home
    const LC_GAP = 16; // gap from the low-carbon chip down into the grid chip it feeds
    const CHARGE_DOCK = 30; // horizontal inset where the PV -> Power charge leader meets the chip
    // Home pill mirrors the PV chip: centred, the same distance below the cluster as PV sits above.
    const homeX = hx;
    const homeY = hy - LIFT + PV_OFF;
    const pvX = hx;
    const pvY = hy - LIFT - PV_OFF;
    const powerX = hx + SIDE;
    const powerY = hy - LIFT - HALF_GAP;
    const socX = hx + SIDE;
    const socY = hy - LIFT + HALF_GAP;
    const gridX = hx - SIDE;
    const gridY = hy - LIFT + HALF_GAP;
    const lcX = hx - SIDE;
    const lcY = hy - LIFT - HALF_GAP;

    const dur = (w: number): number =>
      Math.max(0.6, Math.min(6, (5000 / Math.max(50, Math.abs(w))) * 0.8));
    const beaded = (path: string, color: string, w: number): string =>
      `<path class="chip-leader" style="stroke:${color}" fill="none" d="${path}"/>` +
      (Math.abs(w) > IDLE_W
        ? `<circle class="leader-bead" r="3" fill="${color}"><animateMotion dur="${dur(w).toFixed(2)}s" repeatCount="indefinite" path="${path}"/></circle>`
        : "");
    const plain = (path: string, color: string): string =>
      `<path class="chip-leader" style="stroke:${color}" fill="none" d="${path}"/>`;
    // Rounded L from a chip to the home pill: horizontal leg, fillet, vertical leg to the pill edge.
    const lToHome = (cx: number, cy: number, nudge: number): string => {
      const dirH = homeX > cx ? 1 : -1;
      const dirV = homeY > cy ? 1 : -1;
      const sx = cx + dirH * nudge;
      const ex = homeX - dirH * PILL_QX;
      const ey = homeY - dirV * PILL_H;
      const r = Math.min(FILLET, Math.abs(ex - sx) / 2, Math.abs(ey - cy) / 2);
      const preX = ex - dirH * r;
      const postY = cy + dirV * r;
      return `M ${sx.toFixed(1)},${cy.toFixed(1)} L ${preX.toFixed(1)},${cy.toFixed(1)} Q ${ex.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${postY.toFixed(1)} L ${ex.toFixed(1)},${ey.toFixed(1)}`;
    };
    // Rounded L between two points, vertical leg first.
    const lVFirst = (
      sx: number,
      sy: number,
      ex: number,
      ey: number
    ): string => {
      const dirH = ex > sx ? 1 : -1;
      const dirV = ey > sy ? 1 : -1;
      const r = Math.min(FILLET, Math.abs(ex - sx) / 2, Math.abs(ey - sy) / 2);
      const preY = ey - dirV * r;
      const postX = sx + dirH * r;
      return `M ${sx.toFixed(1)},${sy.toFixed(1)} L ${sx.toFixed(1)},${preY.toFixed(1)} Q ${sx.toFixed(1)},${ey.toFixed(1)} ${postX.toFixed(1)},${ey.toFixed(1)} L ${ex.toFixed(1)},${ey.toFixed(1)}`;
    };

    const solar = "var(--energy-solar-color)";
    let s = "";
    // PV -> home: straight drop down the centre into the home pill (PV and home share the centre x).
    // Gated on the home chip too: in forecast-only futures the PV chip stands alone, so its leader
    // would otherwise dangle to an absent home.
    if (p.pv != null && p.home != null) {
      s += beaded(
        `M ${pvX.toFixed(1)},${(pvY + PV_HH).toFixed(1)} L ${homeX.toFixed(1)},${(homeY - PILL_H).toFixed(1)}`,
        solar,
        p.pv
      );
    }
    // Grid -> home: rounded L from the bottom-left into the home pill.
    if (p.grid != null) {
      s += beaded(
        lToHome(gridX, gridY, LEADER_NUDGE),
        p.grid >= 0
          ? "var(--energy-grid-consumption-color)"
          : "var(--energy-grid-return-color)",
        p.grid
      );
    }
    // Low-carbon -> grid: straight vertical down into the grid chip below it.
    if (p.lowCarbon != null) {
      s += plain(
        `M ${lcX.toFixed(1)},${(lcY + LC_GAP).toFixed(1)} L ${gridX.toFixed(1)},${(gridY - LC_GAP).toFixed(1)}`,
        "var(--energy-non-fossil-color)"
      );
    }
    // Battery: SoC links to the Power chip above it with a static hairline (a level, not a flow);
    // PV feeds Power while charging, SoC feeds home while discharging.
    if (p.battery != null) {
      const battColor =
        p.battery >= 0
          ? "var(--energy-battery-out-color)"
          : "var(--energy-battery-in-color)";
      s += plain(
        `M ${socX.toFixed(1)},${(socY - PILL_H).toFixed(1)} L ${powerX.toFixed(1)},${(powerY + PILL_H).toFixed(1)}`,
        "var(--energy-battery-out-color)"
      );
      if (p.battery < -IDLE_W) {
        // Charging: PV -> Power chip, drop then right.
        s += beaded(
          lVFirst(pvX + PV_HW / 2, pvY + PV_HH, powerX - CHARGE_DOCK, powerY),
          solar,
          p.battery
        );
      } else if (p.battery > IDLE_W) {
        // Discharging: SoC -> home.
        s += beaded(lToHome(socX, socY, LEADER_NUDGE), battColor, p.battery);
      }
    }
    return s;
  }

  private _renderNightShade(
    altitude: number,
    width: number,
    height: number
  ): string {
    const shade = nightShade(altitude);
    return shade.opacity > 0
      ? `<rect width="${width}" height="${height}" fill="${shade.color}" opacity="${shade.opacity.toFixed(3)}"/>`
      : "";
  }

  // Every footprint casts a shadow; one group-opacity flattens overlaps into a single even shade
  // (no double-darkening) without a polygon-union dependency, composited on the GPU. The fill is the
  // theme shadow colour (opaque so the group opacity, not per-polygon overlap, sets the shade).
  private _renderShadows(
    sun: { azimuth: number; altitude: number },
    shadow: string
  ): string {
    // Ramp the shade in over the first degrees of altitude so sunrise/sunset fades rather than snaps.
    const fade = Math.min(1, sun.altitude / SHADOW_FADE_DEG);
    if (fade <= 0) return "";
    const away = (sun.azimuth + 180) * DEG;
    let inner = "";
    for (const b of this._buildings) {
      const length = Math.min(b.height / Math.tan(sun.altitude * DEG), 50);
      const oe = Math.sin(away) * length;
      const on = Math.cos(away) * length;
      const base = b.footprint.map((p) => this._project(p[0], p[1], 0));
      const cast = b.footprint.map((p) =>
        this._project(p[0] + oe, p[1] + on, 0)
      );
      inner += `<polygon points="${pointsAttr(convexHull([...base, ...cast]))}" fill="${shadow}"/>`;
    }
    return inner
      ? `<g opacity="${(SHADOW_OPACITY * fade).toFixed(3)}">${inner}</g>`
      : "";
  }

  private _renderBuildings(
    altitude: number,
    palette: { home: string; neighbor: string }
  ): string {
    const bearing = this._bearing * DEG;
    const order = this._buildings
      .map((b, index) => ({
        index,
        depth: this._project(b.centerX, b.centerY, 0)[1],
      }))
      .sort((a, b) => a.depth - b.depth);

    let svg = "";
    for (const { index } of order) {
      const b = this._buildings[index];
      // The home also rides _homeGrowth (the target-colour squash/grow); neighbours only the load rise.
      const grow = b.isHome ? this._growth * this._homeGrowth : this._growth;
      const homeColor = this._homeColor || palette.home;
      const base = b.footprint.map((p) => this._project(p[0], p[1], 0));
      const roof = b.footprint.map((p) =>
        this._project(p[0], p[1], b.height * grow)
      );
      const roofFill = tintedRgba(
        b.isHome ? mixHex(homeColor, "#ffffff", 0.18) : palette.neighbor,
        altitude,
        b.isHome ? 0.92 : 0.16
      );
      const wallFill = tintedRgba(
        b.isHome ? mixHex(homeColor, "#000000", 0.22) : palette.neighbor,
        altitude,
        b.isHome ? 0.9 : 0.11
      );
      // Neighbour edges follow the theme (derived from the same palette colour as their fill) so they
      // stay legible in both light and dark; the home keeps a fixed dark outline for definition.
      const stroke = b.isHome
        ? "rgba(0,0,0,0.3)"
        : tintedRgba(palette.neighbor, altitude, 0.16);

      const walls: { depth: number; svg: string }[] = [];
      for (let i = 0; i < base.length; i++) {
        const next = (i + 1) % base.length;
        // back-face cull: drop walls whose outward normal faces away from the camera
        const edgeE = b.footprint[next][0] - b.footprint[i][0];
        const edgeN = b.footprint[next][1] - b.footprint[i][1];
        if (edgeN * Math.sin(bearing) + edgeE * Math.cos(bearing) <= 0) {
          continue;
        }
        walls.push({
          depth: (base[i][1] + base[next][1]) / 2,
          svg: `<polygon points="${pointsAttr([base[i], base[next], roof[next], roof[i]])}" fill="${wallFill}" stroke="${stroke}" stroke-width="0.4"/>`,
        });
      }
      walls.sort((w1, w2) => w1.depth - w2.depth);
      svg += walls.map((w) => w.svg).join("");
      svg += `<polygon points="${pointsAttr(roof)}" fill="${roofFill}" stroke="${stroke}" stroke-width="0.6"/>`;
    }
    return svg;
  }

  // Sun path on a dome around the home: depth-modulated stroke (far
  // thin, near thick), dark outline under a sun-colour pass, dotted underground leg, and a
  // four-layer disc whose inner fill and halo scale with (clear-sky) irradiance.
  private _renderSky(
    sun: { azimuth: number; altitude: number },
    date: Date,
    width: number,
    height: number,
    palette: { sun: string }
  ): {
    arcBack: string;
    arcFar: string;
    arcNear: string;
    ray: string;
    sun: string;
    sunNear: boolean;
  } {
    const { latitude, longitude } = this.hass.config;
    const DRAW_ALT = -12; // draw a short dotted dip below the horizon

    // World-space arc: a celestial dome of radius R metres around the home, projected
    // through the same perspective as the buildings. R is scaled so the projected arc fills ~0.41
    // of the smaller side; the scale comes from an 8-direction probe whose MAX projected distance
    // is the ellipse's semi-major axis, invariant to the camera bearing, so the arc keeps a
    // constant size as the camera rotates (only resize / zoom changes it).
    const home = this._project3(0, 0, 0);
    let pxPerM = this._pxPerMetre;
    let maxDist = 0;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 2 * Math.PI;
      const p = this._project3(60 * Math.sin(a), 60 * Math.cos(a), 0);
      maxDist = Math.max(maxDist, Math.hypot(p.x - home.x, p.y - home.y));
    }
    if (maxDist > 0) pxPerM = maxDist / 60;
    const ARC_R_M = 40;
    const scale = Math.max(
      0.72,
      Math.min((0.47 * Math.min(width, height)) / pxPerM / ARC_R_M, 6)
    );
    const R = ARC_R_M * scale;
    const dome = (azimuth: number, altitude: number) =>
      this._project3(
        R * Math.cos(altitude * DEG) * Math.sin(azimuth * DEG),
        R * Math.cos(altitude * DEG) * Math.cos(azimuth * DEG),
        R * Math.sin(altitude * DEG)
      );

    // The day's celestial samples depend only on the date, not the camera: cache them so rotating
    // and scrubbing within a day re-project cached angles instead of recomputing sunPosition 96x.
    const midnight = new Date(date);
    midnight.setHours(0, 0, 0, 0);
    const dayKey = midnight.valueOf();
    if (this._arcSamples?.dayKey !== dayKey) {
      const samples: { azimuth: number; altitude: number }[] = [];
      for (let minute = 0; minute <= 1440; minute += 15) {
        samples.push(
          sunPosition(new Date(dayKey + minute * 60000), latitude, longitude)
        );
      }
      this._arcSamples = { dayKey, samples };
    }
    const pts = this._arcSamples.samples.map((at) => ({
      ...dome(at.azimuth, at.altitude),
      alt: at.altitude,
    }));
    const s = dome(sun.azimuth, sun.altitude);

    // One shared perspective ramp: nearness = 1 at the nearest point (max camera depth), 0 at the
    // furthest, across the whole arc plus the sun, so stroke widths and disc size stay consistent.
    let dMin = Infinity;
    let dMax = -Infinity;
    for (const p of pts) {
      dMin = Math.min(dMin, p.depth);
      dMax = Math.max(dMax, p.depth);
    }
    dMin = Math.min(dMin, s.depth);
    dMax = Math.max(dMax, s.depth);
    const dRange = dMax - dMin || 1;
    const near = (d: number) => (d - dMin) / dRange;

    // Three depth buckets so the arc passes BEHIND the home cluster on its far side and IN FRONT on
    // its near side, exactly like the standalone Helios card: below-horizon segments go to the BACK
    // layer (dotted underside), above-horizon segments split at the nearness midpoint into FAR
    // (behind the chips) and NEAR (over the chips). Two passes within each bucket (dark outlines,
    // then coloured segments) so every layer keeps a continuous rim.
    let backOut = "";
    let backSeg = "";
    let farOut = "";
    let farSeg = "";
    let nearOut = "";
    let nearSeg = "";
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (a.alt < DRAW_ALT || b.alt < DRAW_ALT) continue;
      const n = (near(a.depth) + near(b.depth)) / 2;
      const night = a.alt <= 0 && b.alt <= 0;
      const factor = night ? 0.5 : 1;
      const ow = (1.5 + 3.5 * n) * factor;
      const sw = (1 + 3 * n) * factor;
      const cls = night ? " solar-arc-night" : "";
      const coords = `x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"`;
      const outline = `<line class="solar-arc-outline${cls}" ${coords} stroke-width="${ow.toFixed(2)}"/>`;
      const segment = `<line class="solar-arc-segment${cls}" ${coords} stroke="${arcColor((a.alt + b.alt) / 2, palette.sun)}" stroke-width="${sw.toFixed(2)}"/>`;
      if (night) {
        backOut += outline;
        backSeg += segment;
      } else if (n >= 0.5) {
        nearOut += outline;
        nearSeg += segment;
      } else {
        farOut += outline;
        farSeg += segment;
      }
    }
    const arcBack = backOut + backSeg;
    const arcFar = farOut + farSeg;
    const arcNear = nearOut + nearSeg;

    const sunX = s.x;
    const sunY = s.y;
    const wm2 = Math.max(0, 1000 * Math.sin(Math.max(0, sun.altitude) * DEG));
    const fill = Math.sqrt(Math.min(1, wm2 / 1000));
    const r = (10 + 10 * near(s.depth)) * scale;
    const day = sun.altitude > -2;
    // The ray docks on the nearest point of the PV chip's pill outline, gliding along it as
    // the sun arcs; with no PV chip it goes to the home. A bead rides it, paced by irradiance.
    let rayX = home.x;
    let rayY = home.y;
    if (this._power?.pv != null) {
      const cx = home.x;
      const cy = home.y - 98; // PV chip centre (cluster lift 28 + PV offset 70)
      const halfW = 44;
      const halfH = 14;
      const straightHalfW = Math.max(0, halfW - halfH);
      const ex = sunX - cx;
      const ey = sunY - cy;
      if (Math.abs(ex) <= straightHalfW) {
        rayX = sunX;
        rayY = cy + (ey >= 0 ? 1 : -1) * halfH;
      } else {
        const cornerX = cx + (ex >= 0 ? 1 : -1) * straightHalfW;
        const dx = sunX - cornerX;
        const dy = sunY - cy;
        const dist = Math.hypot(dx, dy) || 1;
        rayX = cornerX + (halfH * dx) / dist;
        rayY = cy + (halfH * dy) / dist;
      }
    }
    const rayDur = (1.6 - fill).toFixed(2);
    const ray =
      day && fill > 0
        ? `<line class="solar-ray" style="--sun-flow-duration:${rayDur}s" x1="${sunX.toFixed(1)}" y1="${sunY.toFixed(1)}" x2="${rayX.toFixed(1)}" y2="${rayY.toFixed(1)}" stroke="${palette.sun}"/>` +
          `<circle class="leader-bead" r="3" fill="${palette.sun}"><animateMotion dur="${rayDur}s" repeatCount="indefinite" path="M ${sunX.toFixed(1)},${sunY.toFixed(1)} L ${rayX.toFixed(1)},${rayY.toFixed(1)}"/></circle>`
        : "";
    this._positionSunChip(sunX, sunY, Math.round(wm2), day);
    // The disc inherits the arc's depth split: far half under the chips (z 5), near half over
    // everything but the W/m² readout (z 12).
    const sunNear = near(s.depth) >= 0.5;
    const c = `cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}"`;
    const sunSvg = `
      <defs><radialGradient id="solar-halo">
        <stop offset="0%" stop-color="${palette.sun}" stop-opacity="${(fill * 0.55).toFixed(3)}"/>
        <stop offset="100%" stop-color="${palette.sun}" stop-opacity="0"/>
      </radialGradient></defs>
      <circle ${c} r="${(r * 3).toFixed(1)}" fill="url(#solar-halo)"/>
      <circle ${c} r="${r.toFixed(1)}" fill="${palette.sun}" fill-opacity="0.2"/>
      <circle ${c} r="${(r * fill).toFixed(1)}" fill="${palette.sun}"/>
      <circle ${c} r="${r.toFixed(1)}" fill="none" stroke="${palette.sun}" stroke-width="1.5"/>`;
    return { arcBack, arcFar, arcNear, ray, sun: sunSvg, sunNear };
  }

  private _positionSunChip(
    x: number,
    y: number,
    wm2: number,
    visible: boolean
  ): void {
    const chip = this._sunChip;
    if (!chip) return;
    chip.hidden = !visible;
    if (!visible) return;
    const value = chip.querySelector("span");
    if (value) value.textContent = `${wm2} W/m²`;
    // Safety net: keep the chip on screen even if the sun reaches a corner.
    const w = this._wrap?.clientWidth ?? 0;
    const half = chip.offsetWidth / 2 + SUN_CHIP_EDGE_PAD_PX;
    chip.style.left = `${w ? Math.max(half, Math.min(w - half, x)) : x}px`;
    chip.style.top = `${Math.max(SUN_CHIP_MIN_TOP_PX, y - SUN_CHIP_RISE_PX)}px`;
  }

  // One decimal for kW, whole watts below: deliberately tighter than formatPowerShort (3 decimals) so
  // the compact chips stay glanceable.
  private _fmtPower(w: number): string {
    return Math.abs(w) >= 1000
      ? `${formatNumber(w / 1000, this.hass.locale, { maximumFractionDigits: 1 })} kW`
      : `${Math.round(w)} W`;
  }

  private _chip(
    key: string,
    icon: string,
    color: string,
    value: string,
    target: ChartTarget | null,
    predicted = false
  ) {
    return html`<div
      class="chip ${key} ${target ? "clickable" : ""} ${target &&
      this._target === target
        ? "is-active"
        : ""} ${predicted ? "is-predicted" : ""}"
      style="--chip-color:${color}"
      role=${target ? "button" : nothing}
      data-target=${target ?? nothing}
      @click=${this._chipClick}
    >
      <ha-icon icon=${icon}></ha-icon>
      <span>${value}</span>
    </div>`;
  }

  private _chipClick(ev: Event): void {
    const target = (ev.currentTarget as HTMLElement).dataset
      .target as ChartTarget;
    if (target) this._sync?.setTarget(target);
  }

  // Energy chips ringed around the home, each in its metric colour; clicking retargets the timeline.
  private _renderChips() {
    const p = this._power;
    if (!p) return nothing;
    return html`
      ${p.home != null
        ? this._chip(
            "home",
            "mdi:home",
            "var(--primary-color)",
            this._fmtPower(p.home),
            "home"
          )
        : nothing}
      ${p.pv != null
        ? this._chip(
            "pv",
            "mdi:solar-power",
            "var(--energy-solar-color)",
            this._fmtPower(p.pv),
            "production",
            this._pvPredicted
          )
        : nothing}
      ${p.grid != null
        ? this._chip(
            "grid",
            p.grid >= 0
              ? "mdi:transmission-tower-import"
              : "mdi:transmission-tower-export",
            p.grid >= 0
              ? "var(--energy-grid-consumption-color)"
              : "var(--energy-grid-return-color)",
            this._fmtPower(Math.abs(p.grid)),
            "grid"
          )
        : nothing}
      ${p.lowCarbon != null
        ? this._chip(
            "lowcarbon",
            "mdi:leaf",
            "var(--energy-non-fossil-color)",
            this._fmtPower(p.lowCarbon),
            "lowcarbon"
          )
        : nothing}
      ${p.battery != null
        ? this._chip(
            "battery",
            "mdi:lightning-bolt",
            p.battery >= 0
              ? "var(--energy-battery-out-color)"
              : "var(--energy-battery-in-color)",
            this._fmtPower(Math.abs(p.battery)),
            "battery"
          )
        : nothing}
      ${p.soc != null
        ? this._chip(
            "soc",
            "mdi:battery",
            "var(--energy-battery-out-color)",
            `${Math.round(p.soc)} %`,
            "battery-soc"
          )
        : nothing}
    `;
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    return html`
      <ha-card>
        <div class="wrap">
          <div class="title">${this._config.title}</div>
          <div class="chip-row">
            ${this._instant !== null && this._windowContainsNow()
              ? html`<button
                  class="live-chip"
                  title="Back to live"
                  @click=${this._backToLive}
                >
                  <hui-energy-graph-chip>
                    <ha-icon icon="mdi:restore"></ha-icon>
                  </hui-energy-graph-chip>
                </button>`
              : nothing}
            <hui-energy-graph-chip>
              ${formatShortDateTime(
                this._activeDate(),
                this.hass.locale,
                this.hass.config
              )}
            </hui-energy-graph-chip>
          </div>
          <div class="viewport"><div id="ground"></div></div>
          <svg class="layer l-scene" xmlns="http://www.w3.org/2000/svg"></svg>
          <svg
            class="layer l-arc-back"
            xmlns="http://www.w3.org/2000/svg"
          ></svg>
          <svg class="layer l-arc-far" xmlns="http://www.w3.org/2000/svg"></svg>
          <svg class="layer l-leaders" xmlns="http://www.w3.org/2000/svg"></svg>
          <svg class="layer l-ray" xmlns="http://www.w3.org/2000/svg"></svg>
          <svg
            class="layer l-arc-near"
            xmlns="http://www.w3.org/2000/svg"
          ></svg>
          <svg
            class="layer l-sun is-far"
            xmlns="http://www.w3.org/2000/svg"
          ></svg>
          <div class="sun-chip" hidden>
            <ha-icon icon="mdi:white-balance-sunny"></ha-icon>
            <span></span>
          </div>
          ${this._renderChips()}
          <div
            class="drag"
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @pointercancel=${this._onPointerUp}
          ></div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .wrap {
      position: relative;
      width: 100%;
      height: ${CARD_HEIGHT_PX}px;
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      background: linear-gradient(#0c1d33 0%, #14283f 45%, #0b1622 100%);
      /* Own stacking context so the depth-split z-index children (arc, sun, chips up to z 14) stay
         scoped to the card and never escape above the HA header on scroll. */
      isolation: isolate;
    }
    .title {
      position: absolute;
      top: 12px;
      left: 16px;
      z-index: 14;
      color: var(--primary-text-color);
      font-size: var(--ha-card-header-font-size, var(--ha-font-size-2xl, 24px));
      line-height: 1.2;
      pointer-events: none;
    }
    .chip-row {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 14;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .live-chip {
      appearance: none;
      -webkit-appearance: none;
      border: none;
      background: none;
      padding: 0;
      margin: 0;
      cursor: pointer;
      font: inherit;
      color: inherit;
      display: inline-flex;
      align-items: center;
    }
    /* Size the icon to exactly one line of the chip's text (font-size-m x line-height-normal) so the
       icon-only Live button is the same height as the text date chip beside it. */
    .live-chip ha-icon {
      --mdc-icon-size: calc(
        var(--ha-font-size-m) * var(--ha-line-height-normal)
      );
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .viewport {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
    }
    /* perspective must be on the canvas's DIRECT parent, else it flattens and the ground renders
       orthographic while buildings stay in perspective (they slide apart on rotation) */
    #ground {
      position: absolute;
      inset: 0;
      perspective: 1200px;
      perspective-origin: 50% 50%;
    }
    .ground {
      position: absolute;
      left: 0;
      top: 0;
      transform-origin: center center;
      will-change: transform;
      filter: var(--map-filter, none);
    }
    /* The scene is split into stacked SVG layers so the solar arc and disc pass BEHIND the home
       cluster on their far side and IN FRONT on their near side, identically to the standalone Helios
       card. Buildings/shadows sit at the bottom (z 1); the arc splits into back (z 4, the dotted
       below-horizon underside), far (z 5, behind the chips) and near (z 11, over the chips); leaders
       ride at z 5 (the chip pill occludes their endpoints), the sun-to-PV ray at z 7 (below the chips
       so the chip background occludes its endpoint), the chips at z 8 (home hub z 9), the sun disc at
       z 5 when far / z 12 when near, and the W/m² readout last at z 13. */
    /* width/height 100% (not just inset:0): an SVG is a replaced element, so without an explicit size
       and without a viewBox it keeps its tiny intrinsic size and clips the scene to the top-left. The
       px coordinates we draw then map 1:1 onto the filled box. */
    .layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .l-scene {
      z-index: 1;
    }
    .l-arc-back {
      z-index: 4;
    }
    .l-arc-far {
      z-index: 5;
    }
    .l-leaders {
      z-index: 5;
    }
    .l-ray {
      z-index: 7;
    }
    .l-arc-near {
      z-index: 11;
    }
    .l-sun.is-far {
      z-index: 5;
    }
    .l-sun.is-near {
      z-index: 12;
    }
    .drag {
      position: absolute;
      inset: 0;
      z-index: 1;
      cursor: grab;
      touch-action: none;
    }
    .drag:active {
      cursor: grabbing;
    }
    .solar-arc-outline {
      stroke: rgba(0, 0, 0, 0.35);
      stroke-linecap: round;
    }
    .solar-arc-segment {
      stroke-linecap: round;
    }
    .solar-arc-night {
      stroke-linecap: round;
      stroke-dasharray: 0 8;
      stroke-opacity: 0.45;
    }
    .solar-arc-night.solar-arc-outline {
      stroke-opacity: 0.25;
    }
    .solar-ray {
      stroke-width: 1.5;
      stroke-dasharray: 5 6;
      stroke-opacity: 0.6;
      stroke-linecap: round;
      animation: solar-ray-flow var(--sun-flow-duration, 1.2s) linear infinite;
    }
    @keyframes solar-ray-flow {
      from {
        stroke-dashoffset: 0;
      }
      to {
        stroke-dashoffset: -11;
      }
    }
    .sun-chip {
      position: absolute;
      z-index: 13;
      transform: translate(-50%, -100%);
      pointer-events: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border: 2px solid var(--warning-color, #ffc107);
      border-radius: 999px;
      padding: 3px 10px;
      font-size: var(--ha-font-size-s, 12px);
      font-weight: 600;
      line-height: 1.2;
      font-variant-numeric: tabular-nums;
      box-shadow: 0 1px 3px var(--shadow-color, rgba(0, 0, 0, 0.3));
      white-space: nowrap;
    }
    .sun-chip[hidden] {
      display: none;
    }
    .sun-chip ha-icon {
      --mdc-icon-size: 16px;
      color: inherit;
    }
    /* Energy chips: same pill recipe as hui-energy-graph-chip, bordered in the metric colour, and
       anchored to the home via the --home-x / --home-y vars with a fixed per-chip screen offset. */
    .chip {
      position: absolute;
      left: var(--home-x, 50%);
      top: var(--home-y, 50%);
      z-index: 8;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      width: 88px;
      box-sizing: border-box;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border: 2px solid var(--chip-color, var(--divider-color));
      border-radius: 999px;
      padding: 3px 10px;
      font-size: var(--ha-font-size-s, 12px);
      font-weight: 600;
      line-height: 1.2;
      font-variant-numeric: tabular-nums;
      box-shadow: 0 1px 3px var(--shadow-color, rgba(0, 0, 0, 0.2));
      white-space: nowrap;
      pointer-events: none;
    }
    .chip.clickable {
      pointer-events: auto;
      cursor: pointer;
    }
    .chip.is-active {
      box-shadow:
        0 1px 3px var(--shadow-color, rgba(0, 0, 0, 0.2)),
        0 0 12px color-mix(in srgb, var(--chip-color) 70%, transparent);
    }
    /* Forecast (future) value: italic and faded, to mark it as predicted. */
    .chip.is-predicted span {
      font-style: italic;
    }
    .chip.is-predicted {
      opacity: 0.6;
    }
    .chip ha-icon {
      --mdc-icon-size: 16px;
      color: inherit;
    }
    /* Cluster geometry: the pill cluster is lifted 28px off the home ground point; PV sits 70px above
       it (top centre); the side chips are 84px off the home x; the top/bottom rows are split by a 60px
       gap (so +/-30 around the cluster). Low-carbon top-left, grid bottom-left; battery Power
       top-right, SoC bottom-right. Home mirrors PV at bottom centre (+42), the consumption sink the
       flows converge on. z 9 keeps the home pill above a neighbour that drifts close. */
    .chip.home {
      z-index: 9;
      transform: translate(-50%, calc(-50% + 42px));
    }
    .chip.pv {
      transform: translate(-50%, calc(-50% - 98px));
    }
    .chip.lowcarbon {
      transform: translate(calc(-50% - 84px), calc(-50% - 58px));
    }
    .chip.grid {
      transform: translate(calc(-50% - 84px), calc(-50% + 2px));
    }
    .chip.battery {
      transform: translate(calc(-50% + 84px), calc(-50% - 58px));
    }
    .chip.soc {
      transform: translate(calc(-50% + 84px), calc(-50% + 2px));
    }
    .chip-leader {
      stroke-width: 1.5;
      stroke-opacity: 0.5;
      stroke-linecap: round;
    }
    .leader-bead {
      opacity: 0.9;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-solar-scene-card": HuiEnergySolarSceneCard;
  }
}
