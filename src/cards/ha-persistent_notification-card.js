import "@material/mwc-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/ha-card";
import "../components/ha-markdown";

import computeStateName from "../common/entity/compute_state_name";
import LocalizeMixin from "../mixins/localize-mixin";
import computeObjectId from "../common/entity/compute_object_id";

/*
 * @appliesMixin LocalizeMixin
 */
class HaPersistentNotificationCard extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        :host {
          @apply --paper-font-body1;
        }
        ha-markdown {
          display: block;
          padding: 0 16px;
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }
        ha-markdown p:first-child {
          margin-top: 0;
        }
        ha-markdown p:last-child {
          margin-bottom: 0;
        }
        ha-markdown a {
          color: var(--primary-color);
        }
        ha-markdown img {
          max-width: 100%;
        }
        mwc-button {
          margin: 8px;
        }
      </style>

      <ha-card header="[[computeTitle(stateObj)]]">
        <ha-markdown content="[[stateObj.attributes.message]]"></ha-markdown>
        <mwc-button on-click="dismissTap"
          >[[localize('ui.card.persistent_notification.dismiss')]]</mwc-button
        >
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
    };
  }

  computeTitle(stateObj) {
    return stateObj.attributes.title || computeStateName(stateObj);
  }

  dismissTap(ev) {
    ev.preventDefault();
    this.hass.callService("persistent_notification", "dismiss", {
      notification_id: computeObjectId(this.stateObj.entity_id),
    });
  }
}
customElements.define(
  "ha-persistent_notification-card",
  HaPersistentNotificationCard
);
