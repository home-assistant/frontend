import { html, LitElement } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import createHuiElement from "../common/create-hui-element.js";

import { LovelaceCard, LovelaceConfig } from "../types";
import { HomeAssistant } from "../../../types.js";
import { LovelaceElementConfig, LovelaceElement } from "../elements/types.js";

interface Config extends LovelaceConfig {
  title?: string;
  image: string;
  elements: LovelaceElementConfig[];
}

class HuiPictureElementsCard extends LitElement implements LovelaceCard {
  protected _config?: Config;
  private _hass?: HomeAssistant;

  static get properties() {
    return {
      _config: {},
    };
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    for (const el of this.shadowRoot!.querySelectorAll("#root > *")) {
      const element = el as LovelaceElement;
      if (this._hass) {
        element.hass = this._hass;
      }
    }
  }

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: Config): void {
    if (!config) {
      throw new Error("Invalid Configuration");
    } else if (!config.image) {
      throw new Error("Invalid Configuration: image required");
    } else if (!Array.isArray(config.elements)) {
      throw new Error("Invalid Configuration: elements required");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <ha-card .header="${this._config.title}">
        <div id="root">
          <img src="${this._config.image}">
          ${this._config.elements.map((elementConfig: LovelaceElementConfig) =>
            this._createHuiElement(elementConfig)
          )}
        </div>
      </ha-card>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        ha-card {
          overflow: hidden;
        }
        #root {
          position: relative;
          overflow: hidden;
        }
        #root img {
          display: block;
          width: 100%;
        }
        .element {
          position: absolute;
          transform: translate(-50%, -50%);
        }
      </style>
    `;
  }

  private _createHuiElement(
    elementConfig: LovelaceElementConfig
  ): LovelaceElement {
    const element = createHuiElement(elementConfig) as LovelaceElement;
    element.hass = this._hass;
    element.classList.add("element");

    Object.keys(elementConfig.style).forEach((prop) => {
      element.style.setProperty(prop, elementConfig.style[prop]);
    });

    return element;
  }
}

customElements.define("hui-picture-elements-card", HuiPictureElementsCard);
