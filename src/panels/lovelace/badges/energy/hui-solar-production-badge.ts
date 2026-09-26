import { consume } from "@lit/context";
import type { ContextType } from "@lit/context";
import { mdiSolarPower } from "@mdi/js";
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
import type { SolarProductionBadgeConfig } from "../types";

@customElement("hui-solar-production-badge")
export class HuiSolarProductionBadge
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

  @state() private _config?: SolarProductionBadgeConfig;

  @state() private _data?: EnergyData;

  private _entities = new Set<string>();

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: SolarProductionBadgeConfig): void {
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
    if (
      changedProps.has("_config") ||
      changedProps.has("_data") ||
      changedProps.has("_i18n")
    ) {
      return true;
    }

    if (changedProps.has("_states")) {
      const oldStates = changedProps.get("_states") as
        ContextType<typeof statesContext> | undefined;
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

  private _computeSolarPower(): number {
    this._entities.clear();

    let solar = 0;
    this._data!.prefs.energy_sources.forEach((source) => {
      if (source.type === "solar" && source.stat_rate) {
        this._entities.add(source.stat_rate);
        const value = getPowerFromState(this._states[source.stat_rate]) ?? 0;
        if (value > 0) solar += value;
      }
    });

    return solar;
  }
  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (this._data) {
      this.hidden = this._computeSolarPower() <= 0;
    }
  }

  protected render() {
    if (!this._config || !this._data || !this._i18n || this.hidden) {
      return nothing;
    }
    const power = this._computeSolarPower();

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
      this._i18n.localize(
        "ui.panel.lovelace.cards.energy.solar_production_title"
      );

    return html`
      <ha-badge .label=${name}>
        <ha-svg-icon slot="icon" .path=${mdiSolarPower}></ha-svg-icon>
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
    "hui-solar-production-badge": HuiSolarProductionBadge;
  }
}
