import { consume } from "@lit/context";
import type { ContextType } from "@lit/context";
import { mdiHomeLightningBolt } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/ha-badge";
import "../../../../components/ha-svg-icon";
import {
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import type { EnergyData, EnergyPreferences } from "../../../../data/energy";
import {
  getEnergyDataCollection,
  getPowerFromState,
} from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type {
  HomeAssistant,
  HomeAssistantInternationalization,
} from "../../../../types";
import type { LovelaceBadge } from "../../types";
import type { PowerTotalBadgeConfig } from "../types";

@customElement("hui-power-total-badge")
export class HuiPowerTotalBadge
  extends SubscribeMixin(LitElement)
  implements LovelaceBadge
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  @state() private _config?: PowerTotalBadgeConfig;

  @state() private _data?: EnergyData;

  private _entities = new Set<string>();

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: PowerTotalBadgeConfig): void {
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

    if (changedProps.has("_states")) {
      const oldStates = changedProps.get("_states") as
        | ContextType<typeof statesContext>
        | undefined;
      if (!oldStates || !this._entities.size) {
        return true;
      }

      for (const entityId of this._entities) {
        if (oldStates[entityId] !== this._states?.[entityId]) {
          return true;
        }
      }
    }

    return false;
  }

  private _getCurrentPower(entityId: string): number {
    this._entities.add(entityId);
    return getPowerFromState(this._states[entityId]) ?? 0;
  }

  private _computeTotalPower(prefs: EnergyPreferences): number {
    this._entities.clear();

    let solar = 0;
    let fromGrid = 0;
    let toGrid = 0;
    let fromBattery = 0;
    let toBattery = 0;

    prefs.energy_sources.forEach((source) => {
      if (source.type === "solar" && source.stat_rate) {
        const value = this._getCurrentPower(source.stat_rate);
        if (value > 0) solar += value;
      } else if (source.type === "grid" && source.stat_rate) {
        const value = this._getCurrentPower(source.stat_rate);
        if (value > 0) fromGrid += value;
        else if (value < 0) toGrid += Math.abs(value);
      } else if (source.type === "battery" && source.stat_rate) {
        const value = this._getCurrentPower(source.stat_rate);
        if (value > 0) fromBattery += value;
        else if (value < 0) toBattery += Math.abs(value);
      }
    });

    const usedTotal = fromGrid + solar + fromBattery - toGrid - toBattery;
    return Math.max(0, usedTotal);
  }

  protected render() {
    if (!this._config || !this._data || !this._i18n) {
      return nothing;
    }

    const power = this._computeTotalPower(this._data.prefs);

    let displayValue: string;
    if (power >= 1000) {
      displayValue = `${formatNumber(power / 1000, this._i18n.locale, {
        maximumFractionDigits: 2,
      })} kW`;
    } else {
      displayValue = `${formatNumber(power, this._i18n.locale, {
        maximumFractionDigits: 0,
      })} W`;
    }

    const name =
      this._config.title ||
      this._i18n.localize("ui.panel.lovelace.cards.energy.power_total_title");

    return html`
      <ha-badge .label=${name}>
        <ha-svg-icon slot="icon" .path=${mdiHomeLightningBolt}></ha-svg-icon>
        ${displayValue}
      </ha-badge>
    `;
  }

  static styles = css`
    ha-badge {
      --badge-color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-power-total-badge": HuiPowerTotalBadge;
  }
}
