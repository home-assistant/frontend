import { HassEntity } from "home-assistant-js-websocket";
import {
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { PersistentNotification } from "../../data/persistent_notification";
import { HomeAssistant } from "../../types";
import "./configurator-notification-item";
import "./persistent-notification-item";

@customElement("notification-item")
export class HuiNotificationItem extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public notification?: HassEntity | PersistentNotification;

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.hass || !this.notification || changedProps.has("notification")) {
      return true;
    }

    return false;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this.notification) {
      return html``;
    }

    return "entity_id" in this.notification
      ? html`
          <configurator-notification-item
            .hass=${this.hass}
            .notification="${this.notification}"
          ></configurator-notification-item>
        `
      : html`
          <persistent-notification-item
            .hass=${this.hass}
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
