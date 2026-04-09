import { mdiTransmissionTower } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import "../../../../components/tile/ha-tile-icon";
import "../../../../components/tile/ha-tile-info";
import type { EnergyData } from "../../../../data/energy";
import {
  getEnergyDataCollection,
  getSummedData,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyGridBalanceCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";

@customElement("hui-energy-grid-balance-card")
class HuiEnergyGridBalanceCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-graph-card-editor");
    return document.createElement("hui-energy-graph-card-editor");
  }

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): EnergyGridBalanceCardConfig {
    return {
      type: "energy-grid-balance",
    };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyGridBalanceCardConfig;

  @state() private _data?: EnergyData;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass!, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._data = data;
      }),
    ];
  }

  public getCardSize(): number {
    return 1;
  }

  public setConfig(config: EnergyGridBalanceCardConfig): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
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
    if (!this._config || !this.hass) {
      return nothing;
    }

    if (!this._data) {
      return html`${this.hass.localize(
        "ui.panel.lovelace.cards.energy.loading"
      )}`;
    }

    const { summedData } = getSummedData(this._data);

    if (
      !("from_grid" in summedData.total) ||
      !("to_grid" in summedData.total)
    ) {
      return nothing;
    }

    const imported = summedData.total.from_grid ?? 0;
    const exported = summedData.total.to_grid ?? 0;
    const net = imported - exported;

    const fmt = (value: number) =>
      formatNumber(
        value,
        this.hass.locale,
        Math.abs(value) < 0.01
          ? { maximumSignificantDigits: 2 }
          : { maximumFractionDigits: 2 }
      );

    const isConsumption = net >= 0;
    const max = Math.max(imported, exported);
    const leftPercent = max > 0 ? (exported / max) * 100 : 0;
    const rightPercent = max > 0 ? (imported / max) * 100 : 0;
    const netPercent = max > 0 ? (Math.abs(net) / (2 * max)) * 100 : 0;

    return html`
      <ha-card>
        <div class="content">
          <ha-tile-icon>
            <ha-svg-icon
              slot="icon"
              .path=${mdiTransmissionTower}
            ></ha-svg-icon>
          </ha-tile-icon>
          <ha-tile-info>
            <span slot="primary">
              ${this.hass.localize(
                "ui.panel.lovelace.cards.energy.grid_balance.title"
              )}
            </span>
            <span slot="secondary" class="equation" id="equation">
              <span class="imported"> ${fmt(imported)} kWh </span>
              <span class="operator"> - </span>
              <span class="exported"> ${fmt(exported)} kWh </span>
              <span class="operator"> = </span>
              <span class="net ${isConsumption ? "consumption" : "return"}">
                ${fmt(net)} kWh
              </span>
            </span>
          </ha-tile-info>
          <ha-tooltip for="equation" placement="top">
            ${this.hass.localize(
              "ui.panel.lovelace.cards.energy.grid_balance.tooltip"
            )}
          </ha-tooltip>
        </div>
        <div class="bar">
          <div class="bar-half bar-left">
            <div
              id="bar-exported"
              class="bar-fill return"
              style="width: ${leftPercent}%"
            ></div>
            <ha-tooltip for="bar-exported" placement="top">
              ${this.hass.localize(
                "ui.panel.lovelace.cards.energy.grid_balance.exported",
                { value: fmt(exported) }
              )}
            </ha-tooltip>
            ${!isConsumption
              ? html`<div
                    id="bar-net-left"
                    class="bar-net return"
                    style="width: ${netPercent * 2}%"
                  ></div>
                  <ha-tooltip for="bar-net-left" placement="top">
                    ${this.hass.localize(
                      "ui.panel.lovelace.cards.energy.grid_balance.net_export",
                      {
                        value: fmt(Math.abs(net)),
                      }
                    )}
                  </ha-tooltip>`
              : nothing}
          </div>
          <div class="bar-center"></div>
          <div class="bar-half bar-right">
            <div
              id="bar-imported"
              class="bar-fill consumption"
              style="width: ${rightPercent}%"
            ></div>
            <ha-tooltip for="bar-imported" placement="top">
              ${this.hass.localize(
                "ui.panel.lovelace.cards.energy.grid_balance.imported",
                { value: fmt(imported) }
              )}
            </ha-tooltip>
            ${isConsumption
              ? html`<div
                    id="bar-net-right"
                    class="bar-net consumption"
                    style="width: ${netPercent * 2}%"
                  ></div>
                  <ha-tooltip for="bar-net-right" placement="top">
                    ${this.hass.localize(
                      "ui.panel.lovelace.cards.energy.grid_balance.net_import",
                      {
                        value: fmt(Math.abs(net)),
                      }
                    )}
                  </ha-tooltip>`
              : nothing}
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .content {
      display: flex;
      align-items: center;
      padding: 10px;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    ha-tile-icon {
      --tile-icon-color: var(--state-inactive-color);
    }

    .equation {
      display: flex;
      flex-wrap: wrap;
    }

    .operator {
      color: var(--secondary-text-color);
      white-space: pre;
    }

    .imported {
      color: var(--energy-grid-consumption-color);
    }

    .exported {
      color: var(--energy-grid-return-color);
    }

    .net.consumption {
      color: var(--energy-grid-consumption-color);
    }

    .net.return {
      color: var(--energy-grid-return-color);
    }

    .bar {
      position: relative;
      display: flex;
      height: 42px;
      margin: 0 12px 16px;
      overflow: visible;
    }

    .bar-half {
      position: relative;
      display: flex;
      flex: 1;
      height: 100%;
      overflow: hidden;
      border: 1px solid;
    }

    .bar-left {
      flex-direction: row-reverse;
      border-radius: var(--ha-border-radius-lg) 0 0 var(--ha-border-radius-lg);
      border-color: color-mix(
        in srgb,
        var(--energy-grid-return-color) 30%,
        transparent
      );
      border-right: none;
    }

    .bar-right {
      border-radius: 0 var(--ha-border-radius-lg) var(--ha-border-radius-lg) 0;
      border-color: color-mix(
        in srgb,
        var(--energy-grid-consumption-color) 30%,
        transparent
      );
      border-left: none;
    }

    .bar-fill {
      position: absolute;
      top: 0;
      height: 100%;
      opacity: 0.3;
      transition: width 180ms ease-in-out;
    }

    .bar-left .bar-fill {
      right: 0;
    }

    .bar-right .bar-fill {
      left: 0;
    }

    .bar-fill.consumption {
      background-color: var(--energy-grid-consumption-color);
    }

    .bar-fill.return {
      background-color: var(--energy-grid-return-color);
    }

    .bar-net {
      position: absolute;
      top: 0;
      height: 100%;
      transition: width 180ms ease-in-out;
    }

    .bar-left .bar-net {
      right: 0;
    }

    .bar-right .bar-net {
      left: 0;
    }

    .bar-net.consumption {
      background-color: var(--energy-grid-consumption-color);
    }

    .bar-net.return {
      background-color: var(--energy-grid-return-color);
    }

    .bar-center {
      position: absolute;
      left: 50%;
      top: -6px;
      transform: translateX(-50%);
      width: 2px;
      height: calc(100% + 12px);
      background: var(--primary-text-color);
      z-index: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-grid-balance-card": HuiEnergyGridBalanceCard;
  }
}
