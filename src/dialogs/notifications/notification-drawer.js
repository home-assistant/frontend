import "@material/mwc-button";
import "@polymer/app-layout/app-drawer/app-drawer";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { computeDomain } from "../../common/entity/compute_domain";
import "../../components/ha-icon-button-prev";
import { subscribeNotifications } from "../../data/persistent_notification";
import { EventsMixin } from "../../mixins/events-mixin";
import LocalizeMixin from "../../mixins/localize-mixin";
import "./notification-item";

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
export class HuiNotificationDrawer extends EventsMixin(
  LocalizeMixin(PolymerElement)
) {
  static get template() {
    return html`
    <style>
      app-toolbar {
        color: var(--primary-text-color);
        border-bottom: 1px solid var(--divider-color);
        background-color: var(--primary-background-color);
        height: var(--header-height);
        box-sizing: border-box;
      }

      div[main-title] {
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
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
    </style>
    <app-drawer id="drawer" opened="{{open}}" disable-swipe align="start">
      <app-toolbar>
        <div main-title>[[localize('ui.notification_drawer.title')]]</div>
        <ha-icon-button-prev hass="[[hass]]" on-click="_closeDrawer"
          label="[[localize('ui.notification_drawer.close')]]">
        </ha-icon-button-prev>
      </app-toolbar>
      <div class="notifications">
        <template is="dom-if" if="[[!_empty(notifications)]]">
          <dom-repeat items="[[notifications]]">
            <template>
              <div class="notification">
                <notification-item hass="[[hass]]" notification="[[item]]"></notification-item>
              </div>
            </template>
          </dom-repeat>
          <template is="dom-if" if="[[_moreThanOne(notifications)]]">
            <div class="notification-actions">
              <mwc-button raised on-click="_dismissAll">
                [[localize('ui.notification_drawer.dismiss_all')]]
              </mwc-button>
            </div>
          </template>
        </template>
        <template is="dom-if" if="[[_empty(notifications)]]">
          <div class="empty">[[localize('ui.notification_drawer.empty')]]<div>
        </template>
      </div>
    </app-drawer>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      open: {
        type: Boolean,
        observer: "_openChanged",
      },
      notifications: {
        type: Array,
        computed: "_computeNotifications(open, hass, _notificationsBackend)",
        observer: "_notificationsChanged",
      },
      _notificationsBackend: {
        type: Array,
        value: [],
      },
    };
  }

  ready() {
    super.ready();
    window.addEventListener("location-changed", () => {
      // close drawer when we navigate away.
      if (this.open) {
        this.open = false;
      }
    });
  }

  _closeDrawer(ev) {
    ev.stopPropagation();
    this.open = false;
  }

  _dismissAll() {
    this.notifications.forEach((notification) => {
      this.hass.callService("persistent_notification", "dismiss", {
        notification_id: notification.notification_id,
      });
    });
    this.open = false;
  }

  _empty(notifications) {
    return notifications.length === 0;
  }

  _moreThanOne(notifications) {
    return notifications.length > 1;
  }

  _openChanged(open) {
    if (open) {
      // Render closed then animate open
      this._unsubNotifications = subscribeNotifications(
        this.hass.connection,
        (notifications) => {
          this._notificationsBackend = notifications;
        }
      );
    } else if (this._unsubNotifications) {
      this._unsubNotifications();
      this._unsubNotifications = undefined;
    }
  }

  _notificationsChanged(newNotifications, oldNotifications) {
    // automatically close drawer when last notification has been dismissed
    if (
      this.open &&
      oldNotifications.length > 0 &&
      newNotifications.length === 0
    ) {
      this.open = false;
    }
  }

  _computeNotifications(open, hass, notificationsBackend) {
    if (!open) {
      return [];
    }

    const configuratorEntities = Object.keys(hass.states)
      .filter((entityId) => computeDomain(entityId) === "configurator")
      .map((entityId) => hass.states[entityId]);

    const notifications = notificationsBackend.concat(configuratorEntities);

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

    return notifications;
  }

  showDialog({ narrow }) {
    this.style.setProperty(
      "--app-drawer-width",
      narrow ? window.innerWidth + "px" : "500px"
    );
    this.$.drawer.open();
  }
}
customElements.define("notification-drawer", HuiNotificationDrawer);
