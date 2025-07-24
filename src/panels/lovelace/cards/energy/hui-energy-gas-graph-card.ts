import { endOfToday, isToday, startOfToday } from "date-fns";
import type { HassConfig, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { BarSeriesOption } from "echarts/charts";
import { getEnergyColor } from "./common/color";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import type {
  EnergyData,
  GasSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { getEnergyDataCollection } from "../../../../data/energy";
import type { Statistics, StatisticsMetaData } from "../../../../data/recorder";
import { getStatisticLabel } from "../../../../data/recorder";
import type { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyGasGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import {
  fillDataGapsAndRoundCaps,
  getCommonOptions,
  getCompareTransform,
} from "./common/energy-chart-options";
import type { ECOption } from "../../../../resources/echarts";

@customElement("hui-energy-gas-graph-card")
export class HuiEnergyGasGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyGasGraphCardConfig;

  @state() private _chartData: BarSeriesOption[] = [];

  @state() private _start = startOfToday();

  @state() private _end = endOfToday();

  @state() private _compareStart?: Date;

  @state() private _compareEnd?: Date;

  @state() private _unit?: string;

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

  public setConfig(config: EnergyGasGraphCardConfig): void {
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
              this._unit,
              this._compareStart,
              this._compareEnd
            )}
            chart-type="bar"
          ></ha-chart-base>
          ${!this._chartData.length
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
    this.hass.localize(
      "ui.panel.lovelace.cards.energy.energy_gas_graph.total_consumed",
      { num: formatNumber(total, this.hass.locale), unit: this._unit }
    );

  private _createOptions = memoizeOne(
    (
      start: Date,
      end: Date,
      locale: FrontendLocaleData,
      config: HassConfig,
      unit?: string,
      compareStart?: Date,
      compareEnd?: Date
    ): ECOption =>
      getCommonOptions(
        start,
        end,
        locale,
        config,
        unit,
        compareStart,
        compareEnd,
        this._formatTotal
      )
  );

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    this._start = energyData.start;
    this._end = energyData.end || endOfToday();

    this._compareStart = energyData.startCompare;
    this._compareEnd = energyData.endCompare;

    const gasSources: GasSourceTypeEnergyPreference[] =
      energyData.prefs.energy_sources.filter(
        (source) => source.type === "gas"
      ) as GasSourceTypeEnergyPreference[];

    this._unit = energyData.gasUnit;

    const datasets: BarSeriesOption[] = [];

    const computedStyles = getComputedStyle(this);

    if (energyData.statsCompare) {
      datasets.push(
        ...this._processDataSet(
          energyData.statsCompare,
          energyData.statsMetadata,
          gasSources,
          computedStyles,
          true
        )
      );
    } else {
      // add empty dataset so compare bars are first
      // `stack: gas` so it doesn't take up space yet
      const firstId = gasSources[0]?.stat_energy_from ?? "placeholder";
      datasets.push({
        id: "compare-" + firstId,
        type: "bar",
        stack: "gas",
        data: [],
      });
    }

    datasets.push(
      ...this._processDataSet(
        energyData.stats,
        energyData.statsMetadata,
        gasSources,
        computedStyles
      )
    );

    fillDataGapsAndRoundCaps(datasets);
    this._chartData = datasets;
  }

  private _processDataSet(
    statistics: Statistics,
    statisticsMetaData: Record<string, StatisticsMetaData>,
    gasSources: GasSourceTypeEnergyPreference[],
    computedStyles: CSSStyleDeclaration,
    compare = false
  ) {
    const data: BarSeriesOption[] = [];
    const compareTransform = getCompareTransform(
      this._start,
      this._compareStart!
    );

    gasSources.forEach((source, idx) => {
      let prevStart: number | null = null;

      const gasConsumptionData: BarSeriesOption["data"] = [];

      // Process gas consumption data.
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
          const dataPoint: (Date | string | number)[] = [
            point.start,
            point.change,
          ];
          if (compare) {
            dataPoint[2] = dataPoint[0];
            dataPoint[0] = compareTransform(new Date(point.start));
          }
          gasConsumptionData.push(dataPoint);
          prevStart = point.start;
        }
      }

      data.push({
        type: "bar",
        cursor: "default",
        id: compare
          ? "compare-" + source.stat_energy_from
          : source.stat_energy_from,
        name: getStatisticLabel(
          this.hass,
          source.stat_energy_from,
          statisticsMetaData[source.stat_energy_from]
        ),
        barMaxWidth: 50,
        itemStyle: {
          borderColor: getEnergyColor(
            computedStyles,
            this.hass.themes.darkMode,
            false,
            compare,
            "--energy-gas-color",
            idx
          ),
        },
        color: getEnergyColor(
          computedStyles,
          this.hass.themes.darkMode,
          true,
          compare,
          "--energy-gas-color",
          idx
        ),
        data: gasConsumptionData,
        stack: compare ? "compare-gas" : "gas",
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
    "hui-energy-gas-graph-card": HuiEnergyGasGraphCard;
  }
}
