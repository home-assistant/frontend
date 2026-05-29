import { consume } from "@lit/context";
import type { ContextType } from "@lit/context";
import { mdiFire } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-badge";
import "../../../../components/ha-svg-icon";
import { formatNumber } from "../../../../common/number/format_number";
import {
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import type { EnergyData } from "../../../../data/energy";
import {
  computeTotalFlowRate,
  getEnergyDataCollection,
} from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type {
  HomeAssistant,
  HomeAssistantInternationalization,
} from "../../../../types";
import type { LovelaceBadge } from "../../types";
import type { GasTotalBadgeConfig } from "../types";

@customElement("hui-gas-total-badge")
export class HuiGasTotalBadge
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

  protected render() {
    if (!this._config || !this._data || !this._i18n) {
      return nothing;
    }

    const { value, unit } = computeTotalFlowRate(
      "gas",
      this._data.prefs,
      this._states,
      this._entities
    );
    const displayValue = `${formatNumber(value, this._i18n.locale, { maximumFractionDigits: 1 })} ${unit}`;

    const name =
      this._config.title ||
      this._i18n.localize("ui.panel.lovelace.cards.energy.gas_total_title");

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
