import { html, LitElement } from "@polymer/lit-element";

import "../components/hui-image.js";

import { computeTooltip } from "../../../common/string/compute-tooltip";
import { handleClick } from "../../../common/dom/handle-click";
import { longPress } from "../common/directives/long-press-directive";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceElement, LovelaceElementConfig } from "./types.js";
import { HomeAssistant } from "../../../types.js";
import { TemplateResult } from "lit-html";

interface Config extends LovelaceElementConfig {
  image?: string;
  state_image?: string;
  camera_image?: string;
  filter?: string;
  state_filter?: string;
  aspect_ratio?: string;
}

export class HuiImageElement extends hassLocalizeLitMixin(LitElement)
  implements LovelaceElement {
  public hass?: HomeAssistant;
  private _config?: Config;

  static get properties() {
    return { hass: {}, _config: {} };
  }

  public setConfig(config: Config): void {
    if (!config) {
      throw Error("Error in element configuration");
    }

    this.classList.toggle("clickable", config.tap_action !== "none");
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <hui-image
        .hass="${this.hass}"
        .entity="${this._config.entity}"
        .image="${this._config.image}"
        .state-image="${this._config.state_image}"
        .camera-image="${this._config.camera_image}"
        .filter="${this._config.filter}"
        .state-filter="${this._config.state_filter}"
        .title="${computeTooltip(this.hass!, this._config)}"
        .aspect-ratio="${this._config.aspect_ratio}"
        @ha-click="${() => handleClick(this, this.hass!, this._config!, false)}"
        @ha-hold="${() => handleClick(this, this.hass!, this._config!, true)}"
        .longPress="${longPress()}"
      ></hui-image>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        :host(.clickable) {
          cursor: pointer;
          overflow: hidden;
          -webkit-touch-callout: none !important;
        }
        hui-image {
          -webkit-user-select: none !important;
        }
      </style>
    `;
  }
}
customElements.define("hui-image-element", HuiImageElement);
