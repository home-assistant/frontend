// PROTOTYPE: faux-3D solar overview built on Leaflet (an existing HA dependency)
// instead of MapLibre. Single self-contained file on purpose for now. The map is an
// aerial basemap; the house, sun arc and sweeping cast shadow are 2D/SVG overlays
// anchored to the home lat/lon. Reads a forecast integration's entities when present,
// with a mock fallback so it renders anywhere.
/* eslint-disable */
// @ts-nocheck
import type { Map as LeafletMap } from "leaflet";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { setupLeafletMap } from "../../../../common/dom/setup-leaflet-map";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";

// --- solar position (SunCalc-derived). azimuth from NORTH clockwise, altitude in deg ---
const RAD = Math.PI / 180;
const OBLIQUITY = RAD * 23.4397;
const toDays = (d: Date) => d.valueOf() / 86400000 - 0.5 + 2440588 - 2451545;
const solarMeanAnomaly = (d: number) => RAD * (357.5291 + 0.98560028 * d);
const eclipticLongitude = (M: number) =>
  M +
  RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) +
  RAD * 102.9372 +
  Math.PI;
const declination = (l: number) => Math.asin(Math.sin(OBLIQUITY) * Math.sin(l));
const rightAscension = (l: number) =>
  Math.atan2(Math.cos(OBLIQUITY) * Math.sin(l), Math.cos(l));
const siderealTime = (d: number, lw: number) =>
  RAD * (280.16 + 360.9856235 * d) - lw;

function sunPosition(date: Date, lat: number, lng: number) {
  const lw = RAD * -lng;
  const phi = RAD * lat;
  const d = toDays(date);
  const L0 = eclipticLongitude(solarMeanAnomaly(d));
  const dec = declination(L0);
  const H = siderealTime(d, lw) - rightAscension(L0);
  const altitude = Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)
  );
  let azimuth =
    Math.atan2(
      Math.sin(H),
      Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)
    ) + Math.PI;
  azimuth = (((azimuth / RAD) % 360) + 360) % 360;
  return { azimuth, altitude: altitude / RAD };
}

// Andrew's monotone-chain convex hull, for the cast-shadow outline.
function convexHull(points: [number, number][]): [number, number][] {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}
const ptsToStr = (pts: [number, number][]) =>
  pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

