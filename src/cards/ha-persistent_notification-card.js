import '@polymer/paper-button/paper-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/ha-card.js';
import '../components/ha-markdown.js';
import '../util/hass-mixins.js';

/*
 * @appliesMixin window.hassMixins.LocalizeMixin
 */
class HaPersistentNotificationCard extends window.hassMixins.LocalizeMixin(PolymerElement) {
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
      paper-button {
        margin: 8px;
        font-weight: 500;
      }
    </style>

    <ha-card header="[[computeTitle(stateObj)]]">
      <ha-markdown content="[[stateObj.attributes.message]]"></ha-markdown>
      <paper-button on-click="dismissTap">[[localize('ui.card.persistent_notification.dismiss')]]</paper-button>
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
    return (stateObj.attributes.title ||
            window.hassUtil.computeStateName(stateObj));
  }

  dismissTap(ev) {
    ev.preventDefault();
    this.hass.callApi('DELETE', 'states/' + this.stateObj.entity_id);
  }
}
customElements.define('ha-persistent_notification-card', HaPersistentNotificationCard);
