import { createCardElement } from "../common/create-card-element";
import { computeCardSize } from "../common/compute-card-size";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { LovelaceCardConfig, Condition } from "../../../data/lovelace";
import { LovelaceElement, LovelaceElementConfig } from "../elements/types";

export interface ConditionalConfig {
  conditions: Condition[];
  card: LovelaceCardConfig;
  elements: LovelaceElementConfig[];
  // todo: add row (can't find any createhuirow or LovelaceRowConfig...)
  // rows: Lovelace;
}

export class HuiConditional extends HTMLElement {
  private _hass?: HomeAssistant;
  private _conditionalConfig?: ConditionalConfig;

  private _card?: LovelaceCard;
  private _elements: LovelaceElement[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

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
    if (this._hass) {
      this.hass = this._hass;
    }

    // set style (overridable)
    // LitElement can't work since styles are static and we want to allow deriving classes to modify it
    const styleElement: HTMLStyleElement = document.createElement("style");
    styleElement.innerHTML = this.getCustomStyle();
    this.shadowRoot!.appendChild(styleElement);

    this.removeItems();

    this.createItems();
  }

  public getCardSize() {
    return computeCardSize(this._card!);
  }

  protected getCustomStyle(): string {
    return "";
  }

  protected _createHuiElement(
    elementConfig: LovelaceElementConfig
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
    //todo: add rows, etc'....
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
      if (!this._card!.parentElement) {
        this.shadowRoot!.appendChild(this._card);
      }
    } else if (this._elements.length > 0) {
      this._elements.map((el: LovelaceElement) => {
        if (!el.parentElement) {
          el.hass = this._hass;
          this.shadowRoot!.appendChild(el);
        }
      });
    }
  }

  private removeItems() {
    if (this._card && this._card.parentElement) {
      this.shadowRoot!.removeChild(this._card);
    } else if (this._elements.length > 0) {
      this._elements.map((el: LovelaceElement) => {
        if (el.parentElement) {
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
