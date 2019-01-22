import "@polymer/paper-input/paper-textarea";

import deepClone from "deep-clone-simple";

import { createCardElement } from "../../common/create-card-element";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import { LovelaceCard } from "../../types";
import { ConfigError } from "../types";
import { getCardElementTag } from "../../common/get-card-element-tag";
import { createErrorCardConfig } from "../../cards/hui-error-card";
import { computeRTL } from "../../../../common/util/compute_rtl";

export class HuiCardPreview extends HTMLElement {
  private _hass?: HomeAssistant;
  private _element?: LovelaceCard;

  set hass(value: HomeAssistant) {
    this._hass = value;
    if (this._element) {
      this._element.hass = value;
    }
  }

  set error(error: ConfigError) {
    const configValue = createErrorCardConfig(
      `${error.type}: ${error.message}`,
      undefined
    );

    this._createCard(configValue);
  }

  set config(configValue: LovelaceCardConfig) {
    if (!configValue) {
      return;
    }

    if (this._hass && computeRTL(this._hass)) {
      this.style.direction = "rtl";
    }

    if (!this._element) {
      this._createCard(configValue);
      return;
    }

    const tag = getCardElementTag(configValue.type);

    if (tag.toUpperCase() === this._element.tagName) {
      try {
        this._element.setConfig(deepClone(configValue));
      } catch (err) {
        this._createCard(createErrorCardConfig(err.message, configValue));
      }
    } else {
      this._createCard(configValue);
    }
  }

  private _createCard(configValue: LovelaceCardConfig): void {
    if (this._element) {
      this.removeChild(this._element);
    }

    this._element = createCardElement(configValue);

    if (this._hass) this._element!.hass = this._hass;

    this.appendChild(this._element!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-preview": HuiCardPreview;
  }
}

customElements.define("hui-card-preview", HuiCardPreview);
