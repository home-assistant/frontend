// Companion chart for the Solar scene card: the solar production curve over the period selected
// in the dashboard date picker, styled like the other energy charts (ECharts via ha-chart-base).
// Hovering (or touch-dragging) the chart scrubs anywhere inside that period and writes a shared
// instant, so the sun in the Solar scene card above follows; a click pins a marker on that moment.
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type {
  CallbackDataParams,
  LineSeriesOption,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import { getEnergyColor } from "./common/color";
import { fillLineGaps, getCommonOptions } from "./common/energy-chart-options";
import { formatNumber } from "../../../../common/number/format_number";
import { formatShortDateTime } from "../../../../common/datetime/format_date_time";
import type { HaChartBase } from "../../../../components/chart/ha-chart-base";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "./common/hui-energy-graph-chip";
import type { HaECOption } from "../../../../resources/echarts/echarts";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyData, EnergySolarForecasts } from "../../../../data/energy";
import {
  getEnergyDataCollection,
  getEnergySolarForecasts,
  getSuggestedPeriod,
} from "../../../../data/energy";
import type { Statistics } from "../../../../data/recorder";
import { fetchStatistics } from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../energy/constants";
import type {
  ChartTarget,
  SolarSceneSync,
  SolarSceneSyncState,
} from "./common/solar-scene-sync";
import { getSolarSceneSync } from "./common/solar-scene-sync";
import { forecastSeries, targetSeries } from "./common/solar-scene-power";

// Per-series tooltip metadata: the icon, unit and colour token shown for each curve the cursor
// crosses. Keyed on the series id set by targetSeries. The token is the SAME one the line is drawn
// with, so the icon colour matches its curve exactly (import icon in the import colour, etc.).
const TOOLTIP_META: Record<
  string,
  { icon: string; unit: string; token: string }
> = {
  solar: { icon: "mdi:solar-power", unit: "kW", token: "--energy-solar-color" },
  import: {
    icon: "mdi:transmission-tower-import",
    unit: "kW",
    token: "--energy-grid-consumption-color",
  },
  export: {
    icon: "mdi:transmission-tower-export",
    unit: "kW",
    token: "--energy-grid-return-color",
  },
  discharge: {
    icon: "mdi:battery-arrow-up",
    unit: "kW",
    token: "--energy-battery-out-color",
  },
  charge: {
    icon: "mdi:battery-arrow-down",
    unit: "kW",
    token: "--energy-battery-in-color",
  },
  forecast: {
    icon: "mdi:solar-power",
    unit: "kW",
    token: "--energy-solar-color",
  },
  soc: { icon: "mdi:battery", unit: "%", token: "--energy-battery-out-color" },
  lowcarbon: {
    icon: "mdi:leaf",
    unit: "kW",
    token: "--energy-non-fossil-color",
  },
  home: { icon: "mdi:home", unit: "kW", token: "--primary-color" },
};

export interface EnergySolarSceneTimelineCardConfig extends LovelaceCardConfig {
  collection_key?: string;
}

// Resolution for the timeline curves: finer than the energy collection's coarse default so a week or
// month reads as a detailed curve, but capped at hourly (5-minute statistics are only retained a few
// days and would leave gaps) and dropping to daily past ~2 months where hourly would be unreadable.
const finePeriod = (start: Date, end?: Date): "hour" | "day" =>
  getSuggestedPeriod(start, end, true) === "day" ? "day" : "hour";

