import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import { classMap } from "lit/directives/class-map";
import "../../../../components/ha-card";
import {
  ChartData,
  ChartDataset,
  ChartOptions,
  ScatterDataPoint,
} from "chart.js";
import { endOfToday, isToday, startOfToday } from "date-fns";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergySolarGraphCardConfig } from "../types";
import {
  hex2rgb,
  lab2rgb,
  rgb2hex,
  rgb2lab,
} from "../../../../common/color/convert-color";
import { labDarken } from "../../../../common/color/lab";
import {
  EnergyData,
  getEnergyDataCollection,
  SolarSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import {
  ForecastSolarForecast,
  getForecastSolarForecasts,
} from "../../../../data/forecast_solar";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/chart/ha-chart-base";
import {
  formatNumber,
  numberFormatToLocale,
} from "../../../../common/string/format_number";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { FrontendLocaleData } from "../../../../data/translation";

@customElement("hui-energy-solar-graph-card")
export class HuiEnergySolarGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergySolarGraphCardConfig;

  @state() private _chartData: ChartData = {
    datasets: [],
  };

  @state() private _start = startOfToday();

  @state() private _end = endOfToday();

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

  public setConfig(config: EnergySolarGraphCardConfig): void {
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
            .options=${this._createOptions(
              this._start,
              this._end,
              this.hass.locale
            )}
            chart-type="bar"
          ></ha-chart-base>
          ${!this._chartData.datasets.length
            ? html`<div class="no-data">
                ${isToday(this._start)
                  ? "There is no data to show. It can take up to 2 hours for new data to arrive after you configure your energy dashboard."
                  : "There is no data for this period."}
              </div>`
            : ""}
        </div>
      </ha-card>
    `;
  }

  private _createOptions = memoizeOne(
    (start: Date, end: Date, locale: FrontendLocaleData): ChartOptions => ({
      parsing: false,
      animation: false,
      scales: {
        x: {
          type: "time",
          suggestedMin: start.getTime(),
          suggestedMax: end.getTime(),
          adapters: {
            date: {
              locale: locale,
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
            tooltipFormat: "datetime",
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
              `${context.dataset.label}: ${formatNumber(
                context.parsed.y,
                locale
              )} kWh`,
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
      // @ts-expect-error
      locale: numberFormatToLocale(locale),
    })
  );

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    const solarSources: SolarSourceTypeEnergyPreference[] =
      energyData.prefs.energy_sources.filter(
        (source) => source.type === "solar"
      ) as SolarSourceTypeEnergyPreference[];

    let forecasts: Record<string, ForecastSolarForecast>;
    if (
      isComponentLoaded(this.hass, "forecast_solar") &&
      solarSources.some((source) => source.config_entry_solar_forecast)
    ) {
      forecasts = await getForecastSolarForecasts(this.hass);
    }

    const statisticsData = Object.values(energyData.stats);
    const datasets: ChartDataset<"bar">[] = [];
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

    const computedStyles = getComputedStyle(this);
    const solarColor = computedStyles
      .getPropertyValue("--energy-solar-color")
      .trim();

    solarSources.forEach((source, idx) => {
      const data: ChartDataset<"bar" | "line">[] = [];
      const entity = this.hass.states[source.stat_energy_from];

      const borderColor =
        idx > 0
          ? rgb2hex(lab2rgb(labDarken(rgb2lab(hex2rgb(solarColor)), idx)))
          : solarColor;

      let prevValue: number | null = null;
      let prevStart: string | null = null;

      const solarProductionData: ScatterDataPoint[] = [];

      // Process solar production data.
      if (energyData.stats[source.stat_energy_from]) {
        for (const point of energyData.stats[source.stat_energy_from]) {
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
          const value = point.sum - prevValue;
          const date = new Date(point.start);
          solarProductionData.push({
            x: date.getTime(),
            y: value,
          });
          prevStart = point.start;
          prevValue = point.sum;
        }
      }

      if (solarProductionData.length) {
        data.push({
          label: `Production ${
            entity ? computeStateName(entity) : source.stat_energy_from
          }`,
          borderColor,
          backgroundColor: borderColor + "7F",
          data: solarProductionData,
        });
      }

      // Process solar forecast data.
      if (forecasts && source.config_entry_solar_forecast) {
        let forecastsData: Record<string, number> | undefined;
        source.config_entry_solar_forecast.forEach((configEntryId) => {
          if (!forecastsData) {
            forecastsData = forecasts![configEntryId]?.wh_hours;
            return;
          }
          if (!forecasts![configEntryId]) {
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
          const solarForecastData: ScatterDataPoint[] = [];
          for (const [date, value] of Object.entries(forecastsData)) {
            const dateObj = new Date(date);
            if (
              dateObj < energyData.start ||
              (energyData.end && dateObj > energyData.end)
            ) {
              continue;
            }
            solarForecastData.push({
              x: dateObj.getTime(),
              y: value / 1000,
            });
          }

          if (solarForecastData.length) {
            data.push({
              type: "line",
              label: `Forecast ${
                entity ? computeStateName(entity) : source.stat_energy_from
              }`,
              fill: false,
              stepped: false,
              borderColor: computedStyles.getPropertyValue(
                "--primary-text-color"
              ),
              borderDash: [7, 5],
              pointRadius: 0,
              data: solarForecastData,
            });
          }
        }
      }

      // Concat two arrays
      Array.prototype.push.apply(datasets, data);
    });

    this._start = energyData.start;
    this._end = energyData.end || endOfToday();

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
      .no-data {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20%;
        margin-left: 32px;
        box-sizing: border-box;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-solar-graph-card": HuiEnergySolarGraphCard;
  }
}
