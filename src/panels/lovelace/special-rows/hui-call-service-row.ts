import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import "@material/mwc-button";

import "../../../components/ha-icon";
import "./hui-button-row";

import {
  LovelaceRow,
  CallServiceRowConfig,
  ButtonRowConfig,
} from "../entity-rows/types";
import { HomeAssistant } from "../../../types";
import { createRowElement } from "../create-element/create-row-element";

@customElement("hui-call-service-row")
export class HuiCallServiceRow extends LitElement implements LovelaceRow {
  public hass?: HomeAssistant;
  @property() private _config?: CallServiceRowConfig;

  public setConfig(config: CallServiceRowConfig): void {
    if (!config) {
      throw new Error("Error in card configuration.");
    }

    if (!config.name) {
      throw new Error("Error in card configuration. No name specified.");
    }

    if (!config.service) {
      throw new Error("Error in card configuration. No service specified.");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const config: ButtonRowConfig = {
      tap_action: {
        action: "call-service",
        service: this._config.service,
        service_data: this._config.service_data,
      },
      ...this._config,
      type: "button",
    };

    const element = createRowElement(config);

    element.hass = this.hass;

    return html`
      ${element}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-call-service-row": HuiCallServiceRow;
  }
}
