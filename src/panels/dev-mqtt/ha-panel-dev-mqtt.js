import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-input/paper-textarea";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../components/ha-menu-button";
import "../../resources/ha-style";
import "../../util/app-localstorage-document";

class HaPanelDevMqtt extends PolymerElement {
  static get template() {
    return html`
      <style include="ha-style">
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }

        .content {
          padding: 24px 0 32px;
          max-width: 600px;
          margin: 0 auto;
        }

        paper-card {
          display: block;
        }

        paper-button {
          background-color: white;
        }
      </style>

      <app-header-layout has-scrolling-region>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-menu-button
              narrow="[[narrow]]"
              show-menu="[[showMenu]]"
            ></ha-menu-button>
            <div main-title>MQTT</div>
          </app-toolbar>
        </app-header>

        <app-localstorage-document key="panel-dev-mqtt-topic" data="{{topic}}">
        </app-localstorage-document>
        <app-localstorage-document
          key="panel-dev-mqtt-payload"
          data="{{payload}}"
        >
        </app-localstorage-document>

        <div class="content">
          <paper-card heading="Publish a packet">
            <div class="card-content">
              <paper-input label="topic" value="{{topic}}"></paper-input>

              <paper-textarea
                always-float-label
                label="Payload (template allowed)"
                value="{{payload}}"
              ></paper-textarea>
            </div>
            <div class="card-actions">
              <paper-button on-click="_publish">Publish</paper-button>
            </div>
          </paper-card>
        </div>
      </app-header-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      showMenu: Boolean,
      topic: String,
      payload: String,
    };
  }

  _publish() {
    this.hass.callService("mqtt", "publish", {
      topic: this.topic,
      payload_template: this.payload,
    });
  }
}

customElements.define("ha-panel-dev-mqtt", HaPanelDevMqtt);
