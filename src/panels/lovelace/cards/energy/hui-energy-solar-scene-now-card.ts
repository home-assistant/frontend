// Solar scene ("Now") card: a self-contained faux-3D view of the home on the CARTO basemap, present
// instant only, for the Energy "Now" tab. The ground is a tiled <canvas> tilted via a CSS 3D transform;
// the house is the Home Assistant logo silhouette extruded through a matching projection. No map/3D lib
// (just <canvas>, <svg>, fetch).
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type {
  HassEntities,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import { mdiWeatherSunsetDown, mdiWeatherSunsetUp } from "@mdi/js";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import { theme2hex } from "../../../../common/color/convert-color";
import type { EnergyData } from "../../../../data/energy";
import {
  energySourcesByType,
  getEnergyDataCollection,
  getPowerFromState,
} from "../../../../data/energy";
import { hasLocation } from "../../../energy/strategies/energy-cards";
import { batteryLevelIcon } from "../../../../common/entity/battery_icon";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { formatNumber } from "../../../../common/number/format_number";
import { blankBeforeUnit } from "../../../../common/translations/blank_before_unit";
import { formatTime } from "../../../../common/datetime/format_time";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";

type Point = [number, number];

// ============================ Constants ============================

// Geo / projection. GROUND_RADIUS = tiles each side of the home; the canvas is (2*R+1)*TILE_PX, so KEEP
// IT ≤ 3 (7×7×256 = 1792px, under the 2048px GPU texture limit of old devices like the Pi Zero, else a
// blank map). GROUND_ZOOM = CARTO tile zoom (street detail).
const DEG = Math.PI / 180;
const EARTH_CIRCUMFERENCE_M = 40075016.686;
const TILE_PX = 256;
const GROUND_RADIUS = 3;
const GROUND_ZOOM = 19;

// Camera. DEFAULT_BEARING faces the sun's side (south in the N hemisphere, flipped to north in the S
// from latitude in _buildScene). NEAR_PLANE = near-plane margin (fraction of PERSPECTIVE): points within
// it are clamped (kills the smear). PERSPECTIVE = projection/CSS depth (px),
// shared by the ground transform and the projection. ROTATE_HOLD_MS = touch hold before rotating (so a
// quick swipe scrolls instead). TILT_DEG = initial pitch (within PITCH_MIN..PITCH_MAX).
const PITCH_MIN = 5;
const PITCH_MAX = 65;
const DEFAULT_BEARING = 180;
const NEAR_PLANE = 0.15;
const PERSPECTIVE = 1200;
const ROTATE_HOLD_MS = 350;
const TILT_DEG = 50;

// Viewport / render. FALLBACK_WIDTH_PX = first-frame width fallback (real height is computed in _draw to
// match a sibling chart card: clamp(width/2, 200, CHART_MAX_HEIGHT_PX), mirroring ha-chart-base's
// --chart-max-height, plus the title band). DARK_FILTER tints the basemap in dark mode. GROUND_FADE_START
// = ground radius (%) where the edge fade dissolves the tiles into the card bg (gives the disc look).
const FALLBACK_WIDTH_PX = 600;
const CHART_MAX_HEIGHT_PX = 350;
const GROUND_FADE_START = 90; // under 90 reveals the "fake" flat ground around the home
const DARK_FILTER =
  "invert(0.9) hue-rotate(170deg) brightness(1.3) contrast(1) saturate(0.4)";

// Power / shadows. IDLE_W = min watts to treat a flow as flowing. Shadows fade in/out near the horizon
// (full at SHADOW_FADE_DEG above it) so they don't pop at dawn/dusk.
const IDLE_W = 5;
const SHADOW_OPACITY = 0.26;
const SHADOW_FADE_DEG = 10;

// The house: a gable-roofed prism, half-width/half-depth in metres, whose front gable faces the equator
// (south in the N hemisphere, north in the S) and carries the Home Assistant mark. EAVE = wall top,
// RIDGE = roof apex; the ratio mirrors the logo silhouette (~square: width ≈ ridge height; eave ≈
// 0.56·ridge). TARGET_HEIGHT_M = camera aim point (mid-house height).
const HOME_HALF_W = 5;
const HOME_HALF_D = 4;
const HOME_EAVE_M = 5.3;
const HOME_RIDGE_M = 9.5;
const TARGET_HEIGHT_M = 3;
// Home Assistant logo, painted on the front gable only. Two paths from the official mark (viewBox
// 0..400; the house silhouette spans x 80..320, y 82..316): BG = the rounded-house field, FG = the
// blue circuit drawn over it. Mapped onto the gable in _homeMark.
const LOGO_BG_D =
  "M320 301.762C320 310.012 313.25 316.762 305 316.762H95C86.75 316.762 80 310.012 80 301.762V211.762C80 203.512 84.77 191.993 90.61 186.153L189.39 87.3725C195.22 81.5425 204.77 81.5425 210.6 87.3725L309.39 186.162C315.22 191.992 320 203.522 320 211.772V301.772V301.762Z";
const LOGO_FG_D =
  "M309.39 186.153L210.61 87.3725C204.78 81.5425 195.23 81.5425 189.4 87.3725L90.61 186.153C84.78 191.983 80 203.512 80 211.762V301.762C80 310.012 86.75 316.762 95 316.762H187.27L146.64 276.132C144.55 276.852 142.32 277.262 140 277.262C128.7 277.262 119.5 268.062 119.5 256.762C119.5 245.462 128.7 236.262 140 236.262C151.3 236.262 160.5 245.462 160.5 256.762C160.5 259.092 160.09 261.322 159.37 263.412L191 295.042V179.162C184.2 175.822 179.5 168.842 179.5 160.772C179.5 149.472 188.7 140.272 200 140.272C211.3 140.272 220.5 149.472 220.5 160.772C220.5 168.842 215.8 175.822 209 179.162V260.432L240.46 228.972C239.84 227.012 239.5 224.932 239.5 222.772C239.5 211.472 248.7 202.272 260 202.272C271.3 202.272 280.5 211.472 280.5 222.772C280.5 234.072 271.3 243.272 260 243.272C257.5 243.272 255.12 242.802 252.91 241.982L209 285.892V316.772H305C313.25 316.772 320 310.022 320 301.772V211.772C320 203.522 315.23 192.002 309.39 186.162V186.153Z";

export interface EnergySolarSceneNowCardConfig extends LovelaceCardConfig {
  collection_key?: string;
}

// ============ Pure helpers (colour, geometry, astronomy) ============

const pointsAttr = (points: Point[]): string =>
  points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

const hexByte = (hex: string, i: number): number =>
  parseInt(hex.slice(i, i + 2), 16);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Blend two #rrggbb colours per channel (t: 0=hexA, 1=hexB). Kept local — runs per shape per frame.
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

function cssHex(
  styles: CSSStyleDeclaration,
  name: string,
  fallback: string
): string {
  return theme2hex(styles.getPropertyValue(name).trim() || fallback);
}

// Web Mercator: lon/lat -> fractional tile coordinates at the given zoom.
function lonLatToTile(lon: number, lat: number, zoom: number): Point {
  const world = 2 ** zoom;
  const latRad = lat * DEG;
  const y =
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
  return [((lon + 180) / 360) * world, y * world];
}

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

// Current sun position: prefer Core's sun.sun (authoritative, computed server-side, so it can't drift
// from the rest of HA), falling back to the local astronomy for the rare instant the entity is missing.
function sunNow(
  hass: HomeAssistant,
  date: Date,
  latitude: number,
  longitude: number
): { azimuth: number; altitude: number } {
  const attrs = hass.states["sun.sun"]?.attributes;
  const azimuth = Number(attrs?.azimuth);
  const elevation = Number(attrs?.elevation);
  if (isFinite(azimuth) && isFinite(elevation)) {
    return { azimuth: ((azimuth % 360) + 360) % 360, altitude: elevation };
  }
  return sunPosition(date, latitude, longitude);
}

// UTC epoch of the home's local midnight, using the HA server timezone so the day boundary (and thus the
// computed arc) stays correct around midnight even when the browser sits in a different zone.
function startOfLocalDay(now: Date, timeZone: string | undefined): number {
  if (!timeZone) {
    const m = new Date(now);
    m.setHours(0, 0, 0, 0);
    return m.valueOf();
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);
  const p: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second
  );
  const offset = asUtc - now.valueOf(); // ms the zone leads UTC at this instant
  return Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0) - offset;
}

