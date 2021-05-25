import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-attributes";
import { HomeAssistant } from "../../../types";

@customElement("more-info-default")
class MoreInfoDefault extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: HassEntity;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    return html`<ha-attributes
      .hass=${this.hass}
      .stateObj=${this.stateObj}
    ></ha-attributes>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-default": MoreInfoDefault;
  }
}
