import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-input/paper-textarea.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../components/ha-menu-button.js';
import '../../resources/ha-style.js';
import './events-list.js';
import EventsMixin from '../../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
class HaPanelDevEvent extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style iron-flex iron-positioning"></style>
    <style>
      :host {
        -ms-user-select: initial;
        -webkit-user-select: initial;
        -moz-user-select: initial;
      }

      .content {
        @apply --paper-font-body1;
        padding: 16px;
      }

      .ha-form {
        margin-right: 16px;
      }

      .header {
        @apply --paper-font-title;
      }
    </style>

    <app-header-layout has-scrolling-region>
      <app-header slot="header" fixed>
        <app-toolbar>
          <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
          <div main-title>Events</div>
        </app-toolbar>
      </app-header>

      <div class$='[[computeFormClasses(narrow)]]'>
        <div class='flex'>
          <p>
            Fire an event on the event bus.
          </p>

          <div class='ha-form'>
            <paper-input label="Event Type" autofocus required value='{{eventType}}'></paper-input>
            <paper-textarea label="Event Data (JSON, optional)" value='{{eventData}}'></paper-textarea>
            <paper-button on-click='fireEvent' raised>Fire Event</paper-button>
          </div>
        </div>

        <div>
          <div class='header'>Available Events</div>
          <events-list on-event-selected='eventSelected' hass='[[hass]]'></events-list>
        </div>
      </div>
    </app-header-layout>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      narrow: {
        type: Boolean,
        value: false,
      },

      showMenu: {
        type: Boolean,
        value: false,
      },

      eventType: {
        type: String,
        value: '',
      },

      eventData: {
        type: String,
        value: '',
      },
    };
  }

  eventSelected(ev) {
    this.eventType = ev.detail.eventType;
  }

  fireEvent() {
    var eventData;

    try {
      eventData = this.eventData ? JSON.parse(this.eventData) : {};
    } catch (err) {
      /* eslint-disable no-alert */
      alert('Error parsing JSON: ' + err);
      /* eslint-enable no-alert */
      return;
    }

    this.hass.callApi('POST', 'events/' + this.eventType, eventData)
      .then(function () {
        this.fire('hass-notification', {
          message: 'Event ' + this.eventType + ' successful fired!',
        });
      }.bind(this));
  }

  computeFormClasses(narrow) {
    return narrow ?
      'content fit' : 'content fit layout horizontal';
  }
}

customElements.define('ha-panel-dev-event', HaPanelDevEvent);
