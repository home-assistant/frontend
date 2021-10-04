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
import { differenceInDays, endOfToday, isToday, startOfToday } from "date-fns";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergyGasGraphCardConfig } from "../types";
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
  getEnergyGasUnit,
  GasSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/chart/ha-chart-base";
import {
  formatNumber,
  numberFormatToLocale,
} from "../../../../common/number/format_number";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { FrontendLocaleData } from "../../../../data/translation";
import {
  reduceSumStatisticsByMonth,
  reduceSumStatisticsByDay,
} from "../../../../data/history";

@customElement("hui-energy-gas-graph-card")
export class HuiEnergyGasGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyGasGraphCardConfig;

  @state() private _chartData: ChartData = {
    datasets: [],
  };

  @state() private _start = startOfToday();

  @state() private _end = endOfToday();

  @state() private _unit?: string;

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

  public setConfig(config: EnergyGasGraphCardConfig): void {
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
              this.hass.locale,
              this._unit
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
    (
      start: Date,
      end: Date,
      locale: FrontendLocaleData,
      unit?: string
    ): ChartOptions => {
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
            type: "linear",
            title: {
              display: true,
              text: unit,
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
                )} ${unit}`,
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
    const gasSources: GasSourceTypeEnergyPreference[] =
      energyData.prefs.energy_sources.filter(
        (source) => source.type === "gas"
      ) as GasSourceTypeEnergyPreference[];

    this._unit = getEnergyGasUnit(this.hass, energyData.prefs) || "m³";

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
    const gasColor = computedStyles
      .getPropertyValue("--energy-gas-color")
      .trim();

    const dayDifference = differenceInDays(
      energyData.end || new Date(),
      energyData.start
    );

    gasSources.forEach((source, idx) => {
      const data: ChartDataset<"bar" | "line">[] = [];
      const entity = this.hass.states[source.stat_energy_from];

      const borderColor =
        idx > 0
          ? rgb2hex(lab2rgb(labDarken(rgb2lab(hex2rgb(gasColor)), idx)))
          : gasColor;

      let prevValue: number | null = null;
      let prevStart: string | null = null;

      const gasConsumptionData: ScatterDataPoint[] = [];

      // Process gas consumption data.
      if (source.stat_energy_from in energyData.stats) {
        const stats =
          dayDifference > 35
            ? reduceSumStatisticsByMonth(
                energyData.stats[source.stat_energy_from]
              )
            : dayDifference > 2
            ? reduceSumStatisticsByDay(
                energyData.stats[source.stat_energy_from]
              )
            : energyData.stats[source.stat_energy_from];

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
          gasConsumptionData.push({
            x: date.getTime(),
            y: value,
          });
          prevStart = point.start;
          prevValue = point.sum;
        }
      }

      if (gasConsumptionData.length) {
        data.push({
          label: entity ? computeStateName(entity) : source.stat_energy_from,
          borderColor,
          backgroundColor: borderColor + "7F",
          data: gasConsumptionData,
        });
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
    "hui-energy-gas-graph-card": HuiEnergyGasGraphCard;
  }
}
