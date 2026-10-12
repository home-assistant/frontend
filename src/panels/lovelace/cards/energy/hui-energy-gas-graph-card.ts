import { endOfToday, isToday, startOfToday } from "date-fns";
import type { HassConfig, HassEntities } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { BarSeriesOption } from "echarts/charts";
import { consume } from "../../../../common/decorators/consume";
import { transform } from "../../../../common/decorators/transform";
import { formatNumber } from "../../../../common/number/format_number";
import { preserveUnchangedRecord } from "../../../../common/util/preserve-unchanged-record";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import {
  configContext,
  entitiesContext,
  formattersContext,
  internationalizationContext,
  statesContext,
  uiContext,
} from "../../../../data/context";
import type { EnergyData } from "../../../../data/energy";
import {
  energySourcesByType,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import type { FrontendLocaleData } from "../../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantUI,
} from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyGasGraphCardConfig } from "../types";
import { getCommonOptions } from "./common/energy-chart-options";
import type { HaECOption } from "../../../../resources/echarts/echarts";
import { generateEnergyGasGraphData } from "./energy-gas-graph-data";
import "./common/hui-energy-graph-chip";
import "../../../../components/ha-tooltip";

@customElement("hui-energy-gas-graph-card")
export class HuiEnergyGasGraphCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-graph-card-editor");
    return document.createElement("hui-energy-graph-card-editor");
  }

  @state() private _config?: EnergyGasGraphCardConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): EnergyGasGraphCardConfig {
    return {
      type: "energy-gas-graph",
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

  @state() private _gasStatIds?: string[];

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, Record<string, string>>({
    transformer: function (this: HuiEnergyGasGraphCard, states) {
      const units: Record<string, string> = {};
      this._gasStatIds?.forEach((statId) => {
        const unit = states[statId]?.attributes.unit_of_measurement;
        if (unit !== undefined) {
          units[statId] = unit;
        }
      });
      return preserveUnchangedRecord(this._gasUnits, units, (a, b) => a === b);
    },
    watch: ["_gasStatIds"],
  })
  private _gasUnits?: Record<string, string>;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  @transform<HomeAssistant["entities"], Record<string, number>>({
    transformer: function (this: HuiEnergyGasGraphCard, entities) {
      const precisions: Record<string, number> = {};
      this._gasStatIds?.forEach((statId) => {
        const precision = entities[statId]?.display_precision;
        if (precision !== undefined) {
          precisions[statId] = precision;
        }
      });
      return preserveUnchangedRecord(
        this._gasPrecisions,
        precisions,
        (a, b) => a === b
      );
    },
    watch: ["_gasStatIds"],
  })
  private _gasPrecisions?: Record<string, number>;

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

  public setConfig(config: EnergyGasGraphCardConfig): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
    this._config = config;
  }

  private get _displayPrecision(): number | undefined {
    const gasDisplayPrecisions = this._gasStatIds
      ?.filter((statId) => this._gasUnits?.[statId] === this._unit)
      .map((statId) => this._gasPrecisions?.[statId])
      .filter((precision): precision is number => precision !== undefined);

    return gasDisplayPrecisions?.length
      ? Math.max(...gasDisplayPrecisions)
      : undefined;
  }

  private get _gasFormatOptions(): Intl.NumberFormatOptions | undefined {
    const displayPrecision = this._displayPrecision;

    return displayPrecision !== undefined
      ? {
          minimumFractionDigits: displayPrecision,
          maximumFractionDigits: displayPrecision,
        }
      : undefined;
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
                <span>${this._config.title}</span>
                ${
                  this._total
                    ? html`<hui-energy-graph-chip
                        .tooltip=${this._formatTotal(this._total)}
                      >
                        ${formatNumber(
                          this._total,
                          this._i18n.locale,
                          this._gasFormatOptions
                        )}
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
              this._displayPrecision ?? this._yAxisFractionDigits
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
      "ui.panel.lovelace.cards.energy.energy_gas_graph.total_consumed",
      {
        num: formatNumber(total, this._i18n.locale, this._gasFormatOptions),
        unit: this._unit,
      }
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
    this._gasStatIds = energySourcesByType(energyData.prefs).gas?.map(
      (source) => source.stat_energy_from
    );

    const result = generateEnergyGasGraphData({
      states: this._states,
      formatEntityName: this._formatters.formatEntityName,
      darkMode: this._ui.themes.darkMode,
      energyData,
      computedStyles: getComputedStyle(this),
      now: endOfToday(),
    });

    this._start = result.start;
    this._end = result.end;
    this._compareStart = result.compareStart;
    this._compareEnd = result.compareEnd;
    this._unit = result.unit;
    this._yAxisFractionDigits = result.yAxisFractionDigits;
    this._chartData = result.chartData;
    this._total = result.total;
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
    "hui-energy-gas-graph-card": HuiEnergyGasGraphCard;
  }
}
