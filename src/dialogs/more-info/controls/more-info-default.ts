import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
} from "lit-element";
import { HassEntity } from "home-assistant-js-websocket";

import { HomeAssistant } from "../../../types";

import "../../../components/ha-attributes";

@customElement("more-info-default")
class MoreInfoDefault extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public stateObj?: HassEntity;

  protected render(): TemplateResult | void {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <ha-attributes .stateObj=${this.stateObj}></ha-attributes>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-default": MoreInfoDefault;
  }
}
