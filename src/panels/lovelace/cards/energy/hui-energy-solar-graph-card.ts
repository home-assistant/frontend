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
import "../../../../components/ha-card";
import { ChartData, ChartDataset, ChartOptions } from "chart.js";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergySolarGraphCardConfig } from "../types";
import { fetchStatistics, Statistics } from "../../../../data/history";
import {
  hex2rgb,
  lab2rgb,
  rgb2hex,
  rgb2lab,
} from "../../../../common/color/convert-color";
import { labDarken } from "../../../../common/color/lab";
import { SolarSourceTypeEnergyPreference } from "../../../../data/energy";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import {
  ForecastSolarForecast,
  getForecastSolarForecasts,
} from "../../../../data/forecast_solar";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-switch";
import "../../../../components/ha-formfield";

const SOLAR_COLOR = "#FF9800";

@customElement("hui-energy-solar-graph-card")
export class HuiEnergySolarGraphCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergySolarGraphCardConfig;

  @state() private _data?: Statistics;

  @state() private _chartData?: ChartData;

  @state() private _forecasts?: Record<string, ForecastSolarForecast>;

  @state() private _chartOptions?: ChartOptions;

  @state() private _showAllForecastData = false;

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

  public setConfig(config: EnergySolarGraphCardConfig): void {
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
      | EnergySolarGraphCardConfig
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
      <ha-card .header="${this._config.title}">
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
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const startTime = startDate.getTime();

    this._chartOptions = {
      parsing: false,
      animation: false,
      scales: {
        x: {
          type: "time",
          suggestedMin: startTime,
          suggestedMax: startTime + 24 * 60 * 60 * 1000,
          adapters: {
            date: {
              locale: this.hass.locale,
            },
          },
          ticks: {
            maxRotation: 0,
            sampleSize: 5,
            autoSkipPadding: 20,
            major: {
              enabled: true,
            },
            font: (context) =>
              context.tick && context.tick.major
                ? ({ weight: "bold" } as any)
                : {},
          },
          time: {
            tooltipFormat: "datetimeseconds",
          },
          offset: true,
        },
        y: {
          type: "linear",
          title: {
            display: true,
            text: "kWh",
          },
          ticks: {
            beginAtZero: true,
          },
        },
      },
      plugins: {
        tooltip: {
          mode: "nearest",
          callbacks: {
            label: (context) =>
              `${context.dataset.label}: ${context.parsed.y} kWh`,
          },
        },
        filler: {
          propagate: false,
        },
        legend: {
          display: false,
          labels: {
            usePointStyle: true,
          },
        },
      },
      hover: {
        mode: "nearest",
      },
      elements: {
        line: {
          tension: 0.3,
          borderWidth: 1.5,
        },
        bar: { borderWidth: 1.5, borderRadius: 4 },
        point: {
          hitRadius: 5,
        },
      },
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

    const solarSources: SolarSourceTypeEnergyPreference[] =
      this._config!.prefs.energy_sources.filter(
        (source) => source.type === "solar"
      ) as SolarSourceTypeEnergyPreference[];

    try {
      this._data = await fetchStatistics(
        this.hass!,
        startDate,
        undefined,
        solarSources.map((source) => source.stat_energy_from)
      );
    } finally {
      this._fetching = false;
    }

    if (
      isComponentLoaded(this.hass, "forecast_solar") &&
      solarSources.some((source) => source.config_entry_solar_forecast)
    ) {
      this._forecasts = await getForecastSolarForecasts(this.hass);
    }

    this._renderChart();
  }

  private _renderChart() {
    const solarSources: SolarSourceTypeEnergyPreference[] =
      this._config!.prefs.energy_sources.filter(
        (source) => source.type === "solar"
      ) as SolarSourceTypeEnergyPreference[];

    const statisticsData = Object.values(this._data!);
    const datasets: ChartDataset<"bar">[] = [];
    let endTime: Date;

    if (statisticsData.length === 0) {
      return;
    }

    endTime = new Date(
      Math.max(
        ...statisticsData.map((stats) =>
          new Date(stats[stats.length - 1].start).getTime()
        )
      )
    );

    if (endTime > new Date()) {
      endTime = new Date();
    }

    solarSources.forEach((source, idx) => {
      const data: ChartDataset<"bar" | "line">[] = [];
      const entity = this.hass.states[source.stat_energy_from];

      const borderColor =
        idx > 0
          ? rgb2hex(lab2rgb(labDarken(rgb2lab(hex2rgb(SOLAR_COLOR)), idx)))
          : SOLAR_COLOR;

      data.push({
        label: `Production ${
          entity ? computeStateName(entity) : source.stat_energy_from
        }`,
        borderColor: borderColor,
        backgroundColor: borderColor + "7F",
        data: [],
      });

      let prevValue: number | null = null;
      let prevStart: string | null = null;

      // Process solar production data.
      if (this._data![source.stat_energy_from]) {
        for (const point of this._data![source.stat_energy_from]) {
          if (!point.sum) {
            continue;
          }
          if (prevValue === null) {
            prevValue = point.sum;
            continue;
          }
          if (prevStart === point.start) {
            continue;
          }
          const value = Math.round((point.sum - prevValue) * 100) / 100;
          const date = new Date(point.start);
          data[0].data.push({
            x: date.getTime(),
            y: value,
          });
          prevStart = point.start;
          prevValue = point.sum;
        }
      }

      const forecasts = this._forecasts;

      // Process solar forecast data.
      if (forecasts && source.config_entry_solar_forecast) {
        let forecastsData: Record<string, number> | undefined;
        source.config_entry_solar_forecast.forEach((configEntryId) => {
          if (!forecastsData) {
            forecastsData = forecasts![configEntryId]?.wh_hours;
            return;
          }
          Object.entries(forecasts![configEntryId].wh_hours).forEach(
            ([date, value]) => {
              if (date in forecastsData!) {
                forecastsData![date] += value;
              } else {
                forecastsData![date] = value;
              }
            }
          );
        });

        if (forecastsData) {
          const forecast: ChartDataset<"line"> = {
            type: "line",
            label: `Forecast ${
              entity ? computeStateName(entity) : source.stat_energy_from
            }`,
            fill: false,
            stepped: false,
            borderColor: "#000",
            borderDash: [7, 5],
            pointRadius: 0,
            data: [],
          };
          data.push(forecast);

          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);

          for (const [date, value] of Object.entries(forecastsData)) {
            const dateObj = new Date(date);
            if (dateObj > tomorrow && !this._showAllForecastData) {
              continue;
            }
            forecast.data.push({
              x: dateObj.getTime(),
              y: value / 1000,
            });
          }
        }
      }

      // Concat two arrays
      Array.prototype.push.apply(datasets, data);
    });

    this._chartData = {
      datasets,
    };
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        height: 100%;
      }
      .content {
        padding: 16px;
      }
      .has-header {
        padding-top: 0;
      }
      ha-formfield {
        margin-bottom: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-solar-graph-card": HuiEnergySolarGraphCard;
  }
}
