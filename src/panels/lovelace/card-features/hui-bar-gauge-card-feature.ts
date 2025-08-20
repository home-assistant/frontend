import { css, LitElement, nothing, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import type {
  LovelaceCardFeatureContext,
  BarGaugeCardFeatureConfig,
} from "./types";

export const supportsBarGaugeCardFeature = (
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

@customElement("hui-bar-gauge-card-feature")
class HuiBarGaugeCardFeature extends LitElement implements LovelaceCardFeature {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public context!: LovelaceCardFeatureContext;

  @state() private _config?: BarGaugeCardFeatureConfig;

  static getStubConfig(): BarGaugeCardFeatureConfig {
    return {
      type: "bar-gauge",
    };
  }

  public setConfig(config: BarGaugeCardFeatureConfig): void {
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
      !supportsBarGaugeCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }
    const stateObj = this.hass.states[this.context.entity_id];
    const value = stateObj.state;
    return html`<div style="width: ${value}%"></div>
      <div class="bar-gauge-background"></div>`;
  }

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: var(--feature-height);
      border-radius: var(--feature-border-radius);
      overflow: hidden;
    }
    :host > div {
      height: 100%;
      background-color: var(--feature-color);
      transition: width 180ms ease-in-out;
    }
    .bar-gauge-background {
      flex: 1;
      opacity: 0.2;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-bar-gauge-card-feature": HuiBarGaugeCardFeature;
  }
}
