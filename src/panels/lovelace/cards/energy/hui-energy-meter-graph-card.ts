import { endOfToday, isToday, startOfToday } from "date-fns";
import type { HassConfig, HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { BarSeriesOption } from "echarts/charts";
import { getEnergyColor } from "./common/color";
import { sumEnergyStatistics } from "./common/sum-statistics";
import { consume } from "../../../../common/decorators/consume";
import { transform } from "../../../../common/decorators/transform";
import "../../../../components/chart/ha-chart-base";
import { computeYAxisFractionDigits } from "../../../../components/chart/y-axis-fraction-digits";
import "../../../../components/ha-card";
import {
  configContext,
  formattersContext,
  internationalizationContext,
  statesContext,
  uiContext,
} from "../../../../data/context";
import type {
  EnergyData,
  WaterSourceTypeEnergyPreference,
  HeatSourceTypeEnergyPreference,
} from "../../../../data/energy";
import {
  getSuggestedPeriod,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import type { Statistics, StatisticsMetaData } from "../../../../data/recorder";
import { getStatisticLabel } from "../../../../data/recorder";
import type { FrontendLocaleData } from "../../../../data/translation";
import type {
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantUI,
} from "../../../../types";
import type { LovelaceCard } from "../../types";
import type {
  EnergyWaterGraphCardConfig,
  EnergyHeatGraphCardConfig,
} from "../types";
import {
  computeStatMidpoint,
  type EnergyDataPoint,
  fillDataGapsAndRoundCaps,
  generateFillBuckets,
  getCommonOptions,
  getCompareTransform,
} from "./common/energy-chart-options";
import type { HaECOption } from "../../../../resources/echarts/echarts";
import {
  formatNumber,
  formatNumberWithUnit,
} from "../../../../common/number/format_number";
import "./common/hui-energy-graph-chip";
import "../../../../components/ha-tooltip";

type MeterChartSource = Pick<
  WaterSourceTypeEnergyPreference | HeatSourceTypeEnergyPreference,
  "stat_energy_from" | "name"
>;

export class EnergyMeterGraphCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-graph-card-editor");
    return document.createElement("hui-energy-graph-card-editor");
  }

  @state() private _config?:
    EnergyWaterGraphCardConfig | EnergyHeatGraphCardConfig;

  @state() private _chartData: BarSeriesOption[] = [];

  @state() private _yAxisFractionDigits = 1;

  @state() private _start = startOfToday();

  @state() private _end = endOfToday();

  @state() private _compareStart?: Date;

  @state() private _compareEnd?: Date;

  @state() private _unit?: string;

  @state() private _total?: number;

  private _data?: EnergyData;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @consume({ context: statesContext, subscribe: true })
  private _states!: HassEntities;

  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @consume({ context: uiContext, subscribe: true })
  private _ui!: HomeAssistantUI;

  constructor() {
    super();
    new EnergyCollectionController(this, {
      config: () => this._config,
      onData: (data) => {
        this._data = data;
        this._getStatistics(data);
      },
    });
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public setConfig(
    config: EnergyWaterGraphCardConfig | EnergyHeatGraphCardConfig
  ): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
    this._config = config;
  }

  protected willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("_config") && this._data) {
      this._getStatistics(this._data);
    }
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const formattedTotal = this._total
      ? formatNumberWithUnit(this._total, this._unit, this._i18n.locale)
      : undefined;

    return html`
      <ha-card>
        ${
          this._config.title
            ? html` <div class="card-header">
                <span
                  >${this._config.title ? this._config.title : nothing}</span
                >
                ${
                  this._total
                    ? html`<hui-energy-graph-chip
                        .tooltip=${this._formatTotal(this._total)}
                      >
                        ${formattedTotal}
                      </hui-energy-graph-chip>`
                    : nothing
                }
              </div>`
            : nothing
        }
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
              this._i18n.locale,
              this._hassConfig,
              this._unit,
              this._compareStart,
              this._compareEnd,
              this._yAxisFractionDigits
            )}
            chart-type="bar"
          ></ha-chart-base>
          ${
            !this._chartData.length
              ? html`<div class="no-data">
                  ${
                    isToday(this._start)
                      ? this._i18n.localize(
                          "ui.panel.lovelace.cards.energy.no_data"
                        )
                      : this._i18n.localize(
                          "ui.panel.lovelace.cards.energy.no_data_period"
                        )
                  }
                </div>`
              : ""
          }
        </div>
      </ha-card>
    `;
  }

  private get _resource(): "water" | "heat" {
    return this._config?.type === "energy-heat-graph" ? "heat" : "water";
  }

  private _formatTotal = (total: number) =>
    this._i18n.localize(
      `ui.panel.lovelace.cards.energy.energy_${this._resource}_graph.total_consumed`,
      { num: formatNumber(total, this._i18n.locale), unit: this._unit }
    );

  private _createOptions = memoizeOne(
    (
      start: Date,
      end: Date,
      locale: FrontendLocaleData,
      config: HassConfig,
      unit: string | undefined,
      compareStart: Date | undefined,
      compareEnd: Date | undefined,
      yAxisFractionDigits: number
    ): HaECOption =>
      getCommonOptions(
        start,
        end,
        locale,
        config,
        unit,
        compareStart,
        compareEnd,
        this._formatTotal,
        false,
        yAxisFractionDigits
      )
  );

  private _getStatistics(energyData: EnergyData): void {
    this._start = energyData.start;
    this._end = energyData.end || endOfToday();

    this._compareStart = energyData.startCompare;
    this._compareEnd = energyData.endCompare;

    const sources = energyData.prefs.energy_sources.filter(
      (
        source
      ): source is
        WaterSourceTypeEnergyPreference | HeatSourceTypeEnergyPreference =>
        source.type === this._resource
    );

    const combine =
      (this._config!.combine_sources ?? energyData.combineSources ?? false) &&
      sources.length > 1;
    const statIds = sources.map((source) => source.stat_energy_from);
    const chartSources: MeterChartSource[] = combine
      ? [
          {
            stat_energy_from: this._resource,
            name: this._i18n.localize(
              `ui.panel.lovelace.cards.energy.energy_distribution.${this._resource}`
            ),
          },
        ]
      : sources;
    const chartStats = (statistics: Statistics): Statistics =>
      combine
        ? { [this._resource]: sumEnergyStatistics(statistics, statIds) }
        : statistics;

    this._unit = this._resource === "heat" ? "kWh" : energyData.waterUnit;

    const datasets: BarSeriesOption[] = [];

    const computedStyles = getComputedStyle(this);

    let yMin = Infinity;
    let yMax = -Infinity;
    const trackY = (v: number) => {
      if (v < yMin) yMin = v;
      if (v > yMax) yMax = v;
    };

    if (energyData.statsCompare) {
      datasets.push(
        ...this._processDataSet(
          chartStats(energyData.statsCompare),
          energyData.statsMetadata,
          chartSources,
          computedStyles,
          trackY,
          true
        )
      );
    } else {
      // add empty dataset so compare bars are first
      // Use the resource stack so it does not take up space yet
      const firstId = chartSources[0]?.stat_energy_from ?? "placeholder";
      datasets.push({
        id: "compare-" + firstId,
        type: "bar",
        stack: this._resource,
        data: [],
      });
    }

    datasets.push(
      ...this._processDataSet(
        chartStats(energyData.stats),
        energyData.statsMetadata,
        chartSources,
        computedStyles,
        trackY
      )
    );

    fillDataGapsAndRoundCaps(
      datasets,
      true,
      generateFillBuckets(
        datasets,
        this._start,
        this._end,
        getSuggestedPeriod(this._start, this._end)
      )
    );
    this._yAxisFractionDigits = computeYAxisFractionDigits(yMin, yMax, true);
    this._chartData = datasets;
    this._total = this._processTotal(energyData.stats, sources);
  }

  private _processTotal(statistics: Statistics, sources: MeterChartSource[]) {
    return sources.reduce(
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
    sources: MeterChartSource[],
    computedStyles: CSSStyleDeclaration,
    trackY: (v: number) => void,
    compare = false
  ) {
    const data: BarSeriesOption[] = [];
    const compareTransform = getCompareTransform(
      this._start,
      this._compareStart!
    );
    const period = getSuggestedPeriod(this._start, this._end);

    sources.forEach((source, idx) => {
      let prevStart: number | null = null;

      const consumptionData: BarSeriesOption["data"] = [];

      // Process consumption data.
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
          const dataPoint: EnergyDataPoint = [
            computeStatMidpoint(
              point.start,
              point.end,
              period,
              compare ? compareTransform : undefined
            ),
            point.change,
            point.start,
          ];
          consumptionData.push(dataPoint);
          trackY(point.change);
          prevStart = point.start;
        }
      }

      data.push({
        type: "bar",
        cursor: "default",
        id: compare
          ? "compare-" + source.stat_energy_from
          : source.stat_energy_from,
        name:
          source.name ||
          getStatisticLabel(
            this._states,
            this._formatters.formatEntityName,
            source.stat_energy_from,
            statisticsMetaData[source.stat_energy_from]
          ),
        barMaxWidth: 50,
        itemStyle: {
          borderColor: getEnergyColor(
            computedStyles,
            this._ui.themes.darkMode,
            false,
            compare,
            `--energy-${this._resource}-color`,
            idx
          ),
        },
        color: getEnergyColor(
          computedStyles,
          this._ui.themes.darkMode,
          true,
          compare,
          `--energy-${this._resource}-color`,
          idx
        ),
        data: consumptionData,
        stack: compare ? "compare" : this._resource,
      });
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
      padding: var(--ha-space-4);
    }
    .has-header {
      padding-top: 0;
    }
    .no-data {
      position: absolute;
      height: 100%;
      top: 0;
      inset-inline: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20%;
      margin-inline-start: var(--ha-space-8);
      box-sizing: border-box;
    }
  `;
}