@customElement("hui-energy-overview")
export class HuiEnergyOverviewCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config: any = {};
  @state() private _label = "";
  @state() private _prodW: number | null = null;
  @state() private _ghi: number | null = null;
  @state() private _cloud: number | null = null;
  @state() private _live = true;

  private _map?: LeafletMap;
  private _Lf: any;
  private _minute = new Date().getHours() * 60 + new Date().getMinutes();
  private _forecast: { t: number; w: number }[] = [];

  public setConfig(config: any): void {
    this._config = {
      zoom: 19,
      house_width_m: 10,
      house_depth_m: 8,
      house_height_m: 6,
      house_bearing_deg: 0,
      ...config,
    };
  }

  public getCardSize(): number {
    return 6;
  }

  protected firstUpdated(): void {
    this._initMap();
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has("hass") && this.hass) {
      this._readData();
      if (this._live) this._drawOverlay();
    }
  }

  private async _initMap(): Promise<void> {
    const lat = this.hass?.config?.latitude ?? 48.8584;
    const lng = this.hass?.config?.longitude ?? 2.2945;
    const mapEl = this.renderRoot.querySelector("#map") as HTMLElement;
    const [map, Leaflet, tileLayer] = await setupLeafletMap(mapEl, {
      latitude: lat,
      longitude: lng,
      zoom: this._config.zoom,
    });
    // Swap CARTO street tiles for Esri aerial imagery (a flat basemap; the "3D" is faked above it).
    map.removeLayer(tileLayer);
    Leaflet.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 21, maxNativeZoom: 19, attribution: "&copy; Esri" }
    ).addTo(map);
    this._map = map;
    this._Lf = Leaflet;
    map.on("move zoom moveend resize", () => this._drawOverlay());
    setTimeout(() => {
      map.invalidateSize();
      this._readData();
      this._drawOverlay();
    }, 60);
  }

  // --- data --------------------------------------------------------------
  private _findEntity(needle: string): any {
    const states = this.hass?.states ?? {};
    for (const id of Object.keys(states))
      if (id.startsWith("sensor.") && id.includes(needle)) return states[id];
    return undefined;
  }

  private _readData(): void {
    if (!this.hass) return;
    const cfg = this._config;
    const powerObj = cfg.power_entity
      ? this.hass.states[cfg.power_entity]
      : this._findEntity("power_now");
    const fc = powerObj?.attributes?.forecast as
      | { datetime: string; watts: number }[]
      | undefined;
    if (Array.isArray(fc)) {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      this._forecast = fc
        .map((p) => ({
          t: (new Date(p.datetime).valueOf() - midnight.valueOf()) / 60000,
          w: p.watts,
        }))
        .filter((p) => p.t >= -60 && p.t <= 24 * 60 + 60);
    }
    const ghiObj = cfg.ghi_entity ? this.hass.states[cfg.ghi_entity] : this._findEntity("_ghi");
    this._ghi = ghiObj ? parseFloat(ghiObj.state) : null;
    const cloudObj = cfg.cloud_entity
      ? this.hass.states[cfg.cloud_entity]
      : this._findEntity("cloud_cover");
    this._cloud = cloudObj ? parseFloat(cloudObj.state) : null;
    this._refreshReadouts();
  }

  private _prodAt(minute: number): number | null {
    if (!this._forecast.length) {
      const x = (minute - 780) / 240;
      return Math.max(0, Math.round(4200 * Math.exp(-x * x)));
    }
    let lo = this._forecast[0];
    let hi = this._forecast[this._forecast.length - 1];
    for (let i = 0; i < this._forecast.length - 1; i++)
      if (this._forecast[i].t <= minute && this._forecast[i + 1].t >= minute) {
        lo = this._forecast[i];
        hi = this._forecast[i + 1];
        break;
      }
    const span = hi.t - lo.t || 1;
    return Math.round(lo.w + ((hi.w - lo.w) * (minute - lo.t)) / span);
  }

  private _refreshReadouts(): void {
    const minute = this._live
      ? new Date().getHours() * 60 + new Date().getMinutes()
      : this._minute;
    this._prodW = this._prodAt(minute);
    const h = Math.floor(minute / 60);
    const m = Math.floor(minute % 60);
    this._label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  private _currentDate(): Date {
    const d = new Date();
    const minute = this._live ? d.getHours() * 60 + d.getMinutes() : this._minute;
    d.setHours(0, 0, 0, 0);
    return new Date(d.valueOf() + minute * 60000);
  }

  // --- scrub -------------------------------------------------------------
  private _onScrub(e: Event): void {
    this._minute = Number((e.target as HTMLInputElement).value);
    this._live = false;
    this._refreshReadouts();
    this._drawOverlay();
  }
  private _toggleLive(): void {
    this._live = !this._live;
    if (this._live) this._minute = new Date().getHours() * 60 + new Date().getMinutes();
    this._refreshReadouts();
    this._drawOverlay();
  }

  // --- the faux-3D overlay ----------------------------------------------
  private _drawOverlay(): void {
    const svg = this.renderRoot.querySelector(".overlay") as SVGSVGElement | null;
    if (!svg || !this._map) return;
    const size = this._map.getSize();
    const W = size.x;
    const Hgt = size.y;
    svg.setAttribute("viewBox", `0 0 ${W} ${Hgt}`);

    const lat = this.hass?.config?.latitude ?? 48.8584;
    const lng = this.hass?.config?.longitude ?? 2.2945;
    const home = this._map.latLngToContainerPoint([lat, lng]);
    const north = this._map.latLngToContainerPoint([lat + 10 / 111320, lng]);
    const pxPerM = Math.hypot(north.x - home.x, north.y - home.y) / 10;

    const date = this._currentDate();
    const sun = sunPosition(date, lat, lng);
    const night = sun.altitude <= 0;

    const hw = (this._config.house_width_m / 2) * pxPerM;
    const hd = (this._config.house_depth_m / 2) * pxPerM;
    const bear = this._config.house_bearing_deg * RAD;
    const cosB = Math.cos(bear);
    const sinB = Math.sin(bear);
    const rot = (dx: number, dy: number): [number, number] => [
      home.x + dx * cosB - dy * sinB,
      home.y + dx * sinB + dy * cosB,
    ];
    const base: [number, number][] = [rot(-hw, -hd), rot(hw, -hd), rot(hw, hd), rot(-hw, hd)];
    const heightPx = this._config.house_height_m * pxPerM;
    const top: [number, number][] = base.map((p) => [p[0], p[1] - heightPx]);

    let shadowPoly = "";
    if (!night && sun.altitude > 2) {
      const lenM = Math.min(this._config.house_height_m / Math.tan(sun.altitude * RAD), 60);
      const sb = (sun.azimuth + 180) * RAD;
      const ox = Math.sin(sb) * lenM * pxPerM;
      const oy = -Math.cos(sb) * lenM * pxPerM;
      const swept = convexHull([
        ...base,
        ...base.map((p) => [p[0] + ox, p[1] + oy] as [number, number]),
      ]);
      shadowPoly = `<polygon points="${ptsToStr(swept)}" fill="rgba(10,15,25,0.42)" />`;
    }

    const horizonY = Hgt * 0.42;
    const arcH = Hgt * 0.34;
    const azToX = (az: number) => W * ((az - 90) / 180);
    const altToY = (alt: number) => horizonY - (Math.max(0, alt) / 70) * arcH;
    const arc: string[] = [];
    const d0 = new Date(date);
    d0.setHours(0, 0, 0, 0);
    for (let mn = 0; mn <= 1440; mn += 15) {
      const s = sunPosition(new Date(d0.valueOf() + mn * 60000), lat, lng);
      if (s.altitude > 0 && s.azimuth >= 90 && s.azimuth <= 270)
        arc.push(`${azToX(s.azimuth).toFixed(1)},${altToY(s.altitude).toFixed(1)}`);
    }
    const sunX = azToX(sun.azimuth);
    const sunY = altToY(sun.altitude);
    const sunColor = night ? "#3a4a63" : sun.altitude < 12 ? "#ff8a3d" : "#ffc107";

    const wall = (a, b) =>
      `<polygon points="${a[0].toFixed(1)},${a[1].toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)} ${b[0].toFixed(1)},${(b[1] - heightPx).toFixed(1)} ${a[0].toFixed(1)},${(a[1] - heightPx).toFixed(1)}" fill="rgba(60,70,86,0.92)" stroke="rgba(0,0,0,0.3)" stroke-width="0.5"/>`;

    svg.innerHTML = `
      ${shadowPoly}
      <line x1="0" y1="${horizonY}" x2="${W}" y2="${horizonY}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
      ${arc.length ? `<polyline points="${arc.join(" ")}" fill="none" stroke="rgba(255,200,80,0.5)" stroke-width="2" stroke-dasharray="3 4"/>` : ""}
      ${!night ? `<line x1="${sunX.toFixed(1)}" y1="${sunY.toFixed(1)}" x2="${home.x.toFixed(1)}" y2="${home.y.toFixed(1)}" stroke="rgba(255,200,80,0.28)" stroke-width="1.5" stroke-dasharray="2 5"/>` : ""}
      <circle cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" r="13" fill="${sunColor}" opacity="${night ? 0.4 : 0.95}"/>
      <circle cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" r="22" fill="none" stroke="${sunColor}" stroke-width="1.5" opacity="0.4"/>
      ${wall(base[3], base[2])}
      ${wall(base[2], base[1])}
      <polygon points="${ptsToStr(top)}" fill="rgba(120,135,155,0.95)" stroke="rgba(255,255,255,0.25)" stroke-width="0.75"/>
    `;
  }

  protected render() {
    return html`
      <ha-card>
        <div class="wrap">
          <div id="map"></div>
          <svg class="overlay" xmlns="http://www.w3.org/2000/svg"></svg>
          <div class="chips">
            <div class="chip">
              <span class="dot" style="background:#ff9800"></span>
              ${this._prodW ?? "--"} <small>W produced</small>
            </div>
            <div class="chip">
              <span class="dot" style="background:#ffc107"></span>
              ${this._ghi != null ? Math.round(this._ghi) : "--"} <small>W/m² irradiance</small>
            </div>
            <div class="chip">
              <span class="dot" style="background:#90a4ae"></span>
              ${this._cloud != null ? Math.round(this._cloud) : "--"} <small>% cloud</small>
            </div>
          </div>
          <div class="panel">
            ${this._sparkline()}
            <div class="row">
              <span class="time">${this._label}</span>
              <input
                type="range"
                min="0"
                max="1439"
                .value=${String(this._live ? new Date().getHours() * 60 + new Date().getMinutes() : this._minute)}
                @input=${this._onScrub}
              />
              <button class=${this._live ? "" : "off"} @click=${this._toggleLive}>
                ${this._live ? "● live" : "live"}
              </button>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _sparkline() {
    const W = 600;
    const H = 34;
    const pts: string[] = [];
    let peak = 1;
    for (let mn = 0; mn <= 1440; mn += 30) peak = Math.max(peak, this._prodAt(mn) ?? 0);
    for (let mn = 0; mn <= 1440; mn += 30) {
      const x = (mn / 1440) * W;
      const y = H - ((this._prodAt(mn) ?? 0) / peak) * (H - 2) - 1;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const cur = this._live ? new Date().getHours() * 60 + new Date().getMinutes() : this._minute;
    const curX = (cur / 1440) * W;
    return html`<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <polyline points=${pts.join(" ")} fill="none" stroke="rgba(255,152,0,0.9)" stroke-width="1.5" />
      <line x1=${curX.toFixed(1)} y1="0" x2=${curX.toFixed(1)} y2=${H} stroke="#ffc107" stroke-width="1.5" />
    </svg>`;
  }

  static styles = css`
    .wrap {
      position: relative;
      width: 100%;
      height: 480px;
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      background: #0b1622;
    }
    #map {
      position: absolute;
      inset: 0;
      z-index: 0;
    }
    .overlay {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
    }
    .chips {
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 2;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(12, 20, 32, 0.72);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      backdrop-filter: blur(6px);
    }
    .chip .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }
    .chip small {
      opacity: 0.7;
      font-weight: 500;
    }
    .panel {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 12px;
      z-index: 2;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(12, 20, 32, 0.78);
      color: #fff;
      backdrop-filter: blur(6px);
    }
    .panel .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .panel .time {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      min-width: 52px;
    }
    .panel input[type="range"] {
      flex: 1;
      accent-color: #ffc107;
    }
    .panel button {
      border: 0;
      border-radius: 999px;
      padding: 4px 10px;
      font-weight: 600;
      cursor: pointer;
      background: #ffc107;
      color: #222;
    }
    .panel button.off {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
    .spark {
      display: block;
      width: 100%;
      height: 34px;
      margin-bottom: 6px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-overview": HuiEnergyOverviewCard;
  }
}
