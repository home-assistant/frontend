import { css, LitElement, nothing, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import type {
  LovelaceCardFeatureContext,
  SensorBarCardFeatureConfig,
} from "./types";
import { stateColorCss } from "../../../common/entity/state_color";

export const supportsSensorBarCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "sensor" && stateObj.attributes.unit_of_measurement === "%";
};

@customElement("hui-sensor-bar-card-feature")
class HuiSensorBarCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public context!: LovelaceCardFeatureContext;

  @state() private _config?: SensorBarCardFeatureConfig;

  static getStubConfig(): SensorBarCardFeatureConfig {
    return {
      type: "sensor-bar",
    };
  }

  public setConfig(config: SensorBarCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this.context.entity_id ||
      !this.hass.states[this.context.entity_id] ||
      !supportsSensorBarCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }
    const stateObj = this.hass.states[this.context.entity_id];
    const color = stateColorCss(stateObj);
    const value = stateObj.state;
    return html`<div
      class="sensor-bar-fill"
      style="width: ${value}%; background-color: ${color}"
    ></div>`;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: var(--feature-height);
      border-radius: 4px;
      overflow: hidden;
      background-color: var(--secondary-background-color);
    }
    .sensor-bar-fill {
      height: 100%;
      background-color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sensor-bar-card-feature": HuiSensorBarCardFeature;
  }
}
