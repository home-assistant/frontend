import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-number-buttons";
import "../../../components/ha-control-slider";
import "../../../components/ha-icon";
import { isUnavailableState } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  NumericInputCardFeatureConfig,
} from "./types";

export const supportsNumericInputCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "input_number" || domain === "number";
};

@customElement("hui-numeric-input-card-feature")
class HuiNumericInputCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public context!: LovelaceCardFeatureContext;

  @state() private _config?: NumericInputCardFeatureConfig;

  @state() _currentState?: string;

  static getStubConfig(): NumericInputCardFeatureConfig {
    return {
      type: "numeric-input",
      style: "buttons",
    };
  }

  private get _stateObj(): HassEntity | undefined {
    return this.hass.states[this.context.entity_id!] as HassEntity | undefined;
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
    if (changedProp.has("hass") && this._stateObj) {
      const oldHass = changedProp.get("hass") as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states[this.context.entity_id!];
      if (oldStateObj !== this._stateObj) {
        this._currentState = this._stateObj.state;
      }
    }
  }

  private async _setValue(ev: CustomEvent) {
    const stateObj = this._stateObj!;

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
      !this._stateObj ||
      !supportsNumericInputCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const stateObj = this._stateObj;

    const parsedState = Number(stateObj.state);
    const value = !isNaN(parsedState) ? parsedState : undefined;

    if (this._config.style === "buttons") {
      return html`
        <ha-control-number-buttons
          .value=${value}
          .min=${stateObj.attributes.min}
          .max=${stateObj.attributes.max}
          .step=${stateObj.attributes.step}
          @value-changed=${this._setValue}
          .disabled=${isUnavailableState(stateObj.state)}
          .unit=${stateObj.attributes.unit_of_measurement}
          .locale=${this.hass.locale}
        ></ha-control-number-buttons>
      `;
    }
    return html`
      <ha-control-slider
        .value=${value}
        .min=${stateObj.attributes.min}
        .max=${stateObj.attributes.max}
        .step=${stateObj.attributes.step}
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
