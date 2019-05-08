import "@polymer/paper-card/paper-card";
import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/components/buttons/ha-call-api-button";
import "../../../src/resources/ha-style";
import { EventsMixin } from "../../../src/mixins/events-mixin";

class HassioAddonNetwork extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="ha-style">
        :host {
          display: block;
        }
        paper-card {
          display: block;
        }
        .errors {
          color: var(--google-red-500);
          margin-bottom: 16px;
        }
        .card-actions {
          @apply --layout;
          @apply --layout-justified;
        }
      </style>
      <paper-card heading="Network">
        <div class="card-content">
          <template is="dom-if" if="[[error]]">
            <div class="errors">[[error]]</div>
          </template>

          <table>
            <tbody>
              <tr>
                <th>Container</th>
                <th>Host</th>
                <th>Description</th>
              </tr>
              <template is="dom-repeat" items="[[config]]">
                <tr>
                  <td>[[item.container]]</td>
                  <td>
                    <paper-input
                      placeholder="disabled"
                      value="{{item.host}}"
                      no-label-float=""
                    ></paper-input>
                  </td>
                  <td>[[item.description]]</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div class="card-actions">
          <ha-call-api-button
            class="warning"
            hass="[[hass]]"
            path="hassio/addons/[[addonSlug]]/options"
            data="[[resetData]]"
            >Reset to defaults</ha-call-api-button
          >
          <mwc-button on-click="saveTapped">Save</mwc-button>
        </div>
      </paper-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      addonSlug: String,
      config: Object,
      addon: {
        type: Object,
        observer: "addonChanged",
      },
      error: String,
      resetData: {
        type: Object,
        value: {
          network: null,
        },
      },
    };
  }

  addonChanged(addon) {
    if (!addon) return;

    const network = addon.network || {};
    const description = addon.network_description || {};
    const items = Object.keys(network).map((key) => ({
      container: key,
      host: network[key],
      description: description[key],
    }));
    this.config = items.sort(function(el1, el2) {
      return el1.host - el2.host;
    });
  }

  saveTapped() {
    this.error = null;
    const data = {};
    this.config.forEach(function(item) {
      data[item.container] = parseInt(item.host);
    });
    const path = `hassio/addons/${this.addonSlug}/options`;

    this.hass
      .callApi("post", path, {
        network: data,
      })
      .then(
        () => {
          this.fire("hass-api-called", { success: true, path: path });
        },
        (resp) => {
          this.error = resp.body.message;
        }
      );
  }
}

customElements.define("hassio-addon-network", HassioAddonNetwork);
