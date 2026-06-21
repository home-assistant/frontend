// Shared faux-3D engine for the Solar scene cards: the ground is the CARTO basemap stitched into one
// seam-free <canvas> used as a tilted/orbiting plane via a CSS 3D transform; world coordinates
// (east/north/up metres around the home at the origin) are projected through a matching perspective so
// any content a subclass draws stays glued to that plane as the camera turns. No map/geometry library
// (just <canvas>, <svg>, fetch) so it runs on a Raspberry Pi 0.
//
// A subclass supplies the CONTENT: it implements `_renderLayers()` (its own stacked <svg> layers),
// `_paint()` (fills those layers each frame using `_project`), and optionally `_renderOverlay()` and
// the `_on*` lifecycle hooks. The engine owns the camera, projection, ground tile + edge fade, the
// draw loop, drag, resize, and the timeline sync (instant/target + a shared camera so every card on
// the same collection rotates together).
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { property, query, state } from "lit/decorators";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { LovelaceCardConfig } from "../../../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../../../types";
import { theme2hex } from "../../../../../common/color/convert-color";
import type { EnergyData } from "../../../../../data/energy";
import { getEnergyDataCollection } from "../../../../../data/energy";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { formatShortDateTime } from "../../../../../common/datetime/format_date_time";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../../energy/constants";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon";
import "./hui-energy-graph-chip";
import type {
  ChartTarget,
  SolarSceneSync,
  SolarSceneSyncState,
} from "./solar-scene-sync";
import { getSolarSceneSync } from "./solar-scene-sync";

export type Point = [number, number];

export const DEG = Math.PI / 180;
export const EARTH_CIRCUMFERENCE_M = 40075016.686;

const TILE_PX = 256;
// Camera pitch bounds (degrees).
export const PITCH_MIN = 15;
export const PITCH_MAX = 55;
// Card viewport: fixed height, with a width fallback for the first frame before layout settles.
export const CARD_HEIGHT_PX = 380;
const FALLBACK_WIDTH_PX = 600;
const DARK_FILTER =
  "invert(0.9) hue-rotate(170deg) brightness(1.3) contrast(1) saturate(0.4)";

// Initial shared camera: facing due south (the sun's side in the northern hemisphere) and at a gentle
// tilt. Stored in the sync so every card on the same collection turns together; the first card seeds
// the tilt from its own config.
const DEFAULT_BEARING = 180;

export interface SolarSceneEngineConfig extends LovelaceCardConfig {
  collection_key?: string;
  ground_zoom: number;
  ground_radius: number;
  tilt_deg: number;
  perspective: number;
  target_height_m: number;
}

export const ENGINE_DEFAULTS = {
  ground_zoom: 19,
  ground_radius: 3, // 7x7 @256px = 1792px canvas, under the 2048 GPU limit (Pi-0 safe)
  tilt_deg: 50,
  perspective: 1200,
  target_height_m: 10, // aim 10 m above the home to open up the sky
};

export const pointsAttr = (points: Point[]): string =>
  points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

const hexByte = (hex: string, i: number): number =>
  parseInt(hex.slice(i, i + 2), 16);

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

