import { endOfToday, isToday, startOfToday } from "date-fns";
import type { HassConfig, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { LineSeriesOption } from "echarts/charts";
import type {
  TooltipOption,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import { graphic } from "echarts";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import type { EnergyData } from "../../../../data/energy";
import { getEnergyDataCollection } from "../../../../data/energy";
import type { StatisticValue } from "../../../../data/recorder";
import type { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { PowerGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import { getCommonOptions, fillLineGaps } from "./common/energy-chart-options";
import type { ECOption } from "../../../../resources/echarts";
import { hex2rgb } from "../../../../common/color/convert-color";

@customElement("hui-power-graph-card")
export class HuiPowerGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: PowerGraphCardConfig;

  @state() private _chartData: LineSeriesOption[] = [];

  @state() private _start = startOfToday();

  @state() private _end = endOfToday();

  @state() private _compareStart?: Date;

  @state() private _compareEnd?: Date;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config?.collection_key,
      }).subscribe((data) => this._getStatistics(data)),
    ];
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public setConfig(config: PowerGraphCardConfig): void {
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
    );
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-card>
        ${this._config.title
          ? html`<h1 class="card-header">${this._config.title}</h1>`
          : ""}
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
          })}"
        >
          <ha-chart-base
            .hass=${this.hass}
            .data=${this._chartData}
            .options=${this._createOptions(
              this._start,
              this._end,
              this.hass.locale,
              this.hass.config,
              this._compareStart,
              this._compareEnd
            )}
            chart-type="bar"
          ></ha-chart-base>
          ${!this._chartData.some((dataset) => dataset.data!.length)
            ? html`<div class="no-data">
                ${isToday(this._start)
                  ? this.hass.localize("ui.panel.lovelace.cards.energy.no_data")
                  : this.hass.localize(
                      "ui.panel.lovelace.cards.energy.no_data_period"
                    )}
              </div>`
            : ""}
        </div>
      </ha-card>
    `;
  }

  private _createOptions = memoizeOne(
    (
      start: Date,
      end: Date,
      locale: FrontendLocaleData,
      config: HassConfig,
      compareStart?: Date,
      compareEnd?: Date
    ): ECOption => {
      const commonOptions = getCommonOptions(
        start,
        end,
        locale,
        config,
        "kW",
        compareStart,
        compareEnd,
      );
      return commonOptions;
    }
  );

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    const datasets: LineSeriesOption[] = [];

    const statIds = {
      solar: {
        positive: [] as string[],
        negative: [] as string[],
        color: "--energy-solar-color",
        name: this.hass.localize("ui.panel.lovelace.cards.energy.power_graph.solar"),
      },
      grid: {
        positive: [] as string[],
        negative: [] as string[],
        color: "--energy-grid-consumption-color",
        name: this.hass.localize("ui.panel.lovelace.cards.energy.power_graph.grid"),
      },
      battery: {
        positive: [] as string[],
        negative: [] as string[],
        color: "--energy-battery-out-color",
        name: this.hass.localize("ui.panel.lovelace.cards.energy.power_graph.battery"),
      },
    };

    const computedStyles = getComputedStyle(this);

    for (const source of energyData.prefs.energy_sources) {
      if (source.type === "solar") {
        if (source.stat_power_from) {
          statIds.solar.positive.push(source.stat_power_from);
        }
        continue;
      }

      if (source.type === "battery") {
        if (source.stat_power_to) {
          statIds.battery.negative.push(source.stat_power_to);
        }
        if (source.stat_power_from) {
          statIds.battery.positive.push(source.stat_power_from);
        }
        continue;
      }

      if (source.type !== "grid") {
        continue;
      }

      // grid source
      for (const flowFrom of source.flow_from) {
        if (flowFrom.stat_power_from) {
          statIds.grid.positive.push(flowFrom.stat_power_from);
        }
      }
      for (const flowTo of source.flow_to) {
        if (flowTo.stat_power_to) {
          statIds.grid.negative.push(flowTo.stat_power_to);
        }
      }
    }
    const commonSeriesOptions: LineSeriesOption = {
      type: "line",
      smooth: 0.4,
      smoothMonotone: "x",
      lineStyle: {
        width: 1,
      },
    };

    Object.keys(statIds).forEach((key) => {
      if (statIds[key].positive.length || statIds[key].negative.length) {
        const colorHex = computedStyles.getPropertyValue(statIds[key].color);
        const rgb = hex2rgb(colorHex);
        const data = this._processData(
          statIds[key].positive.map(
            (id: string) => energyData.stats[id] ?? []
          ),
          statIds[key].negative.map(
            (id: string) => energyData.stats[id] ?? []
          )
        );
        if (statIds[key].positive.length) {
          datasets.push({
            ...commonSeriesOptions,
            id: key,
            name: statIds[key].name,
            color: colorHex,
            stack: "positive",
            areaStyle: {
              color: new graphic.LinearGradient(0, 0, 0, 1, [
                {
                  offset: 0,
                  color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.6)`,
                },
                {
                  offset: 1,
                  color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`,
                },
              ]),
            },
            data: data.map((d) => [d![0], Math.max(d![1], 0)]),
          });
        }
        if (statIds[key].negative.length) {
          datasets.push({
            ...commonSeriesOptions,
            id: `${key}-negative`,
            name: `${statIds[key].name}-negative`,
            color: colorHex,
            stack: "negative",
            areaStyle: {
              color: new graphic.LinearGradient(0, 0, 0, 1, [
                {
                  offset: 0,
                  color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.6)`,
                },
                {
                  offset: 1,
                  color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`,
                },
              ]),
            },
            data: data.map((d) => [d![0], Math.min(d![1], 0)]),
          });
        }
      }
    });

    this._start = energyData.start;
    this._end = energyData.end || endOfToday();

    this._chartData = fillLineGaps(datasets);
    console.log(this._chartData);
  }

  private _processData(
    positive: StatisticValue[][],
    negative: StatisticValue[][]
  ): NonNullable<LineSeriesOption["data"]> {
    const data: Record<number, number[]> = {};
    positive.forEach((statSet) => {
      statSet.forEach((point) => {
        if (point.mean == null) {
          return;
        }
        const x = (point.start + point.end) / 2;
        data[x] = [...(data[x] ?? []), point.mean];
      });
    });
    negative.forEach((statSet) => {
      statSet.forEach((point) => {
        if (point.mean == null) {
          return;
        }
        const x = (point.start + point.end) / 2;
        data[x] = [...(data[x] ?? []), -point.mean];
      });
    });
    return Object.entries(data).map(([x, y]) => [
      Number(x),
      y.reduce((a, b) => a + b, 0) / y.length,
    ]);
  }

  static styles = css`
    ha-card {
      height: 100%;
    }
    .card-header {
      padding-bottom: 0;
    }
    .content {
      padding: 16px;
    }
    .has-header {
      padding-top: 0;
    }
    .no-data {
      position: absolute;
      height: 100%;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20%;
      margin-left: 32px;
      margin-inline-start: 32px;
      margin-inline-end: initial;
      box-sizing: border-box;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-power-graph-card": HuiPowerGraphCard;
  }
}
