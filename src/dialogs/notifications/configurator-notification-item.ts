import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { domainToName } from "../../data/integration";
import type { PersitentNotificationEntity } from "../../data/persistent_notification";
import type { HomeAssistant } from "../../types";
import "../../components/ha-button";
import "./notification-item-template";

@customElement("configurator-notification-item")
export class HuiConfiguratorNotificationItem extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false })
  public notification?: PersitentNotificationEntity;

  protected render() {
    if (!this.hass || !this.notification) {
      return nothing;
    }

    return html`
      <notification-item-template>
        <span slot="header">
          ${domainToName(this.hass.localize, "configurator")}
        </span>

        <div>
          ${this.hass.localize("ui.notification_drawer.click_to_configure", {
            entity: this.notification.attributes.friendly_name,
          })}
        </div>

        <ha-button
          appearance="plain"
          slot="actions"
          @click=${this._handleClick}
        >
          ${this.hass.formatEntityState(this.notification)}
        </ha-button>
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
