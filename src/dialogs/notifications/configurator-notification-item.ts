import {
  html,
  LitElement,
  TemplateResult,
  property,
  customElement,
} from "lit-element";
import "@material/mwc-button";

import "./notification-item-template";

import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { PersitentNotificationEntity } from "../../data/persistent_notification";

@customElement("configurator-notification-item")
export class HuiConfiguratorNotificationItem extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public notification?: PersitentNotificationEntity;

  protected render(): TemplateResult {
    if (!this.hass || !this.notification) {
      return html``;
    }

    return html`
      <notification-item-template>
        <span slot="header">${this.hass.localize("domain.configurator")}</span>

        <div>
          ${this.hass.localize(
            "ui.notification_drawer.click_to_configure",
            "entity",
            this.notification.attributes.friendly_name
          )}
        </div>

        <mwc-button slot="actions" @click="${this._handleClick}"
          >${this.hass.localize(
            `state.configurator.${this.notification.state}`
          )}</mwc-button
        >
      </notification-item-template>
    `;
  }

  private _handleClick(): void {
    fireEvent(this, "hass-more-info", {
      entityId: this.notification!.entity_id,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "configurator-notification-item": HuiConfiguratorNotificationItem;
  }
}
