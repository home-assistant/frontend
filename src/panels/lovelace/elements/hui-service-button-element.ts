import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  internalProperty,
  TemplateResult,
} from "lit-element";
import "../../../components/buttons/ha-call-service-button";
import { HomeAssistant } from "../../../types";
import { LovelaceElement, ServiceButtonElementConfig } from "./types";

@customElement("hui-service-button-element")
export class HuiServiceButtonElement extends LitElement
  implements LovelaceElement {
  public hass?: HomeAssistant;

  @internalProperty() private _config?: ServiceButtonElementConfig;

  private _domain?: string;

  private _service?: string;

  public setConfig(config: ServiceButtonElementConfig): void {
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
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <ha-call-service-button
        .hass=${this.hass}
        .domain="${this._domain}"
        .service="${this._service}"
        .serviceData="${this._config.service_data}"
        >${this._config.title}</ha-call-service-button
      >
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-call-service-button {
        color: var(--primary-color);
        white-space: nowrap;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-service-button-element": HuiServiceButtonElement;
  }
}
