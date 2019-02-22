import { LitElement } from "lit-element";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { LovelaceCardConfig, Condition } from "../../../data/lovelace";
import { LovelaceElement, LovelaceElementConfig } from "../elements/types";
import { EntityRowConfig } from "../entity-rows/types";
import { createCardElement } from "../common/create-card-element";
// import { createRowElement } from "../common/create-row-element";

export interface ConditionalConfig {
  conditions: Condition[];
  card: LovelaceCardConfig;
  elements: LovelaceElementConfig[];
  rows: EntityRowConfig[];
  // todo: add row (can't find any createhuirow or LovelaceRowConfig...)
  // rows: Lovelace;
  // use it with createRowElement
}

export class HuiConditional extends LitElement {
  protected _card?: LovelaceCard;

  private _hass?: HomeAssistant;
  private _conditionalConfig?: ConditionalConfig;
  private _elements: LovelaceElement[] = [];

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    if (this.hasNoItems()) {
      return;
    }

    const visible = this.handleItems();

    // This will hide the complete component so it won't get styled by parent in case there's nothing in it
    this.style.setProperty("display", visible ? "" : "none");
  }

  public setConditionalConfig(config) {
    if (
      !config.conditions ||
      !Array.isArray(config.conditions) ||
      !config.conditions.every((c) => c.entity && (c.state || c.state_not)) ||
      (!config.card && (!config.elements || !Array.isArray(config.elements)))
    ) {
      throw new Error("Error in conditional configuration.");
    }

    this._conditionalConfig = config;

    // set style (overridable)
    // LitElement static styles can't work since we want to allow deriving classes to modify it
    const styleElement: HTMLStyleElement = document.createElement("style");
    styleElement.innerHTML = this.getCustomStyle();
    this.shadowRoot!.appendChild(styleElement);

    this.removeItems();

    this.createItems();

    if (this._hass) {
      this.hass = this._hass;
    }
  }

  protected getCustomStyle(): string {
    return "";
  }

  protected _createHuiElement(
    _elementConfig: LovelaceElementConfig
  ): LovelaceElement {
    return (null as unknown) as LovelaceElement;
  }

  private createItems() {
    if (this._conditionalConfig!.card) {
      this._card = createCardElement(this._conditionalConfig!.card);
    } else if (
      this._conditionalConfig!.elements &&
      this._conditionalConfig!.elements.length > 0
    ) {
      this._conditionalConfig!.elements.map(
        (elementConfig: LovelaceElementConfig) => {
          this._elements.push(this._createHuiElement(elementConfig));
        }
      );
    }
    // todo: add rows, etc'....
  }

  private handleItems(): boolean {
    const conditionsMet =
      this._conditionalConfig &&
      this._conditionalConfig.conditions.every((c) => {
        if (!(c.entity in this._hass!.states)) {
          return false;
        }
        if (c.state) {
          return this._hass!.states[c.entity].state === c.state;
        }
        return this._hass!.states[c.entity].state !== c.state_not;
      });

    if (conditionsMet) {
      this.appendItems();
    } else {
      this.removeItems();
    }

    return conditionsMet as boolean;
  }

  private appendItems() {
    if (this._card) {
      this._card.hass = this._hass;
      if (!this._card!.parentNode) {
        this.shadowRoot!.appendChild(this._card);
      }
    } else if (this._elements.length > 0) {
      this._elements.map((el: LovelaceElement) => {
        el.hass = this._hass;
        if (!el.parentNode) {
          this.shadowRoot!.appendChild(el);
        }
      });
    }
  }

  private removeItems() {
    if (this._card && this._card.parentNode) {
      this.shadowRoot!.removeChild(this._card);
    } else if (this._elements.length > 0) {
      this._elements.map((el: LovelaceElement) => {
        if (el.parentNode) {
          this.shadowRoot!.removeChild(el);
        }
      });
    }
  }

  private hasNoItems() {
    return !this._card && (!this._elements || this._elements.length === 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional": HuiConditional;
  }
}

customElements.define("hui-conditional", HuiConditional);
