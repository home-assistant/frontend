import { createStyledHuiElement } from "../cards/picture-elements/create-styled-hui-element";

import { LovelaceElement, LovelaceElementConfig } from "./types";
import { HomeAssistant } from "../../../types";

interface Config extends LovelaceElementConfig {
  visible?: boolean;
  toggle_tap?: boolean;
  auto_scale?: boolean;
  elements: LovelaceElementConfig[];
}

class HuiGroupElement extends HTMLElement implements LovelaceElement {
  public _hass?: HomeAssistant;
  private _config?: Config;
  private _elements: LovelaceElement[] = [];
  private _visible: boolean = true;

  constructor() {
    super();

    this.addEventListener("click", (ev) => {
      if (ev.target !== this) {
        ev.stopPropagation();
        return;
      }
      this.toggleVisibility();
    });
  }

  public setConfig(config: Config): void {
    if (!config.elements || !Array.isArray(config.elements)) {
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

    this.style.transform = "none";
    if (config.visible !== undefined) {
      this._visible = config.visible;
    }

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

    if (this._elements.length === 0) {
      this._config!.elements.map((elementConfig: LovelaceElementConfig) => {
        const element = createStyledHuiElement(elementConfig);

        this._elements.push(element);
      });
    }

    this._elements.map((el: LovelaceElement) => {
      if (this._visible) {
        el.hass = this._hass;
        if (!el.parentElement) {
          this.appendChild(el);
        }
      } else if (el.parentElement) {
        el.parentElement.removeChild(el);
      }
    });
  }

  private toggleVisibility() {
    if (!this._config!.toggle_tap) {
      return;
    }

    this._visible = !this._visible;

    this.updateElements();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-group-element": HuiGroupElement;
  }
}

customElements.define("hui-group-element", HuiGroupElement);
