import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "../../../types";
import type { HuiErrorCard } from "../cards/hui-error-card";
import { createCardFeatureElement } from "../create-element/create-card-feature-element";
import type { LovelaceCardFeature } from "../types";
import type { LovelaceCardFeatureConfig } from "./types";

@customElement("hui-card-feature")
export class HuiCardFeature extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: false }) public feature?: LovelaceCardFeatureConfig;

  @property({ attribute: false }) public color?: string;

  private _element?: LovelaceCardFeature | HuiErrorCard;

  private _getFeatureElement(feature: LovelaceCardFeatureConfig) {
    if (!this._element) {
      this._element = createCardFeatureElement(feature);
      return this._element;
    }

    return this._element;
  }

  protected render() {
    if (!this.feature) {
      return nothing;
    }

    const element = this._getFeatureElement(this.feature);

    if (this.hass) {
      element.hass = this.hass;
      (element as LovelaceCardFeature).stateObj = this.stateObj;
      (element as LovelaceCardFeature).color = this.color;
    }
    return html`${element}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-feature": HuiCardFeature;
  }
}
