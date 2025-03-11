import { mdiPower, mdiWaterPercent } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import { UNAVAILABLE } from "../../../data/entity";
import type {
  HumidifierEntity,
  HumidifierState,
} from "../../../data/humidifier";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type { HumidifierToggleCardFeatureConfig } from "./types";

export const supportsHumidifierToggleCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "humidifier";
};

@customElement("hui-humidifier-toggle-card-feature")
class HuiHumidifierToggleCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HumidifierEntity;

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
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentState = this.stateObj.state as HumidifierState;
    }
  }

  private async _valueChanged(ev: CustomEvent) {
    const newState = (ev.detail as any).value as HumidifierState;

    if (newState === this.stateObj!.state) return;

    const oldState = this.stateObj!.state as HumidifierState;
    this._currentState = newState;

    try {
      await this._setState(newState);
    } catch (_err) {
      this._currentState = oldState;
    }
  }

  private async _setState(newState: HumidifierState) {
    await this.hass!.callService(
      "humidifier",
      newState === "on" ? "turn_on" : "turn_off",
      {
        entity_id: this.stateObj!.entity_id,
      }
    );
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsHumidifierToggleCardFeature(this.stateObj)
    ) {
      return null;
    }

    const color = stateColorCss(this.stateObj);

    const options = ["off", "on"].map<ControlSelectOption>((entityState) => ({
      value: entityState,
      label: this.hass!.formatEntityState(this.stateObj!, entityState),
      path: entityState === "on" ? mdiWaterPercent : mdiPower,
    }));

    return html`
      <ha-control-select
        .options=${options}
        .value=${this._currentState}
        @value-changed=${this._valueChanged}
        hide-label
        .ariaLabel=${this.hass.localize("ui.card.humidifier.state")}
        style=${styleMap({
          "--control-select-color": color,
        })}
        .disabled=${this.stateObj!.state === UNAVAILABLE}
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
