import {
  checkConditionsMet,
  validateConditionalConfig,
} from "../../lovelace/common/validate-condition";
import { createStyledHuiElement } from "../cards/picture-elements/create-styled-hui-element";
import {
  LovelaceElement,
  LovelaceElementConfig,
  ConditionalElementConfig,
} from "./types";
import { HomeAssistant } from "../../../types";

class HuiConditionalElement extends HTMLElement implements LovelaceElement {
  public _hass?: HomeAssistant;
  private _config?: ConditionalElementConfig;
  private _elements: LovelaceElement[] = [];

  public setConfig(config: ConditionalElementConfig): void {
    if (
      !config.conditions ||
      !Array.isArray(config.conditions) ||
      !config.elements ||
      !Array.isArray(config.elements) ||
      !validateConditionalConfig(config.conditions)
    ) {
      throw new Error("Error in card configuration.");
    }

    if (this._elements.length > 0) {
      this._elements.map((el: LovelaceElement) => {
        if (el.parentElement) {
          el.parentElement.removeChild(el);
        }
      });

      this._elements = [];
    }

    this._config = config;

    this._config.elements.map((elementConfig: LovelaceElementConfig) => {
      this._elements.push(createStyledHuiElement(elementConfig));
    });

    this.updateElements();
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    this.updateElements();
  }

  private updateElements() {
    if (!this._hass || !this._config) {
      return;
    }

    const visible = checkConditionsMet(this._config.conditions, this._hass);

    this._elements.map((el: LovelaceElement) => {
      if (visible) {
        el.hass = this._hass;
        if (!el.parentElement) {
          this.appendChild(el);
        }
      } else if (el.parentElement) {
        el.parentElement.removeChild(el);
      }
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-element": HuiConditionalElement;
  }
}

customElements.define("hui-conditional-element", HuiConditionalElement);
