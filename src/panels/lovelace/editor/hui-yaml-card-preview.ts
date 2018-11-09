import "@polymer/paper-input/paper-textarea";

import createCardElement from "../common/create-card-element";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceConfig } from "../types";

export class HuiCardPreview extends HTMLElement {
  private _hass?: HomeAssistant;

  set hass(value: HomeAssistant) {
    this._hass = value;
    if (this.lastChild) {
      (this.lastChild as LovelaceCard).hass = value;
    }
  }

  set value(configValue: LovelaceConfig) {
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
