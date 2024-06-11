import { HassEntity } from "home-assistant-js-websocket";
import { customElement, property } from "lit/decorators";
import { PropertyValues } from "lit";
import { HuiConditionalBase } from "../components/hui-conditional-base";
import { createCardFeatureElement } from "../create-element/create-card-feature-element";
import { LovelaceCardFeature } from "../types";
import {
  ConditionalCardFeatureConfig,
  LovelaceCardFeatureConfig,
} from "./types";

@customElement("hui-conditional-card-feature")
class HuiConditionalFeature
  extends HuiConditionalBase
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false }) public color?: string;

  public static getStubConfig(): ConditionalCardFeatureConfig {
    return {
      type: "conditional",
      conditions: [],
      feature: {
        type: "",
      } as any,
    };
  }

  protected willUpdate(changedProp: PropertyValues): void {
    if (changedProp.has("stateObj")) {
      (this._element! as LovelaceCardFeature).stateObj = this.stateObj;
    }
  }

  public setConfig(config: ConditionalCardFeatureConfig): void {
    this.validateConfig(config);

    if (!config.feature) {
      throw new Error("No feature configured");
    }

    this._element = this._createFeatureElement(config.feature);
  }

  private _createFeatureElement(featureConfig: LovelaceCardFeatureConfig) {
    const element = createCardFeatureElement(
      featureConfig
    ) as LovelaceCardFeature;
    if (this.hass) {
      element.hass = this.hass;
      element.stateObj = this.stateObj;
      element.color = this.color;
    }
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        this._rebuildFeature(featureConfig);
      },
      { once: true }
    );
    return element;
  }

  private _rebuildFeature(config: LovelaceCardFeatureConfig): void {
    this._element = this._createFeatureElement(config);
    if (this.lastChild) {
      this.replaceChild(this._element, this.lastChild);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-card-feature": HuiConditionalFeature;
  }
}
