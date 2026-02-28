import { mdiWater } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-badge";
import "../../../../components/ha-svg-icon";
import type { EnergyData, EnergyPreferences } from "../../../../data/energy";
import {
  formatFlowRateShort,
  getEnergyDataCollection,
  getFlowRateFromState,
} from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceBadge } from "../../types";
import type { WaterTotalBadgeConfig } from "../types";

@customElement("hui-water-total-badge")
export class HuiWaterTotalBadge
  extends SubscribeMixin(LitElement)
  implements LovelaceBadge
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: WaterTotalBadgeConfig;

  @state() private _data?: EnergyData;

  private _entities = new Set<string>();

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: WaterTotalBadgeConfig): void {
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

  private _getCurrentFlowRate(entityId: string): number {
    this._entities.add(entityId);
    return getFlowRateFromState(this.hass.states[entityId]) ?? 0;
  }

  private _computeTotalFlowRate(prefs: EnergyPreferences): number {
    this._entities.clear();

    let totalFlow = 0;

    prefs.energy_sources.forEach((source) => {
      if (source.type === "water" && source.stat_rate) {
        const value = this._getCurrentFlowRate(source.stat_rate);
        if (value > 0) totalFlow += value;
      }
    });

    return Math.max(0, totalFlow);
  }

  protected render() {
    if (!this._config || !this._data) {
      return nothing;
    }

    const flowRate = this._computeTotalFlowRate(this._data.prefs);
    const displayValue = formatFlowRateShort(
      this.hass.locale,
      this.hass.config.unit_system.length,
      flowRate
    );

    const name =
      this._config.title ||
      this.hass.localize("ui.panel.lovelace.cards.energy.water_total_title");

    return html`
      <ha-badge .label=${name}>
        <ha-svg-icon slot="icon" .path=${mdiWater}></ha-svg-icon>
        ${displayValue}
      </ha-badge>
    `;
  }

  static styles = css`
    ha-badge {
      --badge-color: var(--energy-water-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-water-total-badge": HuiWaterTotalBadge;
  }
}
