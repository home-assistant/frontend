import { html, LitElement } from "@polymer/lit-element";

import "../components/hui-image";

import { computeTooltip } from "../common/compute-tooltip";
import { handleClick } from "../common/handle-click";
import { longPress } from "../common/directives/long-press-directive";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceElement, LovelaceElementConfig } from "./types";
import { HomeAssistant } from "../../../types";
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
        .stateImage="${this._config.state_image}"
        .cameraImage="${this._config.camera_image}"
        .filter="${this._config.filter}"
        .stateFilter="${this._config.state_filter}"
        .title="${computeTooltip(this.hass!, this._config)}"
        .aspectRatio="${this._config.aspect_ratio}"
        @ha-click="${this._handleClick}"
        @ha-hold="${this._handleHold}"
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

  private _handleClick() {
    handleClick(this, this.hass!, this._config!, false);
  }

  private _handleHold() {
    handleClick(this, this.hass!, this._config!, true);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-image-element": HuiImageElement;
  }
}

customElements.define("hui-image-element", HuiImageElement);