// Andrew's monotone-chain convex hull, used for the ground shadow and the house silhouette outline.
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

// Tint a base colour for the time of day: deep night below the horizon, through dusk and a warm low-sun
// band, back to the base colour high up.
function tintByAltitude(base: string, altitude: number): string {
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
  const hex = tintByAltitude(base, altitude);
  return `rgba(${hexByte(hex, 1)},${hexByte(hex, 3)},${hexByte(hex, 5)},${opacity})`;
}

// Sun colour along the day: grey underground, warm near the horizon, amber high up.
const arcColor = (altitude: number, amber: string): string =>
  altitude <= 0
    ? "#3a4a63"
    : altitude < 12
      ? mixHex(amber, "#ff6a00", 0.5)
      : amber;

// ============ Live power resolver (present instant only) ============

interface Resolved {
  solarRate: string[];
  gridRate: string[];
  batteryRate: string[];
  soc: string[];
}

function resolve(data: EnergyData): Resolved {
  const types = energySourcesByType(data.prefs);
  const r: Resolved = {
    solarRate: [],
    gridRate: [],
    batteryRate: [],
    soc: [],
  };
  for (const s of types.solar ?? []) {
    if (s.stat_rate) r.solarRate.push(s.stat_rate);
  }
  for (const s of types.grid ?? []) {
    if (s.stat_rate) r.gridRate.push(s.stat_rate);
  }
  for (const s of types.battery ?? []) {
    if (s.stat_rate) r.batteryRate.push(s.stat_rate);
    if (s.stat_soc) r.soc.push(s.stat_soc);
  }
  return r;
}

