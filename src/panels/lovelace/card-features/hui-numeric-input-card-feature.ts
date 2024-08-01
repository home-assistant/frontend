import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-number-buttons";
import "../../../components/ha-control-slider";
import "../../../components/ha-icon";
import { isUnavailableState } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import { NumericInputCardFeatureConfig } from "./types";

export const supportsNumericInputCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "input_number" || domain === "number";
};

@customElement("hui-numeric-input-card-feature")
class HuiNumericInputCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: NumericInputCardFeatureConfig;

  @state() _currentState?: string;

  static getStubConfig(): NumericInputCardFeatureConfig {
    return {
      type: "numeric-input",
      style: "buttons",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import(
      "../editor/config-elements/hui-numeric-input-card-feature-editor"
    );
    return document.createElement("hui-numeric-input-card-feature-editor");
  }

  public setConfig(config: NumericInputCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentState = this.stateObj.state;
    }
  }

  private async _setValue(ev: CustomEvent) {
    const stateObj = this.stateObj!;

    const domain = computeDomain(stateObj.entity_id);

    await this.hass!.callService(domain, "set_value", {
      entity_id: stateObj.entity_id,
      value: ev.detail.value,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsNumericInputCardFeature(this.stateObj)
    ) {
      return nothing;
    }

    const stateObj = this.stateObj;

    if (this._config.style === "buttons") {
      return html`
        <ha-control-number-buttons
          value=${stateObj.state}
          min=${stateObj.attributes.min}
          max=${stateObj.attributes.max}
          step=${stateObj.attributes.step}
          @value-changed=${this._setValue}
          .disabled=${isUnavailableState(stateObj.state)}
          .unit=${stateObj.attributes.unit_of_measurement}
          .locale=${this.hass.locale}
        ></ha-control-number-buttons>
      `;
    }
    return html`
      <ha-control-slider
        value=${stateObj.state}
        min=${stateObj.attributes.min}
        max=${stateObj.attributes.max}
        step=${stateObj.attributes.step}
        @value-changed=${this._setValue}
        .disabled=${isUnavailableState(stateObj.state)}
        .unit=${stateObj.attributes.unit_of_measurement}
        .locale=${this.hass.locale}
      ></ha-control-slider>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-numeric-input-card-feature": HuiNumericInputCardFeature;
  }
}
