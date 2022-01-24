import {
  ChartData,
  ChartDataset,
  ChartOptions,
  ScatterDataPoint,
} from "chart.js";
import {
  addHours,
  differenceInDays,
  endOfToday,
  isToday,
  startOfToday,
} from "date-fns";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import {
  hex2rgb,
  lab2rgb,
  rgb2hex,
  rgb2lab,
} from "../../../../common/color/convert-color";
import { labBrighten, labDarken } from "../../../../common/color/lab";
import { formatTime } from "../../../../common/datetime/format_time";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import {
  formatNumber,
  numberFormatToLocale,
} from "../../../../common/number/format_number";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import {
  EnergyData,
  EnergySolarForecasts,
  getEnergyDataCollection,
  getEnergySolarForecasts,
  SolarSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergySolarGraphCardConfig } from "../types";

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
                  ? this.hass.localize("ui.panel.lovelace.cards.energy.no_data")
                  : this.hass.localize(
                      "ui.panel.lovelace.cards.energy.no_data_period"
                    )}
              </div>`
            : ""}
        </div>
      </ha-card>
    `;
  }

  private _createOptions = memoizeOne(
    (start: Date, end: Date, locale: FrontendLocaleData): ChartOptions => {
      const dayDifference = differenceInDays(end, start);
      return {
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
              tooltipFormat:
                dayDifference > 35
                  ? "monthyear"
                  : dayDifference > 7
                  ? "date"
                  : dayDifference > 2
                  ? "weekday"
                  : dayDifference > 0
                  ? "datetime"
                  : "hour",
              minUnit:
                dayDifference > 35
                  ? "month"
                  : dayDifference > 2
                  ? "day"
                  : "hour",
            },
            offset: true,
          },
          y: {
            stacked: true,
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
              title: (datasets) => {
                if (dayDifference > 0) {
                  return datasets[0].label;
                }
                const date = new Date(datasets[0].parsed.x);
                return `${formatTime(date, locale)} – ${formatTime(
                  addHours(date, 1),
                  locale
                )}`;
              },
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

    let forecasts: EnergySolarForecasts | undefined;
    if (
      solarSources.some((source) => source.config_entry_solar_forecast?.length)
    ) {
      try {
        forecasts = await getEnergySolarForecasts(this.hass);
      } catch (_e) {
        // ignore
      }
    }

    const datasets: ChartDataset<"bar">[] = [];

    const computedStyles = getComputedStyle(this);
    const solarColor = computedStyles
      .getPropertyValue("--energy-solar-color")
      .trim();

    const dayDifference = differenceInDays(
      energyData.end || new Date(),
      energyData.start
    );

    solarSources.forEach((source, idx) => {
      const data: ChartDataset<"bar" | "line">[] = [];
      const entity = this.hass.states[source.stat_energy_from];

      const modifiedColor =
        idx > 0
          ? this.hass.themes.darkMode
            ? labBrighten(rgb2lab(hex2rgb(solarColor)), idx)
            : labDarken(rgb2lab(hex2rgb(solarColor)), idx)
          : undefined;
      const borderColor = modifiedColor
        ? rgb2hex(lab2rgb(modifiedColor))
        : solarColor;

      let prevValue: number | null = null;
      let prevStart: string | null = null;

      const solarProductionData: ScatterDataPoint[] = [];

      // Process solar production data.
      if (source.stat_energy_from in energyData.stats) {
        const stats = energyData.stats[source.stat_energy_from];

        for (const point of stats) {
          if (point.sum === null) {
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
          label: this.hass.localize(
            "ui.panel.lovelace.cards.energy.energy_solar_graph.production",
            {
              name: entity ? computeStateName(entity) : source.stat_energy_from,
            }
          ),
          borderColor,
          backgroundColor: borderColor + "7F",
          data: solarProductionData,
          stack: "solar",
        });
      }

      // Process solar forecast data.
      if (forecasts && source.config_entry_solar_forecast) {
        const forecastsData: Record<string, number> | undefined = {};
        source.config_entry_solar_forecast.forEach((configEntryId) => {
          if (!forecasts![configEntryId]) {
            return;
          }
          Object.entries(forecasts![configEntryId].wh_hours).forEach(
            ([date, value]) => {
              const dateObj = new Date(date);
              if (
                dateObj < energyData.start ||
                (energyData.end && dateObj > energyData.end)
              ) {
                return;
              }
              if (dayDifference > 35) {
                dateObj.setDate(1);
              }
              if (dayDifference > 2) {
                dateObj.setHours(0, 0, 0, 0);
              } else {
                dateObj.setMinutes(0, 0, 0);
              }
              const time = dateObj.getTime();
              if (time in forecastsData) {
                forecastsData[time] += value;
              } else {
                forecastsData[time] = value;
              }
            }
          );
        });

        if (forecastsData) {
          const solarForecastData: ScatterDataPoint[] = [];
          for (const [time, value] of Object.entries(forecastsData)) {
            solarForecastData.push({
              x: Number(time),
              y: value / 1000,
            });
          }

          if (solarForecastData.length) {
            data.push({
              type: "line",
              label: this.hass.localize(
                "ui.panel.lovelace.cards.energy.energy_solar_graph.forecast",
                {
                  name: entity
                    ? computeStateName(entity)
                    : source.stat_energy_from,
                }
              ),
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
        height: 100%;
        top: 0;
        left: 0;
        right: 0;
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
