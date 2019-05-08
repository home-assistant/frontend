import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/components/buttons/ha-call-api-button";
import { EventsMixin } from "../../../src/mixins/events-mixin";

import { showHassioMarkdownDialog } from "../dialogs/markdown/show-dialog-hassio-markdown";

class HassioHostInfo extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        paper-card {
          display: inline-block;
          width: 400px;
          margin-left: 8px;
        }
        .card-content {
          height: 200px;
          color: var(--primary-text-color);
        }
        @media screen and (max-width: 830px) {
          paper-card {
            margin-top: 8px;
            margin-left: 0;
            width: 100%;
          }
          .card-content {
            height: auto;
          }
        }
        .info {
          width: 100%;
        }
        .info td:nth-child(2) {
          text-align: right;
        }
        .errors {
          color: var(--google-red-500);
          margin-top: 16px;
        }
        mwc-button.info {
          max-width: calc(50% - 12px);
        }
        table.info {
          margin-bottom: 10px;
        }
      </style>
      <paper-card>
        <div class="card-content">
          <h2>Host system</h2>
          <table class="info">
            <tbody>
              <tr>
                <td>Hostname</td>
                <td>[[data.hostname]]</td>
              </tr>
              <tr>
                <td>System</td>
                <td>[[data.operating_system]]</td>
              </tr>
              <template is="dom-if" if="[[data.deployment]]">
                <tr>
                  <td>Deployment</td>
                  <td>[[data.deployment]]</td>
                </tr>
              </template>
            </tbody>
          </table>
          <mwc-button raised on-click="_showHardware" class="info">
            Hardware
          </mwc-button>
          <template is="dom-if" if="[[_featureAvailable(data, 'hostname')]]">
            <mwc-button raised on-click="_changeHostnameClicked" class="info">
              Change hostname
            </mwc-button>
          </template>
          <template is="dom-if" if="[[errors]]">
            <div class="errors">Error: [[errors]]</div>
          </template>
        </div>
        <div class="card-actions">
          <template is="dom-if" if="[[_featureAvailable(data, 'reboot')]]">
            <ha-call-api-button
              class="warning"
              hass="[[hass]]"
              path="hassio/host/reboot"
              >Reboot</ha-call-api-button
            >
          </template>
          <template is="dom-if" if="[[_featureAvailable(data, 'shutdown')]]">
            <ha-call-api-button
              class="warning"
              hass="[[hass]]"
              path="hassio/host/shutdown"
              >Shutdown</ha-call-api-button
            >
          </template>
          <template is="dom-if" if="[[_featureAvailable(data, 'hassos')]]">
            <ha-call-api-button
              class="warning"
              hass="[[hass]]"
              path="hassio/hassos/config/sync"
              title="Load HassOS configs or updates from USB"
              >Import from USB</ha-call-api-button
            >
          </template>
          <template is="dom-if" if="[[_computeUpdateAvailable(_hassOs)]]">
            <ha-call-api-button hass="[[hass]]" path="hassio/hassos/update"
              >Update</ha-call-api-button
            >
          </template>
        </div>
      </paper-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      data: {
        type: Object,
        observer: "_dataChanged",
      },
      errors: String,
      _hassOs: Object,
    };
  }

  ready() {
    super.ready();
    this.addEventListener("hass-api-called", (ev) => this.apiCalled(ev));
  }

  apiCalled(ev) {
    if (ev.detail.success) {
      this.errors = null;
      return;
    }

    var response = ev.detail.response;

    if (typeof response.body === "object") {
      this.errors = response.body.message || "Unknown error";
    } else {
      this.errors = response.body;
    }
  }

  _dataChanged(data) {
    if (data.features && data.features.includes("hassos")) {
      this.hass.callApi("get", "hassio/hassos/info").then((resp) => {
        this._hassOs = resp.data;
      });
    } else {
      this._hassOs = {};
    }
  }

  _computeUpdateAvailable(data) {
    return data && data.version !== data.version_latest;
  }

  _featureAvailable(data, feature) {
    return data && data.features && data.features.includes(feature);
  }

  _showHardware() {
    this.hass
      .callApi("get", "hassio/hardware/info")
      .then(
        (resp) => this._objectToMarkdown(resp.data),
        () => "Error getting hardware info"
      )
      .then((content) => {
        showHassioMarkdownDialog(this, {
          title: "Hardware",
          content: content,
        });
      });
  }

  _objectToMarkdown(obj, indent = "") {
    let data = "";
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] !== "object") {
        data += `${indent}- ${key}: ${obj[key]}\n`;
      } else {
        data += `${indent}- ${key}:\n`;
        if (Array.isArray(obj[key])) {
          if (obj[key].length) {
            data +=
              `${indent}    - ` + obj[key].join(`\n${indent}    - `) + "\n";
          }
        } else {
          data += this._objectToMarkdown(obj[key], `    ${indent}`);
        }
      }
    });
    return data;
  }

  _changeHostnameClicked() {
    const curHostname = this.data.hostname;
    const hostname = prompt("Please enter a new hostname:", curHostname);
    if (hostname && hostname !== curHostname) {
      this.hass.callApi("post", "hassio/host/options", { hostname });
    }
  }
}

customElements.define("hassio-host-info", HassioHostInfo);
