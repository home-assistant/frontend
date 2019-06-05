import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/iron-input/iron-input";
import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-spinner/paper-spinner";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-markdown";

class MoreInfoConfigurator extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex"></style>
      <style>
        p {
          margin: 8px 0;
        }

        a {
          color: var(--primary-color);
        }

        p > img {
          max-width: 100%;
        }

        p.center {
          text-align: center;
        }

        p.error {
          color: #c62828;
        }

        p.submit {
          text-align: center;
          height: 41px;
        }

        paper-spinner {
          width: 14px;
          height: 14px;
          margin-right: 20px;
        }

        [hidden] {
          display: none;
        }
      </style>

      <div class="layout vertical">
        <template is="dom-if" if="[[isConfigurable]]">
          <ha-markdown
            content="[[stateObj.attributes.description]]"
          ></ha-markdown>

          <p class="error" hidden$="[[!stateObj.attributes.errors]]">
            [[stateObj.attributes.errors]]
          </p>

          <template is="dom-repeat" items="[[stateObj.attributes.fields]]">
            <paper-input
              label="[[item.name]]"
              name="[[item.id]]"
              type="[[item.type]]"
              on-change="fieldChanged"
            ></paper-input>
          </template>

          <p class="submit" hidden$="[[!stateObj.attributes.submit_caption]]">
            <mwc-button
              raised=""
              disabled="[[isConfiguring]]"
              on-click="submitClicked"
            >
              <paper-spinner
                active="[[isConfiguring]]"
                hidden="[[!isConfiguring]]"
                alt="Configuring"
              ></paper-spinner>
              [[stateObj.attributes.submit_caption]]
            </mwc-button>
          </p>
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      stateObj: {
        type: Object,
      },

      action: {
        type: String,
        value: "display",
      },

      isConfigurable: {
        type: Boolean,
        computed: "computeIsConfigurable(stateObj)",
      },

      isConfiguring: {
        type: Boolean,
        value: false,
      },

      fieldInput: {
        type: Object,
        value: function() {
          return {};
        },
      },
    };
  }

  computeIsConfigurable(stateObj) {
    return stateObj.state === "configure";
  }

  fieldChanged(ev) {
    var el = ev.target;
    this.fieldInput[el.name] = el.value;
  }

  submitClicked() {
    var data = {
      configure_id: this.stateObj.attributes.configure_id,
      fields: this.fieldInput,
    };

    this.isConfiguring = true;

    this.hass.callService("configurator", "configure", data).then(
      function() {
        this.isConfiguring = false;
      }.bind(this),
      function() {
        this.isConfiguring = false;
      }.bind(this)
    );
  }
}

customElements.define("more-info-configurator", MoreInfoConfigurator);
