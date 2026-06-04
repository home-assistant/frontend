import { consume } from "@lit/context";
import type { ContextType } from "@lit/context";
import { mdiSolar } from "@mdi/js";
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
import type { EnergyData } from "../../../../data/energy";
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
import type { PowerSolarBadgeConfig } from "../types";

@customElement("hui-power-solar-badge")
export class HuiPowerSolarBadge
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

  @state() private _config?: PowerSolarBadgeConfig;

  @state() private _data?: EnergyData;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: PowerSolarBadgeConfig): void {
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
      const solarSource = this._data?.prefs?.energy_sources?.find(
        (s) => s.type === "solar"
      );
      if (!oldStates || !solarSource?.stat_rate) {
        return true;
      }

      if (oldStates[solarSource.stat_rate] !== this._states?.[solarSource.stat_rate]) {
        return true;
      }
    }

    return false;
  }

  private _getSolarPower(): number {
    if (!this._data?.prefs) {
      return 0;
    }

    const solarSource = this._data.prefs.energy_sources.find(
      (source) => source.type === "solar"
    );

    if (!solarSource?.stat_rate) {
      return 0;
    }

    return getPowerFromState(this._states[solarSource.stat_rate]) ?? 0;
  }

  protected render() {
    if (!this._config || !this._data || !this._i18n) {
      return nothing;
    }

    const power = this._getSolarPower();

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
      this._i18n.localize("ui.panel.lovelace.cards.energy.power_solar_title");

    return html`
      <ha-badge .label=${name}>
        <ha-svg-icon slot="icon" .path=${mdiSolar}></ha-svg-icon>
        ${displayValue}
      </ha-badge>
    `;
  }

  static styles = css`
    ha-badge {
      --badge-color: var(--warning-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-power-solar-badge": HuiPowerSolarBadge;
  }
}
