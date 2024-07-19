import type { HassEntity } from "home-assistant-js-websocket";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "../../../types";
import "./hui-card-feature";
import type { LovelaceCardFeatureConfig } from "./types";

@customElement("hui-card-features")
export class HuiCardFeatures extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: false }) public features?: LovelaceCardFeatureConfig[];

  @property({ attribute: false }) public color?: string;

  protected render() {
    if (!this.features) {
      return nothing;
    }
    return html`
      <div class="container">
        ${this.features.map(
          (feature) => html`
            <hui-card-feature
              .hass=${this.hass}
              .stateObj=${this.stateObj}
              .color=${this.color}
              .feature=${feature}
            ></hui-card-feature>
          `
        )}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --feature-color: var(--state-icon-color);
        --feature-padding: 12px;
        --feature-height: 42px;
        --feature-border-radius: 12px;
        --feature-button-spacing: 12px;
        position: relative;
        width: 100%;
      }
      .container {
        position: relative;
        display: flex;
        flex-direction: column;
        padding: var(--feature-padding);
        padding-top: 0px;
        gap: var(--feature-padding);
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        justify-content: space-evenly;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-features": HuiCardFeatures;
  }
}
