import "@material/mwc-button";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { formatDateTime } from "../../common/datetime/format_date_time";
import "../../components/ha-markdown";
import "../../components/ha-relative-time";
import { PersistentNotification } from "../../data/persistent_notification";
import { HomeAssistant } from "../../types";
import "./notification-item-template";

@customElement("persistent-notification-item")
export class HuiPersistentNotificationItem extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public notification?: PersistentNotification;

  protected render() {
    if (!this.hass || !this.notification) {
      return nothing;
    }

    return html`
      <notification-item-template>
        <span slot="header"> ${this.notification.title} </span>

        <ha-markdown breaks content=${this.notification.message}></ha-markdown>

        <div class="time">
          <span>
            <ha-relative-time
              .hass=${this.hass}
              .datetime=${this.notification.created_at}
              capitalize
            ></ha-relative-time>
            <simple-tooltip animation-delay="0">
              ${this._computeTooltip(this.hass, this.notification)}
            </simple-tooltip>
          </span>
        </div>

        <mwc-button slot="actions" @click=${this._handleDismiss}
          >${this.hass.localize(
            "ui.card.persistent_notification.dismiss"
          )}</mwc-button
        >
      </notification-item-template>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .time {
        display: flex;
        justify-content: flex-end;
        margin-top: 6px;
      }
      ha-relative-time {
        color: var(--secondary-text-color);
      }
      a {
        color: var(--primary-color);
      }
      ha-markdown {
        overflow-wrap: break-word;
      }
    `;
  }

  private _handleDismiss(): void {
    this.hass!.callService("persistent_notification", "dismiss", {
      notification_id: this.notification!.notification_id,
    });
  }

  private _computeTooltip(
    hass: HomeAssistant,
    notification: PersistentNotification
  ): string | undefined {
    if (!hass || !notification) {
      return undefined;
    }

    const d = new Date(notification.created_at!);
    return formatDateTime(d, hass.locale, hass.config);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "persistent-notification-item": HuiPersistentNotificationItem;
  }
}
