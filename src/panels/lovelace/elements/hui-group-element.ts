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
  private _autoScale: boolean = false;
  private _autoPosition: boolean = false;

  private _scaled: boolean = false;
  private _positioned: boolean = false;

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
    if (config.auto_scale !== undefined) {
      this._autoScale = config.auto_scale;
    }
    if (config.auto_position !== undefined) {
      this._autoPosition = config.auto_position;
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

    this.scaleAndPositionElements();

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

  private scaleAndPositionElements() {
    if (this._scaled || this._autoPosition) {
      return;
    }

    if (this._autoScale) {
      this._elements.map((element) => {
        // adjust element dimensions according to parent
        if (this.style.width) {
          if (element.style.left) {
            element.style.left = this.calcFactoredStyleSize(
              element.style.left,
              this.style.width
            );
            this._scaled = true;
          }
          if (element.style.width) {
            element.style.width = this.calcFactoredStyleSize(
              element.style.width,
              this.style.width
            );
            this._scaled = true;
          }
        }
        if (this.style.height) {
          if (element.style.top) {
            element.style.top = this.calcFactoredStyleSize(
              element.style.top,
              this.style.height
            );
            this._scaled = true;
          }
          if (element.style.height) {
            element.style.height = this.calcFactoredStyleSize(
              element.style.height,
              this.style.height
            );
            this._scaled = true;
          }
        }
      });
    }

    if (this._autoPosition) {
      let minLeft = Number.POSITIVE_INFINITY;
      let minTop = Number.POSITIVE_INFINITY;

      // this code is missing consideration of the transform to make it really work

      this._elements.map((element) => {
        if (element.style.left) {
          minLeft = Math.min(minLeft, parseFloat(element.style.left));
        }
        if (element.style.top) {
          minTop = Math.min(minLeft, parseFloat(element.style.top));
        }
      });

      if (!isNaN(minLeft) || !isNaN(minTop)) {
        this._elements.map((element) => {
          if (element.style.left) {
            element.style.left = this.styleSubtract(
              element.style.left,
              minLeft
            );
          }
          if (element.style.top) {
            element.style.top = this.styleSubtract(element.style.top, minTop);
          }
        });

        this._positioned = true;
      }
    }
  }

  private calcFactoredStyleSize(value: string, factor: string): string {
    return (
      (parseFloat(value) * 100.0) / parseFloat(factor) +
      value.replace(/[+-]?\d+(?:\.\d+)?/g, "")
    );
  }

  private styleSubtract(value: string, factor: number): string {
    return (
      parseFloat(value) - factor + value.replace(/[+-]?\d+(?:\.\d+)?/g, "")
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-group-element": HuiGroupElement;
  }
}

customElements.define("hui-group-element", HuiGroupElement);
