import yaml from "js-yaml";

import "@polymer/paper-input/paper-textarea";

import createCardElement from "../common/create-card-element";
import createErrorCardConfig from "../common/create-error-card-config";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";

export class HuiYAMLCardPreview extends HTMLElement {
  private _hass?: HomeAssistant;

  set hass(value: HomeAssistant) {
    this._hass = value;
    if (this.lastChild) {
      (this.lastChild as LovelaceCard).hass = value;
    }
  }

  set yaml(value: string) {
    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    if (value === "") {
      return;
    }

    let conf;
    try {
      conf = yaml.safeLoad(value);
    } catch (err) {
      conf = createErrorCardConfig(`Invalid YAML: ${err.message}`, undefined);
    }

    const element = createCardElement(conf);

    if (this._hass) {
      element.hass = this._hass;
    }

    this.appendChild(element);
  }

  // Set to type any for now. Need to add Config type
  set config(config: any) {
    if (!config) {
      return;
    }

    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    const element = createCardElement(config);

    if (this._hass) {
      element.hass = this._hass;
    }

    this.appendChild(element);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-yaml-card-preview": HuiYAMLCardPreview;
  }
}

customElements.define("hui-yaml-card-preview", HuiYAMLCardPreview);
