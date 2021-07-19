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
import "../../../components/ha-card";
import "../../../components/chart/statistics-chart";
import { ChartData, ChartDataset, ChartOptions } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { EnergySummaryGraphCardConfig } from "./types";
import { fetchStatistics, Statistics } from "../../../data/history";

const PLUGINS = [ChartDataLabels];
const NEGATIVE = ["to_grid", "solar"];
const COLORS = {
  from_grid: "#ff5722",
  to_grid: "#4caf50",
  by_home: "#9c27b0",
  solar: "#ffc107",
};

@customElement("hui-energy-summary-graph-card")
export class HuiEnergySummaryGraphCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergySummaryGraphCardConfig;

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

  public setConfig(config: EnergySummaryGraphCardConfig): void {
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
      | EnergySummaryGraphCardConfig
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
                .plugins=${PLUGINS}
                chartType="line"
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
          mode: "x",
          intersect: true,
          position: "nearest",
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.parsed.y}`,
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
        datalabels: {
          align: (context) =>
            // @ts-ignore
            context.dataset.data[1].y >= 0 ? "top" : "bottom",
          anchor: (context) =>
            // @ts-ignore
            context.dataset.data[1].y >= 0 ? "end" : "start",
          offset: 6,
          borderRadius: 4,
          color: "white",
          font: {
            weight: "bold",
          },
          padding: 6,
          formatter: (value) => value.y,
          backgroundColor: (context) =>
            context.dataset.backgroundColor as string,
        },
      },
      hover: {
        mode: "nearest",
      },
      elements: {
        line: {
          tension: 0.2,
          borderWidth: 1.5,
        },
        point: {
          hitRadius: 5,
        },
      },
    };
  }

  // This is superduper temp.
  private async _getStatistics(): Promise<void> {
    if (this._fetching) {
      return;
    }
    const startDate = new Date("2021-07-08T00:00:00");
    // This should be _just_ today (since local midnight)
    // For now we do a lot because fake data is not recent.
    // startDate.setHours(-135);

    this._fetching = true;
    const prefs = this._config!.prefs;
    const statistics: {
      solar?: string[];
      from_grid?: string[];
      to_grid?: string[];
    } = {};
    for (const source of prefs.energy_sources) {
      if (source.type === "solar") {
        if (statistics.solar) {
          statistics.solar.push(source.stat_energy_from);
        } else {
          statistics.solar = [source.stat_energy_from];
        }
        continue;
      }

      // grid source
      for (const flowFrom of source.flow_from) {
        if (statistics.from_grid) {
          statistics.from_grid.push(flowFrom.stat_energy_from);
        } else {
          statistics.from_grid = [flowFrom.stat_energy_from];
        }
      }
      for (const flowTo of source.flow_to) {
        if (statistics.to_grid) {
          statistics.to_grid.push(flowTo.stat_energy_to);
        } else {
          statistics.to_grid = [flowTo.stat_energy_to];
        }
      }
    }

    try {
      this._data = await fetchStatistics(
        this.hass!,
        startDate,
        undefined,
        Object.values(statistics).flat() as string[]
      );
    } finally {
      this._fetching = false;
    }

    const statisticsData = Object.values(this._data!);
    const datasets: ChartDataset<"line">[] = [];
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

    const combinedData: { [key: string]: { [start: string]: number } } = {};

    Object.entries(statistics).forEach(([key, statIds]) => {
      const totalStats: { [start: string]: number } = {};
      statIds!.forEach((id) => {
        const stats = this._data![id];
        if (!stats) {
          return;
        }
        let prevValue: number;
        stats.forEach((stat) => {
          if (!stat.sum) {
            return;
          }
          if (!prevValue) {
            prevValue = stat.sum;
            return;
          }
          if (stat.start in totalStats) {
            totalStats[stat.start] = stat.sum - prevValue;
          } else {
            totalStats[stat.start] = stat.sum - prevValue;
          }
          prevValue = stat.sum;
        });
      });
      combinedData[key] = totalStats;
    });

    if (combinedData.from_grid && combinedData.to_grid && combinedData.solar) {
      const allStarts = new Set([
        ...Object.keys(combinedData.from_grid),
        ...Object.keys(combinedData.to_grid),
        ...Object.keys(combinedData.solar),
      ]);
      combinedData.by_home = {};
      for (const start of allStarts) {
        combinedData.by_home[start] =
          (combinedData.solar[start] || 0) -
          (combinedData.to_grid[start] || 0) +
          (combinedData.from_grid[start] || 0);
      }
    }

    Object.entries(combinedData).forEach(([key, totalStats]) => {
      const negative = NEGATIVE.includes(key);

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
            d.data.push({
              x: timestamp.getTime(),
              y: Math.round(prevValues[i] * 100) / 100,
            });
          }
          d.data.push({
            x: timestamp.getTime(),
            y: Math.round(datavalues[i] * 100) / 100,
          });
        });
        prevValues = datavalues;
      };

      const color = COLORS[key];

      let lastDate: Date | undefined;

      data.push({
        label: this.hass.localize(
          `ui.panel.lovelace.cards.energy-summary-graph-card.lines.${key}`
        ),
        fill: false,
        borderColor: color,
        backgroundColor: color + "7F",
        stepped: false,
        pointRadius: 0,
        data: [],
      });
      // Process chart data.
      for (const [start, value] of Object.entries(totalStats)) {
        const date = new Date(start);
        if (lastDate && date.getTime() === lastDate.getTime()) {
          return;
        }
        lastDate = date;
        pushData(date, [negative ? -1 * value : value]);
      }

      // Add an entry for final values
      if (endTime.getTime() !== lastDate?.getTime()) {
        pushData(endTime, prevValues);
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-summary-graph-card": HuiEnergySummaryGraphCard;
  }
}
