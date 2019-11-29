import "@polymer/app-layout/app-drawer/app-drawer";
import "@material/mwc-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/app-layout/app-toolbar/app-toolbar";

import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./notification-item";
import "../../components/ha-paper-icon-button-prev";

import { EventsMixin } from "../../mixins/events-mixin";
import LocalizeMixin from "../../mixins/localize-mixin";
import { subscribeNotifications } from "../../data/persistent_notification";
import { computeDomain } from "../../common/entity/compute_domain";
/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
export class HuiNotificationDrawer extends EventsMixin(
  LocalizeMixin(PolymerElement)
) {
  static get template() {
    return html`
    <style include="paper-material-styles">
      app-toolbar {
        color: var(--primary-text-color);
        border-bottom: 1px solid var(--divider-color);
        background-color: var(--primary-background-color);
        min-height: 64px;
        width: calc(100% - 32px);
      }

      .notifications {
        overflow-y: auto;
        padding-top: 16px;
        height: calc(100% - 65px);
        box-sizing: border-box;
        background-color: var(--primary-background-color);
        color: var(--primary-text-color);
      }

      .notification {
        padding: 0 16px 16px;
      }

      .empty {
        padding: 16px;
        text-align: center;
      }
    </style>
    <app-drawer id='drawer' opened="{{open}}" disable-swipe align="start">
      <app-toolbar>
        <div main-title>[[localize('ui.notification_drawer.title')]]</div>
        <ha-paper-icon-button-prev on-click="_closeDrawer" aria-label="[[localize('ui.notification_drawer.close')]]"></paper-icon-button>
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

  _empty(notifications) {
    return notifications.length === 0;
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

  _computeNotifications(open, hass, notificationsBackend) {
    if (!open) {
      return [];
    }

    const configuratorEntities = Object.keys(hass.states)
      .filter((entityId) => computeDomain(entityId) === "configurator")
      .map((entityId) => hass.states[entityId]);

    return notificationsBackend.concat(configuratorEntities);
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
