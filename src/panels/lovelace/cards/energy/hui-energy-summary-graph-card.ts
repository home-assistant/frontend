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
import { EnergySummaryGraphCardConfig } from "../types";
import { fetchStatistics, Statistics } from "../../../../data/history";
import {
  hex2rgb,
  lab2rgb,
  rgb2hex,
  rgb2lab,
} from "../../../../common/color/convert-color";
import { labDarken } from "../../../../common/color/lab";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/chart/ha-chart-base";
import { round } from "../../../../common/number/round";

const NEGATIVE = ["to_grid"];
const ORDER = {
  used_solar: 0,
  from_grid: 100,
  to_grid: 200,
};
const COLORS = {
  to_grid: { border: "#56d256", background: "#87ceab" },
  from_grid: { border: "#126A9A", background: "#88b5cd" },
  used_solar: { border: "#FF9800", background: "#ffcb80" },
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
          stacked: true,
          type: "linear",
          ticks: {
            beginAtZero: true,
            callback: (value) => Math.abs(round(value)),
          },
        },
      },
      plugins: {
        tooltip: {
          mode: "x",
          intersect: true,
          position: "nearest",
          filter: (val) => val.formattedValue !== "0",
          callbacks: {
            label: (context) =>
              `${context.dataset.label}: ${Math.abs(context.parsed.y)} kWh`,
            footer: (contexts) => {
              let totalConsumed = 0;
              let totalReturned = 0;
              for (const context of contexts) {
                const value = (context.dataset.data[context.dataIndex] as any)
                  .y;
                if (value > 0) {
                  totalConsumed += value;
                } else {
                  totalReturned += Math.abs(value);
                }
              }
              return [
                `Total consumed: ${totalConsumed.toFixed(2)} kWh`,
                `Total returned: ${totalReturned.toFixed(2)} kWh`,
              ];
            },
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
          tension: 0.4,
          borderWidth: 1.5,
        },
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
    const prefs = this._config!.prefs;
    const statistics: {
      to_grid?: string[];
      from_grid?: string[];
      solar?: string[];
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
        // Array.flat()
        ([] as string[]).concat(...Object.values(statistics))
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

    const combinedData: {
      [key: string]: { [statId: string]: { [start: string]: number } };
    } = {};
    const summedData: { [key: string]: { [start: string]: number } } = {};

    Object.entries(statistics).forEach(([key, statIds]) => {
      const sum = ["solar", "to_grid"].includes(key);
      const add = key !== "solar";
      const totalStats: { [start: string]: number } = {};
      const sets: { [statId: string]: { [start: string]: number } } = {};
      statIds!.forEach((id) => {
        const stats = this._data![id];
        if (!stats) {
          return;
        }
        const set = {};
        let prevValue: number;
        stats.forEach((stat) => {
          if (!stat.sum) {
            return;
          }
          if (!prevValue) {
            prevValue = stat.sum;
            return;
          }
          const val = stat.sum - prevValue;
          // Get total of solar and to grid to calculate the solar energy used
          if (sum) {
            totalStats[stat.start] =
              stat.start in totalStats ? totalStats[stat.start] + val : val;
          }
          if (add) {
            set[stat.start] = val;
          }
          prevValue = stat.sum;
        });
        sets[id] = set;
      });
      if (sum) {
        summedData[key] = totalStats;
      }
      if (add) {
        combinedData[key] = sets;
      }
    });

    if (summedData.to_grid && summedData.solar) {
      const used_solar = {};
      for (const start of Object.keys(summedData.solar)) {
        used_solar[start] = Math.max(
          (summedData.solar[start] || 0) - (summedData.to_grid[start] || 0),
          0
        );
      }
      combinedData.used_solar = { used_solar: used_solar };
    }

    let allKeys: string[] = [];

    Object.values(combinedData).forEach((sources) => {
      Object.values(sources).forEach((source) => {
        allKeys = allKeys.concat(Object.keys(source));
      });
    });

    const uniqueKeys = Array.from(new Set(allKeys));

    Object.entries(combinedData).forEach(([type, sources]) => {
      const negative = NEGATIVE.includes(type);

      Object.entries(sources).forEach(([statId, source], idx) => {
        const data: ChartDataset<"line">[] = [];
        const entity = this.hass.states[statId];
        const color = COLORS[type];

        data.push({
          label:
            type === "used_solar"
              ? "Solar"
              : entity
              ? computeStateName(entity)
              : statId,
          fill: true,
          stepped: false,
          order: ORDER[type] + idx,
          borderColor:
            idx > 0
              ? rgb2hex(lab2rgb(labDarken(rgb2lab(hex2rgb(color.border)), idx)))
              : color.border,
          backgroundColor:
            idx > 0
              ? rgb2hex(
                  lab2rgb(labDarken(rgb2lab(hex2rgb(color.background)), idx))
                )
              : color.background,
          stack: negative ? "negative" : "positive",
          data: [],
        });

        // Process chart data.
        for (const key of uniqueKeys) {
          const value = key in source ? Math.round(source[key] * 100) / 100 : 0;
          const date = new Date(key);
          data[0].data.push({
            x: date.getTime(),
            y: value && negative ? -1 * value : value,
          });
        }

        // Concat two arrays
        Array.prototype.push.apply(datasets, data);
      });
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
