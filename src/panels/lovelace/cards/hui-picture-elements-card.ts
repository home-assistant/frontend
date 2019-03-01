import { html, LitElement, TemplateResult } from "lit-element";

import { createConfiguredHuiElement } from "../../lovelace/cards/picture-elements/create-configured-hui-element";

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
      _config: {},
    };
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    for (const el of this.shadowRoot!.querySelectorAll("#root > *")) {
      const element = el as LovelaceElement;
      element.hass = this._hass;
    }
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
    if (!this._config) {
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
          ${this._config.elements.map((elementConfig: LovelaceElementConfig) =>
            createConfiguredHuiElement(elementConfig, this._hass!)
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-elements-card": HuiPictureElementsCard;
  }
}

customElements.define("hui-picture-elements-card", HuiPictureElementsCard);
