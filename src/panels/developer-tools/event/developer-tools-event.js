import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-input/paper-textarea";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../resources/ha-style";
import "./events-list";
import "./event-subscribe-card";
import { EventsMixin } from "../../../mixins/events-mixin";

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
          @apply --paper-font-body1;
          padding: 16px;
          direction: ltr;
          display: block;
        }

        .ha-form {
          margin-right: 16px;
        }

        .header {
          @apply --paper-font-title;
        }

        event-subscribe-card {
          display: block;
          max-width: 800px;
          margin: 16px auto;
        }
      </style>

      <div class$="[[computeFormClasses(narrow)]]">
        <div class="flex">
          <p>Fire an event on the event bus.</p>

          <div class="ha-form">
            <paper-input
              label="Event Type"
              autofocus
              required
              value="{{eventType}}"
            ></paper-input>
            <paper-textarea
              label="Event Data (JSON, optional)"
              value="{{eventData}}"
            ></paper-textarea>
            <mwc-button on-click="fireEvent" raised>Fire Event</mwc-button>
          </div>
        </div>

        <div>
          <div class="header">Available Events</div>
          <events-list
            on-event-selected="eventSelected"
            hass="[[hass]]"
          ></events-list>
        </div>
      </div>
      <event-subscribe-card hass="[[hass]]"></event-subscribe-card>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      eventType: {
        type: String,
        value: "",
      },

      eventData: {
        type: String,
        value: "",
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
      alert("Error parsing JSON: " + err);
      /* eslint-enable no-alert */
      return;
    }

    this.hass.callApi("POST", "events/" + this.eventType, eventData).then(
      function() {
        this.fire("hass-notification", {
          message: "Event " + this.eventType + " successful fired!",
        });
      }.bind(this)
    );
  }

  computeFormClasses(narrow) {
    return narrow ? "" : "layout horizontal";
  }
}

customElements.define("developer-tools-event", HaPanelDevEvent);
