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

    this.updateElements();
  }

  public firstStyled() {
    if (!this._config) {
      return;
    }

    this._config!.elements.map((elementConfig: LovelaceElementConfig) => {
      const element = createStyledHuiElement(elementConfig);

      if (this._autoScale) {
        // adjust element dimensions according to parent
        if (this.style.width) {
          if (element.style.left) {
            element.style.left = this.calcFactoredStyleSize(
              element.style.left,
              this.style.width
            );
          }
          if (element.style.width) {
            element.style.width = this.calcFactoredStyleSize(
              element.style.width,
              this.style.width
            );
          }
        }
        if (this.style.height) {
          if (element.style.top) {
            element.style.top = this.calcFactoredStyleSize(
              element.style.top,
              this.style.height
            );
          }
          if (element.style.height) {
            element.style.height = this.calcFactoredStyleSize(
              element.style.height,
              this.style.height
            );
          }
        }
      }

      this._elements.push(element);
    });

    this.updateElements();
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    this.updateElements();
  }

  protected connectedCallback() {
    this.addEventListener("click", (ev) => {
      if (ev.target !== this) {
        ev.stopPropagation();
        return;
      }
      this.toggleVisibility();
    });
  }

  private updateElements() {
    if (!this._hass || !this._config) {
      return;
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

  private calcFactoredStyleSize(value: string, factor: string): string {
    return (
      (parseFloat(value) * 100.0) / parseFloat(factor) +
      value.replace(/[0-9]/g, "")
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-group-element": HuiGroupElement;
  }
}

customElements.define("hui-group-element", HuiGroupElement);
