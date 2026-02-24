import { mdiHomeLightningBolt } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import "../../../../components/tile/ha-tile-container";
import "../../../../components/tile/ha-tile-icon";
import "../../../../components/tile/ha-tile-info";
import type { EnergyData, EnergyPreferences } from "../../../../data/energy";
import {
  getEnergyDataCollection,
  getPowerFromState,
} from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import { tileCardStyle } from "../tile/tile-card-style";
import type { PowerTotalCardConfig } from "../types";

@customElement("hui-power-total-card")
export class HuiPowerTotalCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: PowerTotalCardConfig;

  @state() private _data?: EnergyData;

  private _entities = new Set<string>();

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: PowerTotalCardConfig): void {
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

  private _getCurrentPower(entityId: string): number {
    this._entities.add(entityId);
    return getPowerFromState(this.hass.states[entityId]) ?? 0;
  }

  private _computeTotalPower(prefs: EnergyPreferences): number {
    this._entities.clear();

    let solar = 0;
    let from_grid = 0;
    let to_grid = 0;
    let from_battery = 0;
    let to_battery = 0;

    prefs.energy_sources.forEach((source) => {
      if (source.type === "solar" && source.stat_rate) {
        const value = this._getCurrentPower(source.stat_rate);
        if (value > 0) solar += value;
      } else if (source.type === "grid" && source.stat_rate) {
        const value = this._getCurrentPower(source.stat_rate);
        if (value > 0) from_grid += value;
        else if (value < 0) to_grid += Math.abs(value);
      } else if (source.type === "battery" && source.stat_rate) {
        const value = this._getCurrentPower(source.stat_rate);
        if (value > 0) from_battery += value;
        else if (value < 0) to_battery += Math.abs(value);
      }
    });

    const used_total = from_grid + solar + from_battery - to_grid - to_battery;
    return Math.max(0, used_total);
  }

  protected render() {
    if (!this._config || !this.hass || !this._data) {
      return nothing;
    }

    const power = this._computeTotalPower(this._data.prefs);

    let displayValue = "";
    if (power >= 1000) {
      displayValue = `${formatNumber(power / 1000, this.hass.locale, {
        maximumFractionDigits: 1,
      })} kW`;
    } else {
      displayValue = `${formatNumber(power, this.hass.locale, {
        maximumFractionDigits: 0,
      })} W`;
    }

    const name =
      this._config.title ||
      this.hass.localize("ui.panel.energy.cards.power_total_title");

    // We try to mock a basic tile card appearance
    const style = {
      "--tile-color": "var(--state-sensor-color, var(--state-icon-color))",
    };

    return html`
      <ha-card style=${styleMap(style)}>
        <ha-tile-container .interactive=${false}>
          <ha-tile-icon slot="icon" data-domain="sensor" data-state="active">
            <ha-svg-icon
              slot="icon"
              .path=${mdiHomeLightningBolt}
            ></ha-svg-icon>
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
      ha-card {
        height: 100%;
        box-sizing: border-box;
      }
      ha-tile-container {
        --tile-icon-color: var(--tile-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-power-total-card": HuiPowerTotalCard;
  }
}
