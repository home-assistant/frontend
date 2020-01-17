import "@polymer/paper-input/paper-textarea";

import deepClone from "deep-clone-simple";

import { createCardElement } from "../../create-element/create-card-element";
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

  set hass(hass: HomeAssistant) {
    if (!this._hass || this._hass.language !== hass.language) {
      this.style.direction = computeRTL(hass) ? "rtl" : "ltr";
    }

    this._hass = hass;
    if (this._element) {
      this._element.hass = hass;
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
      this._cleanup();
      return;
    }

    if (!configValue.type) {
      this._createCard(
        createErrorCardConfig("No card type found", configValue)
      );
      return;
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
    this._cleanup();
    this._element = createCardElement(configValue);

    if (this._hass) {
      this._element!.hass = this._hass;
    }

    this.appendChild(this._element!);
  }

  private _cleanup() {
    if (!this._element) {
      return;
    }
    this.removeChild(this._element);
    this._element = undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-preview": HuiCardPreview;
  }
}

customElements.define("hui-card-preview", HuiCardPreview);