@customElement("hui-energy-solar-scene-timeline-card")
export class HuiEnergySolarSceneTimelineCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergySolarSceneTimelineCardConfig;

  @state() private _instant: number | null = null;

  @state() private _target: ChartTarget = "production";

  @state() private _period?: { start: Date; end?: Date };

  @state() private _energyData?: EnergyData;

  @state() private _chartData: LineSeriesOption[] = [];

  // Battery state-of-charge is a level (%), not an energy meter, so the energy collection never
  // fetches it. We pull it separately whenever the chart targets it.
  @state() private _socData: [number, number][] = [];

  private _socKey = "";

  // Metric stats fetched at the FINE period (5-minute / hourly / daily by range), finer than the
  // energy collection's coarse default, so a week or a month reads as a detailed curve instead of a
  // handful of daily averages. Low-carbon stays on the coarse collection (it matches the per-bucket
  // fossil energy keyed at the coarse period).
  @state() private _fineStats: Statistics = {};

  private _fineStatsKey = "";

  private _snappedKey = "";

  // Solar forecast (fetched separately, like the native solar graph; not part of the energy data).
  @state() private _forecasts?: EnergySolarForecasts;

  private _forecastFetched = false;

  // Whether the forecast fetch has settled (resolved, failed, or none configured). The production
  // curve waits for this so the actual and forecast lines sweep in as one animation, instead of the
  // forecast doing a second, separate reveal when it arrives late.
  @state() private _forecastSettled = false;

  private _forecastTimer?: number;

  private _sync?: SolarSceneSync;

  private _unsub?: () => void;

  @query("ha-chart-base") private _chartBase?: HaChartBase;

  @query(".cursor-now") private _cursorNow?: HTMLElement;

  @query(".cursor-sel") private _cursorSel?: HTMLElement;

  private _dragging = false;

  public setConfig(config: EnergySolarSceneTimelineCardConfig): void {
    this._config = config;
  }

  public getCardSize(): number {
    return 4;
  }

  // Bind to the dashboard date selector like the other energy graphs: its period is what we plot.
  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._energyData = data;
        this._period = { start: data.start, end: data.end };
      }),
    ];
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._connectSync();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsub?.();
    this._unsub = undefined;
    this._sync = undefined;
    if (this._forecastTimer) {
      clearTimeout(this._forecastTimer);
      this._forecastTimer = undefined;
    }
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    // Like the other energy graphs: skip bare hass ticks so the chart only redraws on real data,
    // period, target or scrub changes, which keeps the ECharts line animation from churning.
    return changed.size > 1 || !changed.has("hass");
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("_config")) this._connectSync();
    if (changed.has("_period")) this._snapCursorToPeriod();
    if (
      changed.has("_energyData") ||
      changed.has("_target") ||
      changed.has("_period")
    ) {
      this._maybeFetchSoc();
    }
    if (changed.has("_energyData") || changed.has("_period")) {
      this._maybeFetchFineStats();
    }
    if (changed.has("_energyData")) this._maybeFetchForecasts();
    if (
      changed.has("_energyData") ||
      changed.has("_target") ||
      changed.has("_instant") ||
      changed.has("_period") ||
      changed.has("_socData") ||
      changed.has("_fineStats") ||
      changed.has("_forecasts") ||
      changed.has("_forecastSettled")
    ) {
      this._buildSeries();
    }
  }

  // When the dashboard period changes, drop the cursor on the last day of the period at local noon
  // so the scene refreshes to a representative moment. Guarded by the period values (not the object
  // identity) so a plain collection refresh doesn't yank a cursor the user has scrubbed.
  private _snapCursorToPeriod(): void {
    if (!this._period || !this._sync) return;
    const start = this._period.start.getTime();
    const endTime = this._period.end?.getTime() ?? Date.now();
    const key = `${start}|${this._period.end?.getTime() ?? "live"}`;
    if (key === this._snappedKey) return;
    this._snappedKey = key;
    const noon = new Date(endTime - 1);
    noon.setHours(12, 0, 0, 0);
    this._sync.setInstant(Math.min(endTime, Math.max(start, noon.getTime())));
  }

  private async _maybeFetchForecasts(): Promise<void> {
    const hasForecast = this._energyData?.prefs.energy_sources.some(
      (s) => s.type === "solar" && s.config_entry_solar_forecast?.length
    );
    if (!hasForecast) {
      // No forecast to wait for: let the production curve build right away.
      this._forecastSettled = true;
      return;
    }
    if (this._forecastFetched) return;
    this._forecastFetched = true;
    // Safety net: never hold the chart blank if the fetch stalls.
    this._forecastTimer = window.setTimeout(() => {
      this._forecastSettled = true;
    }, 1000);
    try {
      this._forecasts = await getEnergySolarForecasts(this.hass);
    } catch {
      this._forecasts = undefined;
    } finally {
      clearTimeout(this._forecastTimer);
      this._forecastTimer = undefined;
      this._forecastSettled = true;
    }
  }

  // State-of-charge stat ids from the battery sources (HA never fetches them with the energy data).
  private _socIds(): string[] {
    return (
      this._energyData?.prefs.energy_sources.flatMap((s) =>
        s.type === "battery" && s.stat_soc ? [s.stat_soc] : []
      ) ?? []
    );
  }

  private async _maybeFetchSoc(): Promise<void> {
    const ids = this._socIds();
    if (this._target !== "battery-soc" || !ids.length || !this._period) {
      return;
    }
    const start = this._period.start;
    const end = this._period.end ?? new Date();
    const key = `${ids.join(",")}|${start.getTime()}|${end.getTime()}`;
    if (key === this._socKey) return; // already have this window
    this._socKey = key;
    try {
      const stats = await fetchStatistics(
        this.hass,
        start,
        end,
        ids,
        finePeriod(start, end),
        undefined,
        ["mean"]
      );
      // Average across batteries per bucket start, like the chips do.
      const byStart: Record<number, { sum: number; n: number }> = {};
      for (const id of ids) {
        for (const b of stats[id] ?? []) {
          if (b.mean != null) {
            const acc = byStart[b.start] ?? { sum: 0, n: 0 };
            acc.sum += b.mean;
            acc.n += 1;
            byStart[b.start] = acc;
          }
        }
      }
      this._socData = Object.keys(byStart)
        .map((ts): [number, number] => [
          Number(ts),
          byStart[Number(ts)].sum / byStart[Number(ts)].n,
        ])
        .sort((a, b) => a[0] - b[0]);
    } catch {
      this._socData = [];
    }
  }

  // Energy meter stat ids feeding the curves (solar, grid import/export, battery charge/discharge).
  private _metricStatIds(): string[] {
    const ids: string[] = [];
    for (const s of this._energyData?.prefs.energy_sources ?? []) {
      if (s.type === "solar") {
        if (s.stat_energy_from) ids.push(s.stat_energy_from);
      } else if (s.type === "grid" || s.type === "battery") {
        if (s.stat_energy_from) ids.push(s.stat_energy_from);
        if (s.stat_energy_to) ids.push(s.stat_energy_to);
      }
    }
    return ids;
  }

  private async _maybeFetchFineStats(): Promise<void> {
    const ids = this._metricStatIds();
    if (!ids.length || !this._period) {
      this._fineStats = {};
      return;
    }
    const start = this._period.start;
    const end = this._period.end ?? new Date();
    const key = `${ids.join(",")}|${start.getTime()}|${end.getTime()}`;
    if (key === this._fineStatsKey) return;
    this._fineStatsKey = key;
    try {
      this._fineStats = await fetchStatistics(
        this.hass,
        start,
        end,
        ids,
        finePeriod(start, end),
        { energy: "kWh" },
        ["change"]
      );
    } catch {
      this._fineStats = {};
    }
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed); // SubscribeMixin subscribes to the energy collection here
    requestAnimationFrame(() => this._positionCursors());
  }

  private _connectSync(): void {
    if (this._sync || !this._config) return;
    this._sync = getSolarSceneSync(
      this._config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY
    );
    this._unsub = this._sync.subscribe((cursor: SolarSceneSyncState) => {
      this._instant = cursor.instant;
      this._target = cursor.target;
    });
  }

  private _targetIcon(): string {
    switch (this._target) {
      case "grid":
        return "mdi:transmission-tower";
      case "battery":
        return "mdi:lightning-bolt";
      case "battery-soc":
        return "mdi:battery";
      case "lowcarbon":
        return "mdi:leaf";
      case "home":
        return "mdi:home";
      default:
        return "mdi:solar-power";
    }
  }

  protected render() {
    if (!this.hass || !this._config || !this._period) return nothing;
    const start = this._period.start.getTime();
    const end = (this._period.end ?? new Date()).getTime();
    return html`
      <ha-card>
        <div class="target-chip">
          <hui-energy-graph-chip square>
            <ha-icon icon=${this._targetIcon()}></ha-icon>
          </hui-energy-graph-chip>
        </div>
        ${this._config.title
          ? html`<div class="card-header">
              <span>${this._config.title}</span>
            </div>`
          : nothing}
        <div class="content ${this._config.title ? "has-header" : ""}">
          <div class="chart-wrap">
            <ha-chart-base
              .hass=${this.hass}
              .data=${this._chartData}
              .options=${this._options(start, end, this._target)}
              chart-type="line"
              height="150px"
              @pointerdown=${this._onPointerDown}
              @pointermove=${this._onPointerMove}
              @pointerup=${this._onPointerUp}
              @pointercancel=${this._onPointerUp}
            ></ha-chart-base>
            <div class="cursor cursor-now"></div>
            <div class="cursor cursor-sel" hidden></div>
          </div>
        </div>
      </ha-card>
    `;
  }

  // Drag (or tap) the chart to scrub the scene; releasing keeps the picked instant. Landing within
  // a few px of the live "now" column snaps back to live.
  private _onPointerDown(ev: PointerEvent): void {
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this._dragging = true;
    this._scrubAt(ev);
  }

  private _onPointerMove(ev: PointerEvent): void {
    if (this._dragging) this._scrubAt(ev);
  }

  private _onPointerUp(ev: PointerEvent): void {
    this._dragging = false;
    try {
      (ev.currentTarget as HTMLElement).releasePointerCapture(ev.pointerId);
    } catch {
      /* capture may already be released */
    }
  }

  private _scrubAt(ev: PointerEvent): void {
    const chart = this._chartBase?.chart;
    if (!chart || !this._period) return;
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const start = this._period.start.getTime();
    const end = (this._period.end ?? new Date()).getTime();
    const now = Date.now();
    if (now >= start && now <= end) {
      const nowX = chart.convertToPixel({ gridIndex: 0 }, [now, 0]) as number[];
      if (Math.abs(x - nowX[0]) <= 8) {
        this._sync?.setLive();
        return;
      }
    }
    const v = chart.convertFromPixel({ gridIndex: 0 }, [x, 0]) as number[];
    // Land the cursor exactly where the pointer is, not snapped to a bucket boundary.
    const t = Math.min(end, Math.max(start, v[0]));
    this._sync?.setInstant(t);
  }

  // Build the area series (one or two: import + export, discharge + charge) for the target, exactly
  // like the energy graphs: stored in @state and memoised so scrubbing reuses the same objects and
  // ECharts never re-tweens the line. The present + scrub cursors are DOM overlays (next), kept out
  // of the chart so they never disturb its animation.
  private _buildSeries(): void {
    if (!this.hass) return;
    // Hold the production curve until the forecast fetch has settled so the actual and forecast lines
    // sweep in together as one animation rather than the forecast revealing itself separately later.
    if (this._target === "production" && !this._forecastSettled) return;
    this._chartData = this._seriesFromData(
      this._energyData,
      this._target,
      this._socData,
      this._fineStats,
      this._forecasts,
      this.hass.themes.darkMode
    );
  }

  private _seriesFromData = memoizeOne(
    (
      data: EnergyData | undefined,
      target: ChartTarget,
      socData: [number, number][],
      fineStats: Statistics,
      forecasts: EnergySolarForecasts | undefined,
      dark: boolean
    ): LineSeriesOption[] => {
      if (!data) return [];
      const styles = getComputedStyle(this);
      // Plot the curves from the fine-period stats (richer than the collection's coarse default),
      // except low-carbon which must stay on the collection so its per-bucket fossil share lines up.
      const fineData =
        target === "lowcarbon" || !Object.keys(fineStats).length
          ? data
          : { ...data, stats: fineStats };
      // State-of-charge: a single % line from its own fetch, not the energy meters.
      const dirs =
        target === "battery-soc"
          ? [{ key: "soc", token: "--energy-battery-out-color", data: socData }]
          : targetSeries(fineData, target);
      // Key the series ids on the period so a period change retires the old series and enters fresh
      // ones (the whole curve animates in), instead of ECharts morphing the old points by index into
      // the new range, which left the overlapping right part pinned while the rest crawled in.
      const periodKey = `${data.start.getTime()}-${data.end?.getTime() ?? "live"}`;
      const series: LineSeriesOption[] = dirs.map((s) => ({
        id: `${s.key}-${periodKey}`,
        // name stays the period-free key so the tooltip can map it to TOOLTIP_META.
        name: s.key,
        type: "line",
        smooth: 0.4,
        showSymbol: false,
        data: s.data,
        lineStyle: {
          width: 1,
          color: getEnergyColor(styles, dark, false, false, s.token),
        },
        areaStyle: {
          color: getEnergyColor(styles, dark, true, false, s.token),
          opacity: 0.4,
        },
      }));
      fillLineGaps(series);
      // Solar production forecast: a dashed line in the solar colour, like HA's native solar graph.
      if (target === "production" && forecasts) {
        const fc = forecastSeries(
          forecasts,
          data.prefs,
          data.start.getTime(),
          (data.end ?? new Date()).getTime()
        );
        if (fc.length) {
          series.push({
            id: `forecast-${periodKey}`,
            name: "forecast",
            type: "line",
            smooth: 0.4,
            showSymbol: false,
            data: fc,
            lineStyle: {
              width: 1,
              type: "dashed",
              color: getEnergyColor(
                styles,
                dark,
                false,
                false,
                "--energy-solar-color"
              ),
            },
          });
        }
      }
      return series;
    }
  );

  // Present + scrub cursors as thin DOM lines over the plot, positioned through the chart's own
  // pixel mapping, so they never touch the ECharts data.
  private _positionCursors(): void {
    const chart = this._chartBase?.chart;
    if (!chart || !this._period) return;
    const start = this._period.start.getTime();
    const end = (this._period.end ?? new Date()).getTime();
    const xOf = (t: number): number | null => {
      const px = chart.convertToPixel({ gridIndex: 0 }, [t, 0]);
      return Array.isArray(px) ? px[0] : null;
    };
    // Confine the cursors to the plot rectangle so they don't overshoot into the axis label band or
    // up past the top of the grid (which made the header gap read differently from the other cards).
    const rect = (
      chart
        // @ts-ignore internal model, the only way to read the grid pixel rect
        .getModel?.()
        ?.getComponent?.("grid", 0)?.coordinateSystem as
        | { getRect?: () => { y: number; height: number } }
        | undefined
    )?.getRect?.();
    const place = (el: HTMLElement | undefined, t: number | null): void => {
      if (!el) return;
      const x = t === null ? null : xOf(Math.min(end, Math.max(start, t)));
      el.hidden = x === null;
      if (x === null) return;
      el.style.left = `${x}px`;
      if (rect) {
        el.style.top = `${rect.y}px`;
        el.style.height = `${rect.height}px`;
      }
    };
    const now = Date.now();
    place(this._cursorNow, now >= start && now <= end ? now : null);
    place(this._cursorSel, this._instant);
  }

  // Memoised by period: getCommonOptions does date math, yet only the cursor moves while scrubbing,
  // not the axis, so the axis is rebuilt only when the selected period changes.
  private _options = memoizeOne(
    (start: number, end: number, target: ChartTarget): HaECOption => {
      const soc = target === "battery-soc";
      const unit = soc ? "%" : "kW";
      // detailedDailyData = true: this is a line chart, so the x-axis must run all the way to the
      // period end (the bar-chart rounding would cut off the last day, which is always shown on the
      // native energy cards). Same call shape as the native power-sources line graph.
      const xAxis = getCommonOptions(
        new Date(start),
        new Date(end),
        this.hass.locale,
        this.hass.config,
        unit,
        undefined,
        undefined,
        undefined,
        true
      ).xAxis;
      return {
        // Period changes retire the series (period-keyed ids) and enter fresh, but the x-axis range
        // update would otherwise slide the existing curve across; 0 makes that update instant so only
        // the new curve's draw animation plays.
        animationDurationUpdate: 0,
        xAxis,
        yAxis: {
          type: "value",
          name: unit,
          nameGap: 8,
          splitNumber: 3,
          min: soc ? 0 : undefined,
          max: soc ? 100 : undefined,
          axisLabel: {
            formatter: (value: number) => formatNumber(value, this.hass.locale),
          },
          splitLine: { show: true },
        },
        grid: { top: 24, bottom: 0, left: 1, right: 1, containLabel: true },
        // We own the pointer interaction (drag = scrub), so opt out of ha-chart-base's native zoom:
        // providing dataZoom skips its modifier-drag brush, dbl-click zoom and inside pan, and an
        // empty toolbox drops the hidden brush feature. Without this, a drag also draws a zoom range.
        dataZoom: [],
        toolbox: { show: false },
        tooltip: {
          trigger: "axis",
          formatter: (params: TopLevelFormatterParams) => {
            const items = (
              Array.isArray(params) ? params : [params]
            ) as CallbackDataParams[];
            if (!items.length) return nothing;
            const ts = (items[0].value as [number, number])[0];
            const header = formatShortDateTime(
              new Date(ts),
              this.hass.locale,
              this.hass.config
            );
            // One row per crossed curve: its coloured icon and its value (magnitude, since export and
            // charge are plotted below zero), so a two-area target reads as two labelled rows. The
            // icon is tinted with the same colour token as its curve, computed identically.
            const styles = getComputedStyle(this);
            const dark = this.hass.themes.darkMode;
            const rows = items.map((p) => {
              // seriesName is the period-free key (the id is suffixed with the period for animations).
              const key = String(p.seriesName ?? "");
              const meta = TOOLTIP_META[key] ?? {
                icon: "mdi:flash",
                unit: "kW",
                token: "--primary-color",
              };
              const color = getEnergyColor(
                styles,
                dark,
                false,
                false,
                meta.token
              );
              const raw = (p.value as [number, number])[1];
              const value = meta.unit === "%" ? Math.round(raw) : Math.abs(raw);
              return html`<div
                style="display:flex;align-items:center;gap:6px;line-height:1.6"
              >
                <ha-icon
                  icon=${meta.icon}
                  style="color:${color};--mdc-icon-size:16px"
                ></ha-icon>
                <span
                  >${formatNumber(value, this.hass.locale)} ${meta.unit}</span
                >
              </div>`;
            });
            return html`<div>
              <div style="font-weight:500;margin-bottom:2px">${header}</div>
              ${rows}
            </div>`;
          },
        },
      };
    }
  );

  static styles = css`
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0;
    }
    ha-card {
      position: relative;
    }
    .content {
      padding: 16px;
    }
    /* With a header, the header's own bottom padding sets the gap, so the content drops its
       padding-top, matching the native energy graph cards exactly. */
    .has-header {
      padding-top: 0;
    }
    .target-chip {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 1;
    }
    /* Size the icon to one line of the chip's text (font-size-m x line-height-normal) so this
       icon-only chip matches the height of the text date chip on the Solar scene card. */
    .target-chip ha-icon {
      --mdc-icon-size: calc(
        var(--ha-font-size-m) * var(--ha-line-height-normal)
      );
      display: flex;
    }
    .chart-wrap {
      position: relative;
    }
    ha-chart-base {
      cursor: ew-resize;
      touch-action: none;
    }
    .cursor {
      position: absolute;
      /* top + height are set inline to the chart's plot rectangle; this is the fallback. */
      top: 0;
      height: 100%;
      width: 0;
      pointer-events: none;
      z-index: 1;
    }
    .cursor-now {
      border-left: 1.5px dashed var(--secondary-text-color);
    }
    .cursor-sel {
      border-left: 2px solid var(--warning-color, #ffc107);
    }
    .cursor[hidden] {
      display: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-solar-scene-timeline-card": HuiEnergySolarSceneTimelineCard;
  }
}
