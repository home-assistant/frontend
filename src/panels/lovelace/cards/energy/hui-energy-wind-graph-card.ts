import { endOfToday, isToday, startOfToday } from "date-fns";
import type { HassConfig, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import { getEnergyColor } from "./common/color";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import type {
  EnergyData,
  EnergyWindForecasts,
  WindSourceTypeEnergyPreference,
} from "../../../../data/energy";
import {
  getEnergyDataCollection,
  getEnergyWindForecasts,
  getSuggestedPeriod,
} from "../../../../data/energy";
import type { Statistics, StatisticsMetaData } from "../../../../data/recorder";
import { getStatisticLabel } from "../../../../data/recorder";
import type { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyWindGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import {
  fillDataGapsAndRoundCaps,
  getCommonOptions,
  getCompareTransform,
} from "./common/energy-chart-options";
import type { ECOption } from "../../../../resources/echarts/echarts";
import "./common/hui-energy-graph-chip";
import "../../../../components/ha-tooltip";

@customElement("hui-energy-wind-graph-card")
export class HuiEnergyWindGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyWindGraphCardConfig;

  @state() private _chartData: ECOption["series"][] = [];

  @state() private _start = startOfToday();

  @state() private _end = endOfToday();

  @state() private _compareStart?: Date;

  @state() private _compareEnd?: Date;

  @state() private _total?: number;

  protected hassSubscribeRequiredHostProps = ["_config"];

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

  public setConfig(config: EnergyWindGraphCardConfig): void {
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
          ? html` <div class="card-header">
              <span>${this._config.title}</span>
              ${this._total
                ? html`<hui-energy-graph-chip
                    .tooltip=${this._formatTotal(this._total)}
                  >
                    ${formatNumber(this._total, this.hass.locale)} kWh
                  </hui-energy-graph-chip>`
                : nothing}
            </div>`
          : nothing}
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
          })}"
        >
          <ha-chart-base
            .hass=${this.hass}
            .data=${this._chartData}
            .options=${this._createOptions(
              this._start,
              this._end,
              this.hass.locale,
              this.hass.config,
              this._compareStart,
              this._compareEnd
            )}
            chart-type="bar"
          ></ha-chart-base>
          ${!this._chartData.length
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

  private _formatTotal = (total: number) =>
    this.hass.localize(
      "ui.panel.lovelace.cards.energy.energy_wind_graph.total_produced",
      { num: formatNumber(total, this.hass.locale) }
    );

  private _createOptions = memoizeOne(
    (
      start: Date,
      end: Date,
      locale: FrontendLocaleData,
      config: HassConfig,
      compareStart?: Date,
      compareEnd?: Date
    ): ECOption =>
      getCommonOptions(
        start,
        end,
        locale,
        config,
        "kWh",
        compareStart,
        compareEnd,
        this._formatTotal
      )
  );

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    this._start = energyData.start;
    this._end = energyData.end || endOfToday();

    this._compareStart = energyData.startCompare;
    this._compareEnd = energyData.endCompare;

    const windSources: WindSourceTypeEnergyPreference[] =
      energyData.prefs.energy_sources.filter(
        (source) => source.type === "wind"
      ) as WindSourceTypeEnergyPreference[];

    let forecasts: EnergyWindForecasts | undefined;
    if (
      windSources.some((source) => source.config_entry_wind_forecast?.length)
    ) {
      try {
        forecasts = await getEnergyWindForecasts(this.hass);
      } catch (_e) {
        // ignore
      }
    }

    const datasets: ECOption["series"] = [];

    const computedStyles = getComputedStyle(this);

    if (energyData.statsCompare) {
      datasets.push(
        ...this._processDataSet(
          energyData.statsCompare,
          energyData.statsMetadata,
          windSources,
          computedStyles,
          true
        )
      );
    } else {
      // add empty dataset so compare bars are first
      // `stack: wind` so it doesn't take up space yet
      const firstId = windSources[0]?.stat_energy_from ?? "placeholder";
      datasets.push({
        id: "compare-" + firstId,
        type: "bar",
        stack: "wind",
        data: [],
      });
    }

    datasets.push(
      ...this._processDataSet(
        energyData.stats,
        energyData.statsMetadata,
        windSources,
        computedStyles
      )
    );

    fillDataGapsAndRoundCaps(datasets as BarSeriesOption[]);

    if (forecasts) {
      datasets.push(
        ...this._processForecast(
          energyData.statsMetadata,
          forecasts,
          windSources,
          computedStyles.getPropertyValue("--primary-text-color"),
          energyData.start,
          energyData.end
        )
      );
    }

    this._chartData = datasets;
    this._total = this._processTotal(energyData.stats, windSources);
  }

  private _processTotal(
    statistics: Statistics,
    windSources: WindSourceTypeEnergyPreference[]
  ) {
    return windSources.reduce(
      (sum, source) =>
        sum +
        (source.stat_energy_from in statistics
          ? statistics[source.stat_energy_from].reduce(
              (acc, curr) => acc + (curr.change || 0),
              0
            )
          : 0),
      0
    );
  }

  private _processDataSet(
    statistics: Statistics,
    statisticsMetaData: Record<string, StatisticsMetaData>,
    windSources: WindSourceTypeEnergyPreference[],
    computedStyles: CSSStyleDeclaration,
    compare = false
  ) {
    const data: BarSeriesOption[] = [];
    const compareTransform = getCompareTransform(
      this._start,
      this._compareStart!
    );

    windSources.forEach((source, idx) => {
      let prevStart: number | null = null;

      const windProductionData: BarSeriesOption["data"] = [];

      // Process wind production data.
      if (source.stat_energy_from in statistics) {
        const stats = statistics[source.stat_energy_from];

        for (const point of stats) {
          if (
            point.change === null ||
            point.change === undefined ||
            point.change === 0
          ) {
            continue;
          }
          if (prevStart === point.start) {
            continue;
          }
          const dataPoint: (Date | string | number)[] = [
            point.start,
            point.change,
          ];
          if (compare) {
            dataPoint[2] = dataPoint[0];
            dataPoint[0] = compareTransform(new Date(point.start));
          }
          windProductionData.push(dataPoint);
          prevStart = point.start;
        }
      }

      data.push({
        type: "bar",
        cursor: "default",
        id: compare
          ? "compare-" + source.stat_energy_from
          : source.stat_energy_from,
        name: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_wind_graph.production",
          {
            name: getStatisticLabel(
              this.hass,
              source.stat_energy_from,
              statisticsMetaData[source.stat_energy_from]
            ),
          }
        ),
        barMaxWidth: 50,
        itemStyle: {
          borderColor: getEnergyColor(
            computedStyles,
            this.hass.themes.darkMode,
            false,
            compare,
            "--energy-wind-color",
            idx
          ),
        },
        color: getEnergyColor(
          computedStyles,
          this.hass.themes.darkMode,
          true,
          compare,
          "--energy-wind-color",
          idx
        ),
        data: windProductionData,
        stack: compare ? "compare" : "wind",
      });
    });

    return data;
  }

  private _processForecast(
    statisticsMetaData: Record<string, StatisticsMetaData>,
    forecasts: EnergyWindForecasts,
    windSources: WindSourceTypeEnergyPreference[],
    borderColor: string,
    start: Date,
    end?: Date
  ) {
    const data: LineSeriesOption[] = [];

    const period = getSuggestedPeriod(start, end);

    // Process wind forecast data.
    windSources.forEach((source) => {
      if (source.config_entry_wind_forecast) {
        const forecastsData: Record<string, number> | undefined = {};
        source.config_entry_wind_forecast.forEach((configEntryId) => {
          if (!forecasts![configEntryId]) {
            return;
          }
          Object.entries(forecasts![configEntryId].wh_hours).forEach(
            ([date, value]) => {
              const dateObj = new Date(date);
              if (dateObj < start || (end && dateObj > end)) {
                return;
              }
              if (period === "month") {
                dateObj.setDate(1);
              }
              if (period === "month" || period === "day") {
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
          const windForecastData: LineSeriesOption["data"] = [];
          for (const [time, value] of Object.entries(forecastsData)) {
            windForecastData.push([Number(time), value / 1000]);
          }

          if (windForecastData.length) {
            data.push({
              id: "forecast-" + source.stat_energy_from,
              type: "line",
              stack: "forecast",
              name: this.hass.localize(
                "ui.panel.lovelace.cards.energy.energy_wind_graph.forecast",
                {
                  name: getStatisticLabel(
                    this.hass,
                    source.stat_energy_from,
                    statisticsMetaData[source.stat_energy_from]
                  ),
                }
              ),
              step: false,
              color: borderColor,
              lineStyle: {
                type: [7, 5],
                width: 1.5,
              },
              symbol: "none",
              data: windForecastData,
            });
          }
        }
      }
    });

    return data;
  }

  static styles = css`
    ha-card {
      height: 100%;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
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
      margin-inline-start: 32px;
      margin-inline-end: initial;
      box-sizing: border-box;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-wind-graph-card": HuiEnergyWindGraphCard;
  }
}
