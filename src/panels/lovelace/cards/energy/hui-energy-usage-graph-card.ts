import { ChartData, ChartDataset, ChartOptions } from "chart.js";
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
import {
  hex2rgb,
  lab2rgb,
  rgb2hex,
  rgb2lab,
} from "../../../../common/color/convert-color";
import { hexBlend } from "../../../../common/color/hex";
import { labDarken } from "../../../../common/color/lab";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import {
  formatNumber,
  numberFormatToLocale,
} from "../../../../common/string/format_number";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import { fetchStatistics, Statistics } from "../../../../data/history";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergyUsageGraphCardConfig } from "../types";

@customElement("hui-energy-usage-graph-card")
export class HuiEnergyUsageGraphCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyUsageGraphCardConfig;

  @state() private _data?: Statistics;

  @state() private _chartData: ChartData = {
    datasets: [],
  };

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

  public setConfig(config: EnergyUsageGraphCardConfig): void {
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
      | EnergyUsageGraphCardConfig
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
            .options=${this._chartOptions}
            chart-type="bar"
          ></ha-chart-base>
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
            tooltipFormat: "datetime",
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
            callback: (value) =>
              formatNumber(Math.abs(value), this.hass.locale),
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
              `${context.dataset.label}: ${formatNumber(
                Math.abs(context.parsed.y),
                this.hass.locale
              )} kWh`,
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
                totalConsumed
                  ? `Total consumed: ${formatNumber(
                      totalConsumed,
                      this.hass.locale
                    )} kWh`
                  : "",
                totalReturned
                  ? `Total returned: ${formatNumber(
                      totalReturned,
                      this.hass.locale
                    )} kWh`
                  : "",
              ].filter(Boolean);
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
        bar: { borderWidth: 1.5, borderRadius: 4 },
        point: {
          hitRadius: 5,
        },
      },
      // @ts-expect-error
      locale: numberFormatToLocale(this.hass.locale),
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

    const combinedData: {
      [key: string]: { [statId: string]: { [start: string]: number } };
    } = {};
    const summedData: { [key: string]: { [start: string]: number } } = {};

    const computedStyles = getComputedStyle(this);
    const colors = {
      to_grid: computedStyles
        .getPropertyValue("--energy-grid-return-color")
        .trim(),
      from_grid: computedStyles
        .getPropertyValue("--energy-grid-consumption-color")
        .trim(),
      used_solar: computedStyles
        .getPropertyValue("--energy-solar-color")
        .trim(),
    };

    const backgroundColor = computedStyles
      .getPropertyValue("--card-background-color")
      .trim();

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
          if (add && !(stat.start in set)) {
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
      Object.entries(sources).forEach(([statId, source], idx) => {
        const data: ChartDataset<"bar">[] = [];
        const entity = this.hass.states[statId];
        const borderColor =
          idx > 0
            ? rgb2hex(lab2rgb(labDarken(rgb2lab(hex2rgb(colors[type])), idx)))
            : colors[type];

        data.push({
          label:
            type === "used_solar"
              ? "Solar"
              : entity
              ? computeStateName(entity)
              : statId,
          borderColor,
          backgroundColor: hexBlend(borderColor, backgroundColor, 50),
          stack: "stack",
          data: [],
        });

        // Process chart data.
        for (const key of uniqueKeys) {
          const value = source[key] || 0;
          const date = new Date(key);
          // @ts-expect-error
          data[0].data.push({
            x: date.getTime(),
            y: value && type === "to_grid" ? -1 * value : value,
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
      .card-header {
        padding-bottom: 0;
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
    "hui-energy-usage-graph-card": HuiEnergyUsageGraphCard;
  }
}
