import "@material/mwc-button";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, html, css, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import "../../components/ha-icon-button-prev";
import {
  PersistentNotification,
  subscribeNotifications,
} from "../../data/persistent_notification";
import { HomeAssistant } from "../../types";
import "./notification-item";
import "../../components/ha-header-bar";
import "../../components/ha-drawer";
import type { HaDrawer } from "../../components/ha-drawer";

@customElement("notification-drawer")
export class HuiNotificationDrawer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _notifications: PersistentNotification[] = [];

  @state() private _open = false;

  @query("ha-drawer") private _drawer?: HaDrawer;

  private _unsubNotifications?: UnsubscribeFunc;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("location-changed", this.closeDialog);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.addEventListener("location-changed", this.closeDialog);
  }

  showDialog({ narrow }) {
    this._unsubNotifications = subscribeNotifications(
      this.hass.connection,
      (notifications) => {
        if (this._notifications.length && !notifications.length) {
          this.closeDialog();
          return;
        }
        this._notifications = notifications;
      }
    );
    this.style.setProperty(
      "--mdc-drawer-width",
      narrow ? window.innerWidth + "px" : "500px"
    );
    this._open = true;
  }

  closeDialog = () => {
    if (this._drawer) {
      this._drawer.open = false;
    }
    if (this._unsubNotifications) {
      this._unsubNotifications();
      this._unsubNotifications = undefined;
    }
    this._notifications = [];
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  };

  protected render() {
    if (!this._open) {
      return nothing;
    }
    const configuratorEntities = Object.keys(this.hass.states)
      .filter((entityId) => computeDomain(entityId) === "configurator")
      .map((entityId) => this.hass.states[entityId]);

    // @ts-ignore
    const notifications = this._notifications.concat(configuratorEntities);

    notifications.sort((n1, n2) => {
      const d1 = new Date(n1.created_at);
      const d2 = new Date(n2.created_at);

      if (d1 < d2) {
        return 1;
      }
      if (d1 > d2) {
        return -1;
      }
      return 0;
    });

    return html`
      <ha-drawer type="modal" open @MDCDrawer:closed=${this._dialogClosed}>
        <ha-header-bar>
          <div slot="title">
            ${this.hass.localize("ui.notification_drawer.title")}
          </div>
          <ha-icon-button-prev
            slot="actionItems"
            .hass=${this.hass}
            @click=${this.closeDialog}
            .label=${this.hass.localize("ui.notification_drawer.close")}
          >
          </ha-icon-button-prev>
        </ha-header-bar>
        <div class="notifications">
          ${notifications.length
            ? html`${notifications.map(
                (notification) =>
                  html`<div class="notification">
                    <notification-item
                      .hass=${this.hass}
                      .notification=${notification}
                    ></notification-item>
                  </div>`
              )}
              ${this._notifications.length > 1
                ? html`<div class="notification-actions">
                    <mwc-button raised @click=${this._dismissAll}>
                      ${this.hass.localize(
                        "ui.notification_drawer.dismiss_all"
                      )}
                    </mwc-button>
                  </div>`
                : ""}`
            : html` <div class="empty">
                ${this.hass.localize("ui.notification_drawer.empty")}
                <div></div>
              </div>`}
        </div>
      </ha-drawer>
    `;
  }

  private _dialogClosed(ev: Event) {
    ev.stopPropagation();
    this._open = false;
  }

  private _dismissAll() {
    this.hass.callService("persistent_notification", "dismiss_all");
    this.closeDialog();
  }

  static styles = css`
    ha-header-bar {
      --mdc-theme-on-primary: var(--primary-text-color);
      --mdc-theme-primary: var(--primary-background-color);
      border-bottom: 1px solid var(--divider-color);
      display: block;
    }

    .notifications {
      overflow-y: auto;
      padding-top: 16px;
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
      padding-bottom: env(safe-area-inset-bottom);
      height: calc(100% - 1px - var(--header-height));
      box-sizing: border-box;
      background-color: var(--primary-background-color);
      color: var(--primary-text-color);
    }

    .notification {
      padding: 0 16px 16px;
    }

    .notification-actions {
      padding: 0 16px 16px;
      text-align: center;
    }

    .empty {
      padding: 16px;
      text-align: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-drawer": HuiNotificationDrawer;
  }
}
