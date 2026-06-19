// Companion chart for the Solar scene card: the solar production curve over the period selected
// in the dashboard date picker, styled like the other energy charts (ECharts via ha-chart-base).
// Hovering (or touch-dragging) the chart scrubs anywhere inside that period and writes a shared
// instant, so the sun in the Solar scene card above follows; a click pins a marker on that moment.
import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
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
import { getCommonOptions } from "./common/energy-chart-options";
import { formatNumber } from "../../../../common/number/format_number";
import { formatShortDateTime } from "../../../../common/datetime/format_date_time";
import type { HaChartBase } from "../../../../components/chart/ha-chart-base";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import type { HaECOption } from "../../../../resources/echarts/echarts";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import { getEnergyDataCollection } from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../energy/constants";
import type {
  SolarSceneSync,
  SolarSceneSyncState,
} from "./common/solar-scene-sync";
import { getSolarSceneSync } from "./common/solar-scene-sync";

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

  @state() private _period?: { start: Date; end?: Date };

  private _forecast: { t: number; watts: number }[] = [];

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

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("_config")) this._connectSync();
    if (changed.has("hass")) this._readForecast();
  }

  private _connectSync(): void {
    if (this._sync || !this._config) return;
    this._sync = getSolarSceneSync(
      this._config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY
    );
    this._unsub = this._sync.subscribe((state: SolarSceneSyncState) => {
      this._instant = state.instant;
    });
  }

  protected render() {
    if (!this.hass || !this._config || !this._period) return nothing;
    const start = this._period.start.getTime();
    const end = (this._period.end ?? new Date()).getTime();
    return html`
      <ha-card>
        ${this._config.title
          ? html`<div class="card-header">
              <span>${this._config.title}</span>
            </div>`
          : nothing}
        <div class="content">
          <ha-chart-base
            .hass=${this.hass}
            .data=${this._series(start, end)}
            .options=${this._options(start, end)}
            chart-type="line"
            height="150px"
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @pointercancel=${this._onPointerUp}
          ></ha-chart-base>
        </div>
      </ha-card>
    `;
  }

  // Drag (or tap) the chart to scrub the scene, like the Helios timeline; releasing keeps the
  // picked instant. Landing within a few px of the live "now" column snaps back to live.
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
    this._sync?.setInstant(Math.min(end, Math.max(start, v[0])));
  }

  private _findEntity(needle: string): HassEntity | undefined {
    const states = this.hass.states;
    for (const id in states)
      if (id.startsWith("sensor.") && id.includes(needle)) return states[id];
    return undefined;
  }

  private _readForecast(): void {
    if (!this.hass) return;
    const entity = this._config?.power_entity
      ? this.hass.states[this._config.power_entity]
      : this._findEntity("power_now");
    const points = entity?.attributes?.forecast as
      | { datetime: string; watts: number }[]
      | undefined;
    if (!Array.isArray(points)) return;
    this._forecast = points.map((p) => ({
      t: new Date(p.datetime).valueOf(),
      watts: p.watts,
    }));
  }

  private _curve = memoizeOne(
    (
      forecast: { t: number; watts: number }[],
      start: number,
      end: number
    ): [number, number][] =>
      forecast
        .filter((p) => p.t >= start && p.t <= end)
        .map((p) => [p.t, p.watts / 1000])
  );

  private _colors = memoizeOne((dark: boolean) => {
    const styles = getComputedStyle(this);
    return {
      line: getEnergyColor(styles, dark, false, false, "--energy-solar-color"),
      fill: getEnergyColor(styles, dark, true, false, "--energy-solar-color"),
      nowColor:
        styles.getPropertyValue("--secondary-text-color").trim() || "#888",
    };
  });

  private _series(start: number, end: number): LineSeriesOption[] {
    const { line, fill, nowColor } = this._colors(this.hass.themes.darkMode);
    // Always show a present-time cursor; add the picked-instant cursor while scrubbing.
    const now = Date.now();
    const cursors: {
      xAxis: number;
      lineStyle: { color: string; width: number; type?: "solid" | "dashed" };
    }[] = [];
    if (now >= start && now <= end)
      cursors.push({
        xAxis: now,
        lineStyle: { color: nowColor, width: 1.5, type: "dashed" },
      });
    if (this._instant !== null)
      cursors.push({
        xAxis: Math.min(end, Math.max(start, this._instant)),
        lineStyle: { color: "#ffc107", width: 2 },
      });
    return [
      {
        id: "curve",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: this._curve(this._forecast, start, end),
        lineStyle: { width: 2, color: line },
        areaStyle: { color: fill, opacity: 0.4 },
      },
      {
        id: "cursor",
        type: "line",
        data: [],
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: false },
          data: cursors,
        },
      },
    ];
  }

  // Memoised by period: getCommonOptions does date math, yet only the cursor moves while scrubbing,
  // not the axis, so the axis is rebuilt only when the selected period changes.
  private _options = memoizeOne((start: number, end: number): HaECOption => {
    const xAxis = getCommonOptions(
      new Date(start),
      new Date(end),
      this.hass.locale,
      this.hass.config,
      "kW"
    ).xAxis;
    return {
      xAxis,
      yAxis: {
        type: "value",
        name: "kW",
        nameGap: 8,
        min: 0,
        splitNumber: 3,
        axisLabel: {
          formatter: (value: number) => formatNumber(value, this.hass.locale),
        },
        splitLine: { show: true },
      },
      grid: { top: 24, bottom: 0, left: 1, right: 1, containLabel: true },
      tooltip: {
        trigger: "axis",
        formatter: (params: TopLevelFormatterParams) => {
          const point = (
            Array.isArray(params) ? params[0] : params
          ) as CallbackDataParams;
          const [ts, kw] = point.value as [number, number];
          return html`${formatShortDateTime(
            new Date(ts),
            this.hass.locale,
            this.hass.config
          )}:
          ${formatNumber(kw, this.hass.locale)} kW`;
        },
      },
    };
  });

  static styles = css`
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0;
    }
    .content {
      padding: 8px 16px 16px;
    }
    ha-chart-base {
      cursor: ew-resize;
      touch-action: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-solar-scene-timeline-card": HuiEnergySolarSceneTimelineCard;
  }
}
