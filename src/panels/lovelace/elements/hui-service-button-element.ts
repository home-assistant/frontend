import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../components/buttons/ha-call-service-button";
import { HomeAssistant } from "../../../types";
import { LovelaceElement, ServiceButtonElementConfig } from "./types";

@customElement("hui-service-button-element")
export class HuiServiceButtonElement
  extends LitElement
  implements LovelaceElement
{
  public hass?: HomeAssistant;

  @state() private _config?: ServiceButtonElementConfig;

  private _domain?: string;

  private _service?: string;

  public setConfig(config: ServiceButtonElementConfig): void {
    if (!config || !config.service) {
      throw Error("Service required");
    }

    [this._domain, this._service] = config.service.split(".", 2);

    if (!this._domain) {
      throw Error("Service does not have a service domain");
    }

    if (!this._service) {
      throw Error("Service does not have a service name");
    }

    this._config = config;
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    return html`
      <ha-call-service-button
        .hass=${this.hass}
        .domain=${this._domain}
        .service=${this._service}
        .serviceData=${this._config.service_data}
        >${this._config.title}</ha-call-service-button
      >
    `;
  }

  static get styles(): CSSResultGroup {
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
