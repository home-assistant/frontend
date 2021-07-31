import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import { classMap } from "lit/directives/class-map";
import "../../../../components/ha-card";
import { ChartData, ChartDataset, ChartOptions } from "chart.js";
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
  EnergyCollection,
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
import "../../../../components/ha-switch";
import "../../../../components/ha-formfield";
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

  @state() private _forecasts?: Record<string, ForecastSolarForecast>;

  @state() private _showAllForecastData = false;

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
              getEnergyDataCollection(this.hass),
              this.hass.locale
            )}
            chart-type="bar"
          ></ha-chart-base>
        </div>
      </ha-card>
    `;
  }

  private _createOptions = memoizeOne(
    (
      energyCollection: EnergyCollection,
      locale: FrontendLocaleData
    ): ChartOptions => {
      const startTime = energyCollection.start.getTime();

      return {
        parsing: false,
        animation: false,
        scales: {
          x: {
            type: "time",
            suggestedMin: startTime,
            suggestedMax: startTime + 24 * 60 * 60 * 1000,
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
      };
    }
  );

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    const solarSources: SolarSourceTypeEnergyPreference[] =
      energyData.prefs.energy_sources.filter(
        (source) => source.type === "solar"
      ) as SolarSourceTypeEnergyPreference[];

    if (
      isComponentLoaded(this.hass, "forecast_solar") &&
      solarSources.some((source) => source.config_entry_solar_forecast)
    ) {
      this._forecasts = await getForecastSolarForecasts(this.hass);
    }

    const statisticsData = Object.values(energyData.stats);
    const datasets: ChartDataset<"bar">[] = [];
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

      data.push({
        label: `Production ${
          entity ? computeStateName(entity) : source.stat_energy_from
        }`,
        borderColor,
        backgroundColor: borderColor + "7F",
        data: [],
      });

      let prevValue: number | null = null;
      let prevStart: string | null = null;

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
            borderColor: computedStyles.getPropertyValue(
              "--primary-text-color"
            ),
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
      .card-header {
        padding-bottom: 0;
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
