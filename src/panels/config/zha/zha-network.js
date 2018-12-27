import "@polymer/paper-card/paper-card";
import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/buttons/ha-call-api-button";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../ha-config-section";

class ZhaNetwork extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      .content {
        margin-top: 24px;
      }

      paper-card {
        display: block;
        margin: 0 auto;
        max-width: 600px;
      }

      .card-actions.warning ha-call-service-button {
        color: var(--google-red-500);
      }

      .toggle-help-icon {
        position: absolute;
        top: -6px;
        right: 0;
        color: var(--primary-color);
      }

      ha-service-description {
        display: block;
        color: grey;
      }

      [hidden] {
        display: none;
      }
    </style>
    <ha-config-section is-wide="[[isWide]]">
      <div style="position: relative" slot="header">
        <span>Zigbee Home Automation network management</span>
        <paper-icon-button class="toggle-help-icon" on-click="helpTap" icon="hass:help-circle"></paper-icon-button>
      </div>
      <span slot="introduction">Commands that affect entire network</span>

      <paper-card class="content">
        <div class="card-actions">
          <ha-call-service-button hass="[[hass]]" domain="zha" service="permit">Permit</ha-call-service-button>
          <ha-service-description hass="[[hass]]" domain="zha" service="permit" hidden$="[[!showDescription]]"></ha-service-description>
      </paper-card>
    </ha-config-section>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      isWide: {
        type: Boolean,
        value: false,
      },

      showDescription: {
        type: Boolean,
        value: false,
      },
    };
  }

  helpTap() {
    this.showDescription = !this.showDescription;
  }
}

customElements.define("zha-network", ZhaNetwork);
