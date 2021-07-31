import type {
  ChartData,
  ChartDataset,
  ChartOptions,
  ChartType,
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
import { getColorByIndex } from "../../common/color/colors";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { computeStateName } from "../../common/entity/compute_state_name";
import { numberFormatToLocale } from "../../common/string/format_number";
import {
  getStatisticIds,
  Statistics,
  statisticsHaveType,
  StatisticsMetaData,
  StatisticType,
} from "../../data/history";
import type { HomeAssistant } from "../../types";
import "./ha-chart-base";

@customElement("statistics-chart")
class StatisticsChart extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public statisticsData!: Statistics;

  @property({ type: Array }) public statisticIds?: StatisticsMetaData[];

  @property() public names: boolean | Record<string, string> = false;

  @property() public unit?: string;

  @property({ attribute: false }) public endTime?: Date;

  @property({ type: Array }) public statTypes: Array<StatisticType> = [
    "sum",
    "min",
    "mean",
    "max",
  ];

  @property() public chartType: ChartType = "line";

  @property({ type: Boolean }) public isLoadingData = false;

  @state() private _chartData: ChartData = { datasets: [] };

  @state() private _chartOptions?: ChartOptions;

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return changedProps.size > 1 || !changedProps.has("hass");
  }

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      this._createOptions();
    }
    if (changedProps.has("statisticsData") || changedProps.has("statTypes")) {
      this._generateData();
    }
  }

  protected render(): TemplateResult {
    if (!isComponentLoaded(this.hass, "history")) {
      return html`<div class="info">
        ${this.hass.localize("ui.components.history_charts.history_disabled")}
      </div>`;
    }

    if (this.isLoadingData && !this.statisticsData) {
      return html`<div class="info">
        ${this.hass.localize(
          "ui.components.statistics_charts.loading_statistics"
        )}
      </div>`;
    }

    if (!this.statisticsData || !Object.keys(this.statisticsData).length) {
      return html`<div class="info">
        ${this.hass.localize(
          "ui.components.statistics_charts.no_statistics_found"
        )}
      </div>`;
    }

    return html`
      <ha-chart-base
        .data=${this._chartData}
        .options=${this._chartOptions}
        .chartType=${this.chartType}
      ></ha-chart-base>
    `;
  }

  private _createOptions() {
    this._chartOptions = {
      parsing: false,
      animation: false,
      scales: {
        x: {
          type: "time",
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
            tooltipFormat: "datetime",
          },
        },
        y: {
          ticks: {
            maxTicksLimit: 7,
          },
          title: {
            display: this.unit,
            text: this.unit,
          },
        },
      },
      plugins: {
        tooltip: {
          mode: "nearest",
          callbacks: {
            label: (context) =>
              `${context.dataset.label}: ${context.parsed.y} ${
                // @ts-ignore
                context.dataset.unit || ""
              }`,
          },
        },
        filler: {
          propagate: true,
        },
        legend: {
          display: true,
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
          tension: 0.4,
          borderWidth: 1.5,
        },
        bar: { borderWidth: 1.5, borderRadius: 4 },
        point: {
          hitRadius: 5,
        },
      },
      // @ts-expect-error
      locale: numberFormatToLocale(this.hass.locale),
    };
  }

  private async _getStatisticIds() {
    this.statisticIds = await getStatisticIds(this.hass);
  }

  private async _generateData() {
    if (!this.statisticsData) {
      return;
    }

    if (!this.statisticIds) {
      await this._getStatisticIds();
    }

    let colorIndex = 0;
    const statisticsData = Object.values(this.statisticsData);
    const totalDataSets: ChartDataset<"line">[] = [];
    let endTime: Date;

    if (statisticsData.length === 0) {
      return;
    }

    endTime =
      this.endTime ||
      // Get the highest date from the last date of each statistic
      new Date(
        Math.max(
          ...statisticsData.map((stats) =>
            new Date(stats[stats.length - 1].start).getTime()
          )
        )
      );

    if (endTime > new Date()) {
      endTime = new Date();
    }

    let unit: string | undefined | null;

    const names = this.names || {};
    statisticsData.forEach((stats) => {
      const firstStat = stats[0];
      let name = names[firstStat.statistic_id];
      if (!name) {
        const entityState = this.hass.states[firstStat.statistic_id];
        if (entityState) {
          name = computeStateName(entityState);
        } else {
          name = firstStat.statistic_id;
        }
      }

      const meta = this.statisticIds!.find(
        (stat) => stat.statistic_id === firstStat.statistic_id
      );

      if (!this.unit) {
        if (unit === undefined) {
          unit = meta?.unit_of_measurement;
        } else if (unit !== meta?.unit_of_measurement) {
          unit = null;
        }
      }

      // array containing [value1, value2, etc]
      let prevValues: Array<number | null> | null = null;

      // The datasets for the current statistic
      const statDataSets: ChartDataset<"line">[] = [];

      const pushData = (
        timestamp: Date,
        dataValues: Array<number | null> | null
      ) => {
        if (!dataValues) return;
        if (timestamp > endTime) {
          // Drop datapoints that are after the requested endTime. This could happen if
          // endTime is "now" and client time is not in sync with server time.
          return;
        }
        statDataSets.forEach((d, i) => {
          if (dataValues[i] === null && prevValues && prevValues[i] !== null) {
            // null data values show up as gaps in the chart.
            // If the current value for the dataset is null and the previous
            // value of the data set is not null, then add an 'end' point
            // to the chart for the previous value. Otherwise the gap will
            // be too big. It will go from the start of the previous data
            // value until the start of the next data value.
            d.data.push({ x: timestamp.getTime(), y: prevValues[i]! });
          }
          d.data.push({ x: timestamp.getTime(), y: dataValues[i]! });
        });
        prevValues = dataValues;
      };

      const color = getColorByIndex(colorIndex);
      colorIndex++;

      const statTypes: this["statTypes"] = [];

      const drawBands =
        this.statTypes.includes("mean") && statisticsHaveType(stats, "mean");

      const sortedTypes = drawBands
        ? [...this.statTypes].sort((a, b) => {
            if (a === "min" || b === "max") {
              return -1;
            }
            if (a === "max" || b === "min") {
              return +1;
            }
            return 0;
          })
        : this.statTypes;

      sortedTypes.forEach((type) => {
        if (statisticsHaveType(stats, type)) {
          const band = drawBands && (type === "min" || type === "max");
          statTypes.push(type);
          statDataSets.push({
            label: `${name} (${this.hass.localize(
              `ui.components.statistics_charts.statistic_types.${type}`
            )})
            `,
            fill: drawBands
              ? type === "min"
                ? "+1"
                : type === "max"
                ? "-1"
                : false
              : false,
            borderColor: band ? color + "7F" : color,
            backgroundColor: band ? color + "3F" : color + "7F",
            pointRadius: 0,
            data: [],
            // @ts-ignore
            unit: meta?.unit_of_measurement,
            band,
          });
        }
      });

      let prevDate: Date | null = null;
      // Process chart data.
      stats.forEach((stat) => {
        const date = new Date(stat.start);
        if (prevDate === date) {
          return;
        }
        prevDate = date;
        const dataValues: Array<number | null> = [];
        statTypes.forEach((type) => {
          let val: number | null;
          if (type === "sum") {
            val = stat.state;
          } else {
            val = stat[type];
          }
          dataValues.push(val !== null ? Math.round(val * 100) / 100 : null);
        });
        pushData(date, dataValues);
      });

      // Add an entry for final values
      pushData(endTime, prevValues);

      // Concat two arrays
      Array.prototype.push.apply(totalDataSets, statDataSets);
    });

    if (unit !== null) {
      this._chartOptions = {
        ...this._chartOptions,
        scales: {
          ...this._chartOptions!.scales,
          y: {
            ...(this._chartOptions!.scales!.y as Record<string, unknown>),
            title: { display: unit, text: unit },
          },
        },
      };
    }

    this._chartData = {
      datasets: totalDataSets,
    };
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        min-height: 60px;
      }
      .info {
        text-align: center;
        line-height: 60px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "statistics-chart": StatisticsChart;
  }
}
