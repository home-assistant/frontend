import { mdiChartBarStacked, mdiAlignHorizontalLeft } from "@mdi/js";
import {
  ChartData,
  ChartDataset,
  ChartOptions,
  ParsedDataType,
  ScatterDataPoint,
} from "chart.js";
import { getRelativePosition } from "chart.js/helpers";
import { differenceInDays, endOfToday, startOfToday } from "date-fns";
import { HassConfig, UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { getColorByIndex } from "../../../../common/color/colors";
import { fireEvent } from "../../../../common/dom/fire_event";
import {
  formatNumber,
  numberFormatToLocale,
} from "../../../../common/number/format_number";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import {
  EnergyData,
  DeviceConsumptionEnergyPreference,
  getEnergyDataCollection,
} from "../../../../data/energy";
import {
  calculateStatisticSumGrowth,
  fetchStatistics,
  getStatisticLabel,
  Statistics,
  StatisticsMetaData,
  StatisticsUnitConfiguration,
} from "../../../../data/recorder";
import { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergyDevicesGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import { getCommonOptions } from "./common/energy-chart-options";

@customElement("hui-energy-devices-graph-card")
export class HuiEnergyDevicesGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesGraphCardConfig;

  @state() private _chartSummaryData?: ChartData = { datasets: [] };

  @state() private _chartDetailData?: ChartData = { datasets: [] };

  @state() private _data?: EnergyData;

  @state() private _statistics?: Statistics;

  @state() private _compareStatistics?: Statistics;

  @state() private _start = startOfToday();

  @state() private _end = endOfToday();

  @state() private _compareStart?: Date;

  @state() private _compareEnd?: Date;

  @state() private _unit?: string;

  @state() private _detailMode = false;

  @state() private _hiddenStats = new Set<string>();

  private detailPlugins = [
    {
      id: "click",
      afterEvent: (chart, args, _pluginOpts) => {
        if (args.event.type === "click") {
          const { x, y } = args.event;
          if (
            x < chart.scales.x.left &&
            y > chart.scales.y.top &&
            y < chart.scales.y.bottom
          ) {
            const labelId = chart.scales.y.getValueForPixel(y);
            const value = chart.scales.y.getLabelForValue(labelId);
            this._labelClicked(value);
          }
        }
        if (args.event.type === "mousemove") {
          const { x, y } = args.event;
          if (
            x < chart.scales.x.left &&
            y > chart.scales.y.top &&
            y < chart.scales.y.bottom
          ) {
            args.event.chart.canvas.style.cursor = "pointer";
          } else {
            args.event.chart.canvas.style.cursor = "";
          }
        }
      },
    },
  ];

  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config?.collection_key,
      }).subscribe(async (data) => {
        this._data = data;
        await this._getStatistics(this._data);
        if (this._detailMode) {
          this._chartSummaryData = undefined;
          this._processDetailStatistics();
        } else {
          this._chartDetailData = undefined;
          this._processSummaryStatistics();
        }
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

  protected willUpdate(changedProps: PropertyValues) {
    if (
      (changedProps.has("_detailMode") || changedProps.has("_hiddenStats")) &&
      this._statistics
    ) {
      if (this._detailMode) {
        this._processDetailStatistics();
      } else {
        this._processSummaryStatistics();
      }
    }
  }

  private _labelClicked(label: string) {
    if (this._hiddenStats.has(label)) {
      this._hiddenStats.delete(label);
    } else {
      this._hiddenStats.add(label);
    }
    this.requestUpdate("_hiddenStats");
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-card>
        ${this._config.title
          ? html`<h1 class="card-header">${this._config.title}</h1>`
          : nothing}
        <ha-icon-button
          class="chart-toggle"
          .label=${this.hass!.localize(
            this._detailMode
              ? "ui.panel.lovelace.cards.energy.energy_devices_graph.show_summary"
              : "ui.panel.lovelace.cards.energy.energy_devices_graph.show_detail"
          )}
          .path=${this._detailMode
            ? mdiAlignHorizontalLeft
            : mdiChartBarStacked}
          @click=${this._handleToggle}
        ></ha-icon-button>
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
          })}"
        >
          <ha-chart-base
            externalHidden
            class=${this._detailMode ? "" : "summary"}
            .hass=${this.hass}
            .data=${this._detailMode
              ? this._chartDetailData
              : this._chartSummaryData}
            .options=${this._detailMode
              ? this._createDetailOptions(
                  this._start,
                  this._end,
                  this.hass.locale,
                  this.hass.config,
                  this._unit,
                  this._compareStart,
                  this._compareEnd
                )
              : this._createSummaryOptions(this.hass.locale)}
            .height=${this._detailMode
              ? undefined
              : (this._chartSummaryData?.datasets[0]?.data.length || 0) * 28 +
                50}
            .plugins=${this._detailMode ? undefined : this.detailPlugins}
            chart-type="bar"
            @dataset-hidden=${this._datasetHidden}
            @dataset-unhidden=${this._datasetUnhidden}
          ></ha-chart-base>
        </div>
      </ha-card>
    `;
  }

  private _datasetHidden(ev) {
    ev.stopPropagation();
    this._hiddenStats.add(
      this._data!.prefs.device_consumption[ev.detail.index].stat_consumption
    );
    this.requestUpdate("_hiddenStats");
  }

  private _datasetUnhidden(ev) {
    ev.stopPropagation();
    this._hiddenStats.delete(
      this._data!.prefs.device_consumption[ev.detail.index].stat_consumption
    );
    this.requestUpdate("_hiddenStats");
  }

  private _createSummaryOptions = memoizeOne(
    (locale: FrontendLocaleData): ChartOptions => ({
      parsing: false,
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      scales: {
        y: {
          type: "category",
          ticks: {
            autoSkip: false,
            callback: (index) => {
              const statisticId = (
                this._chartSummaryData!.datasets[0].data[
                  index
                ] as ScatterDataPoint
              ).y as unknown as string;
              const spacer = this._hiddenStats.has(statisticId) ? "~~" : "";
              return (
                spacer +
                getStatisticLabel(
                  this.hass,
                  statisticId,
                  this._data?.statsMetadata[statisticId]
                ) +
                spacer
              );
            },
          },
        },
        x: {
          title: {
            display: true,
            text: "kWh",
          },
        },
      },
      elements: { bar: { borderWidth: 1, borderRadius: 4 } },
      plugins: {
        tooltip: {
          mode: "nearest",
          callbacks: {
            title: (item) => {
              const statisticId = item[0].label;
              return getStatisticLabel(
                this.hass,
                statisticId,
                this._data?.statsMetadata[statisticId]
              );
            },
            label: (context) =>
              `${context.dataset.label}: ${formatNumber(
                context.parsed.x,
                locale
              )} kWh`,
          },
        },
      },
      // @ts-expect-error
      locale: numberFormatToLocale(this.hass.locale),
      onClick: (e: any) => {
        const chart = e.chart;
        const canvasPosition = getRelativePosition(e, chart);

        const index = Math.abs(
          chart.scales.y.getValueForPixel(canvasPosition.y)
        );
        fireEvent(this, "hass-more-info", {
          // @ts-ignore
          entityId: this._chartSummaryData?.datasets[0]?.data[index]?.y,
        });
        chart.canvas.dispatchEvent(new Event("mouseout")); // to hide tooltip
      },
    })
  );

  private _handleToggle() {
    this._detailMode = !this._detailMode;
  }

  private _createDetailOptions = memoizeOne(
    (
      start: Date,
      end: Date,
      locale: FrontendLocaleData,
      config: HassConfig,
      unit?: string,
      compareStart?: Date,
      compareEnd?: Date
    ): ChartOptions => {
      const commonOptions = getCommonOptions(
        start,
        end,
        locale,
        config,
        unit,
        compareStart,
        compareEnd
      );

      const options: ChartOptions = {
        ...commonOptions,
        interaction: {
          mode: "nearest",
        },
        plugins: {
          ...commonOptions.plugins!,
          legend: {
            display: true,
            labels: {
              usePointStyle: true,
            },
          },
        },
      };
      return options;
    }
  );

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    const dayDifference = differenceInDays(
      energyData.end || new Date(),
      energyData.start
    );

    const devices = energyData.prefs.device_consumption.map(
      (device) => device.stat_consumption
    );

    const period =
      dayDifference > 35 ? "month" : dayDifference > 2 ? "day" : "hour";

    const lengthUnit = this.hass.config.unit_system.length || "";
    const units: StatisticsUnitConfiguration = {
      energy: "kWh",
      volume: lengthUnit === "km" ? "m³" : "ft³",
    };
    this._unit = "kWh";

    const statistics = await fetchStatistics(
      this.hass,
      energyData.start,
      energyData.end,
      devices,
      period,
      units,
      ["change"]
    );

    let compareStatistics: Statistics | undefined;
    if (energyData.startCompare && energyData.endCompare) {
      compareStatistics = await fetchStatistics(
        this.hass,
        energyData.startCompare,
        energyData.endCompare,
        devices,
        period,
        units,
        ["change"]
      );
    }

    this._statistics = statistics;
    this._compareStatistics = compareStatistics;
  }

  private async _processSummaryStatistics() {
    const energyData = this._data!;
    const data = this._statistics!;
    const compareData = this._compareStatistics;

    const chartData: Array<ChartDataset<"bar", ParsedDataType<"bar">>["data"]> =
      [];
    const chartDataCompare: Array<
      ChartDataset<"bar", ParsedDataType<"bar">>["data"]
    > = [];
    const borderColor: string[] = [];
    const borderColorCompare: string[] = [];
    const backgroundColor: string[] = [];
    const backgroundColorCompare: string[] = [];

    const datasets: ChartDataset<"bar", ParsedDataType<"bar">[]>[] = [
      {
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_devices_graph.energy_usage"
        ),
        borderColor,
        backgroundColor,
        data: chartData,
        barThickness: compareData ? 10 : 20,
      },
    ];

    if (compareData) {
      datasets.push({
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_devices_graph.previous_energy_usage"
        ),
        borderColor: borderColorCompare,
        backgroundColor: backgroundColorCompare,
        data: chartDataCompare,
        barThickness: 10,
      });
    }

    energyData.prefs.device_consumption.forEach((device, idx) => {
      const value =
        device.stat_consumption in data
          ? calculateStatisticSumGrowth(data[device.stat_consumption]) || 0
          : 0;

      chartData.push({
        // @ts-expect-error
        y: device.stat_consumption,
        x: value,
        idx,
      });

      if (compareData) {
        const compareValue =
          device.stat_consumption in compareData
            ? calculateStatisticSumGrowth(
                compareData[device.stat_consumption]
              ) || 0
            : 0;

        chartDataCompare.push({
          // @ts-expect-error
          y: device.stat_consumption,
          x: compareValue,
          idx,
        });
      }
    });

    chartData.sort((a, b) => b.x - a.x);

    chartData.length = this._config?.max_devices || chartData.length;

    chartData.forEach((d: any) => {
      if (this._hiddenStats.has(d.y)) {
        d.x = 0;
      }
      const color = getColorByIndex(d.idx);

      borderColor.push(color);
      backgroundColor.push(color + "7F");
    });

    chartDataCompare.forEach((d: any) => {
      if (this._hiddenStats.has(d.y)) {
        d.x = 0;
      }
      const color = getColorByIndex(d.idx);

      borderColorCompare.push(color + "7F");
      backgroundColorCompare.push(color + "32");
    });

    this._chartSummaryData = {
      labels: chartData.map((d) => d.y),
      datasets,
    };
  }

  private async _processDetailStatistics() {
    const energyData = this._data!;
    const data = this._statistics!;
    const compareData = this._compareStatistics;

    const growthValues = {};
    energyData.prefs.device_consumption.forEach((device) => {
      const value =
        device.stat_consumption in data
          ? calculateStatisticSumGrowth(data[device.stat_consumption]) || 0
          : 0;

      growthValues[device.stat_consumption] = value;
    });

    const sorted_devices = energyData.prefs.device_consumption.map(
      (device) => device.stat_consumption
    );
    sorted_devices.sort((a, b) => growthValues[b] - growthValues[a]);

    const datasets: ChartDataset<"bar", ScatterDataPoint[]>[] = [];

    datasets.push(
      ...this._processDataSet(
        data,
        energyData.statsMetadata,
        energyData.prefs.device_consumption,
        sorted_devices
      )
    );

    if (compareData) {
      // Add empty dataset to align the bars
      datasets.push({
        order: 0,
        data: [],
        pointStyle: false,
      });
      datasets.push({
        order: 999,
        data: [],
        xAxisID: "xAxisCompare",
        pointStyle: false,
      });

      datasets.push(
        ...this._processDataSet(
          compareData,
          energyData.statsMetadata,
          energyData.prefs.device_consumption,
          sorted_devices,
          true
        )
      );
    }

    this._start = energyData.start;
    this._end = energyData.end || endOfToday();

    this._compareStart = energyData.startCompare;
    this._compareEnd = energyData.endCompare;

    this._chartDetailData = {
      datasets,
    };
  }

  private _processDataSet(
    statistics: Statistics,
    statisticsMetaData: Record<string, StatisticsMetaData>,
    devices: DeviceConsumptionEnergyPreference[],
    sorted_devices: string[],
    compare = false
  ) {
    const data: ChartDataset<"bar", ScatterDataPoint[]>[] = [];

    devices.forEach((source, idx) => {
      const color = getColorByIndex(idx);

      let prevStart: number | null = null;

      const consumptionData: ScatterDataPoint[] = [];

      // Process gas consumption data.
      if (source.stat_consumption in statistics) {
        const stats = statistics[source.stat_consumption];
        let end;

        for (const point of stats) {
          if (point.change === null || point.change === undefined) {
            continue;
          }
          if (prevStart === point.start) {
            continue;
          }
          const date = new Date(point.start);
          consumptionData.push({
            x: date.getTime(),
            y: point.change,
          });
          prevStart = point.start;
          end = point.end;
        }
        if (consumptionData.length === 1) {
          consumptionData.push({
            x: end,
            y: 0,
          });
        }
      }

      data.push({
        label: getStatisticLabel(
          this.hass,
          source.stat_consumption,
          statisticsMetaData[source.stat_consumption]
        ),
        hidden: this._hiddenStats.has(source.stat_consumption),
        borderColor: compare ? color + "7F" : color,
        backgroundColor: compare ? color + "32" : color + "7F",
        data: consumptionData,
        order: 1 + sorted_devices.indexOf(source.stat_consumption),
        stack: "devices",
        pointStyle: compare ? false : "circle",
        xAxisID: compare ? "xAxisCompare" : undefined,
      });
    });
    return data;
  }

  static get styles(): CSSResultGroup {
    return css`
      .card-header {
        padding-bottom: 0;
      }
      .content {
        padding: 16px;
        padding-top: 48px;
      }
      .has-header {
        padding-top: 0;
      }
      ha-chart-base.summary {
        --chart-max-height: none;
      }
      .chart-toggle {
        position: absolute;
        top: 0;
        right: 0;
        padding: 8px;
        direction: var(--direction);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-devices-graph-card": HuiEnergyDevicesGraphCard;
  }
}
