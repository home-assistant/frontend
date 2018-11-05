import "@polymer/paper-input/paper-textarea";

import createCardElement from "../common/create-card-element";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceConfig } from "../types";

export class HuiYAMLCardPreview extends HTMLElement {
  private _hass?: HomeAssistant;
  private _config?: LovelaceConfig;

  set hass(value: HomeAssistant) {
    this._hass = value;
    if (this.lastChild) {
      (this.lastChild as LovelaceCard).hass = value;
    }
  }

  set config(config: LovelaceConfig) {
    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    if (!config) {
      return;
    }

    const element = createCardElement(config);

    if (this._hass) {
      element.hass = this._hass;
    }

    this.appendChild(element);
    this._config = config;
  }

  get config() {
    return this._config!;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-yaml-card-preview": HuiYAMLCardPreview;
  }
}

customElements.define("hui-yaml-card-preview", HuiYAMLCardPreview);
