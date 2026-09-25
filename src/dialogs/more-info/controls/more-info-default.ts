import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-default")
class MoreInfoDefault extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    return nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-default": MoreInfoDefault;
  }
}
