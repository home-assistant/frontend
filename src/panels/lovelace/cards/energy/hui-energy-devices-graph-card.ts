import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiChartDonut, mdiChartBar } from "@mdi/js";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { BarSeriesOption, PieSeriesOption } from "echarts/charts";
import { PieChart } from "echarts/charts";
import type { ECElementEvent } from "echarts/types/dist/shared";
import { getGraphColorByIndex } from "../../../../common/color/colors";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/chart/ha-chart-base";
import type { EnergyData } from "../../../../data/energy";
import { getEnergyDataCollection } from "../../../../data/energy";
import {
  calculateStatisticSumGrowth,
  getStatisticLabel,
  isExternalStatistic,
} from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyDevicesGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import type { ECOption } from "../../../../resources/echarts";
import "../../../../components/ha-card";
import { fireEvent } from "../../../../common/dom/fire_event";
import { measureTextWidth } from "../../../../util/text";
import "../../../../components/ha-icon-button";
import { storage } from "../../../../common/decorators/storage";

const MAX_PIE_LABELS = 5;

@customElement("hui-energy-devices-graph-card")
export class HuiEnergyDevicesGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesGraphCardConfig;

  @state() private _chartData: (BarSeriesOption | PieSeriesOption)[] = [];

  @state() private _data?: EnergyData;

  @state()
  @storage({
    key: "energy-devices-graph-chart-type",
    state: true,
    subscribe: false,
  })
  private _chartType: "bar" | "pie" = "bar";

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
        <div class="card-header">
          <span>${this._config.title ? this._config.title : nothing}</span>
          <ha-icon-button
            path=${this._chartType === "pie" ? mdiChartBar : mdiChartDonut}
            label=${this.hass.localize(
              "ui.panel.lovelace.cards.energy.energy_devices_graph.change_chart_type"
            )}
            @click=${this._handleChartTypeChange}
          ></ha-icon-button>
        </div>
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
          })}"
        >
          <ha-chart-base
            .hass=${this.hass}
            .data=${this._chartData}
            .options=${this._createOptions(this._chartData, this._chartType)}
            .height=${`${Math.max(300, (this._chartData[0]?.data?.length || 0) * 28 + 50)}px`}
            @chart-click=${this._handleChartClick}
            .extraComponents=${[PieChart]}
          ></ha-chart-base>
        </div>
      </ha-card>
    `;
  }

  private _renderTooltip(params: any) {
    const title = `<h4 style="text-align: center; margin: 0;">${this._getDeviceName(
      params.name
    )}</h4>`;
    const value = `${formatNumber(
      params.value as number,
      this.hass.locale,
      params.value < 0.1 ? { maximumFractionDigits: 3 } : undefined
    )} kWh`;
    return `${title}${params.marker} ${params.seriesName}: ${value}`;
  }

  private _createOptions = memoizeOne(
    (
      data: (BarSeriesOption | PieSeriesOption)[],
      chartType: "bar" | "pie"
    ): ECOption => {
      const options: ECOption = {
        grid: {
          top: 5,
          left: 5,
          right: 40,
          bottom: 0,
          containLabel: true,
        },
        tooltip: {
          show: true,
          formatter: this._renderTooltip.bind(this),
        },
        xAxis: { show: false },
        yAxis: { show: false },
      };
      if (chartType === "bar") {
        const isMobile = window.matchMedia(
          "all and (max-width: 450px), all and (max-height: 500px)"
        ).matches;
        options.xAxis = {
          show: true,
          type: "value",
          name: "kWh",
        };
        options.yAxis = {
          show: true,
          type: "category",
          inverse: true,
          triggerEvent: true,
          // take order from data
          data: data[0]?.data?.map((d: any) => d.name),
          axisLabel: {
            formatter: this._getDeviceName.bind(this),
            overflow: "truncate",
            fontSize: 12,
            margin: 5,
            width: Math.min(
              isMobile ? 100 : 200,
              Math.max(
                ...(data[0]?.data?.map(
                  (d: any) =>
                    measureTextWidth(this._getDeviceName(d.name), 12) + 5
                ) || [])
              )
            ),
          },
        };
      }
      return options;
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

    const chartData: NonNullable<(BarSeriesOption | PieSeriesOption)["data"]> =
      [];
    const chartDataCompare: NonNullable<
      (BarSeriesOption | PieSeriesOption)["data"]
    > = [];

    const datasets: (BarSeriesOption | PieSeriesOption)[] = [
      {
        type: this._chartType,
        radius: ["40%", "70%"],
        universalTransition: true,
        name: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_devices_graph.energy_usage"
        ),
        itemStyle: {
          borderRadius: this._chartType === "bar" ? [0, 4, 4, 0] : 4,
        },
        data: chartData,
        barWidth: compareData ? 10 : 20,
        cursor: "default",
        label:
          this._chartType === "pie"
            ? {
                formatter: ({ name }) => this._getDeviceName(name),
              }
            : undefined,
      } as BarSeriesOption | PieSeriesOption,
    ];

    if (compareData) {
      datasets.push({
        type: this._chartType,
        universalTransition: true,
        name: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_devices_graph.previous_energy_usage"
        ),
        itemStyle: {
          borderRadius: this._chartType === "bar" ? [0, 4, 4, 0] : 4,
        },
        data: chartDataCompare,
        barWidth: 10,
        cursor: "default",
        label:
          this._chartType === "pie"
            ? {
                formatter: ({ name }) => this._getDeviceName(name),
              }
            : undefined,
      } as BarSeriesOption | PieSeriesOption);
    }

    const computedStyle = getComputedStyle(this);

    const exclude = this._config?.hide_compound_stats
      ? energyData.prefs.device_consumption
          .map((d) => d.included_in_stat)
          .filter(Boolean)
      : [];

    energyData.prefs.device_consumption.forEach((device, id) => {
      if (exclude.includes(device.stat_consumption)) {
        return;
      }
      const value =
        device.stat_consumption in data
          ? calculateStatisticSumGrowth(data[device.stat_consumption]) || 0
          : 0;
      const color = getGraphColorByIndex(id, computedStyle);

      chartData.push({
        id,
        value: value,
        name: device.stat_consumption,
        itemStyle: {
          color: color + "7F",
          borderColor: color,
        },
      });

      if (compareData) {
        const compareValue =
          device.stat_consumption in compareData
            ? calculateStatisticSumGrowth(
                compareData[device.stat_consumption]
              ) || 0
            : 0;

        chartDataCompare.push({
          id,
          value: compareValue,
          name: device.stat_consumption,
          itemStyle: {
            color: color + "32",
            borderColor: color + "7F",
          },
        });
      }
    });

    datasets.forEach((dataset) => {
      dataset.data!.sort((a: any, b: any) => b.value - a.value);

      dataset.data!.length = Math.min(
        this._config?.max_devices || Infinity,
        dataset.data!.length
      );
      if (dataset.data!.length > MAX_PIE_LABELS) {
        for (let i = MAX_PIE_LABELS; i < dataset.data!.length; i++) {
          (dataset.data![i]! as Record<string, any>).label = { show: false };
        }
      }
    });

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

  private _handleChartTypeChange(): void {
    this._chartType = this._chartType === "pie" ? "bar" : "pie";
    this._getStatistics(this._data!);
  }

  static styles = css`
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
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
    ha-icon-button {
      transform: rotate(90deg);
      color: var(--secondary-text-color);
      cursor: pointer;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-devices-graph-card": HuiEnergyDevicesGraphCard;
  }
}
