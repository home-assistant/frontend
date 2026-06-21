// Energy clock card: the same faux-3D ground plane as the Solar scene (shared engine, shared camera —
// rotating either card rotates both), with no buildings and no home. Instead, 24 thin stacked
// "cylinders" stand in a ring around the centre, one per hour of the day, showing whatever chip is
// selected in the timeline (the shared target): production splits per panel string, grid splits into
// import/export, battery into charge/discharge, etc. — same series and colours the timeline draws,
// binned by hour-of-day over the selected period. A single day shows that day's hourly shape; a longer
// range averages it. Future hours with no actuals fall back to the solar forecast, drawn transparently.
// A small medallion at the centre lies flat on the ground with the selected metric's icon.
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, nothing } from "lit";
import { customElement, query, queryAll, state } from "lit/decorators";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceCard } from "../../types";
import type { Statistics } from "../../../../data/recorder";
import { fetchStatistics, getStatisticLabel } from "../../../../data/recorder";
import type { EnergySolarForecasts } from "../../../../data/energy";
import { getEnergySolarForecasts } from "../../../../data/energy";
import { formatNumber } from "../../../../common/number/format_number";
import { formatTime } from "../../../../common/datetime/format_time";
import { getEnergyColor } from "./common/color";
import type { Point } from "./common/solar-scene-engine";
import { mixHex, SolarSceneEngine } from "./common/solar-scene-engine";
import type { RingHour } from "./common/solar-scene-power";
import {
  hourlyTargetRings,
  metricMeta,
  solarRings,
  targetSeries,
} from "./common/solar-scene-power";

export interface EnergyClockCardConfig extends LovelaceCardConfig {
  collection_key?: string;
}

// Ring geometry, expressed in metres at REF_ZOOM and scaled by 2^(REF_ZOOM - ground_zoom) at draw
// time, so the cylinders keep a CONSTANT on-screen size whatever the map zoom: lowering ground_zoom
// pulls the basemap further away without resizing the ring.
const REF_ZOOM = 20;
const RING_R_M = 14;
const FOOT_R_M = 0.7;
const MAX_HEIGHT_M = 12;
// Minimum column height (and the height of the flat puck drawn for hours with no value), so the 24
// cylinders stay visible all the way round the clock.
const FLAT_M = 0.5;
const SIDES = 8;
// Hour labels fade with distance from the camera: this is the opacity of the farthest-back label
// (the nearest is fully opaque), so receding numbers don't clutter the reading.
const LABEL_MIN_OPACITY = 0.15;
// Period-change intro: each cylinder rises (ease-out) over GROW_MS, staggered clockwise by STAGGER_MS.
const GROW_MS = 320;
const STAGGER_MS = 28;
// How close (screen px) the cursor must be to a cylinder's vertical axis to hover it.
const HOVER_PX = 22;

// Distance from point (px,py) to the segment (ax,ay)-(bx,by), in screen px.
function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2
    ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
    : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

