import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import type { ChartData, ChartDataset, ChartOptions } from "chart.js";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { Statistics, StatisticType, StatisticValue } from "../../data/history";
import type { HomeAssistant } from "../../types";
import "../ha-circular-progress";
import "./ha-chart-base";
import { getColorByIndex } from "../../common/color/colors";
import { computeStateName } from "../../common/entity/compute_state_name";

const statsHaveType = (stats: StatisticValue[], type: StatisticType) =>
  stats.some((stat) => stat[type] !== null);

@customElement("statistics-charts")
class StatisticsCharts extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public statisticsData!: Statistics;

  @property() public names: boolean | Record<string, string> = false;

  @property({ attribute: false }) public endTime?: Date;

  @property({ type: Array }) public statTypes: Array<StatisticType> = [
    "sum",
    "min",
    "max",
    "mean",
  ];

  @property({ type: Boolean, attribute: "up-to-now" }) public upToNow = false;

  @property({ type: Boolean, attribute: "no-single" }) public noSingle = false;

  @property({ type: Boolean }) public isLoadingData = false;

  @state() private _chartData?: ChartData<"line">;

  @state() private _chartOptions?: ChartOptions<"line">;

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return !(changedProps.size === 1 && changedProps.has("hass"));
  }

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
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
              tooltipFormat: "datetimeseconds",
            },
          },
          y: {
            ticks: {
              maxTicksLimit: 7,
            },
          },
        },
        plugins: {
          tooltip: {
            mode: "nearest",
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${context.parsed.y}`,
            },
          },
          filler: {
            propagate: true,
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
            tension: 0.4,
            borderWidth: 1.5,
          },
          point: {
            hitRadius: 5,
          },
        },
      };
    }
    if (changedProps.has("statisticsData")) {
      this._generateData();
    }
  }

  protected render(): TemplateResult {
    if (!isComponentLoaded(this.hass, "history")) {
      return html` <div class="info">
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
        chartType="line"
      ></ha-chart-base>
    `;
  }

  private _generateData() {
    let colorIndex = 0;
    const statisticsData = Object.values(this.statisticsData);
    const datasets: ChartDataset<"line">[] = [];
    let endTime: Date;

    if (statisticsData.length === 0) {
      return;
    }

    endTime =
      this.endTime ||
      // Get the highest date from the last date of each device
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
      // array containing [value1, value2, etc]
      let prevValues: any[] | null = null;

      const data: ChartDataset<"line">[] = [];

      const pushData = (timestamp: Date, datavalues: any[] | null) => {
        if (!datavalues) return;
        if (timestamp > endTime) {
          // Drop datapoints that are after the requested endTime. This could happen if
          // endTime is "now" and client time is not in sync with server time.
          return;
        }
        data.forEach((d, i) => {
          if (datavalues[i] === null && prevValues && prevValues[i] !== null) {
            // null data values show up as gaps in the chart.
            // If the current value for the dataset is null and the previous
            // value of the data set is not null, then add an 'end' point
            // to the chart for the previous value. Otherwise the gap will
            // be too big. It will go from the start of the previous data
            // value until the start of the next data value.
            d.data.push({ x: timestamp.getTime(), y: prevValues[i] });
          }
          d.data.push({ x: timestamp.getTime(), y: datavalues[i] });
        });
        prevValues = datavalues;
      };

      const addDataSet = (
        nameY: string,
        step = false,
        fill = false,
        color?: string
      ) => {
        if (!color) {
          color = getColorByIndex(colorIndex);
          colorIndex++;
        }
        data.push({
          label: nameY,
          fill: fill ? "origin" : false,
          borderColor: color,
          backgroundColor: color + "7F",
          stepped: step ? "before" : false,
          pointRadius: 0,
          data: [],
        });
      };

      const statTypes: this["statTypes"] = [];

      this.statTypes.forEach((type) => {
        if (statsHaveType(stats, type)) {
          statTypes.push(type);
          addDataSet(
            `${name} (${this.hass.localize(
              `ui.components.statistics_charts.statistic_types.${type}`
            )})`,
            false
          );
        }
      });

      let lastDate: Date;

      // Process chart data.
      stats.forEach((stat) => {
        const value: Array<number | null> = [];
        statTypes.forEach((type) => {
          value.push(
            stat[type] ? Math.round(stat[type]! * 100) / 100 : stat[type]
          );
        });
        const date = new Date(stat.start);
        if (lastDate && date.getTime() === lastDate.getTime()) {
          return;
        }
        pushData(date, value);
      });

      // Add an entry for final values
      pushData(endTime, prevValues);

      // Concat two arrays
      Array.prototype.push.apply(datasets, data);
    });

    this._chartData = {
      datasets,
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
    "statistics-charts": StatisticsCharts;
  }
}
