import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { BarSeriesOption } from "echarts/charts";
import type { ECElementEvent } from "echarts/types/dist/shared";
import { getGraphColorByIndex } from "../../../../common/color/colors";
import {
  formatNumber,
  getNumberFormatOptions,
} from "../../../../common/number/format_number";
import "../../../../components/chart/ha-chart-base";
import type { EnergyData } from "../../../../data/energy";
import { getEnergyDataCollection } from "../../../../data/energy";
import {
  calculateStatisticSumGrowth,
  getStatisticLabel,
  isExternalStatistic,
} from "../../../../data/recorder";
import type { Statistics } from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyDevicesGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import type { ECOption } from "../../../../resources/echarts";
import "../../../../components/ha-card";
import { fireEvent } from "../../../../common/dom/fire_event";
import { measureTextWidth } from "../../../../util/text";

@customElement("hui-energy-devices-graph-card")
export class HuiEnergyDevicesGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesGraphCardConfig;

  @state() private _chartData: BarSeriesOption[] = [];

  @state() private _data?: EnergyData;

  private _categories: string[] = [];

  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._data = data;
        this._getStatistics(data);
      }),
    ];
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public setConfig(config: EnergyDevicesGraphCardConfig): void {
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
            .options=${this._createOptions(this._chartData, this._categories)}
            .height=${`${(this._categories.length || 0) * 28 + 50}px`}
            @chart-click=${this._handleChartClick}
          ></ha-chart-base>
        </div>
      </ha-card>
    `;
  }

  private _renderTooltip(params: any) {
    let tooltip;
    tooltip = `<h4 style="text-align: center; margin: 0;">${this._getDeviceName(
      this._getDeviceName(params[0].axisValue)
    )}</h4>`;
    let sum = 0;
    params.forEach((param, idx) => {
      const value = `${formatNumber(
        param.value[0] as number,
        this.hass.locale,
        getNumberFormatOptions(undefined, this.hass.entities[param.value[1]])
      )} kWh`;
      sum += param.value[0];
      if (idx > 0) {
        tooltip += "<br>";
      }
      tooltip += param.marker;
      tooltip +=
        params.length > 1 && idx === params.length - 1
          ? "Untracked"
          : param.seriesName;
      tooltip += ": ";
      tooltip += value;
    });
    if (params.length > 1) {
      const sumFormat = `${formatNumber(sum, this.hass.locale)} kWh`;
      tooltip += `<hr><b>Total: ${sumFormat}</b>`;
    }
    return tooltip;
  }

  private _createOptions = memoizeOne(
    (_data: BarSeriesOption[], categories: string[]): ECOption => {
      const isMobile = window.matchMedia(
        "all and (max-width: 450px), all and (max-height: 500px)"
      ).matches;

      return {
        xAxis: {
          type: "value",
          name: "kWh",
        },
        yAxis: {
          type: "category",
          inverse: true,
          triggerEvent: true,
          // take order from data
          data: categories,
          axisLabel: {
            formatter: this._getDeviceName.bind(this),
            overflow: "truncate",
            fontSize: 12,
            margin: 5,
            width: Math.min(
              isMobile ? 100 : 200,
              Math.max(
                ...(categories.map(
                  (d: any) => measureTextWidth(this._getDeviceName(d), 12) + 5
                ) || [])
              )
            ),
          },
        },
        grid: {
          top: 5,
          left: 5,
          right: 40,
          bottom: 0,
          containLabel: true,
        },
        tooltip: {
          show: true,
          trigger: "axis",
          formatter: this._renderTooltip.bind(this),
        },
      };
    }
  );

  private _getDeviceName(statisticId: string): string {
    return (
      this._data?.prefs.device_consumption.find(
        (d) => d.stat_consumption === statisticId
      )?.name ||
      getStatisticLabel(
        this.hass,
        statisticId,
        this._data?.statsMetadata[statisticId]
      )
    );
  }

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    const data = energyData.stats;
    const compareData = energyData.statsCompare;

    const datasets: BarSeriesOption[] = [];
    const computedStyle = getComputedStyle(this);
    const childMap: Record<string, string[]> = {};
    const colors: Record<string, string> = {};
    let sortedConsumption: string[] = [];

    energyData.prefs.device_consumption.forEach((d, idx) => {
      if (d.included_in_stat) {
        childMap[d.included_in_stat] = childMap[d.included_in_stat] || [];
        childMap[d.included_in_stat].push(d.stat_consumption);
      }
      colors[d.stat_consumption] = getGraphColorByIndex(idx, computedStyle);
    });

    let id = 0;
    const processDataset = (stats: Statistics, compare: boolean) => {
      const consumptions: Record<string, number> = {};
      energyData.prefs.device_consumption.forEach((device) => {
        consumptions[device.stat_consumption] =
          device.stat_consumption in stats
            ? calculateStatisticSumGrowth(stats[device.stat_consumption]) || 0
            : 0;
      });

      if (!compare) {
        sortedConsumption = Object.keys(consumptions).sort(
          (a, b) => consumptions[b] - consumptions[a]
        );
      }

      sortedConsumption.forEach((category) => {
        if (childMap[category]) {
          const children = childMap[category].sort(
            (a, b) => consumptions[b] - consumptions[a]
          );
          children.forEach((child) => {
            datasets.push({
              type: "bar",
              name: this._getDeviceName(child),
              data: [
                {
                  id: id++, // FIXME - I don't think this does anything?
                  value: [consumptions[child], category],
                  itemStyle: {
                    color: colors[child] + (compare ? "32" : "7F"),
                    borderColor: colors[child] + (compare ? "7F" : "FF"),
                  },
                },
              ],
              barWidth: compareData ? 10 : 20,
              cursor: "default",
              stack: "total" + (compare ? "compare" : ""),
            });
          });
        }
        datasets.push({
          type: "bar",
          name: this._getDeviceName(category),
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
          },
          data: [
            {
              value: [
                (childMap[category] ?? []).reduce(
                  (acc, dev) => acc - consumptions[dev],
                  consumptions[category]
                ),
                category,
              ],
              itemStyle: {
                color: colors[category] + (compare ? "32" : "7F"),
                borderColor: colors[category] + (compare ? "7F" : "FF"),
              },
            },
          ],
          barWidth: compareData ? 10 : 20,
          cursor: "default",
          stack: "total" + (compare ? "compare" : ""),
        });
      });
    };

    processDataset(data, false);
    if (compareData) {
      processDataset(compareData, true);
    }

    this._categories = [
      ...new Set(datasets.map((d: any) => d.data![0]!.value![1])),
    ];

    // FIXME - fix this
    // chartData.length = this._config?.max_devices || chartData.length;

    this._chartData = datasets;
    await this.updateComplete;
  }

  private _handleChartClick(e: CustomEvent<ECElementEvent>): void {
    if (
      e.detail.targetType === "axisLabel" &&
      e.detail.value &&
      !isExternalStatistic(e.detail.value as string)
    ) {
      fireEvent(this, "hass-more-info", {
        entityId: e.detail.value as string,
      });
    }
  }

  static styles = css`
    .card-header {
      padding-bottom: 0;
    }
    .content {
      padding: 16px;
    }
    .has-header {
      padding-top: 0;
    }
    ha-chart-base {
      --chart-max-height: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-devices-graph-card": HuiEnergyDevicesGraphCard;
  }
}
