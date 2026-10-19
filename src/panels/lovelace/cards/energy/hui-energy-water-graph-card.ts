import { endOfToday, isToday, startOfToday } from "date-fns";
import type { HassConfig, HassEntities } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { BarSeriesOption } from "echarts/charts";
import { getEnergyColor } from "./common/color";
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
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantUI,
} from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyWaterGraphCardConfig } from "../types";
import {
  computeStatMidpoint,
  type EnergyDataPoint,
  fillDataGapsAndRoundCaps,
  generateFillBuckets,
  getCommonOptions,
  getCompareTransform,
} from "./common/energy-chart-options";
import type { HaECOption } from "../../../../resources/echarts/echarts";
import { formatNumber } from "../../../../common/number/format_number";
import "./common/hui-energy-graph-chip";
import "../../../../components/ha-tooltip";

@customElement("hui-energy-water-graph-card")
export class HuiEnergyWaterGraphCard
  extends LitElement
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-graph-card-editor");
    return document.createElement("hui-energy-graph-card-editor");
  }

  @state() private _config?: EnergyWaterGraphCardConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): EnergyWaterGraphCardConfig {
    return {
      type: "energy-water-graph",
    };
  }

  @state() private _chartData: BarSeriesOption[] = [];

  @state() private _yAxisFractionDigits = 1;

  @state() private _start = startOfToday();

  @state() private _end = endOfToday();

  @state() private _compareStart?: Date;

  @state() private _compareEnd?: Date;

  @state() private _unit?: string;

  @state() private _total?: number;

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
      onData: (data) => this._getStatistics(data),
    });
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public setConfig(config: EnergyWaterGraphCardConfig): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
    this._config = config;
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

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
                        ${formatNumber(this._total, this._i18n.locale)}
                        ${this._unit}
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

  private _formatTotal = (total: number) =>
    this._i18n.localize(
      "ui.panel.lovelace.cards.energy.energy_water_graph.total_consumed",
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

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    this._start = energyData.start;
    this._end = energyData.end || endOfToday();

    this._compareStart = energyData.startCompare;
    this._compareEnd = energyData.endCompare;

    const waterSources: WaterSourceTypeEnergyPreference[] =
      energyData.prefs.energy_sources.filter(
        (source) => source.type === "water"
      ) as WaterSourceTypeEnergyPreference[];

    this._unit = energyData.waterUnit;

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
          energyData.statsCompare,
          energyData.statsMetadata,
          waterSources,
          computedStyles,
          trackY,
          true
        )
      );
    } else {
      // add empty dataset so compare bars are first
      // `stack: water` so it doesn't take up space yet
      const firstId = waterSources[0]?.stat_energy_from ?? "placeholder";
      datasets.push({
        id: "compare-" + firstId,
        type: "bar",
        stack: "water",
        data: [],
      });
    }

    datasets.push(
      ...this._processDataSet(
        energyData.stats,
        energyData.statsMetadata,
        waterSources,
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
    this._total = this._processTotal(energyData.stats, waterSources);
  }

  private _processTotal(
    statistics: Statistics,
    waterSources: WaterSourceTypeEnergyPreference[]
  ) {
    return waterSources.reduce(
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
    waterSources: WaterSourceTypeEnergyPreference[],
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

    waterSources.forEach((source, idx) => {
      let prevStart: number | null = null;

      const waterConsumptionData: BarSeriesOption["data"] = [];

      // Process water consumption data.
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
          waterConsumptionData.push(dataPoint);
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
            "--energy-water-color",
            idx
          ),
        },
        color: getEnergyColor(
          computedStyles,
          this._ui.themes.darkMode,
          true,
          compare,
          "--energy-water-color",
          idx
        ),
        data: waterConsumptionData,
        stack: compare ? "compare" : "water",
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
    "hui-energy-water-graph-card": HuiEnergyWaterGraphCard;
  }
}
