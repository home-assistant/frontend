import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import yaml from "js-yaml";

import "../../../components/ha-code-editor";
import "../../../resources/ha-style";
import "./events-list";
import "./event-subscribe-card";
import { EventsMixin } from "../../../mixins/events-mixin";

const ERROR_SENTINEL = {};
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
          max-width: 400px;
        }

        mwc-button {
          margin-top: 8px;
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
          <p>
            Fire an event on the event bus.
            <a
              href="https://www.home-assistant.io/docs/configuration/events/"
              target="_blank"
              >Events Documentation.</a
            >
          </p>
          <div class="ha-form">
            <paper-input
              label="Event Type"
              autofocus
              required
              value="{{eventType}}"
            ></paper-input>
            <p>Event Data (YAML, optional)</p>
            <ha-code-editor
              mode="yaml"
              value="[[eventData]]"
              error="[[!validJSON]]"
              on-value-changed="_yamlChanged"
            ></ha-code-editor>
            <mwc-button on-click="fireEvent" raised disabled="[[!validJSON]]"
              >Fire Event</mwc-button
            >
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

      parsedJSON: {
        type: Object,
        computed: "_computeParsedEventData(eventData)",
      },

      validJSON: {
        type: Boolean,
        computed: "_computeValidJSON(parsedJSON)",
      },
    };
  }

  eventSelected(ev) {
    this.eventType = ev.detail.eventType;
  }

  _computeParsedEventData(eventData) {
    try {
      return eventData.trim() ? yaml.safeLoad(eventData) : {};
    } catch (err) {
      return ERROR_SENTINEL;
    }
  }

  _computeValidJSON(parsedJSON) {
    return parsedJSON !== ERROR_SENTINEL;
  }

  _yamlChanged(ev) {
    this.eventData = ev.detail.value;
  }

  fireEvent() {
    if (!this.eventType) {
      alert("Event type is a mandatory field");
      return;
    }
    this.hass.callApi("POST", "events/" + this.eventType, this.parsedJSON).then(
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
