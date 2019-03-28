import {
  LitElement,
  property,
  customElement,
  PropertyValues,
  TemplateResult,
  html,
} from "lit-element";

import "./hui-configurator-notification-item";
import "./hui-persistent-notification-item";

import { HassEntity } from "home-assistant-js-websocket";
import { HomeAssistant } from "../../../../types";

@customElement("hui-notification-item")
export class HuiNotificationItem extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public notification?: HassEntity;

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.hass || !this.notification || changedProps.has("notification")) {
      return true;
    }

    return false;
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this.notification) {
      return html``;
    }

    return this.notification.entity_id
      ? html`
          <hui-configurator-notification-item
            .hass="${this.hass}"
            .notification="${this.notification}"
          ></hui-configurator-notification-item>
        `
      : html`
          <hui-persistent-notification-item
            .hass="${this.hass}"
            .notification="${this.notification}"
          ></hui-persistent-notification-item>
        `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-notification-item": HuiNotificationItem;
  }
}
