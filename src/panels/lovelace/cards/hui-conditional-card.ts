import { createCardElement } from "../create-element/create-card-element";
import { computeCardSize } from "../common/compute-card-size";
import {
  checkConditionsMet,
  validateConditionalConfig,
} from "../../lovelace/common/validate-condition";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { ConditionalCardConfig } from "./types";

class HuiConditionalCard extends HTMLElement implements LovelaceCard {
  private _hass?: HomeAssistant;
  private _config?: ConditionalCardConfig;
  private _card?: LovelaceCard;

  public setConfig(config) {
    if (
      !config.card ||
      !config.conditions ||
      !Array.isArray(config.conditions) ||
      !validateConditionalConfig(config.conditions)
    ) {
      throw new Error("Error in card configuration.");
    }

    if (this._card && this._card.parentElement) {
      this.removeChild(this._card);
    }

    this._config = config;
    this._card = createCardElement(config.card);

    this.update();
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    this.update();
  }

  public getCardSize() {
    return computeCardSize(this._card!);
  }

  private update() {
    if (!this._card || !this._hass) {
      return;
    }

    const visible =
      this._config && checkConditionsMet(this._config.conditions, this._hass);

    if (visible) {
      this._card.hass = this._hass;
      if (!this._card.parentElement) {
        this.appendChild(this._card);
      }
    } else if (this._card.parentElement) {
      this.removeChild(this._card);
    }
    // This will hide the complete card so it won't get styled by parent
    this.style.setProperty("display", visible ? "" : "none");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-card": HuiConditionalCard;
  }
}

customElements.define("hui-conditional-card", HuiConditionalCard);
