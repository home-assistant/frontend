import "@material/mwc-button";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { safeLoad } from "js-yaml";
import "../../../components/ha-code-editor";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { EventsMixin } from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import "../../../styles/polymer-ha-style";
import { documentationUrl } from "../../../util/documentation-url";
import "./event-subscribe-card";
import "./events-list";

const ERROR_SENTINEL = {};
/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HaPanelDevEvent extends EventsMixin(LocalizeMixin(PolymerElement)) {
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

        a {
          color: var(--primary-color);
        }
      </style>

      <div class$="[[computeFormClasses(narrow)]]">
        <div class="flex">
          <p>
            [[localize( 'ui.panel.developer-tools.tabs.events.description' )]]
            <a
              href="[[_computeDocumentationUrl(hass)]]"
              target="_blank"
              rel="noreferrer"
            >
              [[localize( 'ui.panel.developer-tools.tabs.events.documentation'
              )]]
            </a>
          </p>
          <div class="ha-form">
            <paper-input
              label="[[localize(
                'ui.panel.developer-tools.tabs.events.type'
              )]]"
              autofocus
              required
              value="{{eventType}}"
            ></paper-input>
            <p>
              [[localize( 'ui.panel.developer-tools.tabs.events.data' )]]
            </p>
            <ha-code-editor
              mode="yaml"
              value="[[eventData]]"
              error="[[!validJSON]]"
              on-value-changed="_yamlChanged"
            ></ha-code-editor>
            <mwc-button on-click="fireEvent" raised disabled="[[!validJSON]]"
              >[[localize( 'ui.panel.developer-tools.tabs.events.fire_event'
              )]]</mwc-button
            >
          </div>
        </div>

        <div>
          <div class="header">
            [[localize( 'ui.panel.developer-tools.tabs.events.available_events'
            )]]
          </div>
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
      return eventData.trim() ? safeLoad(eventData) : {};
    } catch (err) {
      return ERROR_SENTINEL;
    }
  }

  _computeDocumentationUrl(hass) {
    return documentationUrl(hass, "/docs/configuration/events/");
  }

  _computeValidJSON(parsedJSON) {
    return parsedJSON !== ERROR_SENTINEL;
  }

  _yamlChanged(ev) {
    this.eventData = ev.detail.value;
  }

  fireEvent() {
    if (!this.eventType) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.developer-tools.tabs.events.alert_event_type"
        ),
      });
      return;
    }
    this.hass.callApi("POST", "events/" + this.eventType, this.parsedJSON).then(
      function () {
        this.fire("hass-notification", {
          message: this.hass.localize(
            "ui.panel.developer-tools.tabs.events.notification_event_fired",
            "type",
            this.eventType
          ),
        });
      }.bind(this)
    );
  }

  computeFormClasses(narrow) {
    return narrow ? "" : "layout horizontal";
  }
}

customElements.define("developer-tools-event", HaPanelDevEvent);
