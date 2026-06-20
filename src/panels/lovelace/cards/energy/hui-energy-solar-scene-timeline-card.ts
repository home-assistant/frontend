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
  power_entity?: string;
}

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

  private _snappedKey = "";

  // Solar forecast (fetched separately, like the native solar graph; not part of the energy data).
  @state() private _forecasts?: EnergySolarForecasts;

  private _forecastFetched = false;

  private _sync?: SolarSceneSync;

  private _unsub?: () => void;

  @query("ha-chart-base") private _chartBase?: HaChartBase;

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
    )
      this._maybeFetchSoc();
    if (changed.has("_energyData")) this._maybeFetchForecasts();
    if (
      changed.has("_energyData") ||
      changed.has("_target") ||
      changed.has("_instant") ||
      changed.has("_period") ||
      changed.has("_socData") ||
      changed.has("_forecasts")
    )
      this._buildSeries();
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
    if (!hasForecast || this._forecastFetched) return;
    this._forecastFetched = true;
    try {
      this._forecasts = await getEnergySolarForecasts(this.hass);
    } catch {
      this._forecasts = undefined;
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
        getSuggestedPeriod(start, end),
        undefined,
        ["mean"]
      );
      // Average across batteries per bucket start, like the chips do.
      const byStart: Record<number, { sum: number; n: number }> = {};
      for (const id of ids)
        for (const b of stats[id] ?? [])
          if (b.mean != null) {
            const acc = byStart[b.start] ?? { sum: 0, n: 0 };
            acc.sum += b.mean;
            acc.n += 1;
            byStart[b.start] = acc;
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

  protected updated(changed: PropertyValues): void {
    super.updated(changed); // SubscribeMixin subscribes to the energy collection here
    requestAnimationFrame(() => this._positionCursors());
  }

  private _connectSync(): void {
    if (this._sync || !this._config) return;
    this._sync = getSolarSceneSync(
      this._config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY
    );
    this._unsub = this._sync.subscribe((state: SolarSceneSyncState) => {
      this._instant = state.instant;
      this._target = state.target;
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
          <hui-energy-graph-chip>
            <ha-icon icon=${this._targetIcon()}></ha-icon>
          </hui-energy-graph-chip>
        </div>
        ${this._config.title
          ? html`<div class="card-header">
              <span>${this._config.title}</span>
            </div>`
          : nothing}
        <div class="content">
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
    let t = Math.min(end, Math.max(start, v[0]));
    // On a wide range (3 months, a year, ...) the buckets are daily, so a raw pick lands on midnight,
    // which is not representative of the day. Snap to local midday instead.
    if (end - start > 2 * 86400000) {
      const noon = new Date(t);
      noon.setHours(12, 0, 0, 0);
      t = Math.min(end, Math.max(start, noon.getTime()));
    }
    this._sync?.setInstant(t);
  }

  // Build the area series (one or two: import + export, discharge + charge) for the target, exactly
  // like the energy graphs: stored in @state and memoised so scrubbing reuses the same objects and
  // ECharts never re-tweens the line. The present + scrub cursors are DOM overlays (next), kept out
  // of the chart so they never disturb its animation.
  private _buildSeries(): void {
    if (!this.hass) return;
    this._chartData = this._seriesFromData(
      this._energyData,
      this._target,
      this._socData,
      this._forecasts,
      this.hass.themes.darkMode
    );
  }

  private _seriesFromData = memoizeOne(
    (
      data: EnergyData | undefined,
      target: ChartTarget,
      socData: [number, number][],
      forecasts: EnergySolarForecasts | undefined,
      dark: boolean
    ): LineSeriesOption[] => {
      if (!data) return [];
      const styles = getComputedStyle(this);
      // State-of-charge: a single % line from its own fetch, not the energy meters.
      const dirs =
        target === "battery-soc"
          ? [{ key: "soc", token: "--energy-battery-out-color", data: socData }]
          : targetSeries(data, target);
      const series: LineSeriesOption[] = dirs.map((s) => ({
        id: s.key,
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
        if (fc.length)
          series.push({
            id: "forecast",
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
    const place = (sel: string, t: number | null): void => {
      const el = this.renderRoot.querySelector(sel) as HTMLElement | null;
      if (!el) return;
      const x = t === null ? null : xOf(Math.min(end, Math.max(start, t)));
      el.hidden = x === null;
      if (x !== null) el.style.left = `${x}px`;
    };
    const now = Date.now();
    place(".cursor-now", now >= start && now <= end ? now : null);
    place(".cursor-sel", this._instant);
  }

  // Memoised by period: getCommonOptions does date math, yet only the cursor moves while scrubbing,
  // not the axis, so the axis is rebuilt only when the selected period changes.
  private _options = memoizeOne(
    (start: number, end: number, target: ChartTarget): HaECOption => {
      const soc = target === "battery-soc";
      const unit = soc ? "%" : "kW";
      const xAxis = getCommonOptions(
        new Date(start),
        new Date(end),
        this.hass.locale,
        this.hass.config,
        unit
      ).xAxis;
      return {
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
            if (!items.length) return html``;
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
              const id = String(p.seriesId ?? "");
              const meta = TOOLTIP_META[id] ?? {
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
      padding: 8px 16px 16px;
    }
    .target-chip {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 1;
    }
    .target-chip ha-icon {
      --mdc-icon-size: 16px;
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
      top: 0;
      bottom: 0;
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
