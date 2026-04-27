import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, html, css, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { KeyboardShortcutMixin } from "../../mixins/keyboard-shortcut-mixin";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import "../../components/ha-icon-button-prev";
import type { PersistentNotification } from "../../data/persistent_notification";
import { subscribeNotifications } from "../../data/persistent_notification";
import type { HomeAssistant } from "../../types";
import "./notification-item";
import "../../components/ha-header-bar";
import "../../components/ha-button";
import "../../components/ha-drawer";
import { loadVirtualizer } from "../../resources/virtualizer";
import type { HaDrawer } from "../../components/ha-drawer";
import { computeRTLDirection } from "../../common/util/compute_rtl";

@customElement("notification-drawer")
export class HuiNotificationDrawer extends KeyboardShortcutMixin(LitElement) {
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
    window.removeEventListener("location-changed", this.closeDialog);
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
      `min(100vw, calc(${narrow ? window.innerWidth + "px" : "500px"} + var(--safe-area-inset-left, 0px)))`
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

  public willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      loadVirtualizer();
    }
  }

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
      <ha-drawer
        type="modal"
        open
        @MDCDrawer:closed=${this._dialogClosed}
        .direction=${computeRTLDirection(this.hass)}
      >
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
            ? html`<div class="list-container">
                  <lit-virtualizer
                    .items=${notifications}
                    .renderItem=${this._renderItem}
                  ></lit-virtualizer>
                </div>
                ${this._notifications.length > 1
                  ? html`<div class="notification-actions">
                      <ha-button appearance="filled" @click=${this._dismissAll}>
                        ${this.hass.localize(
                          "ui.notification_drawer.dismiss_all"
                        )}
                      </ha-button>
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

  private _renderItem = (notification: PersistentNotification) => html`
    <div class="notification">
      <notification-item
        .hass=${this.hass}
        .notification=${notification}
      ></notification-item>
    </div>
  `;

  private _dialogClosed(ev: Event) {
    ev.stopPropagation();
    this._open = false;
  }

  private _dismissAll() {
    this.hass.callService("persistent_notification", "dismiss_all");
    this.closeDialog();
  }

  protected supportedSingleKeyShortcuts(): SupportedShortcuts {
    return {
      Escape: () => this.closeDialog(),
    };
  }

  static styles = css`
    ha-drawer {
      --mdc-drawer-surface-fill-color: var(--primary-background-color);
    }

    ha-header-bar {
      --mdc-theme-on-primary: var(--primary-text-color);
      --mdc-theme-primary: var(--card-background-color);
      --header-bar-padding: var(--safe-area-inset-top, 0px) 0 0
        var(--safe-area-inset-left, 0px);
      border-bottom: 1px solid var(--divider-color);
      display: block;
    }

    @media all and (max-width: 450px), all and (max-height: 500px) {
      ha-header-bar {
        --header-bar-padding: var(--safe-area-inset-top, 0px)
          var(--safe-area-inset-right, 0px) 0 var(--safe-area-inset-left, 0px);
      }
    }

    .list-container {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      padding-top: var(--ha-space-4);
    }

    .notifications {
      display: flex;
      flex-direction: column;
      padding-left: var(--safe-area-inset-left, 0px);
      padding-inline-start: var(--safe-area-inset-left, 0px);
      padding-bottom: var(--safe-area-inset-bottom, 0px);
      height: calc(
        100% - 1px - var(--header-height) - var(--safe-area-inset-top, 0px)
      );
      box-sizing: border-box;
      background-color: var(--primary-background-color);
      color: var(--primary-text-color);
    }

    @media all and (max-width: 450px), all and (max-height: 500px) {
      .notifications {
        padding-right: var(--safe-area-inset-right, 0px);
        padding-inline-end: var(--safe-area-inset-right, 0px);
      }
    }

    .notification {
      padding: 0 var(--ha-space-4) var(--ha-space-4);
      width: 100%;
    }

    .notification-actions {
      border-top: 1px solid var(--divider-color);
      padding: var(--ha-space-4);
      text-align: center;
      flex: 0 0 auto;
    }

    .empty {
      padding: var(--ha-space-4);
      text-align: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-drawer": HuiNotificationDrawer;
  }
}
