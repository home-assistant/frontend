import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { BarSeriesOption } from "echarts/charts";
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
} from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyDevicesGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import type { ECOption } from "../../../../resources/echarts";
import "../../../../components/ha-card";

@customElement("hui-energy-devices-graph-card")
export class HuiEnergyDevicesGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesGraphCardConfig;

  @state() private _chartData: BarSeriesOption[] = [];

  @state() private _data?: EnergyData;

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
            .options=${this._createOptions(this.hass.themes?.darkMode)}
            .height=${`${(this._chartData[0]?.data?.length || 0) * 28 + 50}px`}
          ></ha-chart-base>
        </div>
      </ha-card>
    `;
  }

  private _renderTooltip(params: any) {
    const title = `<h4 style="text-align: center; margin: 0;">${this._getDeviceName(
      params.value[1]
    )}</h4>`;
    const value = `${formatNumber(
      params.value[0] as number,
      this.hass.locale,
      getNumberFormatOptions(undefined, this.hass.entities[params.value[1]])
    )} kWh`;
    return `${title}${params.marker} ${params.seriesName}: ${value}`;
  }

  private _createOptions = memoizeOne(
    (darkMode: boolean): ECOption => ({
      xAxis: {
        type: "value",
        name: "kWh",
        splitLine: {
          lineStyle: darkMode ? { opacity: 0.15 } : {},
        },
      },
      yAxis: {
        type: "category",
        inverse: true,
        axisLabel: {
          formatter: this._getDeviceName.bind(this),
          overflow: "truncate",
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
        formatter: this._renderTooltip.bind(this),
      },
    })
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

    const chartData: NonNullable<BarSeriesOption["data"]> = [];
    const chartDataCompare: NonNullable<BarSeriesOption["data"]> = [];

    const datasets: BarSeriesOption[] = [
      {
        type: "bar",
        name: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_devices_graph.energy_usage"
        ),
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
        },
        data: chartData,
        barWidth: compareData ? 10 : 20,
      },
    ];

    if (compareData) {
      datasets.push({
        type: "bar",
        name: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_devices_graph.previous_energy_usage"
        ),
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
        },
        data: chartDataCompare,
        barWidth: 10,
      });
    }

    const computedStyle = getComputedStyle(this);

    energyData.prefs.device_consumption.forEach((device, id) => {
      const value =
        device.stat_consumption in data
          ? calculateStatisticSumGrowth(data[device.stat_consumption]) || 0
          : 0;
      const color = getGraphColorByIndex(id, computedStyle);

      chartData.push({
        id,
        value: [value, device.stat_consumption],
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
          value: [compareValue, device.stat_consumption],
          itemStyle: {
            color: color + "32",
            borderColor: color + "7F",
          },
        });
      }
    });

    chartData.sort((a: any, b: any) => b.value[0] - a.value[0]);

    chartData.length = this._config?.max_devices || chartData.length;

    this._chartData = datasets;
    await this.updateComplete;
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
