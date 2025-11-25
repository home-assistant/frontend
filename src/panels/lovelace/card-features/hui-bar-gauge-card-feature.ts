import { css, LitElement, nothing, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { isNumericFromAttributes } from "../../../common/number/format_number";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
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
  return domain === "sensor" && isNumericFromAttributes(stateObj.attributes);
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

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-bar-gauge-card-feature-editor");
    return document.createElement("hui-bar-gauge-card-feature-editor");
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
    const min = this._config.min ?? 0;
    const max = this._config.max ?? 100;
    const value = parseFloat(stateObj.state);

    if (isNaN(value) || min >= max) {
      return nothing;
    }

    const percentage = Math.max(
      0,
      Math.min(100, ((value - min) / (max - min)) * 100)
    );

    return html`<div style="width: ${percentage}%"></div>
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
