import { endOfToday, isToday, startOfToday } from "date-fns";
import type { HassConfig, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { LineSeriesOption } from "echarts/charts";
import { LinearGradient } from "../../../../resources/echarts/echarts";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import type { EnergyData } from "../../../../data/energy";
import { getEnergyDataCollection } from "../../../../data/energy";
import type { StatisticValue } from "../../../../data/recorder";
import type { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { PowerSourcesGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import { getCommonOptions, fillLineGaps } from "./common/energy-chart-options";
import type { ECOption } from "../../../../resources/echarts/echarts";
import { hex2rgb } from "../../../../common/color/convert-color";
import type { CustomLegendOption } from "../../../../components/chart/ha-chart-base";

@customElement("hui-power-sources-graph-card")
export class HuiPowerSourcesGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: PowerSourcesGraphCardConfig;

  @state() private _chartData: LineSeriesOption[] = [];

  @state() private _legendData?: CustomLegendOption["data"];

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

  public setConfig(config: PowerSourcesGraphCardConfig): void {
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
              this._compareEnd,
              this._legendData
            )}
          ></ha-chart-base>
          ${!this._chartData.some((dataset) => dataset.data!.length)
            ? html`<div class="no-data">
                ${isToday(this._start)
                  ? this.hass.localize("ui.panel.lovelace.cards.energy.no_data")
                  : this.hass.localize(
                      "ui.panel.lovelace.cards.energy.no_data_period"
                    )}
              </div>`
            : nothing}
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
      compareEnd?: Date,
      legendData?: CustomLegendOption["data"]
    ): ECOption => ({
      ...getCommonOptions(
        start,
        end,
        locale,
        config,
        "kW",
        compareStart,
        compareEnd
      ),
      legend: {
        show: this._config?.show_legend !== false,
        type: "custom",
        data: legendData,
      },
    })
  );

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    const datasets: LineSeriesOption[] = [];
    this._legendData = [];

    const statIds = {
      solar: {
        stats: [] as string[],
        color: "--energy-solar-color",
        name: this.hass.localize(
          "ui.panel.lovelace.cards.energy.power_graph.solar"
        ),
      },
      grid: {
        stats: [] as string[],
        color: "--energy-grid-consumption-color",
        name: this.hass.localize(
          "ui.panel.lovelace.cards.energy.power_graph.grid"
        ),
      },
      battery: {
        stats: [] as string[],
        color: "--energy-battery-out-color",
        name: this.hass.localize(
          "ui.panel.lovelace.cards.energy.power_graph.battery"
        ),
      },
    };

    const computedStyles = getComputedStyle(this);

    for (const source of energyData.prefs.energy_sources) {
      if (source.type === "solar") {
        if (source.stat_rate) {
          statIds.solar.stats.push(source.stat_rate);
        }
        continue;
      }

      if (source.type === "battery") {
        if (source.stat_rate) {
          statIds.battery.stats.push(source.stat_rate);
        }
        continue;
      }

      if (source.type === "grid" && source.power) {
        statIds.grid.stats.push(...source.power.map((p) => p.stat_rate));
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

    Object.keys(statIds).forEach((key, keyIndex) => {
      if (statIds[key].stats.length) {
        const colorHex = computedStyles.getPropertyValue(statIds[key].color);
        const rgb = hex2rgb(colorHex);
        // Echarts is supposed to handle that but it is bugged when you use it together with stacking.
        // The interpolation breaks the stacking, so this positive/negative is a workaround
        const { positive, negative } = this._processData(
          statIds[key].stats.map((id: string) => energyData.stats[id] ?? [])
        );
        datasets.push({
          ...commonSeriesOptions,
          id: key,
          name: statIds[key].name,
          color: colorHex,
          stack: "positive",
          areaStyle: {
            color: new LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.75)`,
              },
              {
                offset: 1,
                color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.25)`,
              },
            ]),
          },
          data: positive,
          z: 3 - keyIndex, // draw in reverse order so 0 value lines are overwritten
        });
        if (key !== "solar") {
          datasets.push({
            ...commonSeriesOptions,
            id: `${key}-negative`,
            name: statIds[key].name,
            color: colorHex,
            stack: "negative",
            areaStyle: {
              color: new LinearGradient(0, 1, 0, 0, [
                {
                  offset: 0,
                  color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.75)`,
                },
                {
                  offset: 1,
                  color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.25)`,
                },
              ]),
            },
            data: negative,
            z: 4 - keyIndex, // draw in reverse order but above positive series
          });
        }
        this._legendData!.push({
          id: key,
          secondaryIds: key !== "solar" ? [`${key}-negative`] : [],
          name: statIds[key].name,
          itemStyle: {
            color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.75)`,
            borderColor: colorHex,
          },
        });
      }
    });

    this._start = energyData.start;
    this._end = energyData.end || endOfToday();

    this._chartData = fillLineGaps(datasets);

    const usageData: NonNullable<LineSeriesOption["data"]> = [];
    this._chartData[0]?.data!.forEach((item, i) => {
      // fillLineGaps ensures all datasets have the same x values
      const x =
        typeof item === "object" && "value" in item!
          ? item.value![0]
          : item![0];
      usageData[i] = [x, 0];
      this._chartData.forEach((dataset) => {
        const y =
          typeof dataset.data![i] === "object" && "value" in dataset.data![i]!
            ? dataset.data![i].value![1]
            : dataset.data![i]![1];
        usageData[i]![1] += y as number;
      });
    });
    this._chartData.push({
      ...commonSeriesOptions,
      id: "usage",
      name: this.hass.localize(
        "ui.panel.lovelace.cards.energy.power_graph.usage"
      ),
      color: computedStyles.getPropertyValue("--primary-text-color"),
      lineStyle: {
        type: [7, 2],
        width: 1.5,
      },
      data: usageData,
      z: 5,
    });
    this._legendData!.push({
      id: "usage",
      name: this.hass.localize(
        "ui.panel.lovelace.cards.energy.power_graph.usage"
      ),
      itemStyle: {
        color: computedStyles.getPropertyValue("--primary-text-color"),
      },
    });
  }

  private _processData(stats: StatisticValue[][]) {
    const data: Record<number, number[]> = {};
    stats.forEach((statSet) => {
      statSet.forEach((point) => {
        if (point.mean == null) {
          return;
        }
        const x = (point.start + point.end) / 2;
        data[x] = [...(data[x] ?? []), point.mean];
      });
    });
    const positive: [number, number][] = [];
    const negative: [number, number][] = [];
    Object.entries(data).forEach(([x, y]) => {
      const ts = Number(x);
      const sumY = y.reduce((a, b) => a + b, 0);
      positive.push([ts, Math.max(0, sumY)]);
      negative.push([ts, Math.min(0, sumY)]);
    });
    return { positive, negative };
  }

  static styles = css`
    ha-card {
      height: 100%;
    }
    .card-header {
      padding-bottom: 0;
    }
    .content {
      padding: var(--ha-space-4);
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
      margin-left: var(--ha-space-8);
      margin-inline-start: var(--ha-space-8);
      margin-inline-end: initial;
      box-sizing: border-box;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-power-sources-graph-card": HuiPowerSourcesGraphCard;
  }
}
