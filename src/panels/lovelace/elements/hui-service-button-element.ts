import { html, LitElement } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "../../../components/buttons/ha-call-service-button";

import { LovelaceElement, LovelaceElementConfig } from "./types";
import { HomeAssistant } from "../../../types";

export class HuiServiceButtonElement extends LitElement
  implements LovelaceElement {
  public hass?: HomeAssistant;
  private _config?: LovelaceElementConfig;
  private _domain?: string;
  private _service?: string;

  static get properties() {
    return { _config: {} };
  }

  public setConfig(config: LovelaceElementConfig): void {
    if (!config || !config.service) {
      throw Error("Invalid Configuration: 'service' required");
    }

    [this._domain, this._service] = config.service.split(".", 2);

    if (!this._domain) {
      throw Error("Invalid Configuration: 'service' does not have a domain");
    }

    if (!this._service) {
      throw Error(
        "Invalid Configuration: 'service' does not have a service name"
      );
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <ha-call-service-button
        .hass="${this.hass}"
        .domain="${this._domain}"
        .service="${this._service}"
        .serviceData="${this._config.service_data}"
        >${this._config.title}</ha-call-service-button
      >
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        ha-call-service-button {
          color: var(--primary-color);
          white-space: nowrap;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-service-button-element": HuiServiceButtonElement;
  }
}

customElements.define("hui-service-button-element", HuiServiceButtonElement);
