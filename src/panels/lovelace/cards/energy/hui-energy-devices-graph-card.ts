import {
  ChartData,
  ChartDataset,
  ChartOptions,
  ParsedDataType,
} from "chart.js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { getColorByIndex } from "../../../../common/color/colors";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import {
  formatNumber,
  numberFormatToLocale,
} from "../../../../common/string/format_number";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import { getEnergyPreferences } from "../../../../data/energy";
import {
  calculateStatisticSumGrowth,
  fetchStatistics,
  Statistics,
} from "../../../../data/history";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergyDevicesGraphCardConfig } from "../types";

@customElement("hui-energy-devices-graph-card")
export class HuiEnergyDevicesGraphCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesGraphCardConfig;

  @state() private _data?: Statistics;

  @state() private _chartData?: ChartData;

  @state() private _chartOptions?: ChartOptions;

  private _fetching = false;

  private _interval?: number;

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    if (!this.hasUpdated) {
      return;
    }
    this._getStatistics();
    // statistics are created every hour
    clearInterval(this._interval);
    this._interval = window.setInterval(
      () => this._getStatistics(),
      1000 * 60 * 60
    );
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public setConfig(config: EnergyDevicesGraphCardConfig): void {
    this._config = config;
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._createOptions();
    }
    if (!this._config || !changedProps.has("_config")) {
      return;
    }

    const oldConfig = changedProps.get("_config") as
      | EnergyDevicesGraphCardConfig
      | undefined;

    if (oldConfig !== this._config) {
      this._getStatistics();
      // statistics are created every hour
      clearInterval(this._interval);
      this._interval = window.setInterval(
        () => this._getStatistics(),
        1000 * 60 * 60
      );
    }
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
                .options=${this._chartOptions}
                chart-type="bar"
              ></ha-chart-base>`
            : ""}
        </div>
      </ha-card>
    `;
  }

  private _createOptions() {
    this._chartOptions = {
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
                this.hass.locale
              )} kWh`,
          },
        },
      },
      // @ts-expect-error
      locale: numberFormatToLocale(this.hass.locale),
    };
  }

  private async _getStatistics(): Promise<void> {
    if (this._fetching) {
      return;
    }
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setTime(startDate.getTime() - 1000 * 60 * 60); // subtract 1 hour to get a startpoint

    this._fetching = true;
    let prefs = this._config!.prefs;

    if (!prefs) {
      try {
        prefs = await getEnergyPreferences(this.hass);
      } catch (e) {
        return;
      }
    }

    try {
      this._data = await fetchStatistics(
        this.hass!,
        startDate,
        undefined,
        prefs.device_consumption.map((device) => device.stat_consumption)
      );
    } finally {
      this._fetching = false;
    }

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

    for (let idx = 0; idx < prefs.device_consumption.length; idx++) {
      const device = prefs.device_consumption[idx];
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