@customElement("hui-energy-clock-card")
export class HuiEnergyClockCard
  extends SolarSceneEngine
  implements LovelaceCard
{
  @state() private _rings: RingHour[] = [];

  private _statsKey = "";

  private _hourlyStats: Statistics = {};

  private _forecasts?: EnergySolarForecasts;

  private _forecastFetched = false;

  // Hovered hour (cylinder under the cursor) + cursor position, for the on-demand tooltip.
  @state() private _hoverHour: number | null = null;

  private _hoverX = 0;

  private _hoverY = 0;

  // Screen-space hit targets (each cylinder's vertical axis), refreshed every paint.
  private _hits: {
    hour: number;
    bx: number;
    by: number;
    tx: number;
    ty: number;
  }[] = [];

  // Band colours resolved once per (dark, token+idx) and reused across frames.
  private _colorCache?: {
    dark: boolean;
    styles: CSSStyleDeclaration;
    map: Map<string, string>;
  };

  // Period-change grow animation: timestamp of the sweep start (0 = no animation, full height).
  private _growthStart = 0;

  private _growthAnimId = 0;

  @query(".l-rings") private _lRings?: SVGSVGElement;

  @query(".tip") private _tip?: HTMLElement;

  @query(".center-plane") private _badgePlane?: HTMLElement;

  @query(".center-disc") private _badgeDisc?: HTMLElement;

  @queryAll(".hour-label") private _hourLabels!: NodeListOf<HTMLElement>;

  public setConfig(config: EnergyClockCardConfig): void {
    // Pull the basemap further away than the Solar scene (a wider, more distant view); the ring
    // geometry is zoom-invariant (see REF_ZOOM), so the cylinders render the same size regardless.
    this._config = this._mergeConfig(config, { ground_zoom: 18 });
  }

  public getCardSize(): number {
    return 4;
  }

  // No "back to live" button and no date chip: the moment shown is the hovered hour, which the tooltip
  // labels, and the metric is shown by the centre medallion's icon.
  protected _hasLiveButton(): boolean {
    return false;
  }

  protected _hasDateChip(): boolean {
    return false;
  }

  // No tilt config of its own (it forces a wider zoom but keeps the default tilt), so it must not
  // seed — and thus override — a Solar scene card's configured tilt just by connecting first.
  protected _seedsCamera(): boolean {
    return false;
  }

  // Drop the colour cache on (re)connect: the theme may have changed while the tab was hidden.
  protected _onConnected(): void {
    this._colorCache = undefined;
  }

  // New energy data / period: refetch the hourly stats + the forecast and rebuild the profile.
  protected _onEnergyData(): void {
    this._fetchStats();
    this._fetchForecasts();
  }

  protected willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    // Switching chip (shared target) rebuilds from the already-fetched stats and replays the sweep.
    if (changed.has("_target")) {
      this._rebuild();
      this._startGrow();
    }
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    this._clampTip();
    if (changed.has("_target")) this._growBadge();
  }

  // Fetch the hourly statistics the timeline series need: `change` for every energy meter (solar,
  // grid, battery) and `mean` for the battery SoC. One fetch per period; switching chip just re-bins.
  private async _fetchStats(): Promise<void> {
    const prefs = this._energyData?.prefs;
    if (!prefs || !this._period) {
      this._hourlyStats = {};
      this._rebuild();
      return;
    }
    const energyIds: string[] = [];
    const socIds: string[] = [];
    for (const s of prefs.energy_sources) {
      if (s.type === "solar") {
        if (s.stat_energy_from) energyIds.push(s.stat_energy_from);
      } else if (s.type === "grid" || s.type === "battery") {
        if (s.stat_energy_from) energyIds.push(s.stat_energy_from);
        if (s.stat_energy_to) energyIds.push(s.stat_energy_to);
      }
      if (s.type === "battery" && s.stat_soc) socIds.push(s.stat_soc);
    }
    const start = this._period.start;
    const end = this._period.end ?? new Date();
    const key = `${energyIds.join(",")}|${socIds.join(",")}|${start.getTime()}|${end.getTime()}`;
    if (key === this._statsKey) return; // already have this window
    this._statsKey = key;
    try {
      const [change, soc] = await Promise.all([
        energyIds.length
          ? fetchStatistics(
              this.hass,
              start,
              end,
              energyIds,
              "hour",
              { energy: "kWh" },
              ["change"]
            )
          : Promise.resolve<Statistics>({}),
        socIds.length
          ? fetchStatistics(this.hass, start, end, socIds, "hour", undefined, [
              "mean",
            ])
          : Promise.resolve<Statistics>({}),
      ]);
      this._hourlyStats = { ...change, ...soc };
    } catch {
      this._hourlyStats = {};
    }
    this._rebuild();
    this._startGrow(); // replay the sweep on a period change
  }

  private async _fetchForecasts(): Promise<void> {
    const hasForecast = this._energyData?.prefs.energy_sources.some(
      (s) => s.type === "solar" && s.config_entry_solar_forecast?.length
    );
    if (!hasForecast || this._forecastFetched) return;
    this._forecastFetched = true; // set first to avoid concurrent fetch storms
    try {
      this._forecasts = await getEnergySolarForecasts(this.hass);
    } catch {
      this._forecasts = undefined;
      this._forecastFetched = false; // failed: allow a retry on the next data update
    }
    this._rebuild(); // forecast arrived after the stats: rebuild so future hours appear
  }

  // Rebuild the 24-hour profile for the current chip. Production keeps its own builder (so a future
  // day still shows every string's forecast); every other chip reuses the timeline's targetSeries,
  // binned by hour-of-day — same series, same colours.
  private _rebuild(): void {
    const data = this._energyData;
    if (!data) {
      this._rings = [];
      return;
    }
    if (this._target === "production") {
      this._rings = solarRings(
        data.prefs,
        this._hourlyStats,
        this._forecasts,
        this._period?.start.getTime(),
        (this._period?.end ?? new Date()).getTime()
      );
    } else {
      const fineData = { ...data, stats: this._hourlyStats };
      this._rings = hourlyTargetRings(targetSeries(fineData, this._target));
    }
    this._scheduleDraw();
  }

  // Run the staggered grow sweep once (replayed on a period or chip change). Instant for reduced motion.
  private _startGrow(): void {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      this._growthStart = 0;
      return;
    }
    this._growthStart = Date.now();
    const id = ++this._growthAnimId;
    const total = GROW_MS + 23 * STAGGER_MS;
    const tick = (): void => {
      if (id !== this._growthAnimId || !this.isConnected) return;
      this._scheduleDraw();
      if (Date.now() - this._growthStart < total) requestAnimationFrame(tick);
      else this._growthStart = 0; // settle to full height
    };
    requestAnimationFrame(tick);
  }

  // Height factor [0..1] for an hour's cylinder during the grow sweep (1 when idle).
  private _hourGrowth(hour: number): number {
    if (!this._growthStart) return 1;
    const t = Math.max(
      0,
      Math.min(
        1,
        (Date.now() - this._growthStart - hour * STAGGER_MS) / GROW_MS
      )
    );
    return 1 - (1 - t) ** 3; // ease-out
  }

  // Pop the centre medallion when the chip changes, matching the home's grow/shrink elsewhere.
  private _growBadge(): void {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    this._badgeDisc?.animate(
      [
        { transform: "scale(0.2)", opacity: 0 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 380, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
    );
  }

  // Resolve a band colour off its token (+ shade index), cached so rotation/scrub frames don't hit
  // getComputedStyle. The cache is rebuilt only when the theme (dark) flips.
  private _color(dark: boolean, token: string, idx?: number): string {
    if (!this._colorCache || this._colorCache.dark !== dark) {
      this._colorCache = {
        dark,
        styles: getComputedStyle(this),
        map: new Map(),
      };
    }
    const k = `${token}|${idx ?? ""}`;
    let c = this._colorCache.map.get(k);
    if (c === undefined) {
      c = getEnergyColor(
        this._colorCache.styles,
        dark,
        false,
        false,
        token,
        idx
      );
      this._colorCache.map.set(k, c);
    }
    return c;
  }

  // Icon for the centre medallion: the selected chip's metric (same mapping as the timeline's).
  private _targetIcon(): string {
    switch (this._target) {
      case "grid":
        return "mdi:transmission-tower";
      case "battery":
        return "mdi:lightning-bolt";
      case "battery-soc":
        return "mdi:battery";
      case "home":
        return "mdi:home";
      default:
        return "mdi:solar-power";
    }
  }

  // A small regular octagon footprint (metres) of radius `r` around a ring position.
  private _foot(cx: number, cy: number, r: number): Point[] {
    return Array.from({ length: SIDES }, (_, k): Point => {
      const a = (k / SIDES) * 2 * Math.PI;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    });
  }

  protected _renderLayers() {
    return html`
      <svg class="layer l-rings" xmlns="http://www.w3.org/2000/svg"></svg>
    `;
  }

  protected _paint(_width: number, _height: number, dark: boolean): void {
    // Lay the centre medallion flat on the ground (same tilt/rotation as the map plane).
    if (this._badgePlane) {
      const [hx, hy] = this._project(0, 0, 0);
      this._badgePlane.style.left = `${hx}px`;
      this._badgePlane.style.top = `${hy}px`;
      this._badgePlane.style.transform = `translate(-50%, -50%) perspective(900px) rotateX(${this._tilt}deg) rotateZ(${this._bearing - 180}deg)`;
    }

    if (!this._lRings) return;
    const rings = this._rings;
    if (!rings.length) {
      this._lRings.innerHTML = "";
      this._hits = [];
      return;
    }

    // Highlight (glow) the hovered cylinder, or — when not hovering — the scrubbed hour.
    const scrubbedHour =
      this._instant != null ? new Date(this._instant).getHours() : null;
    const highlight = this._hoverHour ?? scrubbedHour;

    const mScale = 2 ** (REF_ZOOM - this._config.ground_zoom);
    const ringR = RING_R_M * mScale;
    const footR = FOOT_R_M * mScale;
    const maxHeightPx = MAX_HEIGHT_M * mScale;
    const flatPx = FLAT_M * mScale;

    // 24 hour labels laid flat on the ground, OUTSIDE the ring of cylinders (centre → medallion →
    // cylinders → hours), each rotated so its top points inward toward its cylinder. (z-index keeps
    // them under the cylinders.) Each fades with its distance from the camera: labels at the front
    // stay solid, those receding toward the back go transparent so they don't clutter the reading.
    const labelR = ringR * 1.18;
    const projected = Array.from({ length: 24 }, (_, h) => {
      const angle = (h / 24) * 2 * Math.PI;
      return this._project3(
        labelR * Math.sin(angle),
        labelR * Math.cos(angle),
        0
      );
    });
    let depthMin = Infinity;
    let depthMax = -Infinity;
    for (const p of projected) {
      depthMin = Math.min(depthMin, p.depth);
      depthMax = Math.max(depthMax, p.depth);
    }
    const depthRange = depthMax - depthMin || 1;
    this._hourLabels?.forEach((label, h) => {
      const p = projected[h];
      // nearness: 1 at the closest label (max projected depth), 0 at the farthest.
      const near = (p.depth - depthMin) / depthRange;
      label.style.left = `${p.x}px`;
      label.style.top = `${p.y}px`;
      label.style.opacity = (
        LABEL_MIN_OPACITY +
        (1 - LABEL_MIN_OPACITY) * near
      ).toFixed(3);
      label.style.transform = `translate(-50%, -50%) perspective(900px) rotateX(${this._tilt}deg) rotateZ(${this._bearing + (h / 24) * 360 + 180}deg)`;
    });

    // Per hour: use actuals when present, else the forecast (production only, drawn transparently).
    // The busiest hour, actual or forecast, sets the height scale.
    const perHour = rings.map((r) => {
      const angle = (r.hour / 24) * 2 * Math.PI;
      const east = ringR * Math.sin(angle);
      const north = ringR * Math.cos(angle);
      const actualSum = r.bands.reduce((s, b) => s + Math.max(0, b.value), 0);
      const forecastSum = r.bands.reduce(
        (s, b) => s + Math.max(0, b.forecast),
        0
      );
      const predicted = actualSum <= 0 && forecastSum > 0;
      return {
        r,
        east,
        north,
        predicted,
        amount: predicted ? forecastSum : actualSum,
        screenY: this._project(east, north, 0)[1],
      };
    });
    const maxValue = Math.max(0, ...perHour.map((p) => p.amount));
    // Back-to-front by projected depth so near columns paint over far ones.
    perHour.sort((a, b) => a.screenY - b.screenY);

    const glow = this._color(
      dark,
      rings[0].bands[0]?.token ?? "--primary-color"
    );
    let svg = `<defs><filter id="clock-glow" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="${glow}" flood-opacity="0.9"/></filter></defs>`;
    const hits: typeof this._hits = [];
    for (const col of perHour) {
      const active = highlight === col.r.hour;
      const grow = this._hourGrowth(col.r.hour);
      const foot = this._foot(col.east, col.north, footR);
      // Empty hour (no value and no forecast): a flat neutral puck so all 24 stay visible.
      if (col.amount <= 0 || maxValue <= 0) {
        const h = flatPx * grow;
        const base = this._project(col.east, col.north, 0);
        const top = this._project(col.east, col.north, h);
        hits.push({
          hour: col.r.hour,
          bx: base[0],
          by: base[1],
          tx: top[0],
          ty: top[1],
        });
        svg += this._renderStackedColumn(
          foot,
          h,
          [
            {
              frac: 1,
              wall: "rgba(140,140,140,0.3)",
              roof: "rgba(170,170,170,0.42)",
            },
          ],
          "rgba(0,0,0,0.25)"
        );
        continue;
      }
      // A minimum height keeps tiny values visible; the rest scale against the busiest hour.
      const colHeight =
        Math.max(flatPx, (col.amount / maxValue) * maxHeightPx) * grow;
      const base = this._project(col.east, col.north, 0);
      const top = this._project(col.east, col.north, colHeight);
      hits.push({
        hour: col.r.hour,
        bx: base[0],
        by: base[1],
        tx: top[0],
        ty: top[1],
      });
      const bands = col.r.bands
        .map((b) => ({ b, v: col.predicted ? b.forecast : b.value }))
        .filter((x) => x.v > 0)
        .map(({ b, v }) => {
          const c = this._color(dark, b.token, b.idx);
          return {
            frac: v / col.amount,
            wall: mixHex(c, "#000000", 0.25),
            // Brighten the roof of the highlighted column so it stands out.
            roof: mixHex(c, "#ffffff", active ? 0.4 : 0.12),
          };
        });
      if (!bands.length) continue;
      const stroke = active ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.3)";
      let piece = this._renderStackedColumn(foot, colHeight, bands, stroke);
      if (active) piece = `<g filter="url(#clock-glow)">${piece}</g>`;
      // Forecast (predicted) columns are semi-transparent to mark them as not-yet-measured.
      if (col.predicted) piece = `<g opacity="0.5">${piece}</g>`;
      svg += piece;
    }
    this._hits = hits;
    this._lRings.innerHTML = svg;
  }

  // Hover hit-test: find the cylinder whose vertical segment the cursor is nearest, within HOVER_PX.
  protected _onHover(ev: PointerEvent): void {
    const rect = this._wrap?.getBoundingClientRect();
    if (!rect) return;
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    let best: number | null = null;
    let bestD = HOVER_PX;
    for (const h of this._hits) {
      const d = distToSegment(x, y, h.bx, h.by, h.tx, h.ty);
      if (d < bestD) {
        bestD = d;
        best = h.hour;
      }
    }
    this._hoverX = x;
    this._hoverY = y;
    if (best !== this._hoverHour) {
      this._hoverHour = best;
      this._scheduleDraw(); // move the glow to the hovered cylinder
    } else if (best !== null) {
      this.requestUpdate(); // same cylinder: just reposition the tooltip
    }
  }

  protected _onHoverEnd(): void {
    if (this._hoverHour === null) return;
    this._hoverHour = null;
    this._scheduleDraw();
  }

  // Centre medallion + 24 ground-laid hour labels (locale time format) + the hover tooltip.
  protected _renderOverlay() {
    if (!this._rings.length) return nothing;
    return html`
      <div class="center-plane">
        <div class="center-disc">
          <ha-icon icon=${this._targetIcon()}></ha-icon>
        </div>
      </div>
      ${Array.from(
        { length: 24 },
        (_, h) =>
          html`<div class="hour-label">
            ${formatTime(
              new Date(2000, 0, 1, h),
              this.hass.locale,
              this.hass.config
            )}
          </div>`
      )}
      ${this._hoverHour != null
        ? this._renderTooltip(this._hoverHour)
        : nothing}
    `;
  }

  // Tooltip clamped inside the card (see _clampTip). A time-range header (each cylinder is one hour
  // band aggregated over the period, not an instant), one coloured row per series, then a total. For
  // production the rows are named "Production {name}" and the total reuses the native solar strings.
  private _renderTooltip(hour: number) {
    const ring = this._rings.find((r) => r.hour === hour);
    if (!ring || !this.hass) return nothing;
    const isProduction = this._target === "production";
    const dark = !!this.hass.themes?.darkMode;
    const level = metricMeta(ring.bands[0]?.key ?? "").level;
    const unit = level ? "%" : "kWh";
    const actualSum = ring.bands.reduce((s, b) => s + b.total, 0);
    const forecastSum = ring.bands.reduce((s, b) => s + b.forecastTotal, 0);
    const predicted = isProduction && actualSum <= 0 && forecastSum > 0;
    const valueOf = (b: RingHour["bands"][number]): number =>
      level ? b.value : predicted ? b.forecastTotal : b.total;
    const fmt = (v: number): string =>
      formatNumber(v, this.hass.locale, {
        maximumFractionDigits: level ? 0 : 2,
      });
    const meta = this._energyData?.statsMetadata;
    const bands = ring.bands.filter((b) => valueOf(b) > 0);
    const total = bands.reduce((s, b) => s + valueOf(b), 0);
    const next = String((hour + 1) % 24).padStart(2, "0");
    return html`
      <div
        class="tip ${predicted ? "predicted" : ""}"
        style="left:${this._hoverX}px;top:${this._hoverY}px"
      >
        <div class="tip-head">
          ${String(hour).padStart(2, "0")}:00 – ${next}:00
        </div>
        ${bands.map((b) => {
          const name =
            isProduction && b.statId
              ? getStatisticLabel(this.hass, b.statId, meta?.[b.statId])
              : "";
          return html`<div class="tip-row">
            <ha-icon
              icon=${metricMeta(b.key).icon}
              style="color:${this._color(dark, b.token, b.idx)}"
            ></ha-icon>
            <span
              >${name
                ? html`${this.hass.localize(
                    "ui.panel.lovelace.cards.energy.energy_solar_graph.production",
                    { name }
                  )}: `
                : nothing}${fmt(valueOf(b))}
              ${unit}</span
            >
          </div>`;
        })}
        ${level
          ? nothing
          : html`<div class="tip-total">
              ${isProduction
                ? this.hass.localize(
                    "ui.panel.lovelace.cards.energy.energy_solar_graph.total_produced",
                    { num: fmt(total) }
                  )
                : html`${fmt(total)} ${unit}`}
            </div>`}
      </div>
    `;
  }

  // Keep the hover tooltip fully inside the card: prefer placing it to the right of the cursor, flip
  // to the left if it would overflow, then clamp both axes to the card with a small margin.
  private _clampTip(): void {
    const tip = this._tip;
    const wrap = this._wrap;
    if (!tip || !wrap) return;
    const margin = 8;
    const ww = wrap.clientWidth;
    const wh = wrap.clientHeight;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = this._hoverX + 14;
    if (left + tw > ww - margin) left = this._hoverX - 14 - tw;
    left = Math.max(margin, Math.min(left, ww - tw - margin));
    const top = Math.max(
      margin,
      Math.min(this._hoverY - th / 2, wh - th - margin)
    );
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  static styles: CSSResultGroup = [
    SolarSceneEngine.engineStyles,
    css`
      .l-rings {
        z-index: 1;
      }
      /* Centre medallion: a small disc laid flat on the ground (transform set in _paint), in the
         chart background with a theme border, showing the selected metric's icon. */
      /* Below the cylinders (l-rings z 1) so foreground columns pass over the medallion; still above
         the ground map (z 0). */
      .center-plane {
        position: absolute;
        z-index: 0;
        transform-origin: center;
        will-change: transform;
        pointer-events: none;
      }
      .center-disc {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        box-shadow: 0 1px 3px var(--shadow-color, rgba(0, 0, 0, 0.3));
      }
      .center-disc ha-icon {
        --mdc-icon-size: 34px;
        color: var(--primary-text-color);
      }
      /* Hour labels laid flat on the ground (transform set in _paint). Below the cylinders (z 1) so
         foreground columns pass over them; above the ground map. */
      .hour-label {
        position: absolute;
        z-index: 0;
        transform-origin: center;
        will-change: transform;
        pointer-events: none;
        font-size: var(--ha-font-size-s, 12px);
        font-variant-numeric: tabular-nums;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }
      /* Hover tooltip; left/top are set inline to the cursor, then clamped inside the card. */
      .tip {
        position: absolute;
        z-index: 14;
        min-width: 120px;
        max-width: 80%;
        box-sizing: border-box;
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #212121);
        border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        border-radius: 8px;
        padding: 6px 10px;
        font-size: var(--ha-font-size-s, 12px);
        line-height: 1.6;
        font-variant-numeric: tabular-nums;
        box-shadow: 0 2px 6px var(--shadow-color, rgba(0, 0, 0, 0.3));
        pointer-events: none;
      }
      .tip-head {
        font-weight: 600;
        margin-bottom: 2px;
      }
      .tip-row {
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
      }
      .tip-row ha-icon {
        --mdc-icon-size: 16px;
        flex: none;
      }
      .tip-total {
        font-weight: 600;
        margin-top: 4px;
        padding-top: 4px;
        border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      }
      /* Forecast (not-yet-measured) hours: italic to echo the transparent cylinders. */
      .tip.predicted {
        font-style: italic;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-clock-card": HuiEnergyClockCard;
  }
}
