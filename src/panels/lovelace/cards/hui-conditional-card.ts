import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

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

class HuiConditionalCard extends LitElement implements LovelaceCard {
  private _card?: LovelaceCard;
  private _hass?: HomeAssistant;
  private _config?: Config;

  static get properties(): PropertyDeclarations {
    return {
      _config: {},
    };
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    const visible =
      this._config &&
      this._config.conditions.every((c) => {
        if (!(c.entity in hass.states)) {
          return false;
        }
        if (c.state) {
          return hass.states[c.entity].state === c.state;
        }
        return hass.states[c.entity].state !== c.state_not;
      });

    if (this._card) {
      this._card.hass = this._hass;
    }

    this.style.setProperty("display", visible ? "" : "none");
  }

  public getCardSize(): number {
    return computeCardSize(this._card);
  }

  public setConfig(config: Config): void {
    if (
      !config.card ||
      !config.conditions ||
      !Array.isArray(config.conditions) ||
      !config.conditions.every(
        (condition) =>
          !!condition.entity && (!!condition.state || !!condition.state_not)
      )
    ) {
      throw new Error("Error in card configuration.");
    }

    this._card = createCardElement(config.card);
    this._config = config;
  }

  protected render(): TemplateResult {
    return html`
      ${this._card}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-card": HuiConditionalCard;
  }
}

customElements.define("hui-conditional-card", HuiConditionalCard);
