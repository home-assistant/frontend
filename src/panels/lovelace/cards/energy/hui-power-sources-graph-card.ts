import { endOfToday, isToday, startOfToday } from "date-fns";
import type { HassConfig, HassEntities } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { LineSeriesOption } from "echarts/charts";
import type { PropertyValues } from "lit";
import { consume } from "../../../../common/decorators/consume";
import { transform } from "../../../../common/decorators/transform";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import {
  configContext,
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import type { EnergyData } from "../../../../data/energy";
import {
  validateEnergyCollectionKey,
  formatPowerShort,
} from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import type { FrontendLocaleData } from "../../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantInternationalization,
} from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { PowerSourcesGraphCardConfig } from "../types";
import { getCommonOptions } from "./common/energy-chart-options";
import type { HaECOption } from "../../../../resources/echarts/echarts";
import type { CustomLegendOption } from "../../../../components/chart/ha-chart-base";
import {
  generatePowerSourcesGraphData,
  getPowerLegendValues,
} from "./power-sources-graph-data";

@customElement("hui-power-sources-graph-card")
export class HuiPowerSourcesGraphCard
  extends LitElement
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-graph-card-editor");
    return document.createElement("hui-energy-graph-card-editor");
  }

  @state() private _config?: PowerSourcesGraphCardConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): PowerSourcesGraphCardConfig {
    return {
      type: "power-sources-graph",
    };
  }

  @state() private _chartData: LineSeriesOption[] = [];

  @state() private _yAxisFractionDigits = 1;

  private _energyData?: EnergyData;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: HassEntities;

  @state() private _legendData?: CustomLegendOption["data"];

  @state() private _start = startOfToday();

  @state() private _end = endOfToday();

  @state() private _compareStart?: Date;

  @state() private _compareEnd?: Date;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

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

  public setConfig(config: PowerSourcesGraphCardConfig): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
    this._config = config;
  }

  private _statRateIds = memoizeOne(
    (energyData?: EnergyData) =>
      energyData?.prefs.energy_sources.flatMap((s) =>
        (s.type === "solar" || s.type === "grid" || s.type === "battery") &&
        s.stat_rate
          ? [s.stat_rate]
          : []
      ) ?? []
  );

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.size !== 1 || !changedProps.has("_states")) {
      return true;
    }
    const oldStates = changedProps.get("_states") as HassEntities | undefined;
    return (
      !oldStates ||
      this._statRateIds(this._energyData).some(
        (id) => oldStates[id] !== this._states[id]
      )
    );
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (
      (changedProps.has("_states") || changedProps.has("_i18n")) &&
      !changedProps.has("_legendData")
    ) {
      this._refreshLegendValues();
    }
  }

  private _refreshLegendValues(): boolean {
    if (!this._energyData || !this._legendData) {
      return false;
    }
    const values = getPowerLegendValues(
      this._energyData,
      this._states,
      this._formatPower
    );
    if (this._legendData.every((item) => item.value === values[item.id!])) {
      return false;
    }
    this._legendData = this._legendData.map((item) => ({
      ...item,
      value: values[item.id!],
    }));
    return true;
  }

  private _formatPower = (powerWatts: number) =>
    formatPowerShort(this._i18n.locale, powerWatts);

  protected render() {
    if (!this._config) {
      return nothing;
    }

    return html`
      <ha-card>
        ${
          this._config.title
            ? html`<h1 class="card-header">${this._config.title}</h1>`
            : ""
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
              this._compareStart,
              this._compareEnd,
              this._legendData,
              this._yAxisFractionDigits
            )}
            .expandLegend=${this._config.expand_legend}
          ></ha-chart-base>
          ${
            !this._chartData.some((dataset) => dataset.data!.length)
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
              : nothing
          }
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
      compareStart: Date | undefined,
      compareEnd: Date | undefined,
      legendData: CustomLegendOption["data"] | undefined,
      yAxisFractionDigits: number
    ): HaECOption => ({
      ...getCommonOptions(
        start,
        end,
        locale,
        config,
        "kW",
        compareStart,
        compareEnd,
        undefined,
        true,
        yAxisFractionDigits
      ),
      legend: {
        show: this._config?.show_legend !== false,
        type: "custom",
        data: legendData,
      },
    })
  );

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    const result = generatePowerSourcesGraphData({
      localize: this._i18n.localize,
      formatPower: this._formatPower,
      states: this._states,
      energyData,
      computedStyles: getComputedStyle(this),
      start: this._start,
      end: this._end,
      now: Date.now(),
    });

    this._energyData = energyData;
    this._legendData = result.legendData;
    this._start = result.start;
    this._end = result.end;
    this._chartData = result.chartData;
    this._yAxisFractionDigits = result.yAxisFractionDigits;
  }

  static styles = css`
    ha-card {
      height: 100%;
    }
    .card-header {
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
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20%;
      margin-left: var(--ha-space-8);
      margin-inline-start: var(--ha-space-8);
      margin-inline-end: initial;
      box-sizing: border-box;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-power-sources-graph-card": HuiPowerSourcesGraphCard;
  }
}
