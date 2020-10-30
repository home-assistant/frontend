import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { HomeAssistant } from "../types";

@customElement("ha-service-description")
class HaServiceDescription extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public domain!: string;

  @property() public service!: string;

  protected render(): TemplateResult {
    return html` ${this._getDescription()} `;
  }

  private _getDescription(): string {
    const domainServices = this.hass.services[this.domain];
    if (!domainServices) return "";
    const serviceObject = domainServices[this.service];
    if (!serviceObject) return "";
    return serviceObject.description;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-service-description": HaServiceDescription;
  }
}
