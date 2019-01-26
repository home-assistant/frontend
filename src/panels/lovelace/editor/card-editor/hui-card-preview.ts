import {
  LitElement,
  PropertyDeclarations,
  TemplateResult,
  html,
} from "lit-element";

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

export class HuiCardPreview extends LitElement {
  private _hass?: HomeAssistant;
  private _element?: LovelaceCard;

  static get properties(): PropertyDeclarations {
    return {
      _hass: {},
      _element: {},
    };
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (
      this._hass &&
      computeRTL(this._hass) &&
      (!this.style.direction || this.style.direction == "ltr")
    ) {
      this.style.direction = "rtl";
    }
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._element) {
      this._element.hass = this._hass;
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

  protected render(): TemplateResult | void {
    if (!this._element) {
      return html``;
    }

    return html`
      ${this._element}
    `;
  }

  private _createCard(configValue: LovelaceCardConfig): void {
    this._element = createCardElement(configValue);

    if (this._hass) {
      this._element!.hass = this._hass;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-preview": HuiCardPreview;
  }
}

customElements.define("hui-card-preview", HuiCardPreview);
