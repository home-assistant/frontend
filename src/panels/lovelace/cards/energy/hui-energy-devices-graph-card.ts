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
import type { PieDataItemOption } from "echarts/types/src/chart/pie/PieSeries";
import { filterXSS } from "../../../../common/util/xss";
import { getGraphColorByIndex } from "../../../../common/color/colors";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/chart/ha-chart-base";
import type { EnergyData } from "../../../../data/energy";
import {
  computeConsumptionData,
  getEnergyDataCollection,
  getSummedData,
} from "../../../../data/energy";
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
import type { ECOption } from "../../../../resources/echarts/echarts";
import "../../../../components/ha-card";
import { fireEvent } from "../../../../common/dom/fire_event";
import { measureTextWidth } from "../../../../util/text";
import "../../../../components/ha-icon-button";
import { storage } from "../../../../common/decorators/storage";
import { listenMediaQuery } from "../../../../common/dom/media_query";
import { getEnergyColor } from "./common/color";
import type { CustomLegendOption } from "../../../../components/chart/ha-chart-base";

@customElement("hui-energy-devices-graph-card")
export class HuiEnergyDevicesGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesGraphCardConfig;

  @state() private _chartData: (BarSeriesOption | PieSeriesOption)[] = [];

  @state() private _data?: EnergyData;

  @state() private _legendData: NonNullable<CustomLegendOption["data"]> = [];

  @state()
  @storage({
    key: "energy-devices-graph-chart-type",
    state: true,
    subscribe: false,
  })
  private _chartType?: "bar" | "pie";

  @state()
  @storage({
    key: "energy-devices-pie-hidden-stats",
    state: true,
    subscribe: false,
  })
  private _hiddenStats: string[] = [];

  @state() private _isMobile = false;

  private _compoundStats: string[] = [];

  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._data = data;
        this._getStatistics(data);
      }),
      listenMediaQuery(
        "all and (max-width: 450px), all and (max-height: 500px)",
        (matches) => {
          this._isMobile = matches;
        }
      ),
    ];
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public setConfig(config: EnergyDevicesGraphCardConfig): void {
    this._config = config;
  }

  private _getAllowedModes(): ("bar" | "pie")[] {
    // Empty array or undefined = allow all modes
    if (!this._config?.modes || this._config.modes.length === 0) {
      return ["bar", "pie"];
    }
    return this._config.modes;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
    );
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (changedProps.has("_config") && this._config) {
      const allowedModes = this._getAllowedModes();

      // If _chartType is not set or not in allowed modes, use first from config
      if (!this._chartType || !allowedModes.includes(this._chartType)) {
        this._chartType = allowedModes[0];
      }
    }
  }

  protected render() {
    if (!this.hass || !this._config || !this._chartType) {
      return nothing;
    }

    const modes = this._getAllowedModes();

    return html`
      <ha-card>
        <div class="card-header">
          <span>${this._config.title ? this._config.title : nothing}</span>
          ${modes.length > 1
            ? html`
                <ha-icon-button
                  .path=${this._chartType === "pie"
                    ? mdiChartBar
                    : mdiChartDonut}
                  .label=${this.hass.localize(
                    "ui.panel.lovelace.cards.energy.energy_devices_graph.change_chart_type"
                  )}
                  @click=${this._handleChartTypeChange}
                ></ha-icon-button>
              `
            : nothing}
        </div>
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
          })}"
        >
          <ha-chart-base
            .hass=${this.hass}
            .data=${this._chartData}
            .options=${this._createOptions(
              this._chartData,
              this._chartType,
              this._legendData
            )}
            .height=${`${Math.max(modes.includes("pie") ? 300 : 100, (this._legendData?.length || 0) * 28 + 50)}px`}
            .extraComponents=${[PieChart]}
            @chart-click=${this._handleChartClick}
            @dataset-hidden=${this._datasetHidden}
            @dataset-unhidden=${this._datasetUnhidden}
          ></ha-chart-base>
        </div>
      </ha-card>
    `;
  }

  private _renderTooltip(params: any) {
    const deviceName = filterXSS(this._getDeviceName(params.name));
    const title = `<h4 style="text-align: center; margin: 0;">${deviceName}</h4>`;
    const value = `${formatNumber(
      params.value[0] as number,
      this.hass.locale,
      params.value < 0.1 ? { maximumFractionDigits: 3 } : undefined
    )} kWh`;
    return `${title}${params.marker} ${params.seriesName}: <div style="direction:ltr; display: inline;">${value}</div>`;
  }

  private _createOptions = memoizeOne(
    (
      data: (BarSeriesOption | PieSeriesOption)[],
      chartType: "bar" | "pie",
      legendData: typeof this._legendData
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
        legend: { type: "custom", show: false },
      };
      if (chartType === "bar") {
        options.xAxis = {
          show: true,
          type: "value",
          name: "kWh",
          axisPointer: {
            show: false,
          },
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
              this._isMobile ? 100 : 200,
              Math.max(
                ...(data[0]?.data?.map(
                  (d: any) =>
                    measureTextWidth(this._getDeviceName(d.name), 12) + 5
                ) || [])
              )
            ),
          },
        };
      } else {
        options.legend = {
          type: "custom",
          show: true,
          data: legendData,
          selected: legendData
            .filter((d) => d.id && this._hiddenStats.includes(d.id))
            .reduce((acc, d) => {
              acc[d.id!] = false;
              return acc;
            }, {}),
        };
      }
      return options;
    }
  );

  private _getDeviceName(statisticId: string): string {
    const suffix = this._compoundStats.includes(statisticId)
      ? ` (${this.hass.localize("ui.panel.lovelace.cards.energy.energy_devices_graph.untracked")})`
      : "";
    return (
      (this._data?.prefs.device_consumption.find(
        (d) => d.stat_consumption === statisticId
      )?.name ||
        getStatisticLabel(
          this.hass,
          statisticId,
          this._data?.statsMetadata[statisticId]
        )) + suffix
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
        radius: [compareData ? "50%" : "40%", "70%"],
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
        minShowLabelAngle: 15,
        label:
          this._chartType === "pie"
            ? {
                formatter: ({ name }) => this._getDeviceName(name),
                overflow: "break",
                alignTo: this._isMobile ? "edge" : "none",
                edgeDistance: 1,
              }
            : undefined,
        labelLine: {
          length2: 10,
        },
      } as BarSeriesOption | PieSeriesOption,
    ];

    if (compareData) {
      datasets.push({
        type: this._chartType,
        radius: ["30%", "50%"],
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
        label: this._chartType === "pie" ? { show: false } : undefined,
        emphasis:
          this._chartType === "pie"
            ? {
                focus: "series",
                blurScope: "global",
              }
            : undefined,
      } as BarSeriesOption | PieSeriesOption);
    }

    const computedStyle = getComputedStyle(this);

    this._compoundStats = energyData.prefs.device_consumption
      .map((d) => d.included_in_stat)
      .filter(Boolean) as string[];

    const devices = energyData.prefs.device_consumption;
    const devicesTotals: Record<string, number> = {};
    devices.forEach((device) => {
      devicesTotals[device.stat_consumption] =
        device.stat_consumption in data
          ? calculateStatisticSumGrowth(data[device.stat_consumption]) || 0
          : 0;
    });
    const devicesTotalsCompare: Record<string, number> = {};
    if (compareData) {
      devices.forEach((device) => {
        devicesTotalsCompare[device.stat_consumption] =
          device.stat_consumption in compareData
            ? calculateStatisticSumGrowth(
                compareData[device.stat_consumption]
              ) || 0
            : 0;
      });
    }
    devices.forEach((device, idx) => {
      let value = devicesTotals[device.stat_consumption];
      if (!this._config?.hide_compound_stats) {
        const childSum = devices.reduce((acc, d) => {
          if (d.included_in_stat === device.stat_consumption) {
            return acc + devicesTotals[d.stat_consumption];
          }
          return acc;
        }, 0);
        value -= Math.min(value, childSum);
      } else if (this._compoundStats.includes(device.stat_consumption)) {
        return;
      }
      const color = getGraphColorByIndex(idx, computedStyle);

      chartData.push({
        id: device.stat_consumption,
        value: [value, device.stat_consumption] as any,
        name: device.stat_consumption,
        itemStyle: {
          color: color + "7F",
          borderColor: color,
        },
      });

      if (compareData) {
        let compareValue =
          device.stat_consumption in compareData
            ? calculateStatisticSumGrowth(
                compareData[device.stat_consumption]
              ) || 0
            : 0;
        const compareChildSum = devices.reduce((acc, d) => {
          if (d.included_in_stat === device.stat_consumption) {
            return acc + devicesTotalsCompare[d.stat_consumption];
          }
          return acc;
        }, 0);
        compareValue -= Math.min(compareValue, compareChildSum);

        chartDataCompare.push({
          id: device.stat_consumption,
          value: [compareValue, device.stat_consumption] as any,
          name: device.stat_consumption,
          itemStyle: {
            color: color + "32",
            borderColor: color + "7F",
          },
        });
      }
    });

    if (this._chartType === "pie") {
      const pieChartData = chartData as NonNullable<PieSeriesOption["data"]>;
      const { summedData, compareSummedData } = getSummedData(energyData);
      const { consumption, compareConsumption } = computeConsumptionData(
        summedData,
        compareSummedData
      );
      const totalUsed = consumption.total.used_total;
      const showUntracked =
        "from_grid" in summedData ||
        "solar" in summedData ||
        "from_battery" in summedData;
      const untracked = showUntracked
        ? totalUsed -
          pieChartData.reduce(
            (acc: number, d) => acc + (d as PieDataItemOption).value![0],
            0
          )
        : 0;
      if (untracked > 0) {
        const color = getEnergyColor(
          computedStyle,
          this.hass.themes.darkMode,
          false,
          false,
          "--history-unknown-color"
        );
        pieChartData.push({
          id: "untracked",
          value: [untracked, "untracked"] as any,
          name: this.hass.localize(
            "ui.panel.lovelace.cards.energy.energy_devices_graph.untracked_consumption"
          ),
          itemStyle: {
            color: color + "7F",
            borderColor: color,
          },
        });
        if (compareData) {
          const compareUntracked =
            compareConsumption!.total.used_total -
            chartDataCompare.reduce(
              (acc: number, d: any) => acc + d.value[0],
              0
            );
          if (compareUntracked > 0) {
            chartDataCompare.push({
              id: "untracked",
              value: [compareUntracked, "untracked"] as any,
              name: this.hass.localize(
                "ui.panel.lovelace.cards.energy.energy_devices_graph.untracked_consumption"
              ),
              itemStyle: {
                color: color + "32",
                borderColor: color + "7F",
              },
            });
          }
        }
      }
      const totalChart = pieChartData.reduce(
        (acc: number, d) =>
          this._hiddenStats.includes((d as PieDataItemOption).id as string)
            ? acc
            : acc + (d as PieDataItemOption).value![0],
        0
      );
      datasets.push({
        type: "pie",
        radius: ["0%", compareData ? "30%" : "40%"],
        name: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_devices_graph.total_energy_usage"
        ),
        data: [totalChart],
        label: {
          show: true,
          position: "center",
          color: computedStyle.getPropertyValue("--secondary-text-color"),
          fontSize: computedStyle.getPropertyValue("--ha-font-size-m"),
          lineHeight: 24,
          fontWeight: "bold",
          formatter: `{a}\n${formatNumber(totalChart, this.hass.locale)} kWh`,
        },
        cursor: "default",
        itemStyle: {
          color: "rgba(0, 0, 0, 0)",
        },
        tooltip: {
          show: false,
        },
      });
    }

    chartData.sort((a: any, b: any) => b.value[0] - a.value[0]);
    if (
      this._config?.max_devices &&
      chartData.length > this._config.max_devices
    ) {
      chartData.splice(this._config.max_devices);
    }

    this._legendData = chartData.map((d) => ({
      ...d,
      name: this._getDeviceName(d.name),
    }));
    // filter out hidden stats in place
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (this._hiddenStats.includes((chartData[i] as any).id)) {
        chartData.splice(i, 1);
      }
    }

    if (compareData) {
      datasets[1].data = chartData.map((d) =>
        chartDataCompare.find((d2) => (d2 as any).id === d.id)
      ) as typeof chartDataCompare;
    }

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
    } else if (
      e.detail.seriesType === "pie" &&
      e.detail.event?.target?.type === "tspan" // label
    ) {
      const id = (e.detail.data as any).id as string;
      if (id !== "untracked") {
        fireEvent(this, "hass-more-info", {
          entityId: id,
        });
      }
    }
  }

  private _handleChartTypeChange(): void {
    if (!this._chartType) {
      return;
    }
    const allowedModes = this._getAllowedModes();
    const currentIndex = allowedModes.indexOf(this._chartType);
    const nextIndex = (currentIndex + 1) % allowedModes.length;
    this._chartType = allowedModes[nextIndex];
    this._getStatistics(this._data!);
  }

  private _datasetHidden(ev: CustomEvent<{ id: string }>) {
    this._hiddenStats = [...this._hiddenStats, ev.detail.id];
    this._getStatistics(this._data!);
  }

  private _datasetUnhidden(ev: CustomEvent<{ id: string }>) {
    this._hiddenStats = this._hiddenStats.filter(
      (stat) => stat !== ev.detail.id
    );
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
