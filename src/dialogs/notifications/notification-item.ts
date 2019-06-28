import {
  LitElement,
  property,
  customElement,
  PropertyValues,
  TemplateResult,
  html,
} from "lit-element";

import "./configurator-notification-item";
import "./persistent-notification-item";

import { HomeAssistant } from "../../types";
import { HassNotification } from "./types";

@customElement("notification-item")
export class HuiNotificationItem extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public notification?: HassNotification;

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
          <configurator-notification-item
            .hass="${this.hass}"
            .notification="${this.notification}"
          ></configurator-notification-item>
        `
      : html`
          <persistent-notification-item
            .hass="${this.hass}"
            .notification="${this.notification}"
          ></persistent-notification-item>
        `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-item": HuiNotificationItem;
  }
}
