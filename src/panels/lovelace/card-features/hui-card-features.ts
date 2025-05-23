import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import "./hui-card-feature";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

@customElement("hui-card-features")
export class HuiCardFeatures extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public context!: LovelaceCardFeatureContext;

  @property({ attribute: false }) public features?: LovelaceCardFeatureConfig[];

  @property({ attribute: false }) public color?: string;

  protected render() {
    if (!this.features) {
      return nothing;
    }
    return html`
      ${this.features.map(
        (feature) => html`
          <hui-card-feature
            .hass=${this.hass}
            .context=${this.context}
            .color=${this.color}
            .feature=${feature}
          ></hui-card-feature>
        `
      )}
    `;
  }

  static styles = css`
    :host {
      --feature-color: var(--state-icon-color);
      --feature-height: 42px;
      --feature-border-radius: 12px;
      --feature-button-spacing: 12px;
      position: relative;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      box-sizing: border-box;
      justify-content: space-evenly;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-features": HuiCardFeatures;
  }
}
