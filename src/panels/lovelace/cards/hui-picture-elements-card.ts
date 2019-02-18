import { html, LitElement, TemplateResult } from "lit-element";

import { createHuiElement } from "../common/create-hui-element";

import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { LovelaceElementConfig, LovelaceElement } from "../elements/types";

interface Config extends LovelaceCardConfig {
  title?: string;
  image?: string;
  camera_image?: string;
  state_image?: {};
  aspect_ratio?: string;
  entity?: string;
  elements: LovelaceElementConfig[];
}

class HuiPictureElementsCard extends LitElement implements LovelaceCard {
  private _config?: Config;
  private _hass?: HomeAssistant;

  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.shadowRoot!.querySelectorAll("#root > *").forEach((el, index) => {
      const element = el as LovelaceElement;
      element.hass = this._hass;
      // skip hui-image
      if (index > 0) {
        element.style.display = this._evalConditions(
          this._config!.elements[index - 1]
        )
          ? "block"
          : "none";
      }
    });
  }

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: Config): void {
    if (!config) {
      throw new Error("Invalid Configuration");
    } else if (
      !(config.image || config.camera_image || config.state_image) ||
      (config.state_image && !config.entity)
    ) {
      throw new Error("Invalid Configuration: image required");
    } else if (!Array.isArray(config.elements)) {
      throw new Error("Invalid Configuration: elements required");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._hass || !this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <ha-card .header="${this._config.title}">
        <div id="root">
          <hui-image
            .hass="${this._hass}"
            .image="${this._config.image}"
            .stateImage="${this._config.state_image}"
            .cameraImage="${this._config.camera_image}"
            .entity="${this._config.entity}"
            .aspectRatio="${this._config.aspect_ratio}"
          ></hui-image>
          ${this._config.elements.map(
            (elementConfig: LovelaceElementConfig) => {
              const el = this._createHuiElement(elementConfig);

              el.style.display = this._evalConditions(elementConfig)
                ? "block"
                : "none";

              return el;
            }
          )}
        </div>
      </ha-card>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        #root {
          position: relative;
          overflow: hidden;
        }
        .element {
          position: absolute;
          transform: translate(-50%, -50%);
        }
      </style>
    `;
  }

  private _evalConditions(elementConfig: LovelaceElementConfig): boolean {
    return elementConfig!.conditions.every((c) => {
      if (!(c.entity in this._hass!.states)) {
        return false;
      }
      if (c.state) {
        return this._hass!.states[c.entity].state === c.state;
      }
      return this._hass!.states[c.entity].state !== c.state_not;
    });
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

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-elements-card": HuiPictureElementsCard;
  }
}

customElements.define("hui-picture-elements-card", HuiPictureElementsCard);
