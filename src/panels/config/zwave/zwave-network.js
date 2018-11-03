import "@polymer/paper-card/paper-card";
import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/buttons/ha-call-api-button";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../ha-config-section";

class ZwaveNetwork extends PolymerElement {
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
        <span>Z-Wave Network Management</span>
        <paper-icon-button class="toggle-help-icon" on-click="helpTap" icon="hass:help-circle"></paper-icon-button>

      </div>
      <span slot="introduction">
        Run commands that affect the Z-Wave network. You won't get feedback on whether the command succeeded, but you can look in the OZW Log to try to figure out.
      </span>


      <paper-card class="content">
        <div class="card-actions">
          <ha-call-service-button
            hass="[[hass]]"
            domain="zwave"
            service="add_node_secure">
            Add Node Secure
          </ha-call-service-button>
          <ha-service-description
            hass="[[hass]]"
            domain="zwave"
            service="add_node_secure"
            hidden$="[[!showDescription]]">
          </ha-service-description>

          <ha-call-service-button
            hass="[[hass]]"
            domain="zwave"
            service="add_node">
            Add Node
          </ha-call-service-button>
          <ha-service-description
            hass="[[hass]]"
            domain="zwave"
            service="add_node"
            hidden$="[[!showDescription]]">
          </ha-service-description>

          <ha-call-service-button
            hass="[[hass]]"
            domain="zwave"
            service="remove_node">
            Remove Node
          </ha-call-service-button>
          <ha-service-description
            hass="[[hass]]"
            domain="zwave"
            service="remove_node"
            hidden$="[[!showDescription]]">
          </ha-service-description>

        </div>
        <div class="card-actions warning">
          <ha-call-service-button
            hass="[[hass]]"
            domain="zwave"
            service="cancel_command">
            Cancel Command
          </ha-call-service-button>
          <ha-service-description
            hass="[[hass]]"
            domain="zwave"
            service="cancel_command"
            hidden$="[[!showDescription]]">
          </ha-service-description>

        </div>
        <div class="card-actions">
          <ha-call-service-button
            hass="[[hass]]"
            domain="zwave"
            service="heal_network">
            Heal Network
          </ha-call-service-button>

          <ha-call-service-button
            hass="[[hass]]"
            domain="zwave"
            service="start_network">
            Start Network
          </ha-call-service-button>
          <ha-service-description
            hass="[[hass]]"
            domain="zwave"
            service="start_network"
            hidden$="[[!showDescription]]">
          </ha-service-description>

          <ha-call-service-button
            hass="[[hass]]"
            domain="zwave"
            service="stop_network">
            Stop Network
          </ha-call-service-button>
          <ha-service-description
            hass="[[hass]]"
            domain="zwave"
            service="stop_network"
            hidden$="[[!showDescription]]">
          </ha-service-description>

          <ha-call-service-button
            hass="[[hass]]"
            domain="zwave"
            service="soft_reset">
            Soft Reset
          </ha-call-service-button>
          <ha-service-description
            hass="[[hass]]"
            domain="zwave"
            service="soft_reset"
            hidden$="[[!showDescription]]">
          </ha-service-description>

          <ha-call-service-button
            hass="[[hass]]"
            domain="zwave"
            service="test_network">
            Test Network
          </ha-call-service-button>
          <ha-service-description
            hass="[[hass]]"
            domain="zwave"
            service="test_network"
            hidden$="[[!showDescription]]">
          </ha-service-description>

          <ha-call-api-button
            hass="[[hass]]"
            path="zwave/saveconfig">
            Save Config
          </ha-call-api-button>

        </div>
      </paper-card>
    </ha-config-section>
`;
  }

  static get properties() {
    return {
      hass: Object,

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

customElements.define("zwave-network", ZwaveNetwork);
