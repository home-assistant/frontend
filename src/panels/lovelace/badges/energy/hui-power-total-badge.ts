import { mdiHomeLightningBolt } from "@mdi/js";
import type { HassEntities } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { preserveUnchangedEntityStatesRecord } from "../../../../common/decorators/consume-context-entry";
import { transform } from "../../../../common/decorators/transform";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/ha-badge";
import "../../../../components/ha-svg-icon";
import {
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import type { EnergyData, EnergyPreferences } from "../../../../data/energy";
import { getPowerFromState } from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import type { HomeAssistantInternationalization } from "../../../../types";
import type { LovelaceBadge } from "../../types";
import type { PowerTotalBadgeConfig } from "../types";

@customElement("hui-power-total-badge")
export class HuiPowerTotalBadge extends LitElement implements LovelaceBadge {
  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, HassEntities>({
    transformer: function (this: HuiPowerTotalBadge, states) {
      const tracked: HassEntities = {};
      this._data?.prefs.energy_sources.forEach((source) => {
        if (
          (source.type === "solar" ||
            source.type === "grid" ||
            source.type === "battery") &&
          source.stat_rate &&
          states?.[source.stat_rate]
        ) {
          tracked[source.stat_rate] = states[source.stat_rate];
        }
      });
      return preserveUnchangedEntityStatesRecord(this._states, tracked);
    },
    watch: ["_data"],
  })
  private _states: HassEntities = {};

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  @state() private _config?: PowerTotalBadgeConfig;

  @state() private _data?: EnergyData;

  constructor() {
    super();
    new EnergyCollectionController(this, {
      config: () => this._config,
      onData: (data) => {
        this._data = data;
      },
    });
  }

  public setConfig(config: PowerTotalBadgeConfig): void {
    this._config = config;
  }

  private _getCurrentPower(entityId: string): number {
    return getPowerFromState(this._states[entityId]) ?? 0;
  }

  private _computeTotalPower(prefs: EnergyPreferences): number {
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
