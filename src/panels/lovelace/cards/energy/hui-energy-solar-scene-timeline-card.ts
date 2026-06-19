// Companion chart for the Solar scene card: a day-long solar production curve styled like the
// other energy charts (ECharts via ha-chart-base). Its slider drives a shared time cursor, so
// scrubbing here moves the sun in the Solar scene card sitting above it.
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type {
  CallbackDataParams,
  LineSeriesOption,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import { getEnergyColor } from "./common/color";
import { formatNumber } from "../../../../common/number/format_number";
import { formatTime } from "../../../../common/datetime/format_time";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import type { HaECOption } from "../../../../resources/echarts/echarts";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
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

const SAMPLE_STEP_MIN = 15;
const DAY_MIN = 1440;

const dayStart = (): number => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.valueOf();
};

const nowMinute = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

@customElement("hui-energy-solar-scene-timeline-card")
export class HuiEnergySolarSceneTimelineCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergySolarSceneTimelineCardConfig;

  @state() private _state: SolarSceneSyncState = { minute: 0, live: true };

  private _forecast: { minute: number; watts: number }[] = [];

  private _sync?: SolarSceneSync;

  private _unsub?: () => void;

  public setConfig(config: EnergySolarSceneTimelineCardConfig): void {
    this._config = config;
  }

  public getCardSize(): number {
    return 4;
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
    this._unsub = this._sync.subscribe((state) => {
      this._state = state;
    });
  }

  private _cursorMinute(): number {
    return this._state.live ? nowMinute() : this._state.minute;
  }

  protected render() {
    if (!this.hass || !this._config) return nothing;
    const minute = this._cursorMinute();
    const label = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(
      Math.floor(minute % 60)
    ).padStart(2, "0")}`;
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
            .data=${this._series(this._forecast, minute)}
            .options=${this._options()}
            chart-type="line"
            height="150px"
          ></ha-chart-base>
          <div class="row">
            <span class="time">${label}</span>
            <input
              type="range"
              min="0"
              max=${DAY_MIN - 1}
              .value=${String(minute)}
              @input=${this._onScrub}
            />
            <button
              class=${this._state.live ? "live on" : "live"}
              @click=${this._toggleLive}
            >
              ${this._state.live ? "● live" : "live"}
            </button>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _onScrub(ev: Event): void {
    this._sync?.setMinute(Number((ev.target as HTMLInputElement).value));
  }

  private _toggleLive(): void {
    this._sync?.setLive(!this._state.live);
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
    const midnight = dayStart();
    this._forecast = points
      .map((p) => ({
        minute: (new Date(p.datetime).valueOf() - midnight) / 60000,
        watts: p.watts,
      }))
      .filter((p) => p.minute >= -60 && p.minute <= 1500);
  }

  private _powerAt(minute: number): number {
    const forecast = this._forecast;
    if (!forecast.length) {
      const x = (minute - 780) / 240; // placeholder bell curve until a forecast is present
      return Math.max(0, 4200 * Math.exp(-x * x));
    }
    let before = forecast[0];
    let after = forecast[forecast.length - 1];
    for (let i = 0; i < forecast.length - 1; i++)
      if (forecast[i].minute <= minute && forecast[i + 1].minute >= minute) {
        before = forecast[i];
        after = forecast[i + 1];
        break;
      }
    const span = after.minute - before.minute || 1;
    return (
      before.watts +
      ((after.watts - before.watts) * (minute - before.minute)) / span
    );
  }

  private _curve = memoizeOne(
    (_forecast: { minute: number; watts: number }[]): [number, number][] => {
      const midnight = dayStart();
      const data: [number, number][] = [];
      for (let minute = 0; minute <= DAY_MIN; minute += SAMPLE_STEP_MIN)
        data.push([midnight + minute * 60000, this._powerAt(minute) / 1000]);
      return data;
    }
  );

  private _series(
    forecast: { minute: number; watts: number }[],
    cursorMinute: number
  ): LineSeriesOption[] {
    const styles = getComputedStyle(this);
    const dark = this.hass.themes.darkMode;
    const line = getEnergyColor(
      styles,
      dark,
      false,
      false,
      "--energy-solar-color"
    );
    const fill = getEnergyColor(
      styles,
      dark,
      true,
      false,
      "--energy-solar-color"
    );
    return [
      {
        id: "curve",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: this._curve(forecast),
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
          lineStyle: { color: "#ffc107", width: 2 },
          data: [{ xAxis: dayStart() + cursorMinute * 60000 }],
        },
      },
    ];
  }

  private _options(): HaECOption {
    const midnight = dayStart();
    return {
      xAxis: {
        type: "time",
        min: midnight,
        max: midnight + DAY_MIN * 60000,
        axisLabel: {
          formatter: (value: number) =>
            formatTime(new Date(value), this.hass.locale, this.hass.config),
        },
      },
      yAxis: {
        type: "value",
        name: "kW",
        min: 0,
        axisLabel: {
          formatter: (value: number) => formatNumber(value, this.hass.locale),
        },
        splitLine: { show: true },
      },
      grid: { top: 15, bottom: 0, left: 1, right: 1, containLabel: true },
      tooltip: {
        trigger: "axis",
        formatter: (params: TopLevelFormatterParams) => {
          const point = (
            Array.isArray(params) ? params[0] : params
          ) as CallbackDataParams;
          const [ts, kw] = point.value as [number, number];
          return html`${formatTime(
            new Date(ts),
            this.hass.locale,
            this.hass.config
          )}:
          ${formatNumber(kw, this.hass.locale)} kW`;
        },
      },
    };
  }

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
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }
    .time {
      font-variant-numeric: tabular-nums;
      color: var(--secondary-text-color);
      min-width: 44px;
    }
    input[type="range"] {
      flex: 1;
      accent-color: var(--energy-solar-color, #ff9800);
    }
    button.live {
      border: none;
      border-radius: 14px;
      padding: 4px 12px;
      font-size: 12px;
      cursor: pointer;
      color: var(--secondary-text-color);
      background: var(--secondary-background-color);
    }
    button.live.on {
      color: #fff;
      background: var(--energy-solar-color, #ff9800);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-solar-scene-timeline-card": HuiEnergySolarSceneTimelineCard;
  }
}
