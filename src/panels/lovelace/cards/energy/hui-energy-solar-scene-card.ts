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
  height_scale: 1.5,
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
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: EnergySolarSceneCardConfig & typeof DEFAULTS;
  @state() private _live = true;

  private _minuteOfDay = HuiEnergySolarSceneCard._nowMinutes();
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

  private static _nowMinutes(): number {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  public setConfig(config: EnergySolarSceneCardConfig): void {
    this._config = { ...DEFAULTS, ...config };
    this._tilt = this._config.tilt_deg;
  }

  public getCardSize(): number {
    return 6;
  }

  private _resizeObserver = new ResizeObserver(() => this._scheduleDraw());

  public connectedCallback(): void {
    super.connectedCallback();
    this._resizeObserver.observe(this);
    this._connectSync();
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
      this._live = state.live;
      this._minuteOfDay = state.minute;
      this._scheduleDraw();
    });
  }

  protected firstUpdated(): void {
    this._maybeBuild();
  }

  protected updated(changedProps: PropertyValues): void {
    this._connectSync();
    this._maybeBuild();
    if (changedProps.has("hass") && this.hass && this._live) this._draw();
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
        this._draw();
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
          this._draw();
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

  private _activeMinute(): number {
    return this._live
      ? HuiEnergySolarSceneCard._nowMinutes()
      : this._minuteOfDay;
  }

  private _activeDate(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return new Date(date.valueOf() + this._activeMinute() * 60000);
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

  // Project (east, north, up) metres to screen px: bearing, then pitch, then perspective. Mirrors
  // the ground canvas's CSS transform so everything stays glued together as the camera turns.
  private _project(eastM: number, northM: number, upM: number): Point {
    const bearing = this._bearing * DEG;
    const tilt = this._tilt * DEG;
    const x = eastM * this._pxPerMetre;
    const y = -northM * this._pxPerMetre;
    const z = upM * this._pxPerMetre;
    const rx = x * Math.cos(bearing) - y * Math.sin(bearing);
    const ry = x * Math.sin(bearing) + y * Math.cos(bearing);
    const cameraZ = ry * Math.sin(tilt) + z * Math.cos(tilt);
    const p = this._config.perspective / (this._config.perspective - cameraZ);
    return [
      this._centreX + rx * p,
      this._centreY + (ry * Math.cos(tilt) - z * Math.sin(tilt)) * p,
    ];
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

    this.style.setProperty(
      "--map-filter",
      this.hass?.themes?.darkMode ? DARK_FILTER : "none"
    );
    if (this._ground) {
      const { canvas, homeX, homeY } = this._ground;
      canvas.style.transformOrigin = `${homeX}px ${homeY}px`;
      canvas.style.transform = `translate(${this._centreX - homeX}px, ${this._centreY - homeY}px) rotateX(${this._tilt}deg) rotateZ(${this._bearing}deg)`;
    }

    const { latitude, longitude } = this.hass.config;
    const date = this._activeDate();
    const sun = sunPosition(date, latitude, longitude);

    svg.innerHTML = [
      this._renderNightShade(sun.altitude, width, height),
      this._renderShadows(sun),
      this._renderBuildings(sun.altitude),
      this._renderSky(sun, date, width, height),
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

  private _renderBuildings(altitude: number): string {
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
        this._project(p[0], p[1], b.height * this._config.height_scale)
      );
      const roofFill = tintedRgba(
        b.isHome ? "#7494d6" : "#93a6c2",
        altitude,
        b.isHome ? 0.97 : 0.16
      );
      const wallFill = tintedRgba(
        b.isHome ? "#4a608c" : "#93a6c2",
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

  // Big screen-space sky dome (like Helios scales its arc to the view), tilted/rotated with the camera.
  private _renderSky(
    sun: { azimuth: number; altitude: number },
    date: Date,
    width: number,
    height: number
  ): string {
    const { latitude, longitude } = this.hass.config;
    const radius = Math.min(width * 0.34, height * 0.92);
    const onDome = (azimuth: number, altitude: number): Point => {
      const elev = Math.max(0, altitude) * DEG;
      const az = azimuth * DEG;
      const bearing = this._bearing * DEG;
      const tilt = this._tilt * DEG;
      const x = Math.cos(elev) * Math.sin(az) * radius;
      const y = -Math.cos(elev) * Math.cos(az) * radius;
      const z = Math.sin(elev) * radius;
      const rx = x * Math.cos(bearing) - y * Math.sin(bearing);
      const ry = x * Math.sin(bearing) + y * Math.cos(bearing);
      return [
        this._centreX + rx,
        this._centreY + (ry * Math.cos(tilt) - z * Math.sin(tilt)),
      ];
    };

    const arc: string[] = [];
    const midnight = new Date(date);
    midnight.setHours(0, 0, 0, 0);
    for (let minute = 0; minute <= 1440; minute += 15) {
      const at = sunPosition(
        new Date(midnight.valueOf() + minute * 60000),
        latitude,
        longitude
      );
      if (at.altitude > 0) {
        const [x, y] = onDome(at.azimuth, at.altitude);
        arc.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    }
    const [sx, sy] = onDome(sun.azimuth, Math.max(sun.altitude, 0));
    const isNight = sun.altitude <= 0;
    const color = isNight
      ? "#3a4a63"
      : sun.altitude < 12
        ? "#ff8a3d"
        : "#ffc107";
    const arcLine = arc.length
      ? `<polyline points="${arc.join(" ")}" fill="none" stroke="rgba(255,200,80,0.5)" stroke-width="2" stroke-dasharray="2 4"/>`
      : "";
    return `${arcLine}
      <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="13" fill="${color}" opacity="${isNight ? 0.4 : 0.95}"/>
      <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="22" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.4"/>`;
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    return html`
      <ha-card>
        <div class="wrap">
          <div class="title">${this._config.title}</div>
          <div class="viewport"><div id="ground"></div></div>
          <svg class="overlay" xmlns="http://www.w3.org/2000/svg"></svg>
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
      color: #fff;
      font-size: var(--ha-card-header-font-size, var(--ha-font-size-2xl, 24px));
      line-height: 1.2;
      text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7);
      pointer-events: none;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-solar-scene-card": HuiEnergySolarSceneCard;
  }
}
