import { PolymerElement } from "@polymer/polymer/polymer-element";

import {
  Condition,
  createConfiguredHuiElement,
  checkConditionsMet,
  validateConditionalConfig,
} from "../../lovelace/common/validate-condition";

import { LovelaceElement, LovelaceElementConfig } from "./types";
import { HomeAssistant } from "../../../types";

interface Config extends LovelaceElementConfig {
  conditions: Condition[];
  elements: LovelaceElementConfig[];
}

class HuiConditionalElement extends PolymerElement implements LovelaceElement {
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

    this._config = config;

    this._config.elements.map((elementConfig: LovelaceElementConfig) => {
      this._elements.push(
        createConfiguredHuiElement(elementConfig, this._hass!)
      );
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

  public ready() {
    super.ready();

    if (this._hass) {
      this.hass = this._hass;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-element": HuiConditionalElement;
  }
}

customElements.define("hui-conditional-element", HuiConditionalElement);
