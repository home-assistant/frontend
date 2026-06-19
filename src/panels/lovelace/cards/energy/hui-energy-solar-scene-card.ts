// Faux-3D solar overview card. The ground is the CARTO basemap (Map-panel style) stitched into one
// seam-free <canvas> used as a tilted/orbiting plane via a CSS 3D transform; OpenStreetMap building
// footprints are extruded with a projection that mirrors that transform, so the whole scene turns
// together. No map/geometry library (just <canvas>, <svg>, fetch) so it runs on a Raspberry Pi 0.
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../energy/constants";
import type { SolarSceneSync } from "./common/solar-scene-sync";
import { getSolarSceneSync } from "./common/solar-scene-sync";
import "../../../../components/ha-icon";
import "./common/hui-energy-graph-chip";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { getEnergyDataCollection } from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { formatShortDateTime } from "../../../../common/datetime/format_date_time";

type Point = [number, number];

const DEG = Math.PI / 180;
const EARTH_CIRCUMFERENCE_M = 40075016.686;

// Solar position (SunCalc-derived): azimuth from NORTH clockwise, altitude, both in degrees.
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
      )
        out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return half(sorted).concat(half(sorted.reverse()));
}

// Web Mercator: lon/lat -> fractional tile coordinates at the given zoom.
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
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)
      inside = !inside;
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

// Ambient colour ported from the standalone Helios engine/lighting.ts (pure of sun altitude).
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mixHex(hexA: string, hexB: string, t: number): string {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(
      ((a >> shift) & 255) + (((b >> shift) & 255) - ((a >> shift) & 255)) * t
    );
  return (
    "#" +
    ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1)
  );
}

