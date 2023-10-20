import "@material/mwc-button/mwc-button";
import { mdiBell } from "@mdi/js";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import {
  PersistentNotification,
  subscribeNotifications,
} from "../data/persistent_notification";
import { haStyleSidebarItem } from "../resources/styles";
import { HomeAssistant } from "../types";
import "./ha-svg-icon";

const styles = css`
  .item {
    width: 100%;
  }
`;
@customElement("ha-sidebar-panel-notifications")
class HaSidebarPanelNotifications extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public expanded = false;

  @state() private _notifications?: PersistentNotification[];

  static styles = [haStyleSidebarItem, styles];

  protected render() {
    const notificationCount = this._notifications
      ? this._notifications.length
      : 0;
    return html`<button
      class="item ${this.expanded ? "expanded" : ""}"
      @click=${this._showNotifications}
    >
      <div class="target"></div>
      <span class="icon">
        <ha-svg-icon .path=${mdiBell}></ha-svg-icon>
        ${!this.expanded && notificationCount > 0
          ? html`<span class="badge">${notificationCount}</span>`
          : ""}
      </span>
      <span class="name">
        ${this.hass.localize("ui.notification_drawer.title")}
      </span>
      ${this.expanded && notificationCount > 0
        ? html`<span class="count">${notificationCount}</span>`
        : ""}
    </button>`;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    subscribeNotifications(this.hass.connection, (notifications) => {
      this._notifications = notifications;
    });
  }

  private _showNotifications() {
    fireEvent(this, "hass-show-notifications");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar-panel-notifications": HaSidebarPanelNotifications;
  }
}
