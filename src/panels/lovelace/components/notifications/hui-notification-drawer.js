import "@polymer/paper-button/paper-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/app-layout/app-toolbar/app-toolbar";

import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./hui-notification-item";
import "../../../../components/ha-paper-icon-button-next";

import EventsMixin from "../../../../mixins/events-mixin";
import LocalizeMixin from "../../../../mixins/localize-mixin";
import { computeRTL } from "../../../../common/util/compute_rtl";

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
      :host {
        bottom: 0;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
      }

      :host([hidden]) {
        display: none;
      }

      .container {
        align-items: stretch;
        background: var(--sidebar-background-color, var(--primary-background-color));
        bottom: 0;
        box-shadow: var(--paper-material-elevation-1_-_box-shadow);
        display: flex;
        flex-direction: column;
        overflow-y: hidden;
        position: fixed;
        top: 0;
        transition: right .2s ease-in;
        width: 500px;
        z-index: 10;
      }

      :host([rtl]) .container {
        transition: left .2s ease-in !important;
      }

      :host(:not(narrow)) .container {
        right: -500px;
      }

      :host([rtl]:not(narrow)) .container {
        left: -500px;
      }

      :host([narrow]) .container {
        right: -100%;
        width: 100%;
      }

      :host([rtl][narrow]) .container {
        left: -100%;
        width: 100%;
      }

      :host(.open) .container,
      :host(.open[narrow]) .container {
        right: 0;
      }

      :host([rtl].open) .container,
      :host([rtl].open[narrow]) .container {
        left: 0;
      }

      app-toolbar {
        color: var(--primary-text-color);
        border-bottom: 1px solid var(--divider-color);
        background-color: var(--primary-background-color);
        min-height: 64px;
        width: calc(100% - 32px);
        z-index: 11;
      }

      .overlay {
        display: none;
      }

      :host(.open) .overlay {
        bottom: 0;
        display: block;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
        z-index: 5;
      }

      .notifications {
        overflow-y: auto;
        padding-top: 16px;
      }

      .notification {
        padding: 0 16px 16px;
      }

      .empty {
        padding: 16px;
        text-align: center;
      }
    </style>
    <div class="overlay" on-click="_closeDrawer"></div>
    <div class="container">
      <app-toolbar>
        <div main-title>[[localize('ui.notification_drawer.title')]]</div>
        <ha-paper-icon-button-next on-click="_closeDrawer"></paper-icon-button>
      </app-toolbar>
      <div class="notifications">
        <template is="dom-if" if="[[!_empty(notifications)]]">
          <dom-repeat items="[[notifications]]">
            <template>
              <div class="notification">
                <hui-notification-item hass="[[hass]]" notification="[[item]]"></hui-notification-item>
              </div>
            </template>
          </dom-repeat>
        </template>
        <template is="dom-if" if="[[_empty(notifications)]]">
          <div class="empty">[[localize('ui.notification_drawer.empty')]]<div>
        </template>
      </div>
    </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: {
        type: Boolean,
        reflectToAttribute: true,
      },
      open: {
        type: Boolean,
        notify: true,
        observer: "_openChanged",
      },
      hidden: {
        type: Boolean,
        value: true,
        reflectToAttribute: true,
      },
      notifications: {
        type: Array,
        value: [],
      },
      rtl: {
        type: Boolean,
        reflectToAttribute: true,
        computed: "_computeRTL(hass)",
      },
    };
  }

  _closeDrawer(ev) {
    ev.stopPropagation();
    this.open = false;
  }

  _empty(notifications) {
    return notifications.length === 0;
  }

  _openChanged(open) {
    clearTimeout(this._openTimer);
    if (open) {
      // Render closed then animate open
      this.hidden = false;
      this._openTimer = setTimeout(() => {
        this.classList.add("open");
      }, 50);
    } else {
      // Animate closed then hide
      this.classList.remove("open");
      this._openTimer = setTimeout(() => {
        this.hidden = true;
      }, 250);
    }
  }

  _computeRTL(hass) {
    return computeRTL(hass);
  }
}
customElements.define("hui-notification-drawer", HuiNotificationDrawer);
