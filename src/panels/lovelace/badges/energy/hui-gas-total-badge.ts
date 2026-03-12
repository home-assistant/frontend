import { mdiFire } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-badge";
import "../../../../components/ha-svg-icon";
import { formatNumber } from "../../../../common/number/format_number";
import type { EnergyData, EnergyPreferences } from "../../../../data/energy";
import {
  FLOW_RATE_TO_LMIN,
  getEnergyDataCollection,
} from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceBadge } from "../../types";
import type { GasTotalBadgeConfig } from "../types";

@customElement("hui-gas-total-badge")
export class HuiGasTotalBadge
  extends SubscribeMixin(LitElement)
  implements LovelaceBadge
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: GasTotalBadgeConfig;

  @state() private _data?: EnergyData;

  private _entities = new Set<string>();

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: GasTotalBadgeConfig): void {
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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config") || changedProps.has("_data")) {
      return true;
    }

    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || !this._entities.size) {
        return true;
      }

      for (const entityId of this._entities) {
        if (oldHass.states[entityId] !== this.hass?.states[entityId]) {
          return true;
        }
      }
    }

    return false;
  }

  private _computeTotalFlowRate(prefs: EnergyPreferences): {
    value: number;
    unit: string;
  } {
    this._entities.clear();

    let targetUnit: string | undefined;
    let totalFlow = 0;

    prefs.energy_sources.forEach((source) => {
      if (source.type !== "gas" || !source.stat_rate) {
        return;
      }

      const entityId = source.stat_rate;
      this._entities.add(entityId);

      const stateObj = this.hass.states[entityId];
      if (!stateObj) {
        return;
      }

      const rawValue = parseFloat(stateObj.state);
      if (isNaN(rawValue) || rawValue <= 0) {
        return;
      }

      const entityUnit = stateObj.attributes.unit_of_measurement;
      if (!entityUnit) {
        return;
      }

      if (targetUnit === undefined) {
        targetUnit = entityUnit;
        totalFlow += rawValue;
        return;
      }

      if (entityUnit === targetUnit) {
        totalFlow += rawValue;
        return;
      }

      const sourceFactor = FLOW_RATE_TO_LMIN[entityUnit];
      const targetFactor = FLOW_RATE_TO_LMIN[targetUnit];

      if (sourceFactor !== undefined && targetFactor !== undefined) {
        totalFlow += (rawValue * sourceFactor) / targetFactor;
      } else {
        totalFlow += rawValue;
      }
    });

    return {
      value: Math.max(0, totalFlow),
      unit: targetUnit ?? "",
    };
  }

  protected render() {
    if (!this._config || !this._data) {
      return nothing;
    }

    const { value, unit } = this._computeTotalFlowRate(this._data.prefs);
    const displayValue = `${formatNumber(value, this.hass.locale, { maximumFractionDigits: 1 })} ${unit}`;

    const name =
      this._config.title ||
      this.hass.localize("ui.panel.lovelace.cards.energy.gas_total_title");

    return html`
      <ha-badge .label=${name}>
        <ha-svg-icon slot="icon" .path=${mdiFire}></ha-svg-icon>
        ${displayValue}
      </ha-badge>
    `;
  }

  static styles = css`
    ha-badge {
      --badge-color: var(--energy-gas-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gas-total-badge": HuiGasTotalBadge;
  }
}
