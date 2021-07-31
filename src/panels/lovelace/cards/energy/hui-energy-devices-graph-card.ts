import {
  ChartData,
  ChartDataset,
  ChartOptions,
  ParsedDataType,
} from "chart.js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { getColorByIndex } from "../../../../common/color/colors";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import {
  formatNumber,
  numberFormatToLocale,
} from "../../../../common/string/format_number";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import { EnergyData, getEnergyDataCollection } from "../../../../data/energy";
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

  @state() private _chartData?: ChartData;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass).subscribe((data) =>
        this._getStatistics(data)
      ),
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
          ${this._chartData
            ? html`<ha-chart-base
                .data=${this._chartData}
                .options=${this._createOptions(this.hass.locale)}
                chart-type="bar"
              ></ha-chart-base>`
            : ""}
        </div>
      </ha-card>
    `;
  }

  private _createOptions = memoizeOne(
    (locale: FrontendLocaleData): ChartOptions => ({
      parsing: false,
      animation: false,
      responsive: true,
      indexAxis: "y",
      scales: {
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
    })
  );

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    const energyCollection = getEnergyDataCollection(this.hass);
    this._data = await fetchStatistics(
      this.hass,
      energyCollection.start,
      energyCollection.end,
      energyCollection.getDeviceStatIds()
    );

    const statisticsData = Object.values(this._data!);
    let endTime: Date;

    endTime = new Date(
      Math.max(
        ...statisticsData.map((stats) =>
          new Date(stats[stats.length - 1].start).getTime()
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
      },
    ];

    for (let idx = 0; idx < energyData.prefs.device_consumption.length; idx++) {
      const device = energyData.prefs.device_consumption[idx];
      const entity = this.hass.states[device.stat_consumption];
      const label = entity ? computeStateName(entity) : device.stat_consumption;

      const color = getColorByIndex(idx);

      borderColor.push(color);
      backgroundColor.push(color + "7F");

      const value =
        device.stat_consumption in this._data
          ? calculateStatisticSumGrowth(this._data[device.stat_consumption])
          : 0;
      data.push({
        // @ts-expect-error
        y: label,
        x: value || 0,
      });
    }

    data.sort((a, b) => b.x - a.x);

    this._chartData = {
      datasets,
    };
  }

  static get styles(): CSSResultGroup {
    return css`
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-devices-graph-card": HuiEnergyDevicesGraphCard;
  }
}
