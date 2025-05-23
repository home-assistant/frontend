import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import "../../../components/ha-control-slider";
import { UNAVAILABLE } from "../../../data/entity";
import { lightSupportsBrightness, type LightEntity } from "../../../data/light";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LightBrightnessCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsLightBrightnessCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "light" && lightSupportsBrightness(stateObj);
};

@customElement("hui-light-brightness-card-feature")
class HuiLightBrightnessCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: LightBrightnessCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id] as LightEntity | undefined;
  }

  static getStubConfig(): LightBrightnessCardFeatureConfig {
    return {
      type: "light-brightness",
    };
  }

  public setConfig(config: LightBrightnessCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsLightBrightnessCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const position =
      this._stateObj.attributes.brightness != null
        ? Math.max(
            Math.round((this._stateObj.attributes.brightness * 100) / 255),
            1
          )
        : undefined;

    return html`
      <ha-control-slider
        .value=${position}
        min="1"
        max="100"
        .showHandle=${stateActive(this._stateObj)}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
        @value-changed=${this._valueChanged}
        .label=${this.hass.localize("ui.card.light.brightness")}
        unit="%"
        .locale=${this.hass.locale}
      ></ha-control-slider>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;

    this.hass!.callService("light", "turn_on", {
      entity_id: this._stateObj!.entity_id,
      brightness_pct: value,
    });
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-brightness-card-feature": HuiLightBrightnessCardFeature;
  }
}
