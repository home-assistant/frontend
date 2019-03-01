import {
  Condition,
  checkConditionsMet,
  validateConditionalConfig,
} from "../../lovelace/common/validate-condition";
import { createConfiguredHuiElement } from "../../lovelace/cards/picture-elements/create-configured-hui-element";

import { LovelaceElement, LovelaceElementConfig } from "./types";
import { HomeAssistant } from "../../../types";

interface Config extends LovelaceElementConfig {
  conditions: Condition[];
  elements: LovelaceElementConfig[];
}

class HuiConditionalElement extends HTMLElement implements LovelaceElement {
  public _hass?: HomeAssistant;
  private _config?: Config;
  private _elements: LovelaceElement[] = [];

  public setConfig(config: Config): void {
    if (
      !config.conditions ||
      !Array.isArray(config.conditions) ||
      !config.elements ||
      !Array.isArray(config.elements) ||
      !validateConditionalConfig(config.conditions)
    ) {
      throw new Error("Error in card configuration.");
    }

    if (this._elements && this._elements.length > 0) {
      this._elements.map((el: LovelaceElement) => {
        if (el.parentElement) {
          el.parentElement.removeChild(el);
        }
      });

      this._elements = [];
    }

    this._config = config;

    this._config.elements.map((elementConfig: LovelaceElementConfig) => {
      this._elements.push(createConfiguredHuiElement(elementConfig, undefined));
    });

    if (this._hass) {
      this.hass = this._hass;
    }
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    if (!this._config || !this.parentElement) {
      return;
    }

    const visible = checkConditionsMet(this._config.conditions, hass);

    this._elements.map((el: LovelaceElement) => {
      if (visible) {
        el.hass = hass;
        if (!el.parentElement) {
          this.parentElement!.appendChild(el);
        }
      } else if (el.parentElement) {
        this.parentElement!.removeChild(el);
      }
    });
  }

  public connectedCallback() {
    if (this._hass) {
      this.hass = this._hass;
    }
  }

  public disconnectedCallback() {
    this._elements.map((el: LovelaceElement) => {
      if (el.parentElement) {
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
