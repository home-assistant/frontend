import { consume } from "@lit/context";
import { mdiPower, mdiWaterPercent } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { stateColorCss } from "../../../common/entity/state_color";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import { apiContext, formattersContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type {
  HumidifierEntity,
  HumidifierState,
} from "../../../data/humidifier";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantFormatters,
} from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  HumidifierToggleCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsHumidifierToggleCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "humidifier";
};

export const supportsHumidifierToggleCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsHumidifierToggleCardFeatureFromState(stateObj);
};

@customElement("hui-humidifier-toggle-card-feature")
class HuiHumidifierToggleCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: HumidifierEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state() private _config?: HumidifierToggleCardFeatureConfig;

  @state() _currentState?: HumidifierState;

  static getStubConfig(): HumidifierToggleCardFeatureConfig {
    return {
      type: "humidifier-toggle",
    };
  }

  public setConfig(config: HumidifierToggleCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("_stateObj") && this._stateObj) {
      this._currentState = this._stateObj.state as HumidifierState;
    }
  }

  private async _valueChanged(
    ev: HASSDomEvent<HASSDomEvents["value-changed"]>
  ) {
    const newState = ev.detail.value as HumidifierState;

    if (newState === this._stateObj!.state) return;

    const oldState = this._stateObj!.state as HumidifierState;
    this._currentState = newState;

    try {
      await this._setState(newState);
    } catch (_err) {
      this._currentState = oldState;
    }
  }

  private async _setState(newState: HumidifierState) {
    await this._api.callService(
      "humidifier",
      newState === "on" ? "turn_on" : "turn_off",
      {
        entity_id: this._stateObj!.entity_id,
      }
    );
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsHumidifierToggleCardFeatureFromState(this._stateObj)
    ) {
      return null;
    }

    const color = stateColorCss(this._stateObj);

    const options = ["off", "on"].map<ControlSelectOption>((entityState) => ({
      value: entityState,
      label: this._formatters.formatEntityState(this._stateObj!, entityState),
      path: entityState === "on" ? mdiWaterPercent : mdiPower,
    }));

    return html`
      <ha-control-select
        .options=${options}
        .value=${this._currentState}
        @value-changed=${this._valueChanged}
        hide-option-label
        .label=${this._localize("ui.card.humidifier.state")}
        style=${styleMap({
          "--control-select-color": color,
        })}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
      >
      </ha-control-select>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-humidifier-toggle-card-feature": HuiHumidifierToggleCardFeature;
  }
}
