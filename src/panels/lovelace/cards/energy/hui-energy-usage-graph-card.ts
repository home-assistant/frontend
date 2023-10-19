import {
  ChartData,
  ChartDataset,
  ChartOptions,
  ScatterDataPoint,
} from "chart.js";
import {
  addHours,
  differenceInDays,
  differenceInHours,
  endOfToday,
  isToday,
  startOfToday,
} from "date-fns/esm";
import { HassConfig, UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
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
import { formatDateVeryShort } from "../../../../common/datetime/format_date";
import { formatTime } from "../../../../common/datetime/format_time";
import {
  formatNumber,
  numberFormatToLocale,
} from "../../../../common/number/format_number";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import { EnergyData, getEnergyDataCollection } from "../../../../data/energy";
import {
  getStatisticLabel,
  Statistics,
  StatisticsMetaData,
} from "../../../../data/recorder";
import { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergyUsageGraphCardConfig } from "../types";

interface ColorSet {
  base: string;
  overrides?: Record<string, string>;
}

@customElement("hui-energy-usage-graph-card")
export class HuiEnergyUsageGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyUsageGraphCardConfig;

  @state() private _chartData: ChartData = {
    datasets: [],
  };

  @state() private _start = startOfToday();

  @state() private _end = endOfToday();

  @state() private _compareStart?: Date;

  @state() private _compareEnd?: Date;

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

  public setConfig(config: EnergyUsageGraphCardConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
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
          ${!this._chartData.datasets.some((dataset) => dataset.data.length)
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
    (
      start: Date,
      end: Date,
      locale: FrontendLocaleData,
      config: HassConfig,
      compareStart?: Date,
      compareEnd?: Date
    ): ChartOptions => {
      const dayDifference = differenceInDays(end, start);
      const compare = compareStart !== undefined && compareEnd !== undefined;
      if (compare) {
        const difference = differenceInHours(end, start);
        const differenceCompare = differenceInHours(compareEnd!, compareStart!);
        // If the compare period doesn't match the main period, adjust them to match
        if (differenceCompare > difference) {
          end = addHours(end, differenceCompare - difference);
        } else if (difference > differenceCompare) {
          compareEnd = addHours(compareEnd!, difference - differenceCompare);
        }
      }

      const options: ChartOptions = {
        parsing: false,
        animation: false,
        interaction: {
          mode: "x",
        },
        scales: {
          x: {
            type: "time",
            suggestedMin: start.getTime(),
            suggestedMax: end.getTime(),
            adapters: {
              date: {
                locale,
                config,
              },
            },
            ticks: {
              maxRotation: 0,
              sampleSize: 5,
              autoSkipPadding: 20,
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
              callback: (value) => formatNumber(Math.abs(value), locale),
            },
          },
        },
        plugins: {
          tooltip: {
            position: "nearest",
            filter: (val) => val.formattedValue !== "0",
            itemSort: function (a: any, b: any) {
              if (a.raw?.y > 0 && b.raw?.y < 0) {
                return -1;
              }
              if (b.raw?.y > 0 && a.raw?.y < 0) {
                return 1;
              }
              if (a.raw?.y > 0) {
                return b.datasetIndex - a.datasetIndex;
              }
              return a.datasetIndex - b.datasetIndex;
            },
            callbacks: {
              title: (datasets) => {
                if (dayDifference > 0) {
                  return datasets[0].label;
                }
                const date = new Date(datasets[0].parsed.x);
                return `${
                  compare
                    ? `${formatDateVeryShort(date, locale, config)}: `
                    : ""
                }${formatTime(date, locale, config)} – ${formatTime(
                  addHours(date, 1),
                  locale,
                  config
                )}`;
              },
              label: (context) =>
                `${context.dataset.label}: ${formatNumber(
                  Math.abs(context.parsed.y),
                  locale
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
                    ? this.hass.localize(
                        "ui.panel.lovelace.cards.energy.energy_usage_graph.total_consumed",
                        { num: formatNumber(totalConsumed, locale) }
                      )
                    : "",
                  totalReturned
                    ? this.hass.localize(
                        "ui.panel.lovelace.cards.energy.energy_usage_graph.total_returned",
                        { num: formatNumber(totalReturned, locale) }
                      )
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
        elements: {
          bar: { borderWidth: 1.5, borderRadius: 4 },
          point: {
            hitRadius: 50,
          },
        },
        // @ts-expect-error
        locale: numberFormatToLocale(locale),
      };
      if (compare) {
        options.scales!.xAxisCompare = {
          ...(options.scales!.x as Record<string, any>),
          suggestedMin: compareStart!.getTime(),
          suggestedMax: compareEnd!.getTime(),
          display: false,
        };
      }
      return options;
    }
  );

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    const datasets: ChartDataset<"bar", ScatterDataPoint[]>[] = [];

    const statIds: {
      to_grid?: string[];
      from_grid?: string[];
      solar?: string[];
      to_battery?: string[];
      from_battery?: string[];
    } = {};

    for (const source of energyData.prefs.energy_sources) {
      if (source.type === "solar") {
        if (statIds.solar) {
          statIds.solar.push(source.stat_energy_from);
        } else {
          statIds.solar = [source.stat_energy_from];
        }
        continue;
      }

      if (source.type === "battery") {
        if (statIds.to_battery) {
          statIds.to_battery.push(source.stat_energy_to);
          statIds.from_battery!.push(source.stat_energy_from);
        } else {
          statIds.to_battery = [source.stat_energy_to];
          statIds.from_battery = [source.stat_energy_from];
        }
        continue;
      }

      if (source.type !== "grid") {
        continue;
      }

      // grid source
      for (const flowFrom of source.flow_from) {
        if (statIds.from_grid) {
          statIds.from_grid.push(flowFrom.stat_energy_from);
        } else {
          statIds.from_grid = [flowFrom.stat_energy_from];
        }
      }
      for (const flowTo of source.flow_to) {
        if (statIds.to_grid) {
          statIds.to_grid.push(flowTo.stat_energy_to);
        } else {
          statIds.to_grid = [flowTo.stat_energy_to];
        }
      }
    }

    const computedStyles = getComputedStyle(this);

    const colorPropertyMap = {
      to_grid: "--energy-grid-return-color",
      to_battery: "--energy-battery-in-color",
      from_grid: "--energy-grid-consumption-color",
      used_grid: "--energy-grid-consumption-color",
      used_solar: "--energy-solar-color",
      used_battery: "--energy-battery-out-color",
    };

    const colors = {
      to_grid: {
        base: computedStyles.getPropertyValue(colorPropertyMap.to_grid).trim(),
      },
      to_battery: {
        base: computedStyles
          .getPropertyValue(colorPropertyMap.to_battery)
          .trim(),
      },
      from_grid: {
        base: computedStyles
          .getPropertyValue(colorPropertyMap.from_grid)
          .trim(),
      },
      used_grid: {
        base: computedStyles
          .getPropertyValue(colorPropertyMap.used_grid)
          .trim(),
      },
      used_solar: {
        base: computedStyles
          .getPropertyValue(colorPropertyMap.used_solar)
          .trim(),
      },
      used_battery: {
        base: computedStyles
          .getPropertyValue(colorPropertyMap.used_battery)
          .trim(),
      },
    };

    Object.entries(colorPropertyMap).forEach(([key, colorProp]) => {
      if (
        key === "used_grid" ||
        key === "used_solar" ||
        key === "used_battery"
      ) {
        return;
      }
      colors[key].overrides = [];
      if (statIds[key]) {
        Object.values(statIds[key]).forEach((id, idx) => {
          const override = computedStyles
            .getPropertyValue(colorProp + "-" + idx)
            .trim();
          if (override.length > 0) {
            colors[key].overrides[id] = override;
          }
        });
      }
    });

    const labels = {
      used_grid: this.hass.localize(
        "ui.panel.lovelace.cards.energy.energy_usage_graph.combined_from_grid"
      ),
      used_solar: this.hass.localize(
        "ui.panel.lovelace.cards.energy.energy_usage_graph.consumed_solar"
      ),
      used_battery: this.hass.localize(
        "ui.panel.lovelace.cards.energy.energy_usage_graph.consumed_battery"
      ),
    };

    this._start = energyData.start;
    this._end = energyData.end || endOfToday();

    this._compareStart = energyData.startCompare;
    this._compareEnd = energyData.endCompare;

    datasets.push(
      ...this._processDataSet(
        energyData.stats,
        energyData.statsMetadata,
        statIds,
        colors,
        labels,
        false
      )
    );

    if (energyData.statsCompare) {
      // Add empty dataset to align the bars
      datasets.push({
        order: 0,
        data: [],
      });
      datasets.push({
        order: 999,
        data: [],
        xAxisID: "xAxisCompare",
      });

      datasets.push(
        ...this._processDataSet(
          energyData.statsCompare,
          energyData.statsMetadata,
          statIds,
          colors,
          labels,
          true
        )
      );
    }

    this._chartData = {
      datasets,
    };
  }

  private _processDataSet(
    statistics: Statistics,
    statisticsMetaData: Record<string, StatisticsMetaData>,
    statIdsByCat: {
      to_grid?: string[] | undefined;
      from_grid?: string[] | undefined;
      solar?: string[] | undefined;
      to_battery?: string[] | undefined;
      from_battery?: string[] | undefined;
    },
    colors: {
      to_grid: ColorSet;
      to_battery: ColorSet;
      from_grid: ColorSet;
      used_grid: ColorSet;
      used_solar: ColorSet;
      used_battery: ColorSet;
    },
    labels: {
      used_grid: string;
      used_solar: string;
      used_battery: string;
    },
    compare = false
  ) {
    const data: ChartDataset<"bar", ScatterDataPoint[]>[] = [];

    const combinedData: {
      to_grid?: { [statId: string]: { [start: number]: number } };
      to_battery?: { [statId: string]: { [start: number]: number } };
      from_grid?: { [statId: string]: { [start: number]: number } };
      used_grid?: { [statId: string]: { [start: number]: number } };
      used_solar?: { [statId: string]: { [start: number]: number } };
      used_battery?: { [statId: string]: { [start: number]: number } };
    } = {};

    const summedData: {
      to_grid?: { [start: number]: number };
      from_grid?: { [start: number]: number };
      to_battery?: { [start: number]: number };
      from_battery?: { [start: number]: number };
      solar?: { [start: number]: number };
    } = {};

    let pointEndTime;
    Object.entries(statIdsByCat).forEach(([key, statIds]) => {
      const sum = [
        "solar",
        "to_grid",
        "from_grid",
        "to_battery",
        "from_battery",
      ].includes(key);
      const add = !["solar", "from_battery"].includes(key);
      const totalStats: { [start: number]: number } = {};
      const sets: { [statId: string]: { [start: number]: number } } = {};
      statIds!.forEach((id) => {
        const stats = statistics[id];
        if (!stats) {
          return;
        }

        const set = {};
        stats.forEach((stat) => {
          if (stat.change === null || stat.change === undefined) {
            return;
          }
          const val = stat.change;
          // Get total of solar and to grid to calculate the solar energy used
          if (sum) {
            totalStats[stat.start] =
              stat.start in totalStats ? totalStats[stat.start] + val : val;
            pointEndTime = stat.end;
          }
          if (add && !(stat.start in set)) {
            set[stat.start] = val;
            pointEndTime = stat.end;
          }
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

    const grid_to_battery = {};
    const battery_to_grid = {};
    if ((summedData.to_grid || summedData.to_battery) && summedData.solar) {
      const used_solar = {};
      for (const start of Object.keys(summedData.solar)) {
        used_solar[start] =
          (summedData.solar[start] || 0) -
          (summedData.to_grid?.[start] || 0) -
          (summedData.to_battery?.[start] || 0);
        if (used_solar[start] < 0) {
          if (summedData.to_battery) {
            grid_to_battery[start] = used_solar[start] * -1;
            if (grid_to_battery[start] > (summedData.from_grid?.[start] || 0)) {
              battery_to_grid[start] = Math.min(
                0,
                grid_to_battery[start] - (summedData.from_grid?.[start] || 0)
              );
              grid_to_battery[start] = summedData.from_grid?.[start];
            }
          }
          used_solar[start] = 0;
        }
      }
      combinedData.used_solar = { used_solar };
    }

    if (summedData.from_battery) {
      if (summedData.to_grid) {
        const used_battery = {};
        for (const start of Object.keys(summedData.from_battery)) {
          used_battery[start] =
            (summedData.from_battery![start] || 0) -
            (battery_to_grid[start] || 0);
        }
        combinedData.used_battery = { used_battery };
      } else {
        combinedData.used_battery = { used_battery: summedData.from_battery };
      }
    }

    if (combinedData.from_grid && summedData.to_battery) {
      const used_grid = {};
      for (const start of Object.keys(grid_to_battery)) {
        let noOfSources = 0;
        let source: string;
        for (const [key, stats] of Object.entries(combinedData.from_grid)) {
          if (stats[start]) {
            source = key;
            noOfSources++;
          }
          if (noOfSources > 1) {
            break;
          }
        }
        if (noOfSources === 1) {
          combinedData.from_grid[source!][start] -= grid_to_battery[start] || 0;
        } else {
          let total_from_grid = 0;
          Object.values(combinedData.from_grid).forEach((stats) => {
            total_from_grid += stats[start] || 0;
            delete stats[start];
          });
          used_grid[start] = total_from_grid - (grid_to_battery[start] || 0);
        }
      }
      combinedData.used_grid = { used_grid };
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
        let borderColor = colors[type].overrides?.[statId];
        if (!borderColor) {
          const modifiedColor =
            idx > 0
              ? this.hass.themes.darkMode
                ? labBrighten(rgb2lab(hex2rgb(colors[type].base)), idx)
                : labDarken(rgb2lab(hex2rgb(colors[type].base)), idx)
              : undefined;
          borderColor = modifiedColor
            ? rgb2hex(lab2rgb(modifiedColor))
            : colors[type].base;
        }

        const points: ScatterDataPoint[] = [];
        // Process chart data.
        for (const key of uniqueKeys) {
          const value = source[key] || 0;
          points.push({
            x: Number(key),
            y:
              value && ["to_grid", "to_battery"].includes(type)
                ? -1 * value
                : value,
          });
        }
        if (points.length === 1) {
          points.push({
            x: pointEndTime,
            y: 0,
          });
        }

        data.push({
          label:
            type in labels
              ? labels[type]
              : getStatisticLabel(
                  this.hass,
                  statId,
                  statisticsMetaData[statId]
                ),
          order:
            type === "used_solar"
              ? 1
              : type === "to_battery"
              ? Object.keys(combinedData).length
              : idx + 2,
          borderColor: compare ? borderColor + "7F" : borderColor,
          backgroundColor: compare ? borderColor + "32" : borderColor + "7F",
          stack: "stack",
          data: points,
          xAxisID: compare ? "xAxisCompare" : undefined,
        });
      });
    });
    return data;
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
    "hui-energy-usage-graph-card": HuiEnergyUsageGraphCard;
  }
}
