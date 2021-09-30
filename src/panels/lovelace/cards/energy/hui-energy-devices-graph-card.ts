import {
  ChartData,
  ChartDataset,
  ChartOptions,
  ParsedDataType,
} from "chart.js";
import { getRelativePosition } from "chart.js/helpers";
import { addHours } from "date-fns";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { getColorByIndex } from "../../../../common/color/colors";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import {
  formatNumber,
  numberFormatToLocale,
} from "../../../../common/number/format_number";
import "../../../../components/chart/ha-chart-base";
import type HaChartBase from "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import {
  DeviceConsumptionEnergyPreference,
  EnergyData,
  getEnergyDataCollection,
} from "../../../../data/energy";
import {
  calculateStatisticSumGrowth,
  fetchStatistics,
  Statistics,
} from "../../../../data/history";
import { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergyDevicesGraphCardConfig } from "../types";

@customElement("hui-energy-devices-graph-card")
export class HuiEnergyDevicesGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesGraphCardConfig;

  @state() private _data?: Statistics;

  @state() private _chartData: ChartData = { datasets: [] };

  @query("ha-chart-base") private _chart?: HaChartBase;

  private _deviceConsumptionPrefs: DeviceConsumptionEnergyPreference[] = [];

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

  public setConfig(config: EnergyDevicesGraphCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
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
              const devicePref = this._deviceConsumptionPrefs[index];
              const entity = this.hass.states[devicePref.stat_consumption];
              return entity
                ? computeStateName(entity)
                : devicePref.stat_consumption;
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
      elements: { bar: { borderWidth: 1.5, borderRadius: 4 } },
      plugins: {
        tooltip: {
          mode: "nearest",
          callbacks: {
            title: (item) => {
              const entity = this.hass.states[item[0].label];
              return entity ? computeStateName(entity) : item[0].label;
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
          entityId: this._chartData?.datasets[0]?.data[index]?.y,
        });
      },
    })
  );

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    this._deviceConsumptionPrefs = energyData.prefs.device_consumption;

    this._data = await fetchStatistics(
      this.hass,
      addHours(energyData.start, -1),
      energyData.end,
      energyData.prefs.device_consumption.map(
        (device) => device.stat_consumption
      )
    );

    const statisticsData = Object.values(this._data!);
    let endTime: Date;

    endTime = new Date(
      Math.max(
        ...statisticsData.map((stats) =>
          stats.length ? new Date(stats[stats.length - 1].start).getTime() : 0
        )
      )
    );

    if (!endTime || endTime > new Date()) {
      endTime = new Date();
    }

    const data: Array<ChartDataset<"bar", ParsedDataType<"bar">>["data"]> = [];
    const borderColor: string[] = [];
    const backgroundColor: string[] = [];

    const datasets: ChartDataset<"bar", ParsedDataType<"bar">[]>[] = [
      {
        label: "Energy usage",
        borderColor,
        backgroundColor,
        data,
        barThickness: 20,
      },
    ];

    energyData.prefs.device_consumption.forEach((device, idx) => {
      const value =
        device.stat_consumption in this._data!
          ? calculateStatisticSumGrowth(this._data![device.stat_consumption]) ||
            0
          : 0;

      data.push({
        // @ts-expect-error
        y: device.stat_consumption,
        x: value,
        idx,
      });
    });

    data.sort((a, b) => b.x - a.x);

    data.forEach((d: any) => {
      const color = getColorByIndex(d.idx);

      borderColor.push(color);
      backgroundColor.push(color + "7F");
    });

    this._chartData = {
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
