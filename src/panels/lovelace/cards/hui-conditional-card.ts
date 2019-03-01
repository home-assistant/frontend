import { createCardElement } from "../common/create-card-element";
import { computeCardSize } from "../common/compute-card-size";
import {
  Condition,
  checkConditionsMet,
  validateConditionalConfig,
} from "../../lovelace/common/validate-condition";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";

interface Config extends LovelaceCardConfig {
  card: LovelaceCardConfig;
  conditions: Condition[];
}

class HuiConditionalCard extends HTMLElement implements LovelaceCard {
  private _hass?: HomeAssistant;
  private _config?: Config;
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
    if (this._hass) {
      this.hass = this._hass;
    }
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    if (!this._card) {
      return;
    }

    const visible =
      this._config && checkConditionsMet(this._config.conditions, hass);

    if (visible) {
      this._card.hass = hass;
      if (!this._card.parentElement) {
        this.appendChild(this._card);
      }
    } else if (this._card.parentElement) {
      this.removeChild(this._card);
    }
    // This will hide the complete card so it won't get styled by parent
    this.style.setProperty("display", visible ? "" : "none");
  }

  public getCardSize() {
    return computeCardSize(this._card!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-card": HuiConditionalCard;
  }
}

customElements.define("hui-conditional-card", HuiConditionalCard);
