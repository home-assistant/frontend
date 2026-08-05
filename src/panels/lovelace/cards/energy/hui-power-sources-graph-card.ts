import { endOfToday, isToday, startOfToday } from "date-fns";
import type { HassConfig, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { LineSeriesOption } from "echarts/charts";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import type { EnergyData } from "../../../../data/energy";
import {
  getEnergyDataCollection,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import type { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { PowerSourcesGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import { getCommonOptions } from "./common/energy-chart-options";
import type { HaECOption } from "../../../../resources/echarts/echarts";
import type { CustomLegendOption } from "../../../../components/chart/ha-chart-base";
import { generatePowerSourcesGraphData } from "./power-sources-graph-data";

@customElement("hui-power-sources-graph-card")
export class HuiPowerSourcesGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-graph-card-editor");
    return document.createElement("hui-energy-graph-card-editor");
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

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

  @state() private _legendData?: CustomLegendOption["data"];

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

  public setConfig(config: PowerSourcesGraphCardConfig): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
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
            .hass=${this.hass}
            .data=${this._chartData}
            .options=${this._createOptions(
              this._start,
              this._end,
              this.hass.locale,
              this.hass.config,
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
                      ? this.hass.localize(
                          "ui.panel.lovelace.cards.energy.no_data"
                        )
                      : this.hass.localize(
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
    const result = generatePowerSourcesGraphData({
      localize: this.hass.localize,
      states: this.hass.states,
      energyData,
      computedStyles: getComputedStyle(this),
      start: this._start,
      end: this._end,
      now: Date.now(),
    });

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
