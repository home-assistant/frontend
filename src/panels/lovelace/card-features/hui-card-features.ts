import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import "./hui-card-feature";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
  LovelaceCardFeaturePosition,
} from "./types";

@customElement("hui-card-features")
export class HuiCardFeatures extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public context!: LovelaceCardFeatureContext;

  @property({ attribute: false }) public features?: LovelaceCardFeatureConfig[];

  @property({ attribute: false }) public color?: string;

  @property({ attribute: false })
  public position?: LovelaceCardFeaturePosition;

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
            .position=${this.position}
          ></hui-card-feature>
        `
      )}
    `;
  }

  static styles = css`
    :host {
      --feature-color: var(--state-icon-color);
      --feature-height: 42px;
      --feature-border-radius: var(
        --ha-card-features-border-radius,
        var(--ha-border-radius-lg)
      );
      --feature-button-spacing: 12px;
      pointer-events: none;
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
