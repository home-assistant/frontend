import type { HassEntity } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "../../../types";
import type { HuiErrorCard } from "../cards/hui-error-card";
import { createTileFeatureElement } from "../create-element/create-tile-feature-element";
import type { LovelaceTileFeature } from "../types";
import type { LovelaceTileFeatureConfig } from "./types";

@customElement("hui-tile-features")
export class HuiTileFeatures extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: false }) public features?: LovelaceTileFeatureConfig[];

  @property({ attribute: false }) public color?: string;

  private _featuresElements = new WeakMap<
    LovelaceTileFeatureConfig,
    LovelaceTileFeature | HuiErrorCard
  >();

  private _getFeatureElement(feature: LovelaceTileFeatureConfig) {
    if (!this._featuresElements.has(feature)) {
      const element = createTileFeatureElement(feature);
      this._featuresElements.set(feature, element);
      return element;
    }

    return this._featuresElements.get(feature)!;
  }

  private renderFeature(
    featureConf: LovelaceTileFeatureConfig,
    stateObj: HassEntity
  ): TemplateResult {
    const element = this._getFeatureElement(featureConf);

    if (this.hass) {
      element.hass = this.hass;
      (element as LovelaceTileFeature).stateObj = stateObj;
      (element as LovelaceTileFeature).color = this.color;
    }

    return html`${element}`;
  }

  protected render() {
    if (!this.features) {
      return nothing;
    }
    return html`
      ${this.features.map((featureConf) =>
        this.renderFeature(featureConf, this.stateObj)
      )}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        flex-direction: column;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-features": HuiTileFeatures;
  }
}
