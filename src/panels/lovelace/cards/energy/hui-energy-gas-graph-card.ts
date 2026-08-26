import { endOfToday, isToday, startOfToday } from "date-fns";
import type { HassConfig, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { BarSeriesOption } from "echarts/charts";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import type { EnergyData } from "../../../../data/energy";
import {
  energySourcesByType,
  getEnergyDataCollection,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import type { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyGasGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import { getCommonOptions } from "./common/energy-chart-options";
import type { HaECOption } from "../../../../resources/echarts/echarts";
import { generateEnergyGasGraphData } from "./energy-gas-graph-data";
import "./common/hui-energy-graph-chip";
import "../../../../components/ha-tooltip";

@customElement("hui-energy-gas-graph-card")
export class HuiEnergyGasGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-graph-card-editor");
    return document.createElement("hui-energy-graph-card-editor");
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

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

  @state() private _displayPrecision?: number;

  private _energyData?: EnergyData;

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
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
    if (
      hasConfigChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
    ) {
      return true;
    }

    const oldHass = changedProps.get("hass");

    if (
      this._energyData &&
      energySourcesByType(this._energyData.prefs).gas?.some((source) => {
        const statId = source.stat_energy_from;
        return (
          this.hass.entities[statId]?.display_precision !==
            oldHass.entities[statId]?.display_precision ||
          this.hass.states[statId]?.attributes.unit_of_measurement !==
            oldHass.states[statId]?.attributes.unit_of_measurement
        );
      })
    ) {
      const gasDisplayPrecisions = energySourcesByType(
        this._energyData.prefs
      ).gas
        ?.filter(
          (source) =>
            this.hass.states[source.stat_energy_from]?.attributes
              .unit_of_measurement === this._unit
        )
        .map(
          (source) =>
            this.hass.entities[source.stat_energy_from]?.display_precision
        )
        .filter((precision): precision is number => precision !== undefined);

      this._displayPrecision = gasDisplayPrecisions?.length
        ? Math.max(...gasDisplayPrecisions)
        : undefined;

      return true;
    }

    return false;
  }

  private get _gasFormatOptions(): Intl.NumberFormatOptions | undefined {
    return this._displayPrecision !== undefined
      ? {
          minimumFractionDigits: this._displayPrecision,
          maximumFractionDigits: this._displayPrecision,
        }
      : undefined;
  }

  protected render() {
    if (!this.hass || !this._config) {
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
                          this.hass.locale,
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
            .hass=${this.hass}
            .data=${this._chartData}
            .options=${this._createOptions(
              this._start,
              this._end,
              this.hass.locale,
              this.hass.config,
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
                      ? this.hass.localize(
                          "ui.panel.lovelace.cards.energy.no_data"
                        )
                      : this.hass.localize(
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
    this.hass.localize(
      "ui.panel.lovelace.cards.energy.energy_gas_graph.total_consumed",
      {
        num: formatNumber(total, this.hass.locale, this._gasFormatOptions),
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
    this._energyData = energyData;

    const result = generateEnergyGasGraphData({
      hass: this.hass,
      energyData,
      computedStyles: getComputedStyle(this),
      now: endOfToday(),
    });

    const gasSources = energySourcesByType(energyData.prefs).gas;
    const gasDisplayPrecisions = gasSources
      ?.filter(
        (source) =>
          this.hass.states[source.stat_energy_from]?.attributes
            .unit_of_measurement === result.unit
      )
      .map(
        (source) =>
          this.hass.entities[source.stat_energy_from]?.display_precision
      )
      .filter((precision): precision is number => precision !== undefined);

    this._displayPrecision = gasDisplayPrecisions?.length
      ? Math.max(...gasDisplayPrecisions)
      : undefined;

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
