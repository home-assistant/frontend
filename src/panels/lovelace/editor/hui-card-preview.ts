import "@polymer/paper-input/paper-textarea";

import createCardElement from "../common/create-card-element";
import createErrorCardConfig from "../common/create-error-card-config";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceConfig } from "../types";
import { ConfigError } from "./types";

export class HuiCardPreview extends HTMLElement {
  private _hass?: HomeAssistant;

  set hass(value: HomeAssistant) {
    this._hass = value;
    if (this.lastChild) {
      (this.lastChild as LovelaceCard).hass = value;
    }
  }

  set error(error: ConfigError) {
    const configValue = createErrorCardConfig(
      `${error.type}: ${error.message}`,
      undefined
    );

    this._createCard(configValue);
  }

  set config(configValue: LovelaceConfig) {
    this._createCard(configValue);
  }

  private _createCard(configValue: LovelaceConfig): void {
    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    if (!configValue) {
      return;
    }

    const element = createCardElement(configValue);

    if (this._hass) {
      element.hass = this._hass;
    }

    this.appendChild(element);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-preview": HuiCardPreview;
  }
}

customElements.define("hui-card-preview", HuiCardPreview);