// Blend two #rrggbb colours channel by channel; t in [0..1] runs from hexA to hexB. Kept local (no
// culori) since it runs per shape per frame on Raspberry-Pi-class hardware.
export function mixHex(hexA: string, hexB: string, t: number): string {
  let out = "#";
  for (let i = 1; i < 7; i += 2) {
    const a = hexByte(hexA, i);
    out += Math.round(a + (hexByte(hexB, i) - a) * t)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}

// Resolve a HA CSS custom property to a #rrggbb string via HA's theme2hex (handles hex, rgb() and
// named/theme colours).
export function cssHex(
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

export abstract class SolarSceneEngine extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() protected _config!: SolarSceneEngineConfig;

  @state() protected _instant: number | null = null;

  @state() protected _target: ChartTarget = "production";

  @state() protected _period?: { start: Date; end?: Date };

  @state() protected _energyData?: EnergyData;

  @query(".wrap") protected _wrap?: HTMLElement;

  @query("#ground") private _groundHolder?: HTMLElement;

  private _sync?: SolarSceneSync;

  private _unsub?: () => void;

  protected _bearing = DEFAULT_BEARING;

  protected _tilt = ENGINE_DEFAULTS.tilt_deg;

  protected _pxPerMetre = 4;

  protected _centreX = 0;

  protected _centreY = 0;

  private _drag?: { x: number; y: number };

  protected _ground?: {
    canvas: HTMLCanvasElement;
    fade: HTMLDivElement;
    homeX: number;
    homeY: number;
  };

  private _built = false;

  private _redrawScheduled = false;

  private _lastLiveMinute = -1;

  private _resizeObserver = new ResizeObserver(() => this._scheduleDraw());

  // Merge a card's raw config over the engine defaults + the card's own defaults, so the engine fields
  // are always present. Subclasses call this from their setConfig.
  protected _mergeConfig<T extends Record<string, unknown>>(
    config: LovelaceCardConfig,
    defaults: T
  ): SolarSceneEngineConfig & T {
    return {
      ...ENGINE_DEFAULTS,
      ...defaults,
      ...config,
    } as SolarSceneEngineConfig & T;
  }

  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._energyData = data;
        this._period = { start: data.start, end: data.end };
        this._onEnergyData();
        this._scheduleDraw();
      }),
    ];
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._resizeObserver.observe(this);
    this._connectSync();
    this._onConnected();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver.disconnect();
    this._unsub?.();
    this._unsub = undefined;
    this._sync = undefined;
  }

  protected firstUpdated(_changed: PropertyValues): void {
    this._maybeBuild();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps); // SubscribeMixin subscribes to the energy collection here
    this._connectSync();
    this._maybeBuild();
    if (changedProps.has("hass") && this.hass && this._instant === null) {
      // Live mode tracks "now", which only moves the sun once a minute: skip per-state redraws.
      const minute = Math.floor(Date.now() / 60000);
      if (minute !== this._lastLiveMinute) {
        this._lastLiveMinute = minute;
        this._scheduleDraw();
      }
    }
  }

  // Subscribe to the cursor shared with the timeline card and the other scene cards: scrubbing moves
  // the sun/highlight, and the camera (bearing/tilt) is shared so rotating one card rotates them all.
  private _connectSync(): void {
    if (this._sync || !this._config) return;
    this._sync = getSolarSceneSync(
      this._config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY
    );
    // Seed the shared tilt from the card's own config (first seed wins). Cards without a meaningful
    // tilt of their own opt out via _seedsCamera() so they can't override a configured scene tilt
    // just by connecting first.
    if (this._seedsCamera()) {
      this._sync.seedCamera(DEFAULT_BEARING, this._config.tilt_deg);
    }
    this._unsub = this._sync.subscribe((cursor: SolarSceneSyncState) => {
      this._instant = cursor.instant;
      this._target = cursor.target;
      this._bearing = cursor.bearing;
      this._tilt = cursor.tilt;
      this._scheduleDraw();
    });
  }

  protected _activeDate(): Date {
    return new Date(this._instant ?? Date.now());
  }

  protected _windowContainsNow(): boolean {
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

  // Set the shared chart target (mirrored to the timeline and every linked card).
  protected _setTarget(target: ChartTarget): void {
    this._sync?.setTarget(target);
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
    this._onBuilt(latitude, longitude);
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

    // Edge fade on the plane: same size as the canvas, transformed identically each frame so it tilts
    // with the map. The gradient (CSS, theme-reactive) dissolves the mega-tile's borders into the card
    // background, so the cut-off plane reads as a disc rather than a sniper's-eye rectangle.
    const fade = document.createElement("div");
    fade.className = "ground-fade";
    fade.style.width = `${canvas.width}px`;
    fade.style.height = `${canvas.height}px`;

    if (this._groundHolder) {
      this._groundHolder.innerHTML = "";
      this._groundHolder.appendChild(canvas);
      this._groundHolder.appendChild(fade);
    }
    this._ground = {
      canvas,
      fade,
      homeX: (tileX - firstX) * TILE_PX,
      homeY: (tileY - firstY) * TILE_PX,
    };
    this._draw();
  }

  // Manual 2-axis camera drag, written to the shared store so every linked card turns together.
  private _onPointerDown(ev: PointerEvent): void {
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this._drag = { x: ev.clientX, y: ev.clientY };
    this._onHoverEnd(); // dragging takes over from hovering
  }

  private _onPointerMove(ev: PointerEvent): void {
    if (!this._drag) {
      this._onHover(ev); // not dragging: let the card hit-test for a hover
      return;
    }
    const bearing = (this._bearing - (ev.clientX - this._drag.x) * 0.4) % 360;
    const tilt = Math.max(
      PITCH_MIN,
      Math.min(PITCH_MAX, this._tilt - (ev.clientY - this._drag.y) * 0.3)
    );
    this._drag = { x: ev.clientX, y: ev.clientY };
    this._bearing = bearing;
    this._tilt = tilt;
    // Publish to the shared store; the subscription mirrors it back to every card (including this one)
    // and schedules their redraws, so rotation stays in lockstep.
    this._sync?.setCamera(bearing, tilt);
    this._scheduleDraw();
  }

  private _onPointerUp(): void {
    this._drag = undefined;
  }

  private _onPointerLeave(): void {
    this._onHoverEnd();
  }

  // Hover hooks (no-op by default): a card with hit-testable content (e.g. the production clock's
  // cylinders) overrides these to show a tooltip on the hovered element.
  protected _onHover(_ev: PointerEvent): void {
    /* optional hook */
  }

  protected _onHoverEnd(): void {
    /* optional hook */
  }

  // Coalesce redraws to one per animation frame (pointermove fires far above 60 Hz).
  protected _scheduleDraw(): void {
    if (this._redrawScheduled) return;
    this._redrawScheduled = true;
    requestAnimationFrame(() => {
      this._redrawScheduled = false;
      this._draw();
    });
  }

  // Project (east, north, up) metres to screen px: bearing, then pitch, then perspective. Mirrors the
  // ground canvas's CSS transform so everything stays glued together as the camera turns.
  protected _project3(
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

  protected _project(eastM: number, northM: number, upM: number): Point {
    const p = this._project3(eastM, northM, upM);
    return [p.x, p.y];
  }

  // Draw one frame: size the viewport, recompute the screen centre, apply the 3D transform to the
  // ground + fade, expose the home's projected position as CSS vars, then hand off to the subclass.
  private _draw(): void {
    if (!this._wrap || !this.hass) return;
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

    if (this._ground) {
      const { canvas, fade, homeX, homeY } = this._ground;
      const origin = `${homeX}px ${homeY}px`;
      const transform = `translate(${this._centreX - homeX}px, ${this._centreY - homeY}px) rotateX(${this._tilt}deg) rotateZ(${this._bearing}deg)`;
      canvas.style.transformOrigin = origin;
      canvas.style.transform = transform;
      // Same origin + transform so the fade sits exactly on the map plane and shares its perspective.
      fade.style.transformOrigin = origin;
      fade.style.transform = transform;
    }

    // Anchor overlay chips to the home's projected position via CSS vars (a fixed screen offset).
    const home = this._project(0, 0, 0);
    this.style.setProperty("--home-x", `${home[0].toFixed(1)}px`);
    this.style.setProperty("--home-y", `${home[1].toFixed(1)}px`);

    this._paint(width, height, dark);
  }

  // Draw a thin extruded column whose height is split into stacked bands, back-to-front by depth, with
  // a roof cap. Pure geometry + projection; the caller resolves each band's wall/roof fill. Shared by
  // the home histogram (Solar scene) and the hourly cylinders (Radial production).
  protected _renderStackedColumn(
    footprint: Point[],
    totalHeightM: number,
    bands: { frac: number; wall: string; roof: string }[],
    stroke: string
  ): string {
    if (!bands.length) return "";
    // Cumulative z-fraction boundaries 0 .. 1 (last pinned to 1 against rounding drift).
    const cum = [0];
    for (const b of bands) cum.push(cum[cum.length - 1] + b.frac);
    cum[cum.length - 1] = 1;
    const rings = cum.map((c) =>
      footprint.map((p) => this._project(p[0], p[1], totalHeightM * c))
    );
    const bearing = this._bearing * DEG;
    const edges: { depth: number; faces: string }[] = [];
    for (let i = 0; i < footprint.length; i++) {
      const next = (i + 1) % footprint.length;
      // back-face cull: drop walls whose outward normal faces away from the camera
      const edgeE = footprint[next][0] - footprint[i][0];
      const edgeN = footprint[next][1] - footprint[i][1];
      if (edgeN * Math.sin(bearing) + edgeE * Math.cos(bearing) <= 0) continue;
      let faces = "";
      for (let k = 0; k < bands.length; k++) {
        const lo = rings[k];
        const hi = rings[k + 1];
        faces += `<polygon points="${pointsAttr([lo[i], lo[next], hi[next], hi[i]])}" fill="${bands[k].wall}" stroke="${stroke}" stroke-width="0.4"/>`;
      }
      edges.push({ depth: (rings[0][i][1] + rings[0][next][1]) / 2, faces });
    }
    edges.sort((a, b) => a.depth - b.depth);
    let svg = edges.map((e) => e.faces).join("");
    svg += `<polygon points="${pointsAttr(rings[rings.length - 1])}" fill="${bands[bands.length - 1].roof}" stroke="${stroke}" stroke-width="0.6"/>`;
    return svg;
  }

  // ---- Subclass hooks -------------------------------------------------------

  // The card's own stacked <svg class="layer …"> elements, placed between the ground and the drag
  // surface. The card queries and fills them in `_paint`.
  protected abstract _renderLayers(): TemplateResult;

  // Fill the layers for one frame using `_project`. Called after the engine has set the camera centre,
  // transformed the ground, and exposed the home CSS vars.
  protected abstract _paint(width: number, height: number, dark: boolean): void;

  // DOM overlays above the layers (e.g. energy chips). Default: none.
  protected _renderOverlay(): TemplateResult | typeof nothing {
    return nothing;
  }

  // Called at the end of connectedCallback (e.g. to replay an intro animation on tab return).
  protected _onConnected(): void {
    /* optional hook */
  }

  // Called once after the ground is being built, with the home coordinates (e.g. fetch OSM buildings).
  protected _onBuilt(_lat: number, _lng: number): void {
    /* optional hook */
  }

  // Called whenever the energy collection delivers new data (e.g. fetch SoC / forecasts / hourly stats).
  protected _onEnergyData(): void {
    /* optional hook */
  }

  // Whether the "back to live" button shows when scrubbed. Cards that never need it override to false.
  protected _hasLiveButton(): boolean {
    return true;
  }

  // Whether the date/time chip shows. Cards that surface the moment elsewhere override to false.
  protected _hasDateChip(): boolean {
    return true;
  }

  // Whether this card seeds the shared camera tilt from its config. A card with no meaningful tilt of
  // its own returns false, so it never overrides a sibling's configured tilt by connecting first.
  protected _seedsCamera(): boolean {
    return true;
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const liveButton =
      this._hasLiveButton() &&
      this._instant !== null &&
      this._windowContainsNow();
    return html`
      <ha-card>
        <div class="wrap">
          <div class="title">${this._config.title}</div>
          ${liveButton || this._hasDateChip()
            ? html`<div class="chip-row">
                ${liveButton
                  ? html`<button
                      class="live-chip"
                      title=${this.hass.localize(
                        "ui.panel.lovelace.cards.energy.back_to_live"
                      )}
                      @click=${this._backToLive}
                    >
                      <hui-energy-graph-chip>
                        <ha-icon icon="mdi:restore"></ha-icon>
                      </hui-energy-graph-chip>
                    </button>`
                  : nothing}
                ${this._hasDateChip()
                  ? html`<hui-energy-graph-chip>
                      ${formatShortDateTime(
                        this._activeDate(),
                        this.hass.locale,
                        this.hass.config
                      )}
                    </hui-energy-graph-chip>`
                  : nothing}
              </div>`
            : nothing}
          <div class="viewport"><div id="ground"></div></div>
          ${this._renderLayers()}${this._renderOverlay()}
          <div
            class="drag"
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @pointercancel=${this._onPointerUp}
            @pointerleave=${this._onPointerLeave}
          ></div>
        </div>
      </ha-card>
    `;
  }

  // Engine chrome + ground + layer/drag scaffolding. Subclasses compose this with their own content
  // styles: `static styles = [engineStyles, css\`…\`]`.
  static engineStyles: CSSResultGroup = css`
    :host {
      display: block;
    }
    .wrap {
      position: relative;
      width: 100%;
      height: ${CARD_HEIGHT_PX}px;
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      /* Same flat background as the chart cards: the ground plane fades into it at the edges of the
         merged mega-tile, so the faux-3D plane reads as a disc on the card instead of a cut-off map. */
      background: var(--ha-card-background, var(--card-background-color, #fff));
      /* Own stacking context so the depth-split z-index children stay scoped to the card and never
         escape above the HA header on scroll. */
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
    /* Size the icon to exactly one line of the chip's text so the icon-only Live button matches the
       text date chip beside it. */
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
       orthographic while content stays in perspective (they slide apart on rotation) */
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
    /* Lives in the SAME perspective parent as the ground canvas and gets the SAME 3D transform each
       frame, so the fade is on the map plane (tilts/rotates with it) rather than a flat overhead disc.
       The gradient is the largest circle inscribed in the mega-tile (closest-side = half the square's
       side); it stays clear out to ~86% then dissolves the plane's edges into the card background. */
    .ground-fade {
      position: absolute;
      left: 0;
      top: 0;
      will-change: transform;
      pointer-events: none;
      background: radial-gradient(
        circle closest-side at 50% 50%,
        transparent 0%,
        transparent 86%,
        var(--ha-card-background, var(--card-background-color, #fff)) 100%
      );
    }
    /* width/height 100% (not just inset:0): an SVG is a replaced element, so without an explicit size
       and without a viewBox it keeps its tiny intrinsic size and clips the scene to the top-left. The
       px coordinates we draw then map 1:1 onto the filled box. The per-layer z-index lives in each
       card's own styles. */
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
      touch-action: none;
    }
    .drag:active {
      cursor: grabbing;
    }
  `;
}
