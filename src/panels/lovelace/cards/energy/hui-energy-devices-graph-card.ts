import {
  ChartData,
  ChartDataset,
  ChartOptions,
  ParsedDataType,
  ScatterDataPoint,
} from "chart.js";
import { getRelativePosition } from "chart.js/helpers";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { getGraphColorByIndex } from "../../../../common/color/colors";
import { fireEvent } from "../../../../common/dom/fire_event";
import {
  formatNumber,
  numberFormatToLocale,
} from "../../../../common/number/format_number";
import "../../../../components/chart/ha-chart-base";
import type { HaChartBase } from "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import { EnergyData, getEnergyDataCollection } from "../../../../data/energy";
import {
  calculateStatisticSumGrowth,
  getStatisticLabel,
  isExternalStatistic,
} from "../../../../data/recorder";
import { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergyDevicesGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import { clickIsTouch } from "../../../../components/chart/click_is_touch";

@customElement("hui-energy-devices-graph-card")
export class HuiEnergyDevicesGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesGraphCardConfig;

  @state() private _chartData: ChartData = { datasets: [] };

  @state() private _data?: EnergyData;

  @query("ha-chart-base") private _chart?: HaChartBase;

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
            .options=${this._createOptions(this.hass.locale)}
            .height=${(this._chartData?.datasets[0]?.data.length || 0) * 28 +
            50}
            chart-type="bar"
          ></ha-chart-base>
        </div>
      </ha-card>
    `;
  }

  private _createOptions = memoizeOne(
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
                this._chartData.datasets[0].data[index] as ScatterDataPoint
              ).y;
              return this.getDeviceName(statisticId as any as string);
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
              return this.getDeviceName(statisticId);
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
        if (clickIsTouch(e)) return;
        const chart = e.chart;
        const canvasPosition = getRelativePosition(e, chart);

        const index = Math.abs(
          chart.scales.y.getValueForPixel(canvasPosition.y)
        );
        // @ts-ignore
        const statisticId = this._chartData?.datasets[0]?.data[index]?.y;
        if (!statisticId || isExternalStatistic(statisticId)) return;
        fireEvent(this, "hass-more-info", {
          entityId: statisticId,
        });
        chart.canvas.dispatchEvent(new Event("mouseout")); // to hide tooltip
      },
    })
  );

  private getDeviceName(statisticId: string): string {
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

    const computedStyle = getComputedStyle(this);

    chartData.forEach((d: any) => {
      const color = getGraphColorByIndex(d.idx, computedStyle);

      borderColor.push(color);
      backgroundColor.push(color + "7F");
    });

    chartDataCompare.forEach((d: any) => {
      const color = getGraphColorByIndex(d.idx, computedStyle);

      borderColorCompare.push(color + "7F");
      backgroundColorCompare.push(color + "32");
    });

    this._chartData = {
      labels: chartData.map((d) => d.y),
      datasets,
    };
    await this.updateComplete;
    this._chart?.updateChart("none");
  }

  static get styles(): CSSResultGroup {
    return css`
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-devices-graph-card": HuiEnergyDevicesGraphCard;
  }
}
