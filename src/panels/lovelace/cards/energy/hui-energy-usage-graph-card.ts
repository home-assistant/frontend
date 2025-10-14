import { endOfToday, isToday, startOfToday } from "date-fns";
import type { HassConfig, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { BarSeriesOption } from "echarts/charts";
import type {
  TooltipOption,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import { getEnergyColor } from "./common/color";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import type {
  EnergyData,
  EnergySumData,
  EnergyConsumptionData,
} from "../../../../data/energy";
import {
  computeConsumptionData,
  getEnergyDataCollection,
  getSummedData,
} from "../../../../data/energy";
import type { Statistics, StatisticsMetaData } from "../../../../data/recorder";
import { getStatisticLabel } from "../../../../data/recorder";
import type { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyUsageGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import {
  fillDataGapsAndRoundCaps,
  getCommonOptions,
  getCompareTransform,
} from "./common/energy-chart-options";
import type { ECOption } from "../../../../resources/echarts/echarts";

const colorPropertyMap = {
  to_grid: "--energy-grid-return-color",
  to_battery: "--energy-battery-in-color",
  from_grid: "--energy-grid-consumption-color",
  used_grid: "--energy-grid-consumption-color",
  used_solar: "--energy-solar-color",
  used_battery: "--energy-battery-out-color",
};

@customElement("hui-energy-usage-graph-card")
export class HuiEnergyUsageGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyUsageGraphCardConfig;

  @state() private _chartData: BarSeriesOption[] = [];

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
          ${!this._chartData.some((dataset) => dataset.data!.length)
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
    total > 0
      ? this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_usage_graph.total_consumed",
          { num: formatNumber(total, this.hass.locale) }
        )
      : this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_usage_graph.total_returned",
          { num: formatNumber(-total, this.hass.locale) }
        );

  private _createOptions = memoizeOne(
    (
      start: Date,
      end: Date,
      locale: FrontendLocaleData,
      config: HassConfig,
      compareStart?: Date,
      compareEnd?: Date
    ): ECOption => {
      const commonOptions = getCommonOptions(
        start,
        end,
        locale,
        config,
        "kWh",
        compareStart,
        compareEnd,
        this._formatTotal
      );
      const options: ECOption = {
        ...commonOptions,
        tooltip: {
          ...commonOptions.tooltip,
          formatter: (params: TopLevelFormatterParams): string => {
            if (!Array.isArray(params)) {
              return "";
            }
            params.sort((a, b) => {
              const aValue = (a.value as number[])?.[1];
              const bValue = (b.value as number[])?.[1];
              if (aValue > 0 && bValue < 0) {
                return -1;
              }
              if (bValue > 0 && aValue < 0) {
                return 1;
              }
              if (aValue > 0) {
                return b.componentIndex - a.componentIndex;
              }
              return a.componentIndex - b.componentIndex;
            });
            return (
              (commonOptions.tooltip as TooltipOption)?.formatter as any
            )?.(params);
          },
        },
      };
      return options;
    }
  );

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    const datasets: BarSeriesOption[] = [];

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

    const colorIndices: Record<string, Record<string, number>> = {};
    Object.keys(colorPropertyMap).forEach((key) => {
      colorIndices[key] = {};
      if (
        key === "used_grid" ||
        key === "used_solar" ||
        key === "used_battery"
      ) {
        return;
      }
      if (statIds[key]) {
        Object.values(statIds[key]).forEach((id, idx) => {
          colorIndices[key][id as string] = idx;
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

    const { summedData, compareSummedData } = getSummedData(energyData);
    const { consumption, compareConsumption } = computeConsumptionData(
      summedData,
      compareSummedData
    );

    if (energyData.statsCompare) {
      datasets.push(
        ...this._processDataSet(
          energyData.statsCompare,
          energyData.statsMetadata,
          compareSummedData!,
          compareConsumption!,
          statIds,
          colorIndices,
          computedStyles,
          labels,
          true
        )
      );
    }

    // add empty dataset so compare bars are first
    // `stack: usage` so it doesn't take up space yet
    datasets.push({
      id: "compare-placeholder",
      type: "bar",
      stack: energyData.statsCompare ? "compare" : "usage",
      data: [],
      // @ts-expect-error
      order: 0,
    });

    datasets.push(
      ...this._processDataSet(
        energyData.stats,
        energyData.statsMetadata,
        summedData,
        consumption,
        statIds,
        colorIndices,
        computedStyles,
        labels,
        false
      )
    );

    // @ts-expect-error
    datasets.sort((a, b) => a.order - b.order);
    fillDataGapsAndRoundCaps(datasets);
    this._chartData = datasets;
  }

  private _processDataSet(
    statistics: Statistics,
    statisticsMetaData: Record<string, StatisticsMetaData>,
    summedData: EnergySumData,
    consumptionData: EnergyConsumptionData,
    statIdsByCat: {
      to_grid?: string[] | undefined;
      from_grid?: string[] | undefined;
      solar?: string[] | undefined;
      to_battery?: string[] | undefined;
      from_battery?: string[] | undefined;
    },
    colorIndices: Record<string, Record<string, number>>,
    computedStyles: CSSStyleDeclaration,
    labels: {
      used_grid: string;
      used_solar: string;
      used_battery: string;
    },
    compare = false
  ) {
    const data: BarSeriesOption[] = [];

    const combinedData: {
      to_grid?: Record<string, Record<number, number>>;
      to_battery?: Record<string, Record<number, number>>;
      from_grid?: Record<string, Record<number, number>>;
      used_grid?: Record<string, Record<number, number>>;
      used_solar?: Record<string, Record<number, number>>;
      used_battery?: Record<string, Record<number, number>>;
    } = {};

    Object.entries(statIdsByCat).forEach(([key, statIds]) => {
      if (!["to_grid", "from_grid", "to_battery"].includes(key)) {
        return;
      }
      const sets: Record<string, Record<number, number>> = {};
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
          if (!(stat.start in set)) {
            set[stat.start] = val;
          }
        });
        sets[id] = set;
      });
      combinedData[key] = sets;
    });

    combinedData.used_solar = { used_solar: consumptionData.used_solar };
    combinedData.used_battery = {
      used_battery: consumptionData.used_battery,
    };

    if (combinedData.from_grid && summedData.to_battery) {
      const used_grid = {};
      // If we have to_battery and multiple grid sources in the same period, we
      // can't determine which source was used. So delete all the individual
      // sources and replace with a 'combined from grid' value.
      for (const [start, grid_to_battery] of Object.entries(
        consumptionData.grid_to_battery
      )) {
        if (!grid_to_battery) {
          continue;
        }
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
          combinedData.from_grid[source!][start] =
            consumptionData.used_grid[start];
        } else {
          Object.values(combinedData.from_grid).forEach((stats) => {
            delete stats[start];
          });
          used_grid[start] = consumptionData.used_grid[start];
        }
      }
      combinedData.used_grid = { used_grid };
    }

    const uniqueKeys = summedData.timestamps;

    const compareTransform = getCompareTransform(
      this._start,
      this._compareStart!
    );

    Object.entries(combinedData).forEach(([type, sources], idx) => {
      Object.entries(sources).forEach(([statId, source]) => {
        const points: BarSeriesOption["data"] = [];
        // Process chart data.
        for (const key of uniqueKeys) {
          const value = source[key] || 0;
          const dataPoint = [
            new Date(key),
            value && ["to_grid", "to_battery"].includes(type)
              ? -1 * value
              : value,
          ];
          if (compare) {
            dataPoint[2] = dataPoint[0];
            dataPoint[0] = compareTransform(dataPoint[0] as Date);
          }
          points.push(dataPoint);
        }

        data.push({
          id: `${compare ? "compare-" : ""}${statId}-${type}`,
          type: "bar",
          cursor: "default",
          name:
            type in labels
              ? labels[type]
              : getStatisticLabel(
                  this.hass,
                  statId,
                  statisticsMetaData[statId]
                ),
          // @ts-expect-error
          order:
            type === "used_solar"
              ? 1
              : type === "to_battery"
                ? Object.keys(combinedData).length
                : idx + 2,
          barMaxWidth: 50,
          itemStyle: {
            borderColor: getEnergyColor(
              computedStyles,
              this.hass.themes.darkMode,
              false,
              compare,
              colorPropertyMap[type],
              colorIndices[type]?.[statId]
            ),
          },
          color: getEnergyColor(
            computedStyles,
            this.hass.themes.darkMode,
            true,
            compare,
            colorPropertyMap[type],
            colorIndices[type]?.[statId]
          ),
          stack: compare ? "compare" : "usage",
          data: points,
        });
      });
    });
    return data;
  }

  static styles = css`
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
      margin-inline-start: 32px;
      margin-inline-end: initial;
      box-sizing: border-box;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-usage-graph-card": HuiEnergyUsageGraphCard;
  }
}