// Sum a metric over its source ids, skipping ids with no value; null when none has one.
const sumDefined = (
  ids: string[],
  valueOf: (id: string) => number | null | undefined
): number | null => {
  let sum = 0;
  let any = false;
  for (const id of ids) {
    const w = valueOf(id);
    if (w != null) {
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

// `resolve` only depends on prefs (which change rarely): cache by prefs reference so the per-render
// call in willUpdate doesn't rebuild the source-id arrays every frame.
const resolveCache = new WeakMap<EnergyData["prefs"], Resolved>();
function resolveCached(data: EnergyData): Resolved {
  let r = resolveCache.get(data.prefs);
  if (!r) {
    r = resolve(data);
    resolveCache.set(data.prefs, r);
  }
  return r;
}

// One value per metric at "now", taken only from the configured live rate sensor (stat_rate). We never
// derive power from the latest energy bucket: that is a guess that is wrong often enough to draw bug
// reports, so we show only the live data that is actually configured. null when a source has no rate
// sensor configured or that sensor currently has no value.
function livePower(data: EnergyData, states: HassEntities): LivePower {
  const r = resolveCached(data);
  const metricW = (rateIds: string[]): number | null =>
    sumDefined(rateIds, (id) => getPowerFromState(states[id]));

  const pv = metricW(r.solarRate);
  const grid = metricW(r.gridRate);
  // HA's standard battery stat_rate is + when discharging (into the home), matching the core power-total
  // badge, so the summed rate needs no sign flip.
  const battery = metricW(r.batteryRate);

  let socSum = 0;
  let socCount = 0;
  for (const id of r.soc) {
    const v = parseFloat(states[id]?.state ?? "");
    if (isFinite(v)) {
      socSum += v;
      socCount += 1;
    }
  }
  const soc = socCount ? Math.max(0, Math.min(100, socSum / socCount)) : null;

  const home =
    pv === null && grid === null && battery === null
      ? null
      : Math.max(0, (pv ?? 0) + (grid ?? 0) + (battery ?? 0));

  return { pv, grid, battery, soc, home };
}

// True when two live snapshots carry the same values, so an unchanged frame skips its canvas redraw.
function livePowerEqual(a: LivePower, b?: LivePower): boolean {
  return (
    !!b &&
    a.pv === b.pv &&
    a.grid === b.grid &&
    a.battery === b.battery &&
    a.soc === b.soc &&
    a.home === b.home
  );
}

@customElement("hui-energy-solar-scene-now-card")
export class HuiEnergySolarSceneNowCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  // ---- Public API + reactive state ----
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: EnergySolarSceneNowCardConfig;
  @state() private _energyData?: EnergyData;
  @state() private _power?: LivePower; // live instantaneous power for the chips
  @state() private _showAttribution = false; // CARTO/OSM credit, only when their tiles are shown

  // ---- DOM queries (ground holder + the depth-split SVG layers, filled imperatively in _paint) ----
  @query(".wrap") private _wrap?: HTMLElement;
  @query(".title") private _titleEl?: HTMLElement;
  @query("#ground") private _groundHolder?: HTMLElement;
  @query(".l-scene") private _lScene?: SVGSVGElement;
  @query(".l-arc-back") private _lArcBack?: SVGSVGElement;
  @query(".l-arc-far") private _lArcFar?: SVGSVGElement;
  @query(".l-leaders") private _lLeaders?: SVGSVGElement;
  @query(".l-ray") private _lRay?: SVGSVGElement;
  @query(".l-arc-near") private _lArcNear?: SVGSVGElement;
  @query(".l-sun") private _lSun?: SVGSVGElement;

  // ---- Camera / engine state ----
  private _bearing = DEFAULT_BEARING;
  private _tilt = TILT_DEG;
  private _pxPerMetre = 4;
  private _centreX = 0;
  private _centreY = 0;
  // Home location, set from hass.config in _buildScene (which only runs once a location is configured, so
  // these placeholders are never drawn) + whether the live basemap is usable.
  private _lat = 0;
  private _lon = 0;
  private _liveMap = navigator.onLine;
  private _drag?: { x: number; y: number };
  // Hold-to-rotate (touch): a pending press becomes a drag only after ROTATE_HOLD_MS without scrolling.
  private _pressTimer?: number;
  private _pendingPress?: {
    x: number;
    y: number;
    pointerId: number;
    el: HTMLElement;
  };
  private _ground?: {
    el: HTMLElement;
    fade: HTMLDivElement;
    homeX: number;
    homeY: number;
  };

  private _built = false;
  private _redrawScheduled = false;
  private _lastLiveMinute = -1;
  private _lastDark?: boolean;
  private _resizeObserver = new ResizeObserver(() => this._scheduleDraw());
  // Camera basis (cos/sin of bearing & tilt) computed once per frame in _draw, not per projected vertex.
  private _cam = { cosB: -1, sinB: 0, cosT: 0.643, sinT: 0.766 };

  // Skip all rendering while the card is off-screen or the tab is hidden.
  private _visible = true;
  private _intersectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.some((e) => e.isIntersecting);
    if (visible === this._visible) return;
    this._visible = visible;
    if (visible) this._scheduleDraw();
  });

  private _onVisibilityChange = (): void => {
    if (!document.hidden && this._visible) this._scheduleDraw();
  };

  // Browser came back online: if we're stuck on the flat ground, rebuild to fetch the real basemap.
  private _onOnline = (): void => {
    if (!this._liveMap) {
      this._built = false;
      this._buildScene();
    }
  };

  // ---- Scene content state ----
  private _leadersHtml = "";
  private _homeReady = false;
  private _growth = 0;
  private _grown = false;
  private _arcSamples?: {
    dayKey: number;
    samples: { azimuth: number; altitude: number }[];
  };

  private _palette?: {
    dark: boolean;
    primary: string;
    text: string;
    sun: string;
    shadow: string;
  };

  // ===================== Config =====================

  public setConfig(config: EnergySolarSceneNowCardConfig): void {
    this._config = config;
  }

  public getCardSize(): number {
    return 6;
  }

  // ===================== Lifecycle =====================

  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._energyData = data;
        this._scheduleDraw();
      }),
    ];
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._resizeObserver.observe(this);
    this._intersectionObserver.observe(this);
    document.addEventListener("visibilitychange", this._onVisibilityChange);
    window.addEventListener("online", this._onOnline);
    this.addEventListener("touchmove", this._onTouchMove, { passive: false });
    // Replay the house rise on tab re-entry (like the energy graphs).
    this._grown = false;
    this._growth = 0;
    this._palette = undefined; // theme may have changed while the tab was hidden
    if (this._homeReady) this._startGrowth();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver.disconnect();
    this._intersectionObserver.disconnect();
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
    window.removeEventListener("online", this._onOnline);
    this.removeEventListener("touchmove", this._onTouchMove);
    this._cancelPress();
  }

  protected firstUpdated(_changed: PropertyValues): void {
    this._buildScene();
  }

  protected willUpdate(_changed: PropertyValues): void {
    // Resolve the live chip values before every render (everything is "now"), and redraw the moment they
    // change so a chip and its connection appear or disappear together instead of waiting for the next
    // minute tick in updated().
    if (this.hass && this._energyData) {
      const power = livePower(this._energyData, this.hass.states);
      if (!livePowerEqual(power, this._power)) this._scheduleDraw();
      this._power = power;
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps); // SubscribeMixin subscribes to the energy collection here
    this._buildScene();
    if (changedProps.has("hass") && this.hass) {
      // Theme flip: the map filter + palette only refresh in _draw, so force a redraw now.
      const dark = !!this.hass.themes?.darkMode;
      if (dark !== this._lastDark) {
        this._lastDark = dark;
        this._scheduleDraw();
      }
      // The sun only moves once a minute: skip per-state redraws.
      const minute = Math.floor(Date.now() / 60000);
      if (minute !== this._lastLiveMinute) {
        this._lastLiveMinute = minute;
        this._scheduleDraw();
      }
    }
  }

  // ===================== Setup / ground =====================

  // Build once both setConfig and hass are available; fetch the basemap and place the house.
  private _buildScene(): void {
    if (this._built || !this.hass || !this._config) return;
    // No card without a configured home location (see hasLocation): render() returns nothing and we skip
    // the build, so nothing is ever placed at a guessed default position. Left unbuilt so a location set
    // later still builds.
    if (!hasLocation(this.hass)) return;
    const { latitude, longitude } = this.hass.config;
    this._built = true;
    // Live basemap whenever the browser is online.
    this._liveMap = navigator.onLine;
    this._lat = latitude;
    this._lon = longitude;
    // Face the sun's side by default: south (180°) in the N hemisphere, north (0°) in the S.
    this._bearing = latitude < 0 ? 0 : DEFAULT_BEARING;
    const zoom = GROUND_ZOOM;
    this._pxPerMetre =
      (TILE_PX * 2 ** zoom) /
      (EARTH_CIRCUMFERENCE_M * Math.cos(latitude * DEG));
    this._buildGround(latitude, longitude, zoom);
    this._buildHome();
  }

  // Ground plane: online stitches the CARTO tiles into one seam-free canvas; offline (or a total tile
  // failure) → flat themed plane.
  private async _buildGround(
    lat: number,
    lng: number,
    zoom: number
  ): Promise<void> {
    const [tileX, tileY] = lonLatToTile(lng, lat, zoom);
    const radius = GROUND_RADIUS;
    const firstX = Math.floor(tileX) - radius;
    const firstY = Math.floor(tileY) - radius;
    const across = 2 * radius + 1;
    const size = across * TILE_PX;
    const homeX = (tileX - firstX) * TILE_PX;
    const homeY = (tileY - firstY) * TILE_PX;

    let el: HTMLElement | undefined;
    if (this._liveMap) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      canvas.className = "ground";
      const ctx = canvas.getContext("2d")!;
      let loaded = 0;
      const loads: Promise<void>[] = [];
      for (let col = 0; col < across; col++) {
        for (let row = 0; row < across; row++) {
          const x = firstX + col;
          const y = firstY + row;
          loads.push(
            new Promise<void>((resolve2) => {
              const img = new Image();
              img.onload = () => {
                ctx.drawImage(
                  img,
                  col * TILE_PX,
                  row * TILE_PX,
                  TILE_PX,
                  TILE_PX
                );
                loaded += 1;
                resolve2();
              };
              img.onerror = () => resolve2();
              img.referrerPolicy = "no-referrer"; // don't leak the HA instance URL to the tile CDN
              const sub = "abcd"[(x + y) % 4];
              img.src = `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/${zoom}/${x}/${y}.png`;
            })
          );
        }
      }
      await Promise.all(loads);
      // Every tile failed (offline / blocked): fall back to the flat plane, not a blank canvas.
      if (loaded > 0) el = canvas;
    }
    // CARTO/OSM require visible attribution whenever their tiles are shown (not on the flat fallback).
    this._showAttribution = !!el;
    if (!el) el = this._buildFlatGround(size);

    // Edge fade: same size + transform as the ground, dissolving its borders into the card background.
    const fade = document.createElement("div");
    fade.className = "ground-fade";
    fade.style.width = `${size}px`;
    fade.style.height = `${size}px`;

    if (this._groundHolder) {
      this._groundHolder.innerHTML = "";
      this._groundHolder.appendChild(el);
      this._groundHolder.appendChild(fade);
    }
    this._ground = { el, fade, homeX, homeY };
    this._draw();
  }

  // Flat themed ground (no tiles fetched). CSS background → follows the theme automatically.
  private _buildFlatGround(size: number): HTMLElement {
    const flat = document.createElement("div");
    flat.className = "ground ground-flat";
    flat.style.width = `${size}px`;
    flat.style.height = `${size}px`;
    return flat;
  }

  // ===================== Home =====================

  // Every install renders the same house at the home GPS; the 3D shape and its shadow are drawn from the
  // logo silhouette in _renderHomeHouse / _renderShadows. Here we just mark it ready and start the rise.
  private _buildHome(): void {
    this._homeReady = true;
    this._startGrowth();
  }

  // ===================== Animation =====================

  // Read live (cheap) so OS changes take effect on the next redraw without a listener. Gates the
  // house-rise tween plus every looping flow animation (leader beads, sun ray).
  private get _reducedMotion(): boolean {
    return (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    );
  }

  // The house rises to full height on first load over ~500 ms (cubicOut); instant for reduced motion.
  private _startGrowth(): void {
    if (this._grown) return;
    this._grown = true;
    if (this._reducedMotion) {
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

  // ===================== Camera interaction =====================

  // Manual 2-axis camera drag. A mouse/pen grabs immediately; a touch must be HELD (ROTATE_HOLD_MS)
  // before it rotates, so a quick swipe over the card scrolls the dashboard instead of spinning the scene.
  private _onPointerDown(ev: PointerEvent): void {
    const el = ev.currentTarget as HTMLElement;
    if (ev.pointerType === "touch") {
      this._pendingPress = {
        x: ev.clientX,
        y: ev.clientY,
        pointerId: ev.pointerId,
        el,
      };
      this._pressTimer = window.setTimeout(() => {
        this._pressTimer = undefined;
        const p = this._pendingPress;
        if (!p) return;
        // Take over the gesture and rotate from the press point. The non-passive touchmove listener
        // (connectedCallback) preventDefaults from here on, so vertical drags tilt without scrolling.
        p.el.setPointerCapture(p.pointerId);
        this._drag = { x: p.x, y: p.y };
      }, ROTATE_HOLD_MS);
      return;
    }
    el.setPointerCapture(ev.pointerId);
    this._drag = { x: ev.clientX, y: ev.clientY };
  }

  private _onPointerMove(ev: PointerEvent): void {
    // Moved before the hold fired → it's a scroll, not a rotation: drop the pending press.
    if (this._pendingPress && !this._drag) {
      const dx = ev.clientX - this._pendingPress.x;
      const dy = ev.clientY - this._pendingPress.y;
      if (Math.hypot(dx, dy) > 10) this._cancelPress();
      return;
    }
    if (!this._drag) return;
    this._bearing = (this._bearing - (ev.clientX - this._drag.x) * 0.4) % 360;
    this._tilt = Math.max(
      PITCH_MIN,
      Math.min(PITCH_MAX, this._tilt - (ev.clientY - this._drag.y) * 0.3)
    );
    this._drag = { x: ev.clientX, y: ev.clientY };
    this._scheduleDraw();
  }

  private _onPointerUp(): void {
    this._cancelPress();
    this._drag = undefined;
    this._scheduleDraw(); // redraw once more to let the frozen flow animations resume
  }

  // While rotating, stop the browser scrolling the page under the gesture (touch-action alone can't:
  // it's locked at touchstart, before the hold promotes the press to a drag). Non-passive on purpose.
  private _onTouchMove = (ev: TouchEvent): void => {
    if (this._drag) ev.preventDefault();
  };

  // Cancel a pending hold-to-rotate timer (scroll detected, pointer released, or disconnect).
  private _cancelPress(): void {
    if (this._pressTimer !== undefined) {
      clearTimeout(this._pressTimer);
      this._pressTimer = undefined;
    }
    this._pendingPress = undefined;
  }

  // ===================== Projection + draw loop =====================

  // Coalesce redraws to one per animation frame (pointermove fires far above 60 Hz); skip off-screen.
  private _scheduleDraw(): void {
    if (this._redrawScheduled) return;
    if (!this._visible || document.hidden) return;
    this._redrawScheduled = true;
    requestAnimationFrame(() => {
      this._redrawScheduled = false;
      this._draw();
    });
  }

  // Project (east, north, up) m → screen px (bearing → pitch → perspective). Mirrors the ground's
  // CSS transform so content stays glued as the camera turns.
  private _project3(
    eastM: number,
    northM: number,
    upM: number
  ): { x: number; y: number; depth: number } {
    const c = this._cam;
    const x = eastM * this._pxPerMetre;
    const y = -northM * this._pxPerMetre;
    const z = upM * this._pxPerMetre;
    const rx = x * c.cosB - y * c.sinB;
    const ry = x * c.sinB + y * c.cosB;
    const cameraZ = ry * c.sinT + z * c.cosT;
    const persp = PERSPECTIVE;
    // Clamp the denominator to avoid the near-plane singularity (a point at/behind the camera would
    // otherwise project to infinity or flip across the centre). `depth` stays the true cameraZ.
    const p = persp / Math.max(persp - cameraZ, persp * NEAR_PLANE);
    return {
      x: this._centreX + rx * p,
      y: this._centreY + (ry * c.cosT - z * c.sinT) * p,
      depth: cameraZ,
    };
  }

  private _project(eastM: number, northM: number, upM: number): Point {
    const p = this._project3(eastM, northM, upM);
    return [p.x, p.y];
  }

  // Draw one frame: size the viewport, recompute centre + camera basis, transform the ground, expose
  // the home position as CSS vars, then paint.
  private _draw(): void {
    if (!this._wrap || !this.hass) return;
    const width = this._wrap.clientWidth || FALLBACK_WIDTH_PX;
    // Match a sibling chart card's height: its plot is max(width / 2, 200px) but CAPPED by
    // ha-chart-base's --chart-max-height (CHART_MAX_HEIGHT_PX); add the title-band height it would have
    // (measured off our overlaid title) and let the scene fill all of it.
    const plot = Math.min(Math.max(width / 2, 200), CHART_MAX_HEIGHT_PX);
    const height = plot + (this._titleEl?.clientHeight ?? 0);
    if (this._wrap.style.height !== `${height}px`) {
      this._wrap.style.height = `${height}px`;
    }

    const tilt = this._tilt * DEG;
    const bearing = this._bearing * DEG;
    const targetPx = TARGET_HEIGHT_M * this._pxPerMetre;
    this._centreX = width / 2;
    // Same near-plane clamp as _project3, so a large target_height_m can't blow up the centre.
    const centreDenom = Math.max(
      PERSPECTIVE - targetPx * Math.cos(tilt),
      PERSPECTIVE * NEAR_PLANE
    );
    this._centreY =
      height / 2 + targetPx * Math.sin(tilt) * (PERSPECTIVE / centreDenom);
    this._cam = {
      cosB: Math.cos(bearing),
      sinB: Math.sin(bearing),
      cosT: Math.cos(tilt),
      sinT: Math.sin(tilt),
    };

    const dark = !!this.hass.themes?.darkMode;
    this.style.setProperty("--map-filter", dark ? DARK_FILTER : "none");

    if (this._ground) {
      const { el, fade, homeX, homeY } = this._ground;
      const origin = `${homeX}px ${homeY}px`;
      const transform = `translate(${this._centreX - homeX}px, ${this._centreY - homeY}px) rotateX(${this._tilt}deg) rotateZ(${this._bearing}deg)`;
      el.style.transformOrigin = origin;
      el.style.transform = transform;
      fade.style.transformOrigin = origin;
      fade.style.transform = transform;
    }

    // Anchor overlay chips to the home's projected position via CSS vars (a fixed screen offset).
    const home = this._project(0, 0, 0);
    this.style.setProperty("--home-x", `${home[0].toFixed(1)}px`);
    this.style.setProperty("--home-y", `${home[1].toFixed(1)}px`);

    this._paint(width, height, dark);
  }

  // ===================== Render =====================

  // Paint the depth-split SVG layers for one frame, at the present instant. Layer contents are built as
  // SVG strings and written via innerHTML (not Lit templates) on purpose: with the scene rebuilt every
  // frame on rotation, string concat + one innerHTML write is far cheaper than Lit's keyed diff.
  // Injection-safe — every value is computed internally; the only user-supplied string (the card title)
  // is rendered through Lit in render(), never here.
  private _paint(width: number, height: number, dark: boolean): void {
    if (!this._lScene) return;
    // Theme colours change rarely; resolve them once per theme instead of every frame.
    if (this._palette?.dark !== dark) {
      const styles = getComputedStyle(this);
      this._palette = {
        dark,
        primary: cssHex(styles, "--primary-color", "#03a9f4"),
        text: cssHex(styles, "--primary-text-color", "#dddddd"),
        sun: cssHex(styles, "--warning-color", "#ffc107"),
        shadow: cssHex(styles, "--shadow-color", "#000000"),
      };
    }

    const latitude = this._lat;
    const longitude = this._lon;
    const date = new Date(); // always "now"
    const sun = sunNow(this.hass, date, latitude, longitude);
    const palette = this._palette!;

    const home = this._project(0, 0, 0);

    const sky = this._renderSky(sun, date, width, height, palette);
    // Bottom-up: the 3D scene (night shade, shadow, house) under the depth-split arc and sun.
    this._lScene.innerHTML =
      this._renderNightShade(sun.altitude, width, height) +
      this._renderShadows(sun, palette.shadow) +
      this._renderHomeHouse(sun.altitude);
    if (this._lArcBack) this._lArcBack.innerHTML = sky.arcBack;
    if (this._lArcFar) this._lArcFar.innerHTML = sky.arcFar;
    if (this._lLeaders) {
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

  // Shadow cast by the actual house shape: every silhouette vertex (at both gables, at its real height)
  // is dropped to the ground along the sun ray, and the convex hull of those points + the footprint is
  // the shade. So the peaked roof throws a longer point than the eaves.
  private _renderShadows(
    sun: { azimuth: number; altitude: number },
    shadow: string
  ): string {
    const fade = Math.min(1, sun.altitude / SHADOW_FADE_DEG);
    if (fade <= 0) return "";
    const away = (sun.azimuth + 180) * DEG;
    const t = 1 / Math.tan(sun.altitude * DEG);
    const grow = this._growth;
    const sil = this._homeSilhouettePts();
    const D = HOME_HALF_D;
    const yf = this._lat < 0 ? D : -D;
    const ground: Point[] = [];
    for (const y of [yf, -yf]) {
      for (const [e, u0] of sil) {
        const len = Math.min(u0 * grow * t, 60);
        ground.push(
          this._project(e + Math.sin(away) * len, y + Math.cos(away) * len, 0)
        );
      }
    }
    return `<g opacity="${(SHADOW_OPACITY * fade).toFixed(3)}"><polygon points="${pointsAttr(convexHull(ground))}" fill="${shadow}"/></g>`;
  }

  // The generic home: the (rounded) Home Assistant logo silhouette extruded north into a little house.
  // Its front gable faces the equator (south in the N hemisphere, north in the S) and carries the mark.
  // Faces are back-face culled then painted far→near.
  private _renderHomeHouse(altitude: number): string {
    const grow = this._growth;
    const W = HOME_HALF_W; // half-width (east)
    const D = HOME_HALF_D; // half-depth (north)
    const ridge = HOME_RIDGE_M * grow;
    // Front gable (carries the mark) faces the default camera; the sign follows the hemisphere so the
    // logo greets the viewer instead of the back of the house.
    const yf = this._lat < 0 ? -D : D; // front gable (carries the mark)
    const yb = -yf; // back gable

    // House palette: only the front gable is light (so the blue HA circuit reads on it); the back, the
    // two sides and the roof are HA blue, so the house reads as the logo. Opaque so the basemap never
    // bleeds through; the altitude tint keeps it in step with the day/night scene.
    const frontFill = tintedRgba("#c7d0de", altitude, 1);
    // Back, sides, roof + the front mark: the Home consumption chip colour (--primary-color).
    const bodyFill = tintedRgba(
      this._palette?.primary ?? "#03a9f4",
      altitude,
      1
    );
    const tHex = this._palette?.text ?? "#dddddd"; // primary text colour
    const edge = `rgba(${hexByte(tHex, 1)},${hexByte(tHex, 3)},${hexByte(tHex, 5)},0.25)`;

    type V = [number, number, number]; // east, north, up (m)
    // Outline = the (rounded) logo silhouette in the east-up plane; the house is that outline extruded
    // north by the depth, so the logo's rounded corners and apex carry straight into 3D. Height tweens
    // with the rise animation (grow).
    const sil = this._homeSilhouettePts();
    const S: [number, number][] = sil.map(([e, u]) => [e, u * grow]);

    // Solid centre, used to orient each face's normal outward.
    const O: V = [0, 0, (HOME_RIDGE_M * grow) / 2.5];
    const cross = (a: V, b: V): V => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];

    const drawn: { depth: number; svg: string }[] = [];
    // Keep a face only if it points at the camera: take its geometric normal, flip it to point away from
    // the solid centre, then keep it when a step OUTWARD lands nearer the camera than a step inward. No
    // winding assumptions, so it stays correct for the gables, the walls and the rounded roof alike.
    // Returns whether the face is camera-facing.
    const addFace = (pts: V[], fill: string): boolean => {
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (const p of pts) {
        cx += p[0];
        cy += p[1];
        cz += p[2];
      }
      const k = pts.length;
      const c: V = [cx / k, cy / k, cz / k];
      let n = cross(
        [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]],
        [pts[2][0] - pts[0][0], pts[2][1] - pts[0][1], pts[2][2] - pts[0][2]]
      );
      if (
        n[0] * (c[0] - O[0]) + n[1] * (c[1] - O[1]) + n[2] * (c[2] - O[2]) <
        0
      ) {
        n = [-n[0], -n[1], -n[2]];
      }
      const nl = Math.hypot(n[0], n[1], n[2]) || 1;
      const s = 0.15 / nl;
      const facing =
        this._project3(c[0] + n[0] * s, c[1] + n[1] * s, c[2] + n[2] * s)
          .depth >
        this._project3(c[0] - n[0] * s, c[1] - n[1] * s, c[2] - n[2] * s).depth;
      if (!facing) return false;
      const proj = pts.map((p) => this._project(p[0], p[1], p[2]));
      // Stroke each face in its own colour: hides the seams between the many strip quads (no roof lines)
      // and closes the hairline anti-alias gaps between adjacent polygons.
      drawn.push({
        depth: this._project3(c[0], c[1], c[2]).depth,
        svg: `<polygon points="${pointsAttr(proj)}" fill="${fill}" stroke="${fill}" stroke-width="0.8" stroke-linejoin="round"/>`,
      });
      return true;
    };

    const frontGable: V[] = S.map(([e, u]) => [e, yf, u] as V);
    const backGable: V[] = S.map(([e, u]) => [e, yb, u] as V);
    const frontVisible = addFace(frontGable, frontFill); // light, carries the mark
    addFace(backGable, bodyFill);
    for (let i = 0; i < S.length; i++) {
      const j = (i + 1) % S.length;
      const [e0, u0] = S[i];
      const [e1, u1] = S[j];
      addFace(
        [
          [e0, yf, u0],
          [e1, yf, u1],
          [e1, yb, u1],
          [e0, yb, u0],
        ],
        bodyFill
      );
    }

    drawn.sort((a, b) => a.depth - b.depth);
    const project = (p: V): Point => this._project(p[0], p[1], p[2]);
    const edgePoly = (pts: V[]): string =>
      `<polygon points="${pointsAttr(pts.map(project))}" fill="none" stroke="${edge}" stroke-width="0.8" stroke-linejoin="round"/>`;

    let svg = drawn.map((d) => d.svg).join("");
    if (grow > 0.15 && frontVisible) {
      svg += this._homeMark(W, yf, ridge, frontFill, bodyFill);
    }
    // Visible edges only (the solid is convex, so no hidden-line maths needed): the NEAR gable's outline
    // delineates the front face, and the convex hull of all vertices is the overall silhouette. The far
    // gable is fully occluded, so it is not drawn — no x-ray look.
    svg += edgePoly(frontVisible ? frontGable : backGable);
    const hull = convexHull([...frontGable, ...backGable].map(project));
    svg += `<polygon points="${pointsAttr(hull)}" fill="none" stroke="${edge}" stroke-width="0.8" stroke-linejoin="round"/>`;
    return svg;
  }

  // Paint the HA circuit mark onto the front gable. The logo art and the gable are both planar, so the
  // logo → screen map is affine-fitted through three gable corners (bottom-left, bottom-right, ridge
  // apex), matching the logo's reference points (80,316)/(320,316)/(200,82). The BG path (the house
  // field) is filled the wall colour so the front gable matches the surrounding walls, and the FG path
  // (the circuit) is HA blue — so only the blue mark stands out. The dropped perspective term is
  // negligible here because the gable nearly faces the camera whenever this is drawn.
  private _homeMark(
    W: number,
    yf: number,
    ridge: number,
    wallColor: string,
    markColor: string
  ): string {
    const s0 = this._project(-W, yf, 0); // logo (80, 316)
    const s1 = this._project(W, yf, 0); // logo (320, 316)
    const s2 = this._project(0, yf, ridge); // logo (200, 82)
    // L1 − L0 = (240, 0); L2 − L0 = (120, −234); det = 240·−234.
    const det = -56160;
    const dS1x = s1[0] - s0[0];
    const dS1y = s1[1] - s0[1];
    const dS2x = s2[0] - s0[0];
    const dS2y = s2[1] - s0[1];
    const a = (dS1x * -234) / det;
    const c = (-dS1x * 120 + dS2x * 240) / det;
    const b = (dS1y * -234) / det;
    const d = (-dS1y * 120 + dS2y * 240) / det;
    const e = s0[0] - (a * 80 + c * 316);
    const f = s0[1] - (b * 80 + d * 316);
    const m = [a, b, c, d, e, f].map((v) => v.toFixed(4)).join(" ");
    return `<g transform="matrix(${m})"><path d="${LOGO_BG_D}" fill="${wallColor}"/><path d="${LOGO_FG_D}" fill="${markColor}"/></g>`;
  }

  // Sample the logo's outer silhouette into a closed polyline in the east-up plane, so its rounded
  // corners/apex extrude faithfully. Logo coords (house spans x 80..320, y 82..316) map linearly to
  // east −W..W and up 0..ridge. Computed once (static shape); a sharp pentagon backs it up if the
  // browser can't measure the path.
  private _silhouette?: [number, number][];
  private _homeSilhouettePts(): [number, number][] {
    if (this._silhouette) return this._silhouette;
    let pts: [number, number][] = [];
    try {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("d", LOGO_BG_D);
      const len = path.getTotalLength();
      const N = 64;
      for (let i = 0; i < N; i++) {
        const p = path.getPointAtLength((i / N) * len);
        pts.push([
          ((p.x - 200) / 120) * HOME_HALF_W,
          ((316 - p.y) / 234) * HOME_RIDGE_M,
        ]);
      }
    } catch {
      const w = HOME_HALF_W;
      pts = [
        [-w, 0],
        [w, 0],
        [w, HOME_EAVE_M],
        [0, HOME_RIDGE_M],
        [-w, HOME_EAVE_M],
      ];
    }
    this._silhouette = pts;
    return pts;
  }

  // Sun path on a dome around the home + a four-layer disc whose fill/halo scale with the sun's height.
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
    const latitude = this._lat;
    const longitude = this._lon;
    const DRAW_ALT = -12;

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

    const dayKey = startOfLocalDay(date, this.hass.config?.time_zone);
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
    let arcFar = farOut + farSeg;
    const arcNear = nearOut + nearSeg;

    // Sunrise / sunset: where the day's path crosses the horizon (altitude 0). A dot ON the arc, plus
    // an mdi icon + local time just OUTSIDE it. Drawn on the FAR layer (z 5) so the chips stay on top.
    const samples = this._arcSamples.samples;
    for (let i = 1; i < samples.length; i++) {
      const a0 = samples[i - 1].altitude;
      const a1 = samples[i].altitude;
      const rising = a0 < 0 && a1 >= 0;
      if (!rising && !(a0 >= 0 && a1 < 0)) continue;
      const frac = a1 === a0 ? 0 : -a0 / (a1 - a0);
      let az0 = samples[i - 1].azimuth;
      let az1 = samples[i].azimuth;
      if (az1 - az0 > 180) az0 += 360;
      else if (az0 - az1 > 180) az1 += 360;
      const m = dome(az0 + frac * (az1 - az0), 0);
      const dist = Math.hypot(m.x - home.x, m.y - home.y) || 1;
      const lx = m.x + ((m.x - home.x) / dist) * 26;
      const ly = m.y + ((m.y - home.y) / dist) * 26;
      const t = formatTime(
        new Date(dayKey + ((i - 1) * 15 + frac * 15) * 60000),
        this.hass.locale,
        this.hass.config
      );
      arcFar +=
        `<circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="3" fill="${palette.sun}"/>` +
        `<g transform="translate(${(lx - 8).toFixed(1)},${(ly - 18).toFixed(1)})">` +
        `<path d="${rising ? mdiWeatherSunsetUp : mdiWeatherSunsetDown}" transform="scale(0.67)" fill="${palette.sun}"/>` +
        `<text class="sun-time" x="8" y="26" text-anchor="middle">${t}</text></g>`;
    }

    const sunX = s.x;
    const sunY = s.y;
    // Disc brightness + halo scale with the sun's height — a VISUAL cue only, not an irradiance value
    // (real irradiance needs weather data we don't have, so no W/m² number is shown).
    const fill = Math.sqrt(
      Math.min(1, Math.max(0, Math.sin(Math.max(0, sun.altitude) * DEG)))
    );
    const r = (10 + 10 * near(s.depth)) * scale;
    const day = sun.altitude > -2;
    let rayX = home.x;
    let rayY = home.y;
    if (this._power?.pv != null) {
      const cx = home.x;
      const cy = home.y - 98; // PV chip centre (PV_LIFT in _renderLeaders)
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
    // The ray layer is rewritten every frame (the sun moves with the camera), which restarts its SMIL
    // bead + CSS dash flow. While dragging, freeze them (is-static, no bead) so they don't strobe; they
    // resume on pointer-up, which schedules a redraw. Reduced motion freezes them permanently.
    const flowing = !this._reducedMotion && !this._drag;
    const rayBead = flowing
      ? `<circle class="leader-bead" r="3" fill="${palette.sun}"><animateMotion dur="${rayDur}s" repeatCount="indefinite" path="M ${sunX.toFixed(1)},${sunY.toFixed(1)} L ${rayX.toFixed(1)},${rayY.toFixed(1)}"/></circle>`
      : "";
    const ray =
      day && fill > 0
        ? `<line class="solar-ray${flowing ? "" : " is-static"}" style="--sun-flow-duration:${rayDur}s" x1="${sunX.toFixed(1)}" y1="${sunY.toFixed(1)}" x2="${rayX.toFixed(1)}" y2="${rayY.toFixed(1)}" stroke="${palette.sun}"/>` +
          rayBead
        : "";
    const sunNear = near(s.depth) >= 0.5;
    const c = `cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}"`;
    const sunSvg = `
      <defs><radialGradient id="solar-halo-now">
        <stop offset="0%" stop-color="${palette.sun}" stop-opacity="${(fill * 0.55).toFixed(3)}"/>
        <stop offset="100%" stop-color="${palette.sun}" stop-opacity="0"/>
      </radialGradient></defs>
      <circle ${c} r="${(r * 3).toFixed(1)}" fill="url(#solar-halo-now)"/>
      <circle ${c} r="${r.toFixed(1)}" fill="${palette.sun}" fill-opacity="0.2"/>
      <circle ${c} r="${(r * fill).toFixed(1)}" fill="${palette.sun}"/>
      <circle ${c} r="${r.toFixed(1)}" fill="none" stroke="${palette.sun}" stroke-width="1.5"/>`;
    return { arcBack, arcFar, arcNear, ray, sun: sunSvg, sunNear };
  }

  // Leader from each present chip to the home, with a bead riding it at a speed proportional to the power.
  private _renderLeaders(): string {
    const p = this._power;
    if (!p) return "";
    const hx = 0;
    const hy = 0;
    const SIDE = 84;
    const PV_LIFT = 98;
    const PILL_H = 14;
    const PILL_QX = 13;
    const FILLET = 12;
    const PV_HW = 28;
    const PV_HH = 11;
    const LEADER_NUDGE = 22;
    const CHARGE_DOCK = 30;
    // Home chip sits over the house (at the anchor); grid + battery flank it halfway up to the PV chip.
    const homeX = hx;
    const homeY = hy;
    const pvX = hx;
    const pvY = hy - PV_LIFT;
    const sideY = (pvY + homeY) / 2;
    const socX = hx + SIDE;
    const socY = sideY;
    const gridX = hx - SIDE;
    const gridY = sideY;

    const dur = (w: number): number =>
      Math.max(0.6, Math.min(6, (5000 / Math.max(50, Math.abs(w))) * 0.8));
    // `reverse` flips the bead's travel direction on the SAME path (grid export: flow is home -> grid).
    const beaded = (
      path: string,
      color: string,
      w: number,
      reverse = false
    ): string =>
      `<path class="chip-leader" style="stroke:${color}" fill="none" d="${path}"/>` +
      (!this._reducedMotion && Math.abs(w) > IDLE_W
        ? `<circle class="leader-bead" r="3" fill="${color}"><animateMotion dur="${dur(w).toFixed(2)}s" repeatCount="indefinite"${reverse ? ` keyPoints="1;0" keyTimes="0;1" calcMode="linear"` : ""} path="${path}"/></circle>`
        : "");
    const plain = (path: string, color: string): string =>
      `<path class="chip-leader" style="stroke:${color}" fill="none" d="${path}"/>`;
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
    if (p.pv != null && p.home != null) {
      s += beaded(
        `M ${pvX.toFixed(1)},${(pvY + PV_HH).toFixed(1)} L ${homeX.toFixed(1)},${(homeY - PILL_H).toFixed(1)}`,
        solar,
        p.pv
      );
    }
    if (p.grid != null) {
      // Import: grid -> home. Export (grid < -IDLE_W): home -> grid, so reverse the bead. Near 0 it
      // reads as import (consumption colour, no bead) to match the idle grid chip.
      const exporting = p.grid < -IDLE_W;
      s += beaded(
        lToHome(gridX, gridY, LEADER_NUDGE),
        exporting
          ? "var(--energy-grid-return-color)"
          : "var(--energy-grid-consumption-color)",
        p.grid,
        exporting
      );
    }
    if (p.battery != null) {
      if (p.battery < -IDLE_W) {
        // Charging: draw a bead from the actual source into the battery (no battery → home
        // line, since the battery is not supplying the home).
        if (p.pv != null && p.pv > IDLE_W) {
          // From PV when it is producing: bead PV → battery.
          s += beaded(
            lVFirst(pvX + PV_HW / 2, pvY + PV_HH, socX - CHARGE_DOCK, socY),
            solar,
            p.battery
          );
        } else if (p.grid != null && p.grid > IDLE_W) {
          // Grid-fed (PV idle): bead grid → battery. The two chips flank the home, so a
          // straight line would cross the house — route it over the home hub, where both
          // side leaders already meet, and colour it as grid import to show the source.
          const y = socY;
          const topY = homeY - PILL_H;
          const r = Math.min(
            FILLET,
            Math.abs(homeX - PILL_QX - (gridX + LEADER_NUDGE)) / 2,
            Math.abs(topY - y) / 2
          );
          const gsx = gridX + LEADER_NUDGE;
          const gex = homeX - PILL_QX;
          const bex = homeX + PILL_QX;
          const bsx = socX - LEADER_NUDGE;
          const gridToBattery =
            `M ${gsx.toFixed(1)},${y.toFixed(1)} L ${(gex - r).toFixed(1)},${y.toFixed(1)} ` +
            `Q ${gex.toFixed(1)},${y.toFixed(1)} ${gex.toFixed(1)},${(y + r).toFixed(1)} ` +
            `L ${gex.toFixed(1)},${topY.toFixed(1)} L ${bex.toFixed(1)},${topY.toFixed(1)} ` +
            `L ${bex.toFixed(1)},${(y + r).toFixed(1)} Q ${bex.toFixed(1)},${y.toFixed(1)} ${(bex + r).toFixed(1)},${y.toFixed(1)} ` +
            `L ${bsx.toFixed(1)},${y.toFixed(1)}`;
          s += beaded(
            gridToBattery,
            "var(--energy-grid-consumption-color)",
            p.battery
          );
        }
      } else {
        // Idle or discharging: link the battery to the home like the grid leader,
        // with a bead toward the home only while discharging.
        const battColor =
          p.battery >= 0
            ? "var(--energy-battery-out-color)"
            : "var(--energy-battery-in-color)";
        const homeLeader = lToHome(socX, socY, LEADER_NUDGE);
        s +=
          p.battery > IDLE_W
            ? beaded(homeLeader, battColor, p.battery)
            : plain(homeLeader, battColor);
      }
    }
    return s;
  }

  // Tighter than formatPowerShort (1 decimal for kW, whole watts) to stay glanceable, but locale-aware
  // for the unit spacing.
  private _fmtPower(w: number): string {
    const kw = Math.abs(w) >= 1000;
    const unit = kw ? "kW" : "W";
    const value = formatNumber(kw ? w / 1000 : w, this.hass.locale, {
      maximumFractionDigits: kw ? 1 : 0,
    });
    return `${value}${blankBeforeUnit(unit, this.hass.locale)}${unit}`;
  }

  // A non-clickable energy pill.
  private _chip(key: string, icon: string, color: string, value: string) {
    return html`<div class="chip ${key}" style="--chip-color:${color}">
      <ha-icon icon=${icon} aria-hidden="true"></ha-icon>
      <span>${value}</span>
    </div>`;
  }

  // Energy chips around the home, each in its metric colour (present instant).
  private _renderChips() {
    const p = this._power;
    if (!p) return nothing;
    return html`
      ${
        p.home != null
          ? this._chip(
              "home",
              "mdi:home",
              "var(--primary-color)",
              this._fmtPower(p.home)
            )
          : nothing
      }
      ${
        p.pv != null
          ? this._chip(
              "pv",
              "mdi:solar-power",
              "var(--energy-solar-color)",
              this._fmtPower(p.pv)
            )
          : nothing
      }
      ${
        p.grid != null
          ? this._chip(
              "grid",
              Math.abs(p.grid) <= IDLE_W
                ? "mdi:transmission-tower"
                : p.grid > 0
                  ? "mdi:transmission-tower-import"
                  : "mdi:transmission-tower-export",
              p.grid < -IDLE_W
                ? "var(--energy-grid-return-color)"
                : "var(--energy-grid-consumption-color)",
              this._fmtPower(Math.abs(p.grid))
            )
          : nothing
      }
      ${
        p.battery != null
          ? this._chip(
              "battery",
              p.soc != null ? batteryLevelIcon(p.soc) : "mdi:battery",
              p.battery >= 0
                ? "var(--energy-battery-out-color)"
                : "var(--energy-battery-in-color)",
              this._fmtPower(Math.abs(p.battery))
            )
          : nothing
      }
    `;
  }

  // Screen-reader summary of the live scene (the SVG + chips are otherwise decorative). Localised, and
  // built from the same values + thresholds as the chips.
  private _ariaLabel(): string {
    const title =
      this._config.title ||
      this.hass.localize("ui.panel.energy.cards.energy_solar_scene_title");
    const p = this._power;
    if (!p) return title;
    const a11y = (k: string, value: string): string =>
      this.hass.localize(
        `ui.panel.energy.cards.energy_solar_scene_a11y.${k}` as LocalizeKeys,
        { value }
      );
    const pct = (v: number): string =>
      `${Math.round(v)}${blankBeforeUnit("%", this.hass.locale)}%`;
    const parts: string[] = [];
    if (p.pv != null) parts.push(a11y("solar", this._fmtPower(p.pv)));
    if (p.home != null) parts.push(a11y("home", this._fmtPower(p.home)));
    if (p.grid != null && p.grid > IDLE_W) {
      parts.push(a11y("grid_import", this._fmtPower(p.grid)));
    } else if (p.grid != null && p.grid < -IDLE_W) {
      parts.push(a11y("grid_export", this._fmtPower(-p.grid)));
    }
    if (p.battery != null && p.battery > IDLE_W) {
      parts.push(a11y("battery_discharge", this._fmtPower(p.battery)));
    } else if (p.battery != null && p.battery < -IDLE_W) {
      parts.push(a11y("battery_charge", this._fmtPower(-p.battery)));
    }
    if (p.soc != null) parts.push(a11y("battery_soc", pct(p.soc)));
    return parts.length ? `${title}: ${parts.join(", ")}` : title;
  }

  protected render() {
    if (!this._config || !this.hass || !hasLocation(this.hass)) {
      return nothing;
    }
    return html`
      <ha-card>
        <div class="wrap" role="img" aria-label=${this._ariaLabel()}>
          ${
            this._config.title
              ? html`<div class="title">${this._config.title}</div>`
              : nothing
          }
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
          ${this._renderChips()}
          <div
            class="drag"
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @pointercancel=${this._onPointerUp}
          ></div>
          ${
            this._showAttribution
              ? html`<div class="attribution">
                  &copy;
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noopener noreferrer"
                    >OpenStreetMap</a
                  >, &copy;
                  <a
                    href="https://carto.com/attributions"
                    target="_blank"
                    rel="noopener noreferrer"
                    >CARTO</a
                  >
                </div>`
              : nothing
          }
        </div>
      </ha-card>
    `;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
    }
    /* Same height as a sibling chart card (e.g. Power sources) without its layout: _draw sizes .wrap
       in JS to max(width / 2, 200px) [the chart's own formula] + the title band it would have, so the
       full-bleed scene reclaims the header space. min-height is just a pre-layout fallback. */
    .wrap {
      position: relative;
      width: 100%;
      min-height: 200px;
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      background: var(--ha-card-background, var(--card-background-color, #fff));
      isolation: isolate;
    }
    /* Overlaid title: same style/padding as a real ha-card header (so the band looks native), but the
       scene draws behind it — its rendered height is what _draw reclaims. */
    .title {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 14;
      padding: var(--ha-space-3) var(--ha-space-4) var(--ha-space-4);
      color: var(--ha-card-header-color, var(--primary-text-color));
      font-size: var(--ha-card-header-font-size, var(--ha-font-size-2xl));
      line-height: var(--ha-line-height-expanded);
      letter-spacing: -0.012em;
      font-weight: var(--ha-font-weight-normal);
      pointer-events: none;
    }
    .viewport {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
    }
    /* perspective must be on the canvas's DIRECT parent, else the ground flattens and slides apart
       from the content on rotation */
    #ground {
      position: absolute;
      inset: 0;
      perspective: ${PERSPECTIVE}px;
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
    /* Fallback ground: flat theme-coloured plane. After .ground so filter:none wins (don't invert it). */
    .ground-flat {
      background: var(--ha-card-background, var(--card-background-color, #fff));
      filter: none;
    }
    .ground-fade {
      position: absolute;
      left: 0;
      top: 0;
      will-change: transform;
      pointer-events: none;
      background: radial-gradient(
        circle closest-side at 50% 50%,
        transparent 0%,
        transparent ${GROUND_FADE_START}%,
        var(--ha-card-background, var(--card-background-color, #fff)) 100%
      );
    }
    .layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .drag {
      position: absolute;
      inset: 0;
      z-index: 1;
      cursor: grab;
      /* Allow vertical page scroll by default; hold-to-rotate switches this to none while dragging. */
      touch-action: pan-y;
    }
    .drag:active {
      cursor: grabbing;
    }
    /* CARTO/OSM basemap attribution (required). Bottom-right, above the drag layer so links stay
       clickable, with a faint plate so it reads over any tile. */
    .attribution {
      position: absolute;
      right: 4px;
      bottom: 4px;
      z-index: 13;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.4);
      color: rgba(255, 255, 255, 0.9);
      font-size: 10px;
      line-height: 1.5;
      pointer-events: auto;
    }
    .attribution a {
      color: inherit;
      text-decoration: underline;
    }
    /* Depth-split layers: arc/disc pass behind the house on the far side, in front on the near side.
       z: house 1, arc back 4 / far 5 / near 11, leaders 5, ray 7, chips 8 (home 9), sun 5|12. */
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
    .solar-arc-outline {
      stroke: rgba(0, 0, 0, 0.35);
      stroke-linecap: round;
    }
    .solar-arc-segment {
      stroke-linecap: round;
    }
    /* Sunrise / sunset time labels outside the arc; dark halo (paint-order) for legibility on the map. */
    .sun-time {
      fill: var(--secondary-text-color);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      paint-order: stroke;
      stroke: var(--card-background-color, #000);
      stroke-width: 2.5px;
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
      stroke-width: 1;
      stroke-dasharray: 5 6;
      stroke-opacity: 0.6;
      stroke-linecap: round;
      animation: solar-ray-flow var(--sun-flow-duration, 1.2s) linear infinite;
    }
    /* Frozen while the camera is dragged (the layer is rebuilt every frame — see _renderSky). */
    .solar-ray.is-static {
      animation: none;
    }
    @keyframes solar-ray-flow {
      from {
        stroke-dashoffset: 0;
      }
      to {
        stroke-dashoffset: -11;
      }
    }
    /* Reduced motion: freeze the dashed ray flow (looping beads are dropped in the SVG too). */
    @media (prefers-reduced-motion: reduce) {
      .solar-ray {
        animation: none;
      }
    }
    /* Energy chips: anchored to the home via the --home-x / --home-y vars with a fixed per-chip offset.
       Cluster: home over the house, PV top-centre, grid left and battery right halfway between the
       home and PV chips. Offsets mirror the leader geometry in _renderLeaders. z 9 keeps the home
       chip above the others. */
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
    .chip ha-icon {
      --mdc-icon-size: 16px;
      color: inherit;
    }
    .chip.home {
      z-index: 9;
      transform: translate(-50%, -50%);
    }
    .chip.pv {
      transform: translate(-50%, calc(-50% - 98px));
    }
    .chip.grid {
      transform: translate(calc(-50% - 84px), calc(-50% - 49px));
    }
    .chip.battery {
      transform: translate(calc(-50% + 84px), calc(-50% - 49px));
    }
    .chip-leader {
      stroke-width: 1;
      stroke-linecap: round;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-solar-scene-now-card": HuiEnergySolarSceneNowCard;
  }
}
