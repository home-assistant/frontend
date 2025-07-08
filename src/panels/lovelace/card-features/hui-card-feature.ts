import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import type { HuiErrorCard } from "../cards/hui-error-card";
import { createCardFeatureElement } from "../create-element/create-card-feature-element";
import type { LovelaceCardFeature } from "../types";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
  LovelaceCardFeaturePosition,
} from "./types";

@customElement("hui-card-feature")
export class HuiCardFeature extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public context!: LovelaceCardFeatureContext;

  @property({ attribute: false }) public feature?: LovelaceCardFeatureConfig;

  @property({ attribute: false }) public color?: string;

  @property({ attribute: false })
  public position?: LovelaceCardFeaturePosition;

  private _element?: LovelaceCardFeature | HuiErrorCard;

  private _getFeatureElement(feature: LovelaceCardFeatureConfig) {
    if (!this._element) {
      this._element = createCardFeatureElement(feature);
    }
    return this._element;
  }

  protected render() {
    if (!this.feature) {
      return nothing;
    }

    const element = this._getFeatureElement(
      this.feature
    ) as LovelaceCardFeature;

    if (this.hass) {
      element.hass = this.hass;
      element.context = this.context;
      element.color = this.color;
      element.position = this.position;
      // Backwards compatibility from custom card features
      if (this.context.entity_id) {
        const stateObj = this.hass.states[this.context.entity_id];
        if (stateObj) {
          element.stateObj = stateObj;
        }
      }
    }
    return html`${element}`;
  }

  static styles = css`
    :host > * {
      pointer-events: auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-feature": HuiCardFeature;
  }
}
