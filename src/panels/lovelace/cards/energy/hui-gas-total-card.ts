import { mdiFire } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import "../../../../components/tile/ha-tile-container";
import "../../../../components/tile/ha-tile-icon";
import "../../../../components/tile/ha-tile-info";
import type { EnergyData, EnergyPreferences } from "../../../../data/energy";
import {
  formatFlowRateShort,
  getEnergyDataCollection,
  getFlowRateFromState,
} from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import { tileCardStyle } from "../tile/tile-card-style";
import type { GasTotalCardConfig } from "../types";

@customElement("hui-gas-total-card")
export class HuiGasTotalCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: GasTotalCardConfig;

  @state() private _data?: EnergyData;

  private _entities = new Set<string>();

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: GasTotalCardConfig): void {
    this._config = config;
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._data = data;
      }),
    ];
  }

  public getCardSize(): Promise<number> | number {
    return 1;
  }

  getGridOptions(): LovelaceGridOptions {
    return {
      columns: 12,
      min_columns: 6,
      rows: 1,
      min_rows: 1,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config") || changedProps.has("_data")) {
      return true;
    }

    // Check if any of the tracked entity states have changed
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || !this._entities.size) {
        return true;
      }

      // Only update if one of our tracked entities changed
      for (const entityId of this._entities) {
        if (oldHass.states[entityId] !== this.hass.states[entityId]) {
          return true;
        }
      }
    }

    return false;
  }

  private _getCurrentFlowRate(entityId: string): number {
    this._entities.add(entityId);
    return getFlowRateFromState(this.hass.states[entityId]) ?? 0;
  }

  private _computeTotalFlowRate(prefs: EnergyPreferences): number {
    this._entities.clear();

    let totalFlow = 0;

    prefs.energy_sources.forEach((source) => {
      if (source.type === "gas" && source.stat_rate) {
        const value = this._getCurrentFlowRate(source.stat_rate);
        if (value > 0) totalFlow += value;
      }
    });

    return Math.max(0, totalFlow);
  }

  protected render() {
    if (!this._config || !this.hass || !this._data) {
      return nothing;
    }

    const flowRate = this._computeTotalFlowRate(this._data.prefs);
    const displayValue = formatFlowRateShort(this.hass, flowRate);

    const name =
      this._config.title ||
      this.hass.localize("ui.panel.energy.cards.gas_total_title");

    return html`
      <ha-card>
        <ha-tile-container .interactive=${false}>
          <ha-tile-icon slot="icon" data-domain="sensor" data-state="active">
            <ha-svg-icon slot="icon" .path=${mdiFire}></ha-svg-icon>
          </ha-tile-icon>
          <ha-tile-info slot="info">
            <span slot="primary" class="primary">${name}</span>
            <span slot="secondary" class="secondary">${displayValue}</span>
          </ha-tile-info>
        </ha-tile-container>
      </ha-card>
    `;
  }

  static styles = [
    tileCardStyle,
    css`
      :host {
        --tile-color: var(--energy-gas-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gas-total-card": HuiGasTotalCard;
  }
}
