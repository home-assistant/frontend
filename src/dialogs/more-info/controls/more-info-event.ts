import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-attributes";
import "../../../components/ha-yaml-editor";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-event")
class MoreInfoEvent extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    return html`<p>
        ${this.hass.localize("ui.components.attributes.expansion_header")}
      </p>

      <ha-yaml-editor
        .hass=${this.hass}
        .value=${this.stateObj.attributes}
        auto-update
        read-only
      ></ha-yaml-editor>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-event": MoreInfoEvent;
  }
}
