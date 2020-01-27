import { TemplateResult, html } from "lit-html";
import { customElement, LitElement, property } from "lit-element";
import { HassEntity } from "home-assistant-js-websocket";

import "../components/entity/ha-state-label-badge";

import { HomeAssistant } from "../types";
import { fireEvent } from "../common/dom/fire_event";

@customElement("ha-badges-card")
class HaBadgesCard extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public states?: HassEntity[];

  protected render(): TemplateResult {
    if (!this.hass || !this.states) {
      return html``;
    }

    return html`
      ${this.states.map(
        (state) => html`
          <ha-state-label-badge
            .hass=${this.hass}
            .state=${state}
            @click=${this._handleClick}
          ></ha-state-label-badge>
        `
      )}
    `;
  }

  private _handleClick(ev: Event) {
    const entityId = ((ev.target as any).state as HassEntity).entity_id;
    fireEvent(this, "hass-more-info", {
      entityId,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-badges-card": HaBadgesCard;
  }
}
