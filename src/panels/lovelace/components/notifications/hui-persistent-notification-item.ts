import {
  html,
  LitElement,
  TemplateResult,
  property,
  customElement,
  css,
  CSSResult,
} from "lit-element";
import "@material/mwc-button";
import "@polymer/paper-tooltip/paper-tooltip";

import "../../../../components/ha-relative-time";
import "../../../../components/ha-markdown";
import "./hui-notification-item-template";

import { HomeAssistant } from "../../../../types";
import { HassNotification } from "./types";

@customElement("hui-persistent-notification-item")
export class HuiPersistentNotificationItem extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public notification?: HassNotification;

  protected render(): TemplateResult | void {
    if (!this.hass || !this.notification) {
      return html``;
    }

    return html`
      <hui-notification-item-template>
        <span slot="header">${this._computeTitle(this.notification)}</span>

        <ha-markdown content="${this.notification.message}"></ha-markdown>

        <div class="time">
          <span>
            <ha-relative-time
              .hass="${this.hass}"
              .datetime="${this.notification.created_at}"
            ></ha-relative-time>
            <paper-tooltip
              >${this._computeTooltip(
                this.hass,
                this.notification
              )}</paper-tooltip
            >
          </span>
        </div>

        <mwc-button slot="actions" @click="${this._handleDismiss}"
          >${this.hass.localize(
            "ui.card.persistent_notification.dismiss"
          )}</mwc-button
        >
      </hui-notification-item-template>
    `;
  }

  static get styles(): CSSResult {
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
    `;
  }

  private _handleDismiss(): void {
    this.hass!.callService("persistent_notification", "dismiss", {
      notification_id: this.notification!.notification_id,
    });
  }

  private _computeTitle(notification: HassNotification): string | undefined {
    return notification.title || notification.notification_id;
  }

  private _computeTooltip(
    hass: HomeAssistant,
    notification: HassNotification
  ): string | undefined {
    if (!hass || !notification) {
      return undefined;
    }

    const d = new Date(notification.created_at!);
    return d.toLocaleDateString(hass.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
      minute: "numeric",
      hour: "numeric",
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-persistent-notification-item": HuiPersistentNotificationItem;
  }
}
