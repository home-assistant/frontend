import computeCardSize from "../common/compute-card-size.js";
import createCardElement from "../common/create-card-element.js";
import { HomeAssistant } from "../../../types.js";
import { LovelaceCard, LovelaceConfig } from "../types.js";

interface Condition {
  entity: string;
  state?: string;
  state_not?: string;
}

interface Config extends LovelaceConfig {
  card: LovelaceConfig;
  conditions: Condition[];
}

class HuiConditionalCard extends HTMLElement implements LovelaceCard {
  protected config?: Config;
  protected card?: LovelaceCard;

  public setConfig(config) {
    if(
      !config.card ||
      !config.conditions ||
      !Array.isArray(config.conditions) ||
      !config.conditions.every((c) => c.entity && (c.state || c.state_not))
    ) {
      throw new Error("Error in card configuration.");
    }

    this.config = config;
    this.card = createCardElement(config.card);
    if (this.card) {
      this.appendChild(this.card);
      this.card.hass = this.hass;
    }
  }

  set hass(hass: HomeAssistant) {
    const visible = this.config &&
      this.config.conditions.every((c) => {
      if (!(c.entity in hass.states)) { return false; }
      if (c.state) { return hass.states[c.entity].state === c.state; }
      return hass.states[c.entity].state !== c.state_not;
    });

    if (visible && this.card) { this.card.hass = hass; }

    this.style.setProperty("display", visible? "" : "none");
  }

  public getCardSize() {
    return computeCardSize(this.card);
  }

}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-card": HuiConditionalCard;
  }
}

customElements.define("hui-conditional-card", HuiConditionalCard);