function nightShade(altitude: number): { color: string; opacity: number } {
  if (altitude < -12) return { color: "#02040c", opacity: 0.68 };
  if (altitude < -6)
    return { color: "#040824", opacity: lerp(0.5, 0.68, (-altitude - 6) / 6) };
  if (altitude < 0)
    return { color: "#0a1240", opacity: lerp(0.5, 0.3, (altitude + 6) / 6) };
  if (altitude < 6)
    return { color: "#3a1408", opacity: lerp(0.3, 0.1, altitude / 6) };
  if (altitude < 20)
    return { color: "#3a1408", opacity: lerp(0.1, 0, (altitude - 6) / 14) };
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
  const c = parseInt(buildingColor(base, altitude).slice(1), 16);
  return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${opacity})`;
}

// Resolve a HA CSS custom property (hex or rgb) to a #rrggbb string.
function cssHex(
  styles: CSSStyleDeclaration,
  name: string,
  fallback: string
): string {
  const raw = styles.getPropertyValue(name).trim();
  if (!raw) return fallback;
  if (raw.startsWith("#"))
    return raw.length === 4
      ? "#" +
          raw
            .slice(1)
            .split("")
            .map((c) => c + c)
            .join("")
      : raw.slice(0, 7);
  const m = raw.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return m
    ? "#" +
        [m[1], m[2], m[3]]
          .map((n) => Number(n).toString(16).padStart(2, "0"))
          .join("")
    : fallback;
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
  height_scale?: number;
  osm_radius_m?: number;
  home_radius_m?: number;
  default_height_m?: number;
}

const DEFAULTS = {
  ground_zoom: 19,
  ground_radius: 3, // 7x7 @256px = 1792px canvas, under the 2048 GPU limit (Pi-0 safe)
  tilt_deg: 50,
  perspective: 1200,
  target_height_m: 10, // aim 10 m above the home (like Helios) to open up the sky
  height_scale: 1.0, // real OSM render height, matching Helios (no exaggeration)
  osm_radius_m: 100,
  home_radius_m: 15, // every building within 15 m of the GPS point is "the home"
  default_height_m: 6,
};

const TILE_PX = 256;
const PITCH_MIN = 15; // Helios CAMERA_PITCH_MIN/MAX_DEG
const PITCH_MAX = 55;
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

  private _sync?: SolarSceneSync;
  private _unsub?: () => void;
  private _bearing = 0;
  private _tilt = DEFAULTS.tilt_deg;
  private _pxPerMetre = 4;
  private _centreX = 0;
  private _centreY = 0;
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
        this._period = { start: data.start, end: data.end };
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
    this._unsub = this._sync.subscribe((state) => {
      this._instant = state.instant;
      this._scheduleDraw();
    });
  }

  protected firstUpdated(): void {
    this._maybeBuild();
  }

  protected updated(changedProps: PropertyValues): void {
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
    for (let col = 0; col < across; col++)
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
    await Promise.all(loads);

    const holder = this.renderRoot.querySelector("#ground");
    if (holder) {
      holder.innerHTML = "";
      holder.appendChild(canvas);
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
        Date.now() - cached.time < 30 * 86400000
      ) {
        this._buildings = cached.buildings;
        this._startGrowth();
        return;
      }
    } catch {
      /* ignore corrupt cache */
    }

    const radius = this._config.osm_radius_m;
    const query = `[out:json][timeout:25];(way["building"](around:${radius},${lat},${lng}););out geom;`;
    // Try a couple of CORS-enabled mirrors: the main one rate-limits (406) under repeated loads.
    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ];
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(
          endpoint + "?data=" + encodeURIComponent(query)
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
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }
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
      )
        footprint.pop();
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
      for (const b of buildings)
        if (
          b.centerX ** 2 + b.centerY ** 2 <
          closest.centerX ** 2 + closest.centerY ** 2
        )
          closest = b;
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
      this._growth = 1 - Math.pow(1 - t, 3);
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
    const svg = this.renderRoot.querySelector(
      ".overlay"
    ) as SVGSVGElement | null;
    if (!svg) return;
    const wrap = this.renderRoot.querySelector(".wrap") as HTMLElement | null;
    const width = wrap?.clientWidth || 600;
    const height = wrap?.clientHeight || 480;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

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

    svg.innerHTML = [
      this._renderNightShade(sun.altitude, width, height),
      this._renderShadows(sun),
      this._renderBuildings(sun.altitude, palette),
      this._renderSky(sun, date, width, height, palette),
    ].join("");
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
  // (no double-darkening) without a polygon-union dependency, composited on the GPU.
  private _renderShadows(sun: { azimuth: number; altitude: number }): string {
    if (sun.altitude <= 2) return "";
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
      inner += `<polygon points="${pointsAttr(convexHull([...base, ...cast]))}" fill="#070b14"/>`;
    }
    return inner ? `<g opacity="0.34">${inner}</g>` : "";
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
      const base = b.footprint.map((p) => this._project(p[0], p[1], 0));
      const roof = b.footprint.map((p) =>
        this._project(
          p[0],
          p[1],
          b.height * this._config.height_scale * this._growth
        )
      );
      const roofFill = tintedRgba(
        b.isHome ? mixHex(palette.home, "#ffffff", 0.18) : palette.neighbor,
        altitude,
        b.isHome ? 0.97 : 0.16
      );
      const wallFill = tintedRgba(
        b.isHome ? mixHex(palette.home, "#000000", 0.22) : palette.neighbor,
        altitude,
        b.isHome ? 0.95 : 0.11
      );
      const stroke = b.isHome ? "rgba(0,0,0,0.3)" : "rgba(200,215,240,0.16)";

      const walls: { depth: number; svg: string }[] = [];
      for (let i = 0; i < base.length; i++) {
        const next = (i + 1) % base.length;
        // back-face cull: drop walls whose outward normal faces away from the camera
        const edgeE = b.footprint[next][0] - b.footprint[i][0];
        const edgeN = b.footprint[next][1] - b.footprint[i][1];
        if (edgeN * Math.sin(bearing) + edgeE * Math.cos(bearing) <= 0)
          continue;
        walls.push({
          depth: (base[i][1] + base[next][1]) / 2,
          svg: `<polygon points="${pointsAttr([base[i], base[next], roof[next], roof[i]])}" fill="${wallFill}" stroke="${stroke}" stroke-width="0.4"/>`,
        });
      }
      walls.sort((a, b) => a.depth - b.depth);
      svg += walls.map((w) => w.svg).join("");
      svg += `<polygon points="${pointsAttr(roof)}" fill="${roofFill}" stroke="${stroke}" stroke-width="0.6"/>`;
    }
    return svg;
  }

  // Sun path on a dome around the home, ported from the Helios arc: depth-modulated stroke (far
  // thin, near thick), dark outline under a sun-colour pass, dotted underground leg, and a
  // four-layer disc whose inner fill and halo scale with (clear-sky) irradiance.
  private _renderSky(
    sun: { azimuth: number; altitude: number },
    date: Date,
    width: number,
    height: number,
    palette: { sun: string }
  ): string {
    const { latitude, longitude } = this.hass.config;
    const DRAW_ALT = -12; // draw a short dotted dip below the horizon

    // World-space arc like Helios: a celestial dome of radius R metres around the home, projected
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
      for (let minute = 0; minute <= 1440; minute += 15)
        samples.push(
          sunPosition(new Date(dayKey + minute * 60000), latitude, longitude)
        );
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

    // Two passes (all dark outlines, then all coloured segments) so the outline is a continuous rim.
    let outlines = "";
    let segments = "";
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
      outlines += `<line class="solar-arc-outline${cls}" ${coords} stroke-width="${ow.toFixed(2)}"/>`;
      segments += `<line class="solar-arc-segment${cls}" ${coords} stroke="${arcColor((a.alt + b.alt) / 2, palette.sun)}" stroke-width="${sw.toFixed(2)}"/>`;
    }
    const arc = outlines + segments;

    const sunX = s.x;
    const sunY = s.y;
    const wm2 = Math.max(0, 1000 * Math.sin(Math.max(0, sun.altitude) * DEG));
    const fill = Math.sqrt(Math.min(1, wm2 / 1000));
    const r = (10 + 10 * near(s.depth)) * scale;
    const day = sun.altitude > -2;
    const ray =
      day && fill > 0
        ? `<line class="solar-ray" style="--sun-flow-duration:${(1.6 - fill).toFixed(2)}s" x1="${sunX.toFixed(1)}" y1="${sunY.toFixed(1)}" x2="${home.x.toFixed(1)}" y2="${home.y.toFixed(1)}" stroke="${palette.sun}"/>`
        : "";
    this._positionSunChip(sunX, sunY, Math.round(wm2), day);
    const c = `cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}"`;
    return `${arc}${ray}
      <defs><radialGradient id="solar-halo">
        <stop offset="0%" stop-color="${palette.sun}" stop-opacity="${(fill * 0.55).toFixed(3)}"/>
        <stop offset="100%" stop-color="${palette.sun}" stop-opacity="0"/>
      </radialGradient></defs>
      <circle ${c} r="${(r * 3).toFixed(1)}" fill="url(#solar-halo)"/>
      <circle ${c} r="${r.toFixed(1)}" fill="${palette.sun}" fill-opacity="0.2"/>
      <circle ${c} r="${(r * fill).toFixed(1)}" fill="${palette.sun}"/>
      <circle ${c} r="${r.toFixed(1)}" fill="none" stroke="${palette.sun}" stroke-width="1.5"/>`;
  }

  private _positionSunChip(
    x: number,
    y: number,
    wm2: number,
    visible: boolean
  ): void {
    const chip = this.renderRoot.querySelector(
      ".sun-chip"
    ) as HTMLElement | null;
    if (!chip) return;
    chip.hidden = !visible;
    if (!visible) return;
    const value = chip.querySelector("span");
    if (value) value.textContent = `${wm2} W/m²`;
    // Safety net: keep the chip on screen even if the sun reaches a corner.
    const wrap = this.renderRoot.querySelector(".wrap") as HTMLElement | null;
    const w = wrap?.clientWidth ?? 0;
    const half = chip.offsetWidth / 2 + 4;
    chip.style.left = `${w ? Math.max(half, Math.min(w - half, x)) : x}px`;
    chip.style.top = `${Math.max(28, y - 18)}px`;
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
          <svg class="overlay" xmlns="http://www.w3.org/2000/svg"></svg>
          <div class="sun-chip" hidden>
            <ha-icon icon="mdi:white-balance-sunny"></ha-icon>
            <span></span>
          </div>
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
      height: 480px;
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      background: linear-gradient(#0c1d33 0%, #14283f 45%, #0b1622 100%);
    }
    .title {
      position: absolute;
      top: 12px;
      left: 16px;
      z-index: 3;
      color: var(--primary-text-color);
      font-size: var(--ha-card-header-font-size, var(--ha-font-size-2xl, 24px));
      line-height: 1.2;
      pointer-events: none;
    }
    .chip-row {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 3;
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
    .live-chip ha-icon {
      --mdc-icon-size: 20px;
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
    .overlay {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
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
      z-index: 3;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-solar-scene-card": HuiEnergySolarSceneCard;
  }
}
